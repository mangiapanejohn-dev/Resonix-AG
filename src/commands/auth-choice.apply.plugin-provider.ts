import { resolveResonixAgentDir } from "../agents/agent-paths.js";
import {
  resolveDefaultAgentId,
  resolveAgentDir,
  resolveAgentWorkspaceDir,
} from "../agents/agent-scope.js";
import { upsertAuthProfile } from "../agents/auth-profiles.js";
import { resolveDefaultAgentWorkspaceDir } from "../agents/workspace.js";
import { withProgress } from "../cli/progress.js";
import { enablePluginInConfig } from "../plugins/enable.js";
import { resolvePluginProviders } from "../plugins/providers.js";
import { loadSinglePlugin } from "../plugins/single-loader.js";
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

  const isRemote = isRemoteEnvironment();
  const result = await withProgress(
    {
      label: `Authenticating with ${options.label}...`,
      indeterminate: true,
    },
    async (progress) => {
      progress.setLabel(`Loading ${options.label} authentication plugin...`);

      // Try lightweight single-plugin loader first (faster)
      let provider = await loadSinglePlugin({ pluginId: options.pluginId, config: nextConfig });

      // Fallback to full provider resolution if lightweight loader fails
      if (!provider) {
        progress.setLabel(`Falling back to full provider resolution...`);
        const providers = resolvePluginProviders({ config: nextConfig, workspaceDir });
        provider = resolveProviderMatch(providers, options.providerId);
      } else {
        // Ensure we get the correct method
        provider = resolveProviderMatch([provider], options.providerId) ?? provider;
      }

      if (!provider) {
        progress.setLabel(`Plugin not found...`);
        return {
          configPatch: undefined,
          profiles: [],
          defaultModel: undefined,
          notes: [
            `${options.label} auth plugin is not available. Enable it and re-run the wizard.`,
          ],
        };
      }

      const method = pickAuthMethod(provider, options.methodId) ?? provider.auth[0];
      if (!method) {
        progress.setLabel(`Auth method missing...`);
        return {
          configPatch: undefined,
          profiles: [],
          defaultModel: undefined,
          notes: [`${options.label} auth method missing.`],
        };
      }

      progress.setLabel(`Initializing ${options.label} authorization...`);
      const result = await method.run({
        config: nextConfig,
        agentDir,
        workspaceDir,
        prompter: params.prompter,
        runtime: params.runtime,
        isRemote,
        openUrl: async (url) => {
          progress.setLabel(`Opening ${options.label} authorization page...`);
          await openUrl(url);
          progress.setLabel(`Waiting for ${options.label} authorization...`);
        },
        oauth: {
          createVpsAwareHandlers: (opts) => createVpsAwareOAuthHandlers(opts),
        },
        progress: {
          update: (message) => progress.setLabel(message),
          stop: (message) => {},
        },
      });
      progress.setLabel(`${options.label} authentication completed!`);
      return result;
    },
  );

  // Handle plugin not found or auth method missing
  if (result.notes && result.notes.length > 0) {
    await params.prompter.note(result.notes.join("\n"), options.label);
    return { config: nextConfig };
  }

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

  return { config: nextConfig, agentModelOverride };
}
