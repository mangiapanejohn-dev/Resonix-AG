import type { ResonixConfig } from "./config.js";

export function ensurePluginAllowlisted(cfg: ResonixConfig, pluginId: string): ResonixConfig {
  const allow = cfg.plugins?.allow;
  if (!Array.isArray(allow) || allow.includes(pluginId)) {
    return cfg;
  }
  return {
    ...cfg,
    plugins: {
      ...cfg.plugins,
      allow: [...allow, pluginId],
    },
  };
}
