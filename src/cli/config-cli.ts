import type { Command } from "commander";
import JSON5 from "json5";
import { readConfigFileSnapshot, writeConfigFile } from "../config/config.js";
import { danger, info } from "../globals.js";
import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";
import { shortenHomePath } from "../utils.js";
import { formatCliCommand } from "./command-format.js";

type PathSegment = string;
type ConfigSetParseOpts = {
  strictJson?: boolean;
};

function isIndexSegment(raw: string): boolean {
  return /^[0-9]+$/.test(raw);
}

function parsePath(raw: string): PathSegment[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }
  const parts: string[] = [];
  let current = "";
  let i = 0;
  while (i < trimmed.length) {
    const ch = trimmed[i];
    if (ch === "\\") {
      const next = trimmed[i + 1];
      if (next) {
        current += next;
      }
      i += 2;
      continue;
    }
    if (ch === ".") {
      if (current) {
        parts.push(current);
      }
      current = "";
      i += 1;
      continue;
    }
    if (ch === "[") {
      if (current) {
        parts.push(current);
      }
      current = "";
      const close = trimmed.indexOf("]", i);
      if (close === -1) {
        throw new Error(`Invalid path (missing "]"): ${raw}`);
      }
      const inside = trimmed.slice(i + 1, close).trim();
      if (!inside) {
        throw new Error(`Invalid path (empty "[]"): ${raw}`);
      }
      parts.push(inside);
      i = close + 1;
      continue;
    }
    current += ch;
    i += 1;
  }
  if (current) {
    parts.push(current);
  }
  return parts.map((part) => part.trim()).filter(Boolean);
}

function parseValue(raw: string, opts: ConfigSetParseOpts): unknown {
  const trimmed = raw.trim();
  if (opts.strictJson) {
    try {
      return JSON5.parse(trimmed);
    } catch (err) {
      throw new Error(`Failed to parse JSON5 value: ${String(err)}`, { cause: err });
    }
  }

  try {
    return JSON5.parse(trimmed);
  } catch {
    return raw;
  }
}

function getAtPath(root: unknown, path: PathSegment[]): { found: boolean; value?: unknown } {
  let current: unknown = root;
  for (const segment of path) {
    if (!current || typeof current !== "object") {
      return { found: false };
    }
    if (Array.isArray(current)) {
      if (!isIndexSegment(segment)) {
        return { found: false };
      }
      const index = Number.parseInt(segment, 10);
      if (!Number.isFinite(index) || index < 0 || index >= current.length) {
        return { found: false };
      }
      current = current[index];
      continue;
    }
    const record = current as Record<string, unknown>;
    if (!(segment in record)) {
      return { found: false };
    }
    current = record[segment];
  }
  return { found: true, value: current };
}

function setAtPath(root: Record<string, unknown>, path: PathSegment[], value: unknown): void {
  let current: unknown = root;
  for (let i = 0; i < path.length - 1; i += 1) {
    const segment = path[i];
    const next = path[i + 1];
    const nextIsIndex = Boolean(next && isIndexSegment(next));
    if (Array.isArray(current)) {
      if (!isIndexSegment(segment)) {
        throw new Error(`Expected numeric index for array segment "${segment}"`);
      }
      const index = Number.parseInt(segment, 10);
      const existing = current[index];
      if (!existing || typeof existing !== "object") {
        current[index] = nextIsIndex ? [] : {};
      }
      current = current[index];
      continue;
    }
    if (!current || typeof current !== "object") {
      throw new Error(`Cannot traverse into "${segment}" (not an object)`);
    }
    const record = current as Record<string, unknown>;
    const existing = record[segment];
    if (!existing || typeof existing !== "object") {
      record[segment] = nextIsIndex ? [] : {};
    }
    current = record[segment];
  }

  const last = path[path.length - 1];
  if (Array.isArray(current)) {
    if (!isIndexSegment(last)) {
      throw new Error(`Expected numeric index for array segment "${last}"`);
    }
    const index = Number.parseInt(last, 10);
    current[index] = value;
    return;
  }
  if (!current || typeof current !== "object") {
    throw new Error(`Cannot set "${last}" (parent is not an object)`);
  }
  (current as Record<string, unknown>)[last] = value;
}

function unsetAtPath(root: Record<string, unknown>, path: PathSegment[]): boolean {
  let current: unknown = root;
  for (let i = 0; i < path.length - 1; i += 1) {
    const segment = path[i];
    if (!current || typeof current !== "object") {
      return false;
    }
    if (Array.isArray(current)) {
      if (!isIndexSegment(segment)) {
        return false;
      }
      const index = Number.parseInt(segment, 10);
      if (!Number.isFinite(index) || index < 0 || index >= current.length) {
        return false;
      }
      current = current[index];
      continue;
    }
    const record = current as Record<string, unknown>;
    if (!(segment in record)) {
      return false;
    }
    current = record[segment];
  }

  const last = path[path.length - 1];
  if (Array.isArray(current)) {
    if (!isIndexSegment(last)) {
      return false;
    }
    const index = Number.parseInt(last, 10);
    if (!Number.isFinite(index) || index < 0 || index >= current.length) {
      return false;
    }
    current.splice(index, 1);
    return true;
  }
  if (!current || typeof current !== "object") {
    return false;
  }
  const record = current as Record<string, unknown>;
  if (!(last in record)) {
    return false;
  }
  delete record[last];
  return true;
}

async function loadValidConfig(runtime: RuntimeEnv = defaultRuntime) {
  const snapshot = await readConfigFileSnapshot();
  if (snapshot.valid) {
    return snapshot;
  }
  runtime.error(`Config invalid at ${shortenHomePath(snapshot.path)}.`);
  for (const issue of snapshot.issues) {
    runtime.error(`- ${issue.path || "<root>"}: ${issue.message}`);
  }
  runtime.error(`Run \`${formatCliCommand("resonix doctor")}\` to repair, then retry.`);
  runtime.exit(1);
  return snapshot;
}

function parseRequiredPath(path: string): PathSegment[] {
  const parsedPath = parsePath(path);
  if (parsedPath.length === 0) {
    throw new Error("Path is empty.");
  }
  return parsedPath;
}

type ConfigIssue = {
  path: string;
  message: string;
};

function extractMissingEnvVar(message: string): { varName?: string; configPath?: string } {
  const varName = message.match(/Missing env var "([^"]+)"/i)?.[1];
  const configPath = message.match(/config path:\s*([^\n]+)/i)?.[1]?.trim();
  return {
    ...(varName ? { varName } : {}),
    ...(configPath ? { configPath } : {}),
  };
}

function suggestFixesForIssue(issue: ConfigIssue): string[] {
  const hints: string[] = [];
  const path = issue.path || "<root>";
  const message = issue.message;
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("json5 parse failed")) {
    hints.push(
      `Fix JSON5 syntax in ${path === "<root>" ? "the config file" : `\`${path}\``}, then rerun \`${formatCliCommand("resonix config validate")}\`.`,
    );
  }

  if (lowerMessage.includes("include resolution failed") || lowerMessage.includes("$include")) {
    hints.push(
      `Check include paths and confinement rules, then rerun \`${formatCliCommand("resonix config validate")}\`.`,
    );
  }

  if (lowerMessage.includes("missing env var")) {
    const parsed = extractMissingEnvVar(message);
    if (parsed.varName) {
      hints.push(
        `Set \`${parsed.varName}\` in your shell (example: \`export ${parsed.varName}=...\`) and rerun \`${formatCliCommand("resonix config validate")}\`.`,
      );
    }
    if (parsed.configPath) {
      hints.push(
        `If you want a literal value instead, replace \`${parsed.configPath}\` via \`${formatCliCommand(`resonix config set ${parsed.configPath} \"...\"`)}\`.`,
      );
    }
  }

  if (path === "routing.allowFrom" || lowerMessage.includes("legacy")) {
    hints.push(
      `Run \`${formatCliCommand("resonix doctor --fix")}\` to migrate legacy keys (for example: \`routing.allowFrom\` → \`channels.whatsapp.allowFrom\`).`,
    );
  }

  if (path.startsWith("plugins.") && lowerMessage.includes("plugin not found")) {
    hints.push(
      `Install the missing plugin or remove the stale entry, then verify with \`${formatCliCommand("resonix plugins status")}\`.`,
    );
  }

  if (path.startsWith("channels.") && lowerMessage.includes("unknown channel id")) {
    hints.push(
      `Use known channel ids only. Check current channel availability with \`${formatCliCommand("resonix channels status --all")}\`.`,
    );
  }

  if (
    path.startsWith("browser.profiles.") &&
    lowerMessage.includes("profile must set cdpport or cdpurl")
  ) {
    hints.push(
      `Set either a CDP port or URL for that profile (example: \`${formatCliCommand("resonix config set browser.profiles.<name>.cdpPort 19012")}\`).`,
    );
  }

  if (path.startsWith("agents.list.") && path.endsWith(".identity.avatar")) {
    hints.push(
      "Use a workspace-relative avatar path (or http(s)/data URI) and keep it inside the agent workspace.",
    );
  }

  if (
    hints.length === 0 &&
    (lowerMessage.includes("required") || lowerMessage.includes("expected"))
  ) {
    if (path === "<root>") {
      hints.push(
        `Rerun \`${formatCliCommand("resonix configure")}\` to refresh required config values, then validate again.`,
      );
    } else {
      hints.push(
        `Set a valid value for \`${path}\` using \`${formatCliCommand(`resonix config set ${path} \"...\"`)}\`, or rerun \`${formatCliCommand("resonix configure")}\`.`,
      );
    }
  }

  return hints;
}

function resolveValidationHints(issues: ConfigIssue[]): string[] {
  const unique = new Set<string>();
  for (const issue of issues) {
    for (const hint of suggestFixesForIssue(issue)) {
      unique.add(hint);
    }
  }
  return [...unique];
}

export async function runConfigGet(opts: { path: string; json?: boolean; runtime?: RuntimeEnv }) {
  const runtime = opts.runtime ?? defaultRuntime;
  try {
    const parsedPath = parseRequiredPath(opts.path);
    const snapshot = await loadValidConfig(runtime);
    const res = getAtPath(snapshot.config, parsedPath);
    if (!res.found) {
      runtime.error(danger(`Config path not found: ${opts.path}`));
      runtime.exit(1);
      return;
    }
    if (opts.json) {
      runtime.log(JSON.stringify(res.value ?? null, null, 2));
      return;
    }
    if (
      typeof res.value === "string" ||
      typeof res.value === "number" ||
      typeof res.value === "boolean"
    ) {
      runtime.log(String(res.value));
      return;
    }
    runtime.log(JSON.stringify(res.value ?? null, null, 2));
  } catch (err) {
    runtime.error(danger(String(err)));
    runtime.exit(1);
  }
}

export async function runConfigUnset(opts: { path: string; runtime?: RuntimeEnv }) {
  const runtime = opts.runtime ?? defaultRuntime;
  try {
    const parsedPath = parseRequiredPath(opts.path);
    const snapshot = await loadValidConfig(runtime);
    // Use snapshot.resolved (config after $include and ${ENV} resolution, but BEFORE runtime defaults)
    // instead of snapshot.config (runtime-merged with defaults).
    // This prevents runtime defaults from leaking into the written config file (issue #6070)
    const next = structuredClone(snapshot.resolved) as Record<string, unknown>;
    const removed = unsetAtPath(next, parsedPath);
    if (!removed) {
      runtime.error(danger(`Config path not found: ${opts.path}`));
      runtime.exit(1);
      return;
    }
    await writeConfigFile(next);
    runtime.log(info(`Removed ${opts.path}. Restart the gateway to apply.`));
  } catch (err) {
    runtime.error(danger(String(err)));
    runtime.exit(1);
  }
}

export async function runConfigValidate(opts?: { json?: boolean; runtime?: RuntimeEnv }) {
  const runtime = opts?.runtime ?? defaultRuntime;
  const snapshot = await readConfigFileSnapshot();

  if (opts?.json) {
    runtime.log(
      JSON.stringify(
        {
          valid: snapshot.valid,
          path: snapshot.path,
          issues: snapshot.issues,
        },
        null,
        2,
      ),
    );
    if (!snapshot.valid) {
      runtime.exit(1);
    }
    return;
  }

  if (snapshot.valid) {
    runtime.log(info(`Config valid: ${shortenHomePath(snapshot.path)}`));
    return;
  }

  runtime.error(danger(`Config invalid: ${shortenHomePath(snapshot.path)}`));
  for (const issue of snapshot.issues) {
    runtime.error(`- ${issue.path || "<root>"}: ${issue.message}`);
  }
  const hints = resolveValidationHints(snapshot.issues);
  if (hints.length > 0) {
    runtime.error(theme.muted("Suggested fixes:"));
    for (const hint of hints) {
      runtime.error(`- ${hint}`);
    }
  }
  runtime.error(`Run \`${formatCliCommand("resonix doctor")}\` to repair common problems.`);
  runtime.exit(1);
}

export function registerConfigCli(program: Command) {
  const cmd = program
    .command("config")
    .description(
      "Non-interactive config helpers (get/set/unset). Run without subcommand for the setup wizard.",
    )
    .addHelpText("before", () =>
      [
        "",
        "+----------------------------------------------------------------+",
        "|        RESONIX SYSTEM LAYER - CONFIGURATION                   |",
        "+----------------------------------------------------------------+",
        "|                                                                |",
        "|  Config modules are online and politely judging your YAML.     |",
        "|                                                                |",
        "|  o Model Providers - Anthropic, OpenAI, MiniMax, Qwen, etc.   |",
        "|  o Channel Settings - Telegram, Feishu integration             |",
        "|  o Plugin Management - bundled plugins auto-loaded             |",
        "|  o Security Policies - access control + sandbox rules          |",
        "|  o Memory Configuration - semantic + episodic memory           |",
        "|                                                                |",
        "|  Changes stay synchronized with the running system layer.      |",
        "|                                                                |",
        "|  Docs: https://docs.resonix.ai/cli/config                      |",
        "+----------------------------------------------------------------+",
        "",
      ].join("\n"),
    )
    .option(
      "--section <section>",
      "Configure wizard sections (repeatable). Use with no subcommand.",
      (value: string, previous: string[]) => [...previous, value],
      [] as string[],
    )
    .action(async (opts) => {
      const { configureCommandFromSectionsArg } = await import("../commands/configure.js");
      await configureCommandFromSectionsArg(opts.section, defaultRuntime);
    });

  cmd
    .command("get")
    .description("Get a config value by dot path")
    .argument("<path>", "Config path (dot or bracket notation)")
    .option("--json", "Output JSON", false)
    .action(async (path: string, opts) => {
      await runConfigGet({ path, json: Boolean(opts.json) });
    });

  cmd
    .command("set")
    .description("Set a config value by dot path")
    .argument("<path>", "Config path (dot or bracket notation)")
    .argument("<value>", "Value (JSON5 or raw string)")
    .option("--strict-json", "Strict JSON5 parsing (error instead of raw string fallback)", false)
    .option("--json", "Legacy alias for --strict-json", false)
    .action(async (path: string, value: string, opts) => {
      try {
        const parsedPath = parsePath(path);
        if (parsedPath.length === 0) {
          throw new Error("Path is empty.");
        }
        const parsedValue = parseValue(value, {
          strictJson: Boolean(opts.strictJson || opts.json),
        });
        const snapshot = await loadValidConfig();
        // Use snapshot.resolved (config after $include and ${ENV} resolution, but BEFORE runtime defaults)
        // instead of snapshot.config (runtime-merged with defaults).
        // This prevents runtime defaults from leaking into the written config file (issue #6070)
        const next = structuredClone(snapshot.resolved) as Record<string, unknown>;
        setAtPath(next, parsedPath, parsedValue);
        await writeConfigFile(next);
        defaultRuntime.log(info(`Updated ${path}. Restart the gateway to apply.`));
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });

  cmd
    .command("unset")
    .description("Remove a config value by dot path")
    .argument("<path>", "Config path (dot or bracket notation)")
    .action(async (path: string) => {
      await runConfigUnset({ path });
    });

  cmd
    .command("validate")
    .description("Validate config and report schema issues")
    .option("--json", "Output validation result as JSON", false)
    .action(async (opts) => {
      await runConfigValidate({ json: Boolean(opts.json) });
    });
}
