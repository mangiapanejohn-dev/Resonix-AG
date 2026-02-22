import type { ResonixPluginApi, ProviderAuthContext, ProviderAuthResult } from "resonix/plugin-sdk";
import { loginGeminiCliOAuth } from "./oauth.js";

const PROVIDER_ID = "google-gemini-cli";
const PROVIDER_LABEL = "Gemini CLI OAuth";
const DEFAULT_MODEL = "google-gemini-cli/gemini-3-pro-preview";
const ENV_VARS = [
  "RESONIX_GEMINI_OAUTH_CLIENT_ID",
  "RESONIX_GEMINI_OAUTH_CLIENT_SECRET",
  "GEMINI_CLI_OAUTH_CLIENT_ID",
  "GEMINI_CLI_OAUTH_CLIENT_SECRET",
];

function emptyPluginConfigSchema() {
  return {
    safeParse(value: unknown) {
      if (value === undefined) {
        return { success: true, data: undefined };
      }
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {
          success: false,
          error: {
            issues: [{ path: [], message: "expected config object" }],
          },
        };
      }
      if (Object.keys(value as Record<string, unknown>).length > 0) {
        return {
          success: false,
          error: {
            issues: [{ path: [], message: "config must be empty" }],
          },
        };
      }
      return { success: true, data: value };
    },
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  };
}

function buildOauthProviderAuthResult(params: {
  providerId: string;
  defaultModel: string;
  access: string;
  refresh?: string | null;
  expires?: number | null;
  email?: string | null;
  profilePrefix?: string;
  credentialExtra?: Record<string, unknown>;
  notes?: string[];
}): ProviderAuthResult {
  const email = params.email ?? undefined;
  const profilePrefix = params.profilePrefix ?? params.providerId;
  const profileId = `${profilePrefix}:${email ?? "default"}`;
  const credential = {
    type: "oauth",
    provider: params.providerId,
    access: params.access,
    ...(params.refresh ? { refresh: params.refresh } : {}),
    ...(Number.isFinite(params.expires) ? { expires: params.expires as number } : {}),
    ...(email ? { email } : {}),
    ...(params.credentialExtra ?? {}),
  } as ProviderAuthResult["profiles"][number]["credential"];
  return {
    profiles: [
      {
        profileId,
        credential,
      },
    ],
    configPatch: {
      agents: {
        defaults: {
          models: {
            [params.defaultModel]: {},
          },
        },
      },
    },
    defaultModel: params.defaultModel,
    notes: params.notes,
  };
}

const geminiCliPlugin = {
  id: "google-gemini-cli-auth",
  name: "Google Gemini CLI Auth",
  description: "OAuth flow for Gemini CLI (Google Code Assist)",
  configSchema: emptyPluginConfigSchema(),
  register(api: ResonixPluginApi) {
    api.registerProvider({
      id: PROVIDER_ID,
      label: PROVIDER_LABEL,
      docsPath: "/providers/models",
      aliases: ["gemini-cli"],
      envVars: ENV_VARS,
      auth: [
        {
          id: "oauth",
          label: "Google OAuth",
          hint: "PKCE + localhost callback",
          kind: "oauth",
          run: async (ctx: ProviderAuthContext) => {
            const spin = ctx.prompter.progress("Starting Gemini CLI OAuth…");
            try {
              const result = await loginGeminiCliOAuth({
                isRemote: ctx.isRemote,
                openUrl: ctx.openUrl,
                log: (msg) => ctx.runtime.log(msg),
                note: ctx.prompter.note,
                prompt: async (message) => String(await ctx.prompter.text({ message })),
                progress: spin,
              });

              spin.stop("Gemini CLI OAuth complete");
              return buildOauthProviderAuthResult({
                providerId: PROVIDER_ID,
                defaultModel: DEFAULT_MODEL,
                access: result.access,
                refresh: result.refresh,
                expires: result.expires,
                email: result.email,
                credentialExtra: { projectId: result.projectId },
                notes: ["If requests fail, set GOOGLE_CLOUD_PROJECT or GOOGLE_CLOUD_PROJECT_ID."],
              });
            } catch (err) {
              spin.stop("Gemini CLI OAuth failed");
              await ctx.prompter.note(
                "Trouble with OAuth? Ensure your Google account has Gemini CLI access.",
                "OAuth help",
              );
              throw err;
            }
          },
        },
      ],
    });
  },
};

export default geminiCliPlugin;
