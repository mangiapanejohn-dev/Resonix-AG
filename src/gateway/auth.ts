import type { IncomingMessage } from "node:http";
import type {
  GatewayAuthConfig,
  GatewayTailscaleMode,
  GatewayTrustedProxyConfig,
} from "../config/config.js";
import { readTailscaleWhoisIdentity, type TailscaleWhoisIdentity } from "../infra/tailscale.js";
import { safeEqualSecret } from "../security/secret-equal.js";
import {
  AUTH_RATE_LIMIT_SCOPE_SHARED_SECRET,
  AUTH_RATE_LIMIT_SCOPE_DEVICE_TOKEN,
  type AuthRateLimiter,
  type RateLimitCheckResult,
} from "./auth-rate-limit.js";
import { buildDeviceAuthPayload } from "./device-auth.js";
import {
  isLoopbackAddress,
  isTrustedProxyAddress,
  resolveHostName,
  parseForwardedForClientIp,
  resolveGatewayClientIp,
} from "./net.js";

export type ResolvedGatewayAuthMode = "none" | "token" | "password" | "trusted-proxy";
export type ResolvedGatewayAuthModeSource =
  | "override"
  | "config"
  | "password"
  | "token"
  | "default";

export type ResolvedGatewayAuth = {
  mode: ResolvedGatewayAuthMode;
  modeSource?: ResolvedGatewayAuthModeSource;
  token?: string;
  password?: string;
  allowTailscale: boolean;
  trustedProxy?: GatewayTrustedProxyConfig;
  rateLimit?: import("../config/config.js").GatewayAuthRateLimitConfig;
};

export type GatewayAuthSurface = "http" | "ws-control-ui";

export type GatewayAuthResult = {
  ok: boolean;
  method?: "none" | "token" | "password" | "tailscale" | "device-token" | "trusted-proxy";
  user?: string;
  reason?: string;
  /** Present when the request was blocked by the rate limiter. */
  rateLimited?: boolean;
  /** Milliseconds the client should wait before retrying (when rate-limited). */
  retryAfterMs?: number;
};

type ConnectAuth = {
  token?: string;
  password?: string;
};

type TailscaleUser = {
  login: string;
  name: string;
  profilePic?: string;
};

type TailscaleWhoisLookup = (ip: string) => Promise<TailscaleWhoisIdentity | null>;

function normalizeLogin(login: string): string {
  return login.trim().toLowerCase();
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseDeviceAuthHeader(req?: IncomingMessage): {
  signature?: string;
  signedAt?: number;
  id?: string;
  role?: string;
  scopes?: string[];
  nonce?: string;
} {
  if (!req) {
    return {};
  }
  const header = headerValue(req.headers["x-device-auth"]);
  if (!header) {
    return {};
  }
  const parts = header.split(" ");
  if (parts.length < 2) {
    return {};
  }
  const [scheme, ...rest] = parts;
  if (scheme !== "Device") {
    return {};
  }
  const params = rest.join(" ").split(",");
  const parsed: Record<string, string> = {};
  for (const param of params) {
    const [key, value] = param.split("=");
    if (key && value) {
      parsed[key.trim()] = value.trim();
    }
  }
  return {
    signature: parsed.signature,
    signedAt: parsed.signedAt ? parseInt(parsed.signedAt, 10) : undefined,
    id: parsed.id,
    role: parsed.role,
    scopes: parsed.scopes ? parsed.scopes.split(" ") : undefined,
    nonce: parsed.nonce,
  };
}

function isDevicePairingExpired(signedAt: number): boolean {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes
  return now - signedAt > maxAge;
}

function resolveTailscaleClientIp(req?: IncomingMessage): string | undefined {
  if (!req) {
    return undefined;
  }
  const forwardedFor = headerValue(req.headers?.["x-forwarded-for"]);
  return forwardedFor ? parseForwardedForClientIp(forwardedFor) : undefined;
}

function resolveRequestClientIp(
  req?: IncomingMessage,
  trustedProxies?: string[],
  allowRealIpFallback = false,
): string | undefined {
  if (!req) {
    return undefined;
  }
  return resolveGatewayClientIp({
    remoteAddr: req.socket?.remoteAddress ?? "",
    forwardedFor: headerValue(req.headers?.["x-forwarded-for"]),
    realIp: headerValue(req.headers?.["x-real-ip"]),
    trustedProxies,
    allowRealIpFallback,
  });
}

export function isLocalDirectRequest(req?: IncomingMessage, trustedProxies?: string[]): boolean {
  if (!req) {
    return false;
  }
  const clientIp = resolveRequestClientIp(req, trustedProxies) ?? "";
  if (!isLoopbackAddress(clientIp)) {
    return false;
  }

  const host = resolveHostName(req.headers?.host);
  const hostIsLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";
  const hostIsTailscaleServe = host.endsWith(".ts.net");

  const hasForwarded = Boolean(
    req.headers?.["x-forwarded-for"] ||
    req.headers?.["x-real-ip"] ||
    req.headers?.["x-forwarded-host"],
  );

  const remoteIsTrustedProxy = isTrustedProxyAddress(req.socket?.remoteAddress, trustedProxies);
  return (hostIsLocal || hostIsTailscaleServe) && (!hasForwarded || remoteIsTrustedProxy);
}

function getTailscaleUser(req?: IncomingMessage): TailscaleUser | null {
  if (!req) {
    return null;
  }
  const login = req.headers["tailscale-user-login"];
  if (typeof login !== "string" || !login.trim()) {
    return null;
  }
  const nameRaw = req.headers["tailscale-user-name"];
  const profilePic = req.headers["tailscale-user-profile-pic"];
  const name = typeof nameRaw === "string" && nameRaw.trim() ? nameRaw.trim() : login.trim();
  return {
    login: login.trim(),
    name,
    profilePic: typeof profilePic === "string" && profilePic.trim() ? profilePic.trim() : undefined,
  };
}

function hasTailscaleProxyHeaders(req?: IncomingMessage): boolean {
  if (!req) {
    return false;
  }
  return Boolean(
    req.headers["x-forwarded-for"] &&
    req.headers["x-forwarded-proto"] &&
    req.headers["x-forwarded-host"],
  );
}

function isTailscaleProxyRequest(req?: IncomingMessage): boolean {
  if (!req) {
    return false;
  }
  return isLoopbackAddress(req.socket?.remoteAddress) && hasTailscaleProxyHeaders(req);
}

async function resolveVerifiedTailscaleUser(params: {
  req?: IncomingMessage;
  tailscaleWhois: TailscaleWhoisLookup;
}): Promise<{ ok: true; user: TailscaleUser } | { ok: false; reason: string }> {
  const { req, tailscaleWhois } = params;
  const tailscaleUser = getTailscaleUser(req);
  if (!tailscaleUser) {
    return { ok: false, reason: "tailscale_user_missing" };
  }
  if (!isTailscaleProxyRequest(req)) {
    return { ok: false, reason: "tailscale_proxy_missing" };
  }
  const clientIp = resolveTailscaleClientIp(req);
  if (!clientIp) {
    return { ok: false, reason: "tailscale_whois_failed" };
  }
  const whois = await tailscaleWhois(clientIp);
  if (!whois?.login) {
    return { ok: false, reason: "tailscale_whois_failed" };
  }
  if (normalizeLogin(whois.login) !== normalizeLogin(tailscaleUser.login)) {
    return { ok: false, reason: "tailscale_user_mismatch" };
  }
  return {
    ok: true,
    user: {
      login: whois.login,
      name: whois.name ?? tailscaleUser.name,
      profilePic: tailscaleUser.profilePic,
    },
  };
}

export function resolveGatewayAuth(params: {
  authConfig?: GatewayAuthConfig | null;
  authOverride?: GatewayAuthConfig | null;
  env?: NodeJS.ProcessEnv;
  tailscaleMode?: GatewayTailscaleMode;
}): ResolvedGatewayAuth {
  const baseAuthConfig = params.authConfig ?? {};
  const authOverride = params.authOverride ?? undefined;
  const authConfig: GatewayAuthConfig = { ...baseAuthConfig };
  if (authOverride) {
    if (authOverride.mode !== undefined) {
      authConfig.mode = authOverride.mode;
    }
    if (authOverride.token !== undefined) {
      authConfig.token = authOverride.token;
    }
    if (authOverride.password !== undefined) {
      authConfig.password = authOverride.password;
    }
    if (authOverride.allowTailscale !== undefined) {
      authConfig.allowTailscale = authOverride.allowTailscale;
    }
    if (authOverride.rateLimit !== undefined) {
      authConfig.rateLimit = authOverride.rateLimit;
    }
    if (authOverride.trustedProxy !== undefined) {
      authConfig.trustedProxy = authOverride.trustedProxy;
    }
  }
  const env = params.env ?? process.env;
  const token = authConfig.token ?? env.RESONIX_GATEWAY_TOKEN ?? undefined;
  const password = authConfig.password ?? env.RESONIX_GATEWAY_PASSWORD ?? undefined;
  const trustedProxy = authConfig.trustedProxy;
  const rateLimit = authConfig.rateLimit;

  let mode: ResolvedGatewayAuth["mode"];
  let modeSource: ResolvedGatewayAuth["modeSource"];
  if (authOverride?.mode !== undefined) {
    mode = authOverride.mode;
    modeSource = "override";
  } else if (authConfig.mode) {
    mode = authConfig.mode;
    modeSource = "config";
  } else if (password) {
    mode = "password";
    modeSource = "password";
  } else if (token) {
    mode = "token";
    modeSource = "token";
  } else {
    mode = "token";
    modeSource = "default";
  }

  const allowTailscale =
    authConfig.allowTailscale ??
    (params.tailscaleMode === "serve" && mode !== "password" && mode !== "trusted-proxy");

  return {
    mode,
    modeSource,
    token,
    password,
    allowTailscale,
    trustedProxy,
    rateLimit,
  };
}

export function assertGatewayAuthConfigured(auth: ResolvedGatewayAuth): void {
  if (auth.mode === "token" && !auth.token) {
    if (auth.allowTailscale) {
      return;
    }
    throw new Error(
      "gateway auth mode is token, but no token was configured (set gateway.auth.token or RESONIX_GATEWAY_TOKEN)",
    );
  }
  if (auth.mode === "password" && !auth.password) {
    throw new Error("gateway auth mode is password, but no password was configured");
  }
  if (auth.mode === "trusted-proxy") {
    if (!auth.trustedProxy) {
      throw new Error(
        "gateway auth mode is trusted-proxy, but no trustedProxy config was provided (set gateway.auth.trustedProxy)",
      );
    }
    if (!auth.trustedProxy.userHeader || auth.trustedProxy.userHeader.trim() === "") {
      throw new Error(
        "gateway auth mode is trusted-proxy, but trustedProxy.userHeader is empty (set gateway.auth.trustedProxy.userHeader)",
      );
    }
  }
}

/**
 * Check if the request came from a trusted proxy and extract user identity.
 * Returns the user identity if valid, or null with a reason if not.
 */
function authorizeTrustedProxy(params: {
  req?: IncomingMessage;
  trustedProxies?: string[];
  trustedProxyConfig: GatewayTrustedProxyConfig;
}): { user: string } | { reason: string } {
  const { req, trustedProxies, trustedProxyConfig } = params;

  if (!req) {
    return { reason: "trusted_proxy_no_request" };
  }

  const remoteAddr = req.socket?.remoteAddress;
  if (!remoteAddr || !isTrustedProxyAddress(remoteAddr, trustedProxies)) {
    return { reason: "trusted_proxy_untrusted_source" };
  }

  const requiredHeaders = trustedProxyConfig.requiredHeaders ?? [];
  for (const header of requiredHeaders) {
    const value = headerValue(req.headers[header.toLowerCase()]);
    if (!value || value.trim() === "") {
      return { reason: `trusted_proxy_missing_header_${header}` };
    }
  }

  const userHeaderValue = headerValue(req.headers[trustedProxyConfig.userHeader.toLowerCase()]);
  if (!userHeaderValue || userHeaderValue.trim() === "") {
    return { reason: "trusted_proxy_user_missing" };
  }

  const user = userHeaderValue.trim();

  const allowUsers = trustedProxyConfig.allowUsers ?? [];
  if (allowUsers.length > 0 && !allowUsers.includes(user)) {
    return { reason: "trusted_proxy_user_not_allowed" };
  }

  return { user };
}

export type AuthorizeGatewayConnectParams = {
  auth: ResolvedGatewayAuth;
  connectAuth?: ConnectAuth | null;
  req?: IncomingMessage;
  trustedProxies?: string[];
  tailscaleWhois?: TailscaleWhoisLookup;
  /**
   * Explicit auth surface. HTTP keeps Tailscale forwarded-header auth disabled.
   * WS Control UI enables it intentionally for tokenless trusted-host login.
   */
  authSurface?: GatewayAuthSurface;
  /** Optional rate limiter instance; when provided, failed attempts are tracked per IP. */
  rateLimiter?: AuthRateLimiter;
  /** Client IP used for rate-limit tracking. Falls back to proxy-aware request IP resolution. */
  clientIp?: string;
  /** Optional limiter scope; defaults to shared-secret auth scope. */
  rateLimitScope?: string;
  /** Trust X-Real-IP only when explicitly enabled. */
  allowRealIpFallback?: boolean;
};

function shouldAllowTailscaleHeaderAuth(authSurface: GatewayAuthSurface): boolean {
  return authSurface === "ws-control-ui";
}

export async function authorizeGatewayConnect(
  params: AuthorizeGatewayConnectParams,
): Promise<GatewayAuthResult> {
  const { auth, connectAuth, req, trustedProxies } = params;
  const tailscaleWhois = params.tailscaleWhois ?? readTailscaleWhoisIdentity;
  const authSurface = params.authSurface ?? "http";
  const allowTailscaleHeaderAuth = shouldAllowTailscaleHeaderAuth(authSurface);
  const localDirect = isLocalDirectRequest(req, trustedProxies);

  if (auth.mode === "trusted-proxy") {
    if (!auth.trustedProxy) {
      return { ok: false, reason: "trusted_proxy_config_missing" };
    }
    if (!trustedProxies || trustedProxies.length === 0) {
      return { ok: false, reason: "trusted_proxy_no_proxies_configured" };
    }

    const result = authorizeTrustedProxy({
      req,
      trustedProxies,
      trustedProxyConfig: auth.trustedProxy,
    });

    if ("user" in result) {
      return { ok: true, method: "trusted-proxy", user: result.user };
    }
    return { ok: false, reason: result.reason };
  }

  if (auth.mode === "none") {
    return { ok: true, method: "none" };
  }

  const limiter = params.rateLimiter;
  const ip =
    params.clientIp ??
    resolveRequestClientIp(req, trustedProxies, params.allowRealIpFallback === true) ??
    req?.socket?.remoteAddress;
  const rateLimitScope = params.rateLimitScope ?? AUTH_RATE_LIMIT_SCOPE_SHARED_SECRET;
  if (limiter) {
    const rlCheck: RateLimitCheckResult = limiter.check(ip, rateLimitScope);
    if (!rlCheck.allowed) {
      return {
        ok: false,
        reason: "rate_limited",
        rateLimited: true,
        retryAfterMs: rlCheck.retryAfterMs,
      };
    }
  }

  if (allowTailscaleHeaderAuth && auth.allowTailscale && !localDirect) {
    const tailscaleCheck = await resolveVerifiedTailscaleUser({
      req,
      tailscaleWhois,
    });
    if (tailscaleCheck.ok) {
      limiter?.reset(ip, rateLimitScope);
      return {
        ok: true,
        method: "tailscale",
        user: tailscaleCheck.user.login,
      };
    }
  }

  if (auth.mode === "token") {
    if (!auth.token) {
      return { ok: false, reason: "token_missing_config" };
    }
    if (!connectAuth?.token) {
      limiter?.recordFailure(ip, rateLimitScope);
      return { ok: false, reason: "token_missing" };
    }
    if (!safeEqualSecret(connectAuth.token, auth.token)) {
      limiter?.recordFailure(ip, rateLimitScope);
      return { ok: false, reason: "token_mismatch" };
    }
    limiter?.reset(ip, rateLimitScope);
    return { ok: true, method: "token" };
  }

  if (auth.mode === "password") {
    const password = connectAuth?.password;
    if (!auth.password) {
      return { ok: false, reason: "password_missing_config" };
    }
    if (!password) {
      limiter?.recordFailure(ip, rateLimitScope);
      return { ok: false, reason: "password_missing" };
    }
    if (!safeEqualSecret(password, auth.password)) {
      limiter?.recordFailure(ip, rateLimitScope);
      return { ok: false, reason: "password_mismatch" };
    }
    limiter?.reset(ip, rateLimitScope);
    return { ok: true, method: "password" };
  }

  // Special case: allow device auth when no explicit auth mode was requested
  // (enables shared-token + device-token mode).
  const { signature, signedAt, id, role, scopes, nonce } = parseDeviceAuthHeader(req);
  if (id && signature) {
    if (auth.allowTailscale) {
      return await authorizeGatewayDevice(
        auth,
        {
          id,
          signature,
          signedAt: signedAt!,
          role: role!,
          scopes: scopes!,
          nonce,
          clientIp: ip,
        },
        limiter,
      );
    } else {
      return {
        ok: false,
        method: "device-token",
        reason: "device_auth_disabled",
      };
    }
  }

  limiter?.recordFailure(ip, rateLimitScope);
  return { ok: false, reason: "unauthorized" };
}

export async function authorizeHttpGatewayConnect(
  params: Omit<AuthorizeGatewayConnectParams, "authSurface">,
): Promise<GatewayAuthResult> {
  return authorizeGatewayConnect({
    ...params,
    authSurface: "http",
  });
}

export async function authorizeWsControlUiGatewayConnect(
  params: Omit<AuthorizeGatewayConnectParams, "authSurface">,
): Promise<GatewayAuthResult> {
  return authorizeGatewayConnect({
    ...params,
    authSurface: "ws-control-ui",
  });
}

async function authorizeGatewayDevice(
  auth: ResolvedGatewayAuth,
  device: {
    id: string;
    signature: string;
    signedAt: number;
    role: string;
    scopes: string[];
    nonce?: string;
    clientIp: string | undefined;
  },
  rateLimiter?: AuthRateLimiter,
): Promise<GatewayAuthResult> {
  const { verifyDeviceSignature, getPairedDevice } = await import("../infra/device-pairing.js");

  if (auth.rateLimit) {
    const limiter =
      rateLimiter ?? (await import("./auth-rate-limit.js")).createAuthRateLimiter(auth.rateLimit);
    const checkResult = limiter.check(device.clientIp, AUTH_RATE_LIMIT_SCOPE_DEVICE_TOKEN);
    if (!checkResult.allowed) {
      return {
        ok: false,
        method: "device-token",
        reason: "auth_rate_limited",
        rateLimited: true,
        retryAfterMs: checkResult.retryAfterMs,
      };
    }
  }

  if (isDevicePairingExpired(device.signedAt)) {
    return { ok: false, method: "device-token", reason: "device_token_expired" };
  }

  const devicePairing = await getPairedDevice(device.id);
  if (!devicePairing) {
    return { ok: false, method: "device-token", reason: "device_not_paired" };
  }

  const payload = buildDeviceAuthPayload({
    deviceId: device.id,
    clientId: "",
    clientMode: "",
    role: device.role,
    scopes: device.scopes,
    signedAtMs: device.signedAt,
    token: auth.token,
    nonce: device.nonce,
  });
  if (!verifyDeviceSignature(devicePairing.publicKey, payload, device.signature)) {
    return { ok: false, method: "device-token", reason: "device_signature_invalid" };
  }

  const hasRequiredScopes = device.scopes.some(
    (s) =>
      s === "operator" ||
      s === "operator.admin" ||
      s === "operator.write" ||
      (s === "webchat" && device.role === "operator"),
  );
  if (!hasRequiredScopes) {
    return { ok: false, method: "device-token", reason: "device_scope_insufficient" };
  }

  if (auth.rateLimit) {
    const limiter =
      rateLimiter ?? (await import("./auth-rate-limit.js")).createAuthRateLimiter(auth.rateLimit);
    limiter.recordFailure(device.clientIp, AUTH_RATE_LIMIT_SCOPE_DEVICE_TOKEN);
  }

  return {
    ok: true,
    method: "device-token",
    user: devicePairing.displayName ?? "device",
    reason: "verified_by_gateway",
  };
}
