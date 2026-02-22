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
        [
          "",
          "+----------------------------------------------------------------+",
          "|       RESONIX SYSTEM LAYER - CORE CAPABILITIES                |",
          "+----------------------------------------------------------------+",
          "|                                                                |",
          "|  [PRE-ACTIVATED SYSTEM SKILLS - NO EXTRA RITUAL REQUIRED]     |",
          "|                                                                |",
          "|  o Feishu Integration                                           |",
          "|    - Document read/write operations                             |",
          "|    - Cloud storage file management                              |",
          "|    - Permission management for docs and files                   |",
          "|    - Knowledge base navigation                                  |",
          "|                                                                |",
          "|  o Memory System                                                |",
          "|    - Long-term semantic memory                                  |",
          "|    - Short-term episodic memory                                 |",
          "|    - Working memory for real-time reasoning                     |",
          "|    - Automatic retention + retrieval                            |",
          "|                                                                |",
          "|  o Self-Cognition Engine                                        |",
          "|    - Capability profiling                                       |",
          "|    - Knowledge gap detection                                    |",
          "|    - Continuous learning without babysitting                    |",
          "|                                                                |",
          "|  o Browser Control                                              |",
          "|    - Playwright web automation                                  |",
          "|    - Multi-profile browser handling                             |",
          "|    - Sandbox-isolated execution                                 |",
          "|                                                                |",
          "|  o Security & Isolation                                         |",
          "|    - File system sandbox (least-privilege)                     |",
          "|    - Tool policy enforcement                                    |",
          "|    - Execution audit logging                                    |",
          "|                                                                |",
          "|  [All core skills are ready out of the box.]                   |",
          "|  View all skills: resonix skills list                           |",
          "+----------------------------------------------------------------+",
          "",
        ].join("\n"),
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
