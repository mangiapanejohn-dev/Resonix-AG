import { resolveResonixAgentDir } from "../agents/agent-paths.js";
import {
  resolveDefaultAgentId,
  resolveAgentDir,
  resolveAgentWorkspaceDir,
} from "../agents/agent-scope.js";
import { upsertAuthProfile } from "../agents/auth-profiles.js";
import { resolveDefaultAgentWorkspaceDir } from "../agents/workspace.js";
import { enablePluginInConfig } from "../plugins/enable.js";
import { loadSinglePlugin } from "../plugins/single-loader.js";
import { resolvePluginProviders } from "../plugins/providers.js";
import type { ApplyAuthChoiceParams, ApplyAuthChoiceResult } from "./auth-choice.apply.js";
import { isRemoteEnvironment } from "./oauth-env.js";
import { createVpsAwareOAuthHandlers } from "./oauth-flow.js";
import { applyAuthProfileConfig } from "./onboard-auth.js";
import { openUrl } from "./onboard-helpers.js";
import {
  applyDefaultModel,
  mergeConfigPatch,
  pickAuthMethod,
  resolveProviderMatch,
} from "./provider-auth-helpers.js";

export type PluginProviderAuthChoiceOptions = {
  authChoice: string;
  pluginId: string;
  providerId: string;
  methodId?: string;
  label: string;
};

const SINGLE_PLUGIN_LOAD_TIMEOUT_MS = 1500;

function shouldSkipSinglePluginLoader(): boolean {
  return process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
}

async function loadSinglePluginWithTimeout(params: {
  pluginId: string;
  config: Record<string, unknown>;
  timeoutMs?: number;
}): Promise<ProviderPlugin | null> {
  const timeoutMs = Math.max(1, Math.floor(params.timeoutMs ?? SINGLE_PLUGIN_LOAD_TIMEOUT_MS));
  return await new Promise<ProviderPlugin | null>((resolve) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(null);
    }, timeoutMs);

    void loadSinglePlugin({ pluginId: params.pluginId, config: params.config })
      .then((provider) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        resolve(provider);
      })
      .catch(() => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        resolve(null);
      });
  });
}

export async function applyAuthChoicePluginProvider(
  params: ApplyAuthChoiceParams,
  options: PluginProviderAuthChoiceOptions,
): Promise<ApplyAuthChoiceResult | null> {
  if (params.authChoice !== options.authChoice) {
    return null;
  }

  const enableResult = enablePluginInConfig(params.config, options.pluginId);
  let nextConfig = enableResult.config;
  if (!enableResult.enabled) {
    await params.prompter.note(
      `${options.label} plugin is disabled (${enableResult.reason ?? "blocked"}).`,
      options.label,
    );
    return { config: nextConfig };
  }

  const agentId = params.agentId ?? resolveDefaultAgentId(nextConfig);
  const defaultAgentId = resolveDefaultAgentId(nextConfig);
  const agentDir =
    params.agentDir ??
    (agentId === defaultAgentId ? resolveResonixAgentDir() : resolveAgentDir(nextConfig, agentId));
  const workspaceDir =
    resolveAgentWorkspaceDir(nextConfig, agentId) ?? resolveDefaultAgentWorkspaceDir();

  const initProgress = params.prompter.progress(`Preparing ${options.label} auth…`);
  let provider = null;
  try {
    if (!shouldSkipSinglePluginLoader()) {
      // Try lightweight single-plugin loader first (faster).
      initProgress.update(`Loading ${options.label} auth plugin…`);
      provider = await loadSinglePluginWithTimeout({
        pluginId: options.pluginId,
        config: nextConfig,
      });
    }

    // Fallback to full provider resolution if lightweight loader is unavailable
    // or takes too long (avoid blocking onboarding/OAuth transitions).
    if (!provider) {
      initProgress.update("Scanning plugin providers (fallback)…");
      const providers = resolvePluginProviders({ config: nextConfig, workspaceDir });
      provider = resolveProviderMatch(providers, options.providerId);
    } else {
      // Ensure we get the correct method
      provider = resolveProviderMatch([provider], options.providerId) ?? provider;
    }
  } finally {
    initProgress.stop(provider ? `${options.label} auth ready.` : undefined);
  }

  if (!provider) {
    await params.prompter.note(
      `${options.label} auth plugin is not available. Enable it and re-run the wizard.`,
      options.label,
    );
    return { config: nextConfig };
  }

  const method = pickAuthMethod(provider, options.methodId) ?? provider.auth[0];
  if (!method) {
    await params.prompter.note(`${options.label} auth method missing.`, options.label);
    return { config: nextConfig };
  }

  const isRemote = isRemoteEnvironment();
  const result = await method.run({
    config: nextConfig,
    agentDir,
    workspaceDir,
    prompter: params.prompter,
    runtime: params.runtime,
    isRemote,
    openUrl: async (url) => {
      await openUrl(url);
    },
    oauth: {
      createVpsAwareHandlers: (opts) => createVpsAwareOAuthHandlers(opts),
    },
  });

  if (result.configPatch) {
    nextConfig = mergeConfigPatch(nextConfig, result.configPatch);
  }

  for (const profile of result.profiles) {
    upsertAuthProfile({
      profileId: profile.profileId,
      credential: profile.credential,
      agentDir,
    });

    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId: profile.profileId,
      provider: profile.credential.provider,
      mode: profile.credential.type === "token" ? "token" : profile.credential.type,
      ...("email" in profile.credential && profile.credential.email
        ? { email: profile.credential.email }
        : {}),
    });
  }

  let agentModelOverride: string | undefined;
  if (result.defaultModel) {
    if (params.setDefaultModel) {
      nextConfig = applyDefaultModel(nextConfig, result.defaultModel);
      // Skip note for cleaner flow
    } else if (params.agentId) {
      agentModelOverride = result.defaultModel;
      // Skip note for cleaner flow
    }
  }

  // Skip provider notes for cleaner flow
  // if (result.notes && result.notes.length > 0) {
  //   await params.prompter.note(result.notes.join("\n"), "Provider notes");
  // }

  return { config: nextConfig, agentModelOverride };
}
