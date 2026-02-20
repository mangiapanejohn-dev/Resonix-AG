import type { Command } from "commander";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import { loadConfig } from "../config/config.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";
import { formatSkillInfo, formatSkillsCheck, formatSkillsList } from "./skills-cli.format.js";

export type {
  SkillInfoOptions,
  SkillsCheckOptions,
  SkillsListOptions,
} from "./skills-cli.format.js";
export { formatSkillInfo, formatSkillsCheck, formatSkillsList } from "./skills-cli.format.js";

/**
 * Register the skills CLI commands
 */
export function registerSkillsCli(program: Command) {
  const skills = program
    .command("skills")
    .description("List and inspect available skills")
    .addHelpText(
      "before",
      () =>
        `\n${"+----------------------------------------------------------------+"}\n${"|           RESONIX SYSTEM LAYER - CORE CAPABILITIES           |"}\n${"+----------------------------------------------------------------+"}\n${"|                                                                |"}\n${"|  [SYSTEM PRE-ACTIVATED - NO EXTRA SETUP REQUIRED]              |"}\n${"|                                                                |"}\n${"|  o Feishu Integration                                           |"}\n${"|    - Document read/write operations                             |"}\n${"|    - Cloud storage file management                             |"}\n${"|    - Permission management for documents and files              |"}\n${"|    - Knowledge base navigation                                 |"}\n${"|                                                                |"}\n${"|  o Memory System                                             |"}\n${"|    - Long-term semantic memory (permanent knowledge)             |"}\n${"|    - Short-term episodic memory (session context)               |"}\n${"|    - Working memory (real-time reasoning)                       |"}\n${"|    - Automatic knowledge retention and retrieval                |"}\n${"|                                                                |"}\n${"|  o Self-Cognition Engine                                     |"}\n${"|    - Capability profiling (continuous self-assessment)           |"}\n${"|    - Knowledge gap detection (knows what it doesn't know)       |"}\n${"|    - Continuous learning without manual prompts                 |"}\n${"|                                                                |"}\n${"|  o Browser Control                                           |"}\n${"|    - Playwright-based web automation                           |"}\n${"|    - Multi-profile browser management                          |"}\n${"|    - Sandbox-isolated execution                              |"}\n${"|                                                                |"}\n${"|  o Security & Isolation                                     |"}\n${"|    - File system sandbox (least-privilege)                     |"}\n${"|    - Tool policy enforcement                                   |"}\n${"|    - Execution audit logging                                 |"}\n${"|                                                                |"}\n${"|  [All skills pre-activated - No additional setup required]    |"}\n${"|                                                                |"}\n${"|  View all skills: resonix skills list                         |"}\n${"+----------------------------------------------------------------+"}\n`,
    )
    .addHelpText(
      "after",
      () =>
        `\n${"Docs: https://docs.resonix.ai/cli/skills"}\n`,
    );

  skills
    .command("list")
    .description("List all available skills")
    .option("--json", "Output as JSON", false)
    .option("--eligible", "Show only eligible (ready to use) skills", false)
    .option("-v, --verbose", "Show more details including missing requirements", false)
    .action(async (opts) => {
      try {
        const config = loadConfig();
        const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
        const { buildWorkspaceSkillStatus } = await import("../agents/skills-status.js");
        const report = buildWorkspaceSkillStatus(workspaceDir, { config });
        defaultRuntime.log(formatSkillsList(report, opts));
      } catch (err) {
        defaultRuntime.error(String(err));
        defaultRuntime.exit(1);
      }
    });

  skills
    .command("info")
    .description("Show detailed information about a skill")
    .argument("<name>", "Skill name")
    .option("--json", "Output as JSON", false)
    .action(async (name, opts) => {
      try {
        const config = loadConfig();
        const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
        const { buildWorkspaceSkillStatus } = await import("../agents/skills-status.js");
        const report = buildWorkspaceSkillStatus(workspaceDir, { config });
        defaultRuntime.log(formatSkillInfo(report, name, opts));
      } catch (err) {
        defaultRuntime.error(String(err));
        defaultRuntime.exit(1);
      }
    });

  skills
    .command("check")
    .description("Check which skills are ready vs missing requirements")
    .option("--json", "Output as JSON", false)
    .action(async (opts) => {
      try {
        const config = loadConfig();
        const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
        const { buildWorkspaceSkillStatus } = await import("../agents/skills-status.js");
        const report = buildWorkspaceSkillStatus(workspaceDir, { config });
        defaultRuntime.log(formatSkillsCheck(report, opts));
      } catch (err) {
        defaultRuntime.error(String(err));
        defaultRuntime.exit(1);
      }
    });

  // Default action (no subcommand) - show list
  skills.action(async () => {
    try {
      const config = loadConfig();
      const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
      const { buildWorkspaceSkillStatus } = await import("../agents/skills-status.js");
      const report = buildWorkspaceSkillStatus(workspaceDir, { config });
      defaultRuntime.log(formatSkillsList(report, {}));
    } catch (err) {
      defaultRuntime.error(String(err));
      defaultRuntime.exit(1);
    }
  });
}
