import type { ResonixConfig } from "../config/config.js";

export function applyOnboardingLocalWorkspaceConfig(
  baseConfig: ResonixConfig,
  workspaceDir: string,
): ResonixConfig {
  return {
    ...baseConfig,
    agents: {
      ...baseConfig.agents,
      defaults: {
        ...baseConfig.agents?.defaults,
        workspace: workspaceDir,
      },
    },
    gateway: {
      ...baseConfig.gateway,
      mode: "local",
    },
  };
}
