import { resolveCommitHash } from "../infra/git-commit.js";
import { visibleWidth } from "../terminal/ansi.js";
import { isRich, theme } from "../terminal/theme.js";
import { hasRootVersionAlias } from "./argv.js";
import { pickTagline, type TaglineOptions } from "./tagline.js";

type BannerOptions = TaglineOptions & {
  argv?: string[];
  commit?: string | null;
  columns?: number;
  richTty?: boolean;
};

let bannerEmitted = false;

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
  const commit = options.commit ?? resolveCommitHash({ env: options.env });
  const commitLabel = commit ?? "unknown";
  const tagline = pickTagline(options);
  const rich = options.richTty ?? isRich();
  const title = "👾 Resonix";
  const prefix = "👾 ";
  const columns = options.columns ?? process.stdout.columns ?? 120;
  const plainFullLine = `${title} ${version} (${commitLabel}) — ${tagline}`;
  const fitsOnOneLine = visibleWidth(plainFullLine) <= columns;
  if (rich) {
    if (fitsOnOneLine) {
      return `${theme.heading(title)} ${theme.info(version)} ${theme.muted(
        `(${commitLabel})`,
      )} ${theme.muted("—")} ${theme.accentDim(tagline)}`;
    }
    const line1 = `${theme.heading(title)} ${theme.info(version)} ${theme.muted(
      `(${commitLabel})`,
    )}`;
    const line2 = `${" ".repeat(prefix.length)}${theme.accentDim(tagline)}`;
    return `${line1}\n${line2}`;
  }
  if (fitsOnOneLine) {
    return plainFullLine;
  }
  const line1 = `${title} ${version} (${commitLabel})`;
  const line2 = `${" ".repeat(prefix.length)}${tagline}`;
  return `${line1}\n${line2}`;
}

const RESONIX_ASCII = [
  "██████╗ ███████╗███████╗ ██████╗ ███╗ ██╗██╗██╗ ██╗ ██╔══██╗██╔════╝██╔════╝██╔═══██╗████╗ ██║██║╚██╗██╔╝",
  "██████╗ ███████╗███████╗█████╗  ████╗ ██║██║╚██╗██║██║ ██╔██╗███████╗███████║╚██████╔╝██║ ╚████║██║██╔╝ ██╗",
  "██╔══██╗██╔════╝██╔════╝██╔══██╗██╔██╗ ██║██║ ╚████║██║ ██╔╝ ██║╚════██║╚════██║ ╚═══██║██║ ╚███╔╝██║",
  "██║  ██║█████╗  █████╗  ██████╔╝██║╚██╗██║██║  ╚██╔╝██║     ███████╗███████║ ██║   ██║██║ ██╔██╗ ██║",
  "██║  ██║██╔══╝  ██╔══╝  ██╔══██╗██║ ╚████║██║   ██║  ██║     ██╔══██║██╔══██║ ██║   ██║██║██╔╝ ██╗",
  "██████╔╝███████╗███████╗██║  ██║██║  ╚═══╝╚═╝   ╚═╝  ╚═╝     ██║  ██║██║  ██║ ██║   ██║██║╚═╝  ╚═╝",
  "╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝                       ╚═╝  ╚═╝╚══════╝ ╚═╝   ╚═╝╚═╝       ",
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
    return splitGraphemes(line).map((ch, i) => colorChar(ch, i + lineIndex)).join("") + "\x1b[0m";
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
