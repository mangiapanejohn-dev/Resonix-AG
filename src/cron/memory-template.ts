import {
  loadPermanentMemoryProfile,
  rankPermanentMemoryEntries,
  resolvePermanentMemoryPaths,
  type PermanentMemoryEntry,
  type PermanentMemoryKind,
} from "../memory/permanent-profile.js";

export type CronMemoryTemplateScope =
  | "permanent"
  | "top"
  | "preferences"
  | "facts"
  | "projects"
  | "tasks"
  | "people";

export type CronMemoryTemplateResult = {
  text: string;
  replaced: number;
  profileExists: boolean;
  entryCount: number;
};

const TOKEN_RE = /{{\s*memory(?:\.([a-z]+))?\s*}}/gi;
const DEFAULT_MAX_ENTRIES = 6;
const DEFAULT_MAX_TOTAL_CHARS = 1800;

const KIND_BY_SCOPE: Record<
  Exclude<CronMemoryTemplateScope, "permanent" | "top">,
  PermanentMemoryKind
> = {
  preferences: "preference",
  facts: "fact",
  projects: "project",
  tasks: "task",
  people: "person",
};

function parseScope(raw: string | undefined): CronMemoryTemplateScope {
  const normalized = (raw ?? "permanent").trim().toLowerCase();
  if (
    normalized === "top" ||
    normalized === "preferences" ||
    normalized === "facts" ||
    normalized === "projects" ||
    normalized === "tasks" ||
    normalized === "people"
  ) {
    return normalized;
  }
  return "permanent";
}

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  if (max <= 3) {
    return value.slice(0, max);
  }
  return `${value.slice(0, max - 3)}...`;
}

function formatEntryLine(entry: PermanentMemoryEntry): string {
  return `- ${truncate(entry.text, 160)} (${Math.round(entry.confidence * 100)}%, x${entry.mentions})`;
}

function selectScopeEntries(
  scope: CronMemoryTemplateScope,
  entries: PermanentMemoryEntry[],
): PermanentMemoryEntry[] {
  if (scope === "permanent" || scope === "top") {
    return rankPermanentMemoryEntries(entries);
  }
  const kind = KIND_BY_SCOPE[scope];
  return rankPermanentMemoryEntries(entries.filter((entry) => entry.kind === kind));
}

function renderScope(params: {
  scope: CronMemoryTemplateScope;
  entries: PermanentMemoryEntry[];
  maxEntries: number;
}): string {
  const selected = selectScopeEntries(params.scope, params.entries).slice(0, params.maxEntries);
  if (selected.length === 0) {
    return "No permanent memory captured yet.";
  }
  if (params.scope === "permanent") {
    return selected.map((entry) => formatEntryLine(entry)).join("\n");
  }
  return selected.map((entry) => formatEntryLine(entry)).join("\n");
}

function clampPositiveInt(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.floor(value)));
}

export async function renderCronMemoryTemplate(params: {
  text: string;
  workspaceDir: string;
  maxEntriesPerToken?: number;
  maxTotalChars?: number;
}): Promise<CronMemoryTemplateResult> {
  if (!TOKEN_RE.test(params.text)) {
    return {
      text: params.text,
      replaced: 0,
      profileExists: false,
      entryCount: 0,
    };
  }
  TOKEN_RE.lastIndex = 0;

  const maxEntries = clampPositiveInt(params.maxEntriesPerToken, DEFAULT_MAX_ENTRIES, 1, 20);
  const maxTotalChars = clampPositiveInt(params.maxTotalChars, DEFAULT_MAX_TOTAL_CHARS, 200, 4000);
  const profilePath = resolvePermanentMemoryPaths(params.workspaceDir).jsonPath;
  const profile = await loadPermanentMemoryProfile(profilePath);
  const entries = profile?.entries ?? [];
  const replacements = new Map<CronMemoryTemplateScope, string>();

  const rendered = params.text.replace(TOKEN_RE, (_full, scopeRaw: string | undefined) => {
    const scope = parseScope(scopeRaw);
    if (!replacements.has(scope)) {
      replacements.set(
        scope,
        renderScope({
          scope,
          entries,
          maxEntries,
        }),
      );
    }
    return replacements.get(scope) ?? "No permanent memory captured yet.";
  });

  const bounded = rendered.length > maxTotalChars ? truncate(rendered, maxTotalChars) : rendered;
  return {
    text: bounded,
    replaced: replacements.size,
    profileExists: profile !== null,
    entryCount: entries.length,
  };
}
