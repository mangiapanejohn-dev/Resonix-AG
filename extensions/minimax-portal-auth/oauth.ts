import { createHash, randomBytes, randomUUID } from "node:crypto";

export type MiniMaxRegion = "cn" | "global";

const MINIMAX_OAUTH_CONFIG = {
  cn: {
    baseUrl: "https://api.minimaxi.com",
    clientId: "78257093-7e40-4613-99e0-527b14b39113",
  },
  global: {
    baseUrl: "https://api.minimax.io",
    clientId: "78257093-7e40-4613-99e0-527b14b39113",
  },
} as const;

const MINIMAX_OAUTH_SCOPE = "group_id profile model.completion";
const MINIMAX_OAUTH_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:user_code";
const OAUTH_CODE_TIMEOUT_MS = 8_000;
const OAUTH_TOKEN_TIMEOUT_MS = 8_000;
const DEFAULT_POLL_INTERVAL_MS = 2_000;
const MIN_POLL_INTERVAL_MS = 1_000;
const MAX_POLL_INTERVAL_MS = 5_000;

function normalizeExpiresAtMs(raw: number): number {
  const nowMs = Date.now();
  if (!Number.isFinite(raw) || raw <= 0) {
    return nowMs + 5 * 60_000;
  }

  // Absolute Unix epoch in milliseconds.
  if (raw >= 1_000_000_000_000) {
    return raw;
  }

  // Absolute Unix epoch in seconds.
  if (raw >= 1_000_000_000) {
    return raw * 1000;
  }

  // Duration-style values can arrive in either seconds or milliseconds.
  // Treat <= 1 day as seconds, <= 1 day in ms as milliseconds.
  if (raw <= 86_400) {
    return nowMs + raw * 1000;
  }
  if (raw <= 86_400_000) {
    return nowMs + raw;
  }

  // Fall back to seconds for larger duration-like numbers.
  return nowMs + raw * 1000;
}

function formatRemainingMinutes(expiresAtMs: number): string {
  const remainingMs = expiresAtMs - Date.now();
  if (remainingMs <= 60_000) {
    return "<1 minute";
  }
  const minutes = Math.ceil(remainingMs / 60_000);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

function normalizePollIntervalMs(raw?: number): number {
  if (!raw || !Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_POLL_INTERVAL_MS;
  }
  const intervalMs = raw <= 60 ? raw * 1000 : raw;
  return Math.min(Math.max(Math.round(intervalMs), MIN_POLL_INTERVAL_MS), MAX_POLL_INTERVAL_MS);
}

function getOAuthEndpoints(region: MiniMaxRegion) {
  const config = MINIMAX_OAUTH_CONFIG[region];
  return {
    codeEndpoint: `${config.baseUrl}/oauth/code`,
    tokenEndpoint: `${config.baseUrl}/oauth/token`,
    clientId: config.clientId,
    baseUrl: config.baseUrl,
  };
}

export type MiniMaxOAuthAuthorization = {
  user_code: string;
  verification_uri: string;
  expired_in: number;
  interval?: number;
  state: string;
};

export type MiniMaxOAuthToken = {
  access: string;
  refresh: string;
  expires: number;
  resourceUrl?: string;
  notification_message?: string;
};

type TokenPending = { status: "pending"; message?: string };

type TokenResult =
  | { status: "success"; token: MiniMaxOAuthToken }
  | TokenPending
  | { status: "error"; message: string };

function toFormUrlEncoded(data: Record<string, string>): string {
  return Object.entries(data)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

function generatePkce(): { verifier: string; challenge: string; state: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(16).toString("base64url");
  return { verifier, challenge, state };
}

async function requestOAuthCode(params: {
  challenge: string;
  state: string;
  region: MiniMaxRegion;
}): Promise<MiniMaxOAuthAuthorization> {
  const endpoints = getOAuthEndpoints(params.region);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OAUTH_CODE_TIMEOUT_MS);

  try {
    const response = await fetch(endpoints.codeEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "x-request-id": randomUUID(),
      },
      body: toFormUrlEncoded({
        response_type: "code",
        client_id: endpoints.clientId,
        scope: MINIMAX_OAUTH_SCOPE,
        code_challenge: params.challenge,
        code_challenge_method: "S256",
        state: params.state,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`MiniMax OAuth authorization failed: ${text || response.statusText}`);
    }

    const payload = (await response.json()) as MiniMaxOAuthAuthorization & { error?: string };
    if (!payload.user_code || !payload.verification_uri) {
      throw new Error(
        payload.error ??
          "MiniMax OAuth authorization returned an incomplete payload (missing user_code or verification_uri).",
      );
    }
    if (payload.state !== params.state) {
      throw new Error("MiniMax OAuth state mismatch: possible CSRF attack or session corruption.");
    }
    return payload;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("MiniMax OAuth request timed out. Please check your network connection.");
    }
    throw err;
  }
}

async function pollOAuthToken(params: {
  userCode: string;
  verifier: string;
  region: MiniMaxRegion;
}): Promise<TokenResult> {
  const endpoints = getOAuthEndpoints(params.region);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OAUTH_TOKEN_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(endpoints.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: toFormUrlEncoded({
        grant_type: MINIMAX_OAUTH_GRANT_TYPE,
        client_id: endpoints.clientId,
        user_code: params.userCode,
        code_verifier: params.verifier,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return { status: "pending", message: "OAuth token poll timed out; retrying..." };
    }
    return {
      status: "error",
      message: err instanceof Error ? err.message : "MiniMax OAuth poll failed.",
    };
  }
  clearTimeout(timeoutId);

  const text = await response.text();
  let payload:
    | {
        status?: string;
        base_resp?: { status_code?: number; status_msg?: string };
      }
    | undefined;
  if (text) {
    try {
      payload = JSON.parse(text) as typeof payload;
    } catch {
      payload = undefined;
    }
  }

  if (!response.ok) {
    return {
      status: "error",
      message:
        (payload?.base_resp?.status_msg ?? text) || "MiniMax OAuth failed to parse response.",
    };
  }

  if (!payload) {
    return { status: "error", message: "MiniMax OAuth failed to parse response." };
  }

  const tokenPayload = payload as {
    status: string;
    access_token?: string | null;
    refresh_token?: string | null;
    expired_in?: number | null;
    token_type?: string;
    resource_url?: string;
    notification_message?: string;
  };

  if (tokenPayload.status === "error") {
    return { status: "error", message: "An error occurred. Please try again later" };
  }

  if (tokenPayload.status != "success") {
    return { status: "pending", message: "current user code is not authorized" };
  }

  if (!tokenPayload.access_token || !tokenPayload.refresh_token || !tokenPayload.expired_in) {
    return { status: "error", message: "MiniMax OAuth returned incomplete token payload." };
  }

  return {
    status: "success",
    token: {
      access: tokenPayload.access_token,
      refresh: tokenPayload.refresh_token,
      expires: normalizeExpiresAtMs(tokenPayload.expired_in),
      resourceUrl: tokenPayload.resource_url,
      notification_message: tokenPayload.notification_message,
    },
  };
}

export async function loginMiniMaxPortalOAuth(params: {
  openUrl: (url: string) => Promise<void>;
  note: (message: string, title?: string) => Promise<void>;
  progress: { update: (message: string) => void; stop: (message?: string) => void };
  region?: MiniMaxRegion;
}): Promise<MiniMaxOAuthToken> {
  const region = params.region ?? "global";
  const { verifier, challenge, state } = generatePkce();

  // Show immediate feedback that we're starting
  params.progress.update("Requesting authorization from MiniMax…");

  const oauth = await requestOAuthCode({ challenge, state, region });
  const verificationUrl = oauth.verification_uri;
  const expiresAtMs = normalizeExpiresAtMs(oauth.expired_in);
  const pollIntervalMs = normalizePollIntervalMs(oauth.interval);

  // Kick off browser open immediately after authorization URL arrives.
  // We intentionally do not await this so a slow shell/browser doesn't block OAuth UX.
  void params.openUrl(verificationUrl).catch(() => {
    // Fall back to manual copy/paste if browser open fails.
  });

  const noteLines = [
    `Open ${verificationUrl} to approve access.`,
    `If prompted, enter the code ${oauth.user_code}.`,
    `Expires in: ${formatRemainingMinutes(expiresAtMs)}`,
  ];
  await params.note(noteLines.join("\n"), "MiniMax OAuth");

  params.progress.update("Waiting for MiniMax OAuth approval…");

  while (Date.now() < expiresAtMs) {
    const result = await pollOAuthToken({
      userCode: oauth.user_code,
      verifier,
      region,
    });

    if (result.status === "success") {
      return result.token;
    }

    if (result.status === "error") {
      throw new Error(`MiniMax OAuth failed: ${result.message}`);
    }

    if (result.status === "pending") {
      params.progress.update("Waiting for approval…");
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error("MiniMax OAuth timed out waiting for authorization.");
}
