import fs from "node:fs";
import os from "node:os";
import JSON5 from "json5";
import { resolveConfigPath, resolveStateDir } from "../config/paths.js";
import { resolveCommitHash } from "../infra/git-commit.js";
import { visibleWidth } from "../terminal/ansi.js";
import { isRich, theme } from "../terminal/theme.js";
import { hasRootVersionAlias } from "./argv.js";
import { pickTagline, type TaglineMode, type TaglineOptions } from "./tagline.js";

type BannerOptions = TaglineOptions & {
  argv?: string[];
  commit?: string | null;
  columns?: number;
  richTty?: boolean;
};

let bannerEmitted = false;
let cachedConfigTaglineMode: TaglineMode | null | undefined;

function parseTaglineMode(value: unknown): TaglineMode | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "quiet" || normalized === "hint" || normalized === "playful") {
    return normalized;
  }
  return undefined;
}

function readConfigTaglineMode(env: NodeJS.ProcessEnv): TaglineMode | undefined {
  if (cachedConfigTaglineMode !== undefined) {
    return cachedConfigTaglineMode ?? undefined;
  }
  try {
    const stateDir = resolveStateDir(env, os.homedir);
    const configPath = resolveConfigPath(env, stateDir, os.homedir);
    if (!fs.existsSync(configPath)) {
      cachedConfigTaglineMode = null;
      return undefined;
    }
    const parsed = JSON5.parse(fs.readFileSync(configPath, "utf-8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      cachedConfigTaglineMode = null;
      return undefined;
    }
    const cliRaw = (parsed as Record<string, unknown>).cli;
    if (!cliRaw || typeof cliRaw !== "object" || Array.isArray(cliRaw)) {
      cachedConfigTaglineMode = null;
      return undefined;
    }
    const bannerRaw = (cliRaw as Record<string, unknown>).banner;
    if (!bannerRaw || typeof bannerRaw !== "object" || Array.isArray(bannerRaw)) {
      cachedConfigTaglineMode = null;
      return undefined;
    }
    const mode = parseTaglineMode((bannerRaw as Record<string, unknown>).taglineMode);
    cachedConfigTaglineMode = mode ?? null;
    return mode;
  } catch {
    cachedConfigTaglineMode = null;
    return undefined;
  }
}

const graphemeSegmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function splitGraphemes(value: string): string[] {
  if (!graphemeSegmenter) {
    return Array.from(value);
  }
  try {
    return Array.from(graphemeSegmenter.segment(value), (seg) => seg.segment);
  } catch {
    return Array.from(value);
  }
}

const hasJsonFlag = (argv: string[]) =>
  argv.some((arg) => arg === "--json" || arg.startsWith("--json="));

const hasVersionFlag = (argv: string[]) =>
  argv.some((arg) => arg === "--version" || arg === "-V") || hasRootVersionAlias(argv);

export function formatCliBannerLine(version: string, options: BannerOptions = {}): string {
  const env = options.env ?? process.env;
  const mode = options.mode ?? readConfigTaglineMode(env);
  const commit = options.commit ?? resolveCommitHash({ env: options.env });
  const commitLabel = commit ?? "unknown";
  const tagline = pickTagline({ ...options, mode });
  const hasTagline = tagline.trim().length > 0;
  const rich = options.richTty ?? isRich();
  const title = "👾 Resonix";
  const prefix = "👾 ";
  const columns = options.columns ?? process.stdout.columns ?? 120;
  const plainBaseLine = `${title} ${version} (${commitLabel})`;
  const plainFullLine = hasTagline ? `${plainBaseLine} — ${tagline}` : plainBaseLine;
  const fitsOnOneLine = visibleWidth(plainFullLine) <= columns;
  if (rich) {
    if (fitsOnOneLine) {
      if (!hasTagline) {
        return `${theme.heading(title)} ${theme.info(version)} ${theme.muted(`(${commitLabel})`)}`;
      }
      return `${theme.heading(title)} ${theme.info(version)} ${theme.muted(
        `(${commitLabel})`,
      )} ${theme.muted("—")} ${theme.accentDim(tagline)}`;
    }
    const line1 = `${theme.heading(title)} ${theme.info(version)} ${theme.muted(
      `(${commitLabel})`,
    )}`;
    if (!hasTagline) {
      return line1;
    }
    const line2 = `${" ".repeat(prefix.length)}${theme.accentDim(tagline)}`;
    return `${line1}\n${line2}`;
  }
  if (fitsOnOneLine || !hasTagline) {
    return plainFullLine;
  }
  const line1 = plainBaseLine;
  const line2 = `${" ".repeat(prefix.length)}${tagline}`;
  return `${line1}\n${line2}`;
}

const RESONIX_ASCII = [
  "██████╗ ███████╗███████╗ ██████╗ ███╗   ██╗██╗██╗  ██╗",
  "██╔══██╗██╔════╝██╔════╝██╔═══██╗████╗  ██║██║╚██╗██╔╝",
  "██████╔╝█████╗  ███████╗██║   ██║██╔██╗ ██║██║ ╚███╔╝ ",
  "██╔══██╗██╔══╝  ╚════██║██║   ██║██║╚██╗██║██║ ██╔██╗ ",
  "██║  ██║███████╗███████║╚██████╔╝██║ ╚████║██║██╔╝╚██╗",
  "╚═╝  ╚═╝╚══════╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝╚═╝  ╚═╝",
];

export function formatCliBannerArt(options: BannerOptions = {}): string {
  const rich = options.richTty ?? isRich();
  if (!rich) {
    return RESONIX_ASCII.join("\n");
  }

  const colorChar = (ch: string, index: number) => {
    if (ch === "█") {
      // Blue-purple gradient based on position
      return index % 2 === 0 ? "\x1b[38;2;139;92;246m" + ch : "\x1b[38;2;167;139;250m" + ch; // Purple to light purple
    }
    if (ch === "░") {
      return theme.accentDim(ch);
    }
    if (ch === "▀") {
      return theme.accent(ch);
    }
    return theme.muted(ch);
  };

  const colored = RESONIX_ASCII.map((line, lineIndex) => {
    if (line.includes("RESONIX")) {
      return (
        theme.muted("              ") +
        theme.accent("👾") +
        theme.info(" RESONIX ") +
        theme.accent("👾")
      );
    }
    return (
      splitGraphemes(line)
        .map((ch, i) => colorChar(ch, i + lineIndex))
        .join("") + "\x1b[0m"
    );
  });

  return colored.join("\n");
}

export function emitCliBanner(version: string, options: BannerOptions = {}) {
  if (bannerEmitted) {
    return;
  }
  const argv = options.argv ?? process.argv;
  if (!process.stdout.isTTY) {
    return;
  }
  if (hasJsonFlag(argv)) {
    return;
  }
  if (hasVersionFlag(argv)) {
    return;
  }
  const line = formatCliBannerLine(version, options);
  process.stdout.write(`\n${line}\n\n`);
  bannerEmitted = true;
}

export function hasEmittedCliBanner(): boolean {
  return bannerEmitted;
}
