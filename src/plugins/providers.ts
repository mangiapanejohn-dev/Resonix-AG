import { createSubsystemLogger } from "../logging/subsystem.js";
import { loadResonixPlugins, type PluginLoadOptions } from "./loader.js";
import { createPluginLoaderLogger } from "./logger.js";
import type { ProviderPlugin } from "./types.js";

const log = createSubsystemLogger("plugins");

export function resolvePluginProviders(params: {
  config?: PluginLoadOptions["config"];
  workspaceDir?: string;
  /** Disable caching when config has changed (e.g., after enabling a plugin) */
  noCache?: boolean;
}): ProviderPlugin[] {
  const registry = loadResonixPlugins({
    config: params.config,
    workspaceDir: params.workspaceDir,
    logger: createPluginLoaderLogger(log),
    cache: params.noCache ? false : undefined,
  });

  return registry.providers.map((entry) => entry.provider);
}
