import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export type PermanentMemoryKind = "preference" | "fact" | "task" | "project" | "person";

export type PermanentMemoryEntry = {
  id: string;
  kind: PermanentMemoryKind;
  text: string;
  normalizedText: string;
  firstSeenAtMs: number;
  lastSeenAtMs: number;
  mentions: number;
  confidence: number;
  sources: string[];
};

export type PermanentMemoryProfile = {
  version: 1;
  updatedAtMs: number;
  entries: PermanentMemoryEntry[];
};

export type PermanentMemoryCandidate = {
  kind: PermanentMemoryKind;
  text: string;
  normalizedText: string;
  confidence: number;
};

export type PermanentMemoryPaths = {
  jsonPath: string;
  markdownPath: string;
};

export type PermanentMemoryUpdateResult = {
  updated: boolean;
  extracted: number;
  added: number;
  touched: number;
  profile: PermanentMemoryProfile;
  paths: PermanentMemoryPaths;
};

const PROFILE_VERSION = 1 as const;
const DEFAULT_MAX_ENTRIES_PER_KIND = 120;

const KIND_ORDER: PermanentMemoryKind[] = ["preference", "fact", "project", "task", "person"];

const KIND_LABELS: Record<PermanentMemoryKind, string> = {
  preference: "Preferences",
  fact: "Facts",
  project: "Projects",
  task: "Tasks",
  person: "People",
};

const KIND_BASE_CONFIDENCE: Record<PermanentMemoryKind, number> = {
  preference: 0.78,
  fact: 0.64,
  project: 0.68,
  task: 0.72,
  person: 0.66,
};

const SCORE_CONFIDENCE_HALF_LIFE_DAYS = 120;
const SCORE_MIN_CONFIDENCE_FACTOR = 0.35;

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeEntryId(kind: PermanentMemoryKind, normalizedText: string): string {
  return crypto.createHash("sha256").update(`${kind}:${normalizedText}`).digest("hex").slice(0, 20);
}

function mergeDuplicateEntries(entries: PermanentMemoryEntry[]): PermanentMemoryEntry[] {
  const byKey = new Map<string, PermanentMemoryEntry>();

  for (const entry of entries) {
    const normalized = normalizeText(entry.normalizedText || entry.text);
    if (!normalized) {
      continue;
    }
    const key = `${entry.kind}:${normalized}`;
    const existing = byKey.get(key);
    const sourceSet = new Set(
      entry.sources
        .map((source) => source.trim())
        .filter(Boolean),
    );
    if (!existing) {
      byKey.set(key, {
        ...entry,
        id: makeEntryId(entry.kind, normalized),
        normalizedText: normalized,
        text: entry.text.trim(),
        sources: Array.from(sourceSet).slice(-8),
      });
      continue;
    }

    existing.firstSeenAtMs = Math.min(existing.firstSeenAtMs, entry.firstSeenAtMs);
    existing.lastSeenAtMs = Math.max(existing.lastSeenAtMs, entry.lastSeenAtMs);
    existing.mentions = Math.max(1, existing.mentions + Math.max(1, entry.mentions));
    existing.confidence = Math.max(existing.confidence, entry.confidence);
    if (entry.text.trim().length > existing.text.trim().length) {
      existing.text = entry.text.trim();
    }
    for (const source of entry.sources) {
      const trimmed = source.trim();
      if (trimmed) {
        sourceSet.add(trimmed);
      }
    }
    for (const source of existing.sources) {
      const trimmed = source.trim();
      if (trimmed) {
        sourceSet.add(trimmed);
      }
    }
    existing.sources = Array.from(sourceSet).slice(-8);
  }

  return Array.from(byKey.values()).sort((a, b) => b.lastSeenAtMs - a.lastSeenAtMs);
}

function classifyCandidate(text: string): PermanentMemoryKind | null {
  const lower = text.toLowerCase();
  if (
    /\b(i|we)\s+(really\s+)?(like|love|prefer|enjoy|hate|dislike)\b/.test(lower) ||
    /\b(my|our)\s+(favorite|favourite)\b/.test(lower)
  ) {
    return "preference";
  }
  if (
    /\b(remind me|todo|to do|i need to|we need to|i should|we should|must)\b/.test(lower) ||
    /\bdeadline\b/.test(lower)
  ) {
    return "task";
  }
  if (
    /\b(project|release|milestone|sprint|roadmap|deploy|deployment|repo|repository)\b/.test(lower)
  ) {
    return "project";
  }
  if (
    /\b(my name is|i am|i'm|i work|we work|i live|we live|i use|we use|my team|our team)\b/.test(
      lower,
    )
  ) {
    return "fact";
  }
  if (/\b(with|met|talked to|speaking with)\s+[A-Z][a-z]{1,}\b/.test(text)) {
    return "person";
  }
  return null;
}

function splitCandidateSentences(text: string): string[] {
  return text
    .split(/[\n.!?]+/g)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length >= 12 && entry.length <= 240);
}

export function extractPermanentMemoryCandidates(
  sessionContent: string,
  opts?: { maxItems?: number },
): PermanentMemoryCandidate[] {
  const maxItems = Math.max(1, Math.min(200, Math.floor(opts?.maxItems ?? 40)));
  const candidates: PermanentMemoryCandidate[] = [];
  const seen = new Set<string>();

  const lines = sessionContent
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const roleMatch = line.match(/^(user|assistant)\s*:\s*(.+)$/i);
    if (!roleMatch) {
      continue;
    }
    const role = (roleMatch[1] ?? "").toLowerCase();
    if (role !== "user") {
      continue;
    }
    const rawText = roleMatch[2]?.trim() ?? "";
    if (!rawText || rawText.startsWith("/")) {
      continue;
    }
    for (const sentence of splitCandidateSentences(rawText)) {
      if (sentence.includes("?")) {
        continue;
      }
      const kind = classifyCandidate(sentence);
      if (!kind) {
        continue;
      }
      const normalizedText = normalizeText(sentence);
      if (!normalizedText || normalizedText.length < 8) {
        continue;
      }
      const key = `${kind}:${normalizedText}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      candidates.push({
        kind,
        text: sentence,
        normalizedText,
        confidence: KIND_BASE_CONFIDENCE[kind],
      });
      if (candidates.length >= maxItems) {
        return candidates;
      }
    }
  }
  return candidates;
}

export function resolvePermanentMemoryPaths(workspaceDir: string): PermanentMemoryPaths {
  const resolvedWorkspace = path.resolve(workspaceDir);
  return {
    jsonPath: path.join(resolvedWorkspace, ".resonix", "permanent-memory.json"),
    markdownPath: path.join(resolvedWorkspace, "memory", "permanent-memory.md"),
  };
}

async function readJsonIfExists(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

export async function loadPermanentMemoryProfile(
  jsonPath: string,
): Promise<PermanentMemoryProfile | null> {
  const parsed = await readJsonIfExists(path.resolve(jsonPath));
  if (!parsed) {
    return null;
  }
  const entriesRaw = Array.isArray(parsed.entries) ? parsed.entries : [];
  const entries: PermanentMemoryEntry[] = [];
  for (const item of entriesRaw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const row = item as Record<string, unknown>;
    const kind = row.kind;
    if (
      kind !== "preference" &&
      kind !== "fact" &&
      kind !== "task" &&
      kind !== "project" &&
      kind !== "person"
    ) {
      continue;
    }
    const text = typeof row.text === "string" ? row.text.trim() : "";
    const normalizedText =
      typeof row.normalizedText === "string" ? row.normalizedText.trim() : normalizeText(text);
    if (!text || !normalizedText) {
      continue;
    }
    const id =
      typeof row.id === "string" && row.id.trim()
        ? row.id.trim()
        : makeEntryId(kind, normalizedText);
    entries.push({
      id,
      kind,
      text,
      normalizedText,
      firstSeenAtMs:
        typeof row.firstSeenAtMs === "number" && Number.isFinite(row.firstSeenAtMs)
          ? Math.max(0, Math.floor(row.firstSeenAtMs))
          : Date.now(),
      lastSeenAtMs:
        typeof row.lastSeenAtMs === "number" && Number.isFinite(row.lastSeenAtMs)
          ? Math.max(0, Math.floor(row.lastSeenAtMs))
          : Date.now(),
      mentions:
        typeof row.mentions === "number" && Number.isFinite(row.mentions)
          ? Math.max(1, Math.floor(row.mentions))
          : 1,
      confidence:
        typeof row.confidence === "number" && Number.isFinite(row.confidence)
          ? Math.max(0, Math.min(0.99, row.confidence))
          : KIND_BASE_CONFIDENCE[kind],
      sources: Array.isArray(row.sources)
        ? row.sources.filter((value): value is string => typeof value === "string").slice(0, 8)
        : [],
    });
  }
  const mergedEntries = mergeDuplicateEntries(entries);
  return {
    version: PROFILE_VERSION,
    updatedAtMs:
      typeof parsed.updatedAtMs === "number" && Number.isFinite(parsed.updatedAtMs)
        ? Math.max(0, Math.floor(parsed.updatedAtMs))
        : Date.now(),
    entries: mergedEntries,
  };
}

function resolveDecayedConfidence(entry: PermanentMemoryEntry, nowMs: number): number {
  const ageDays = Math.max(0, nowMs - entry.lastSeenAtMs) / (24 * 60 * 60 * 1000);
  const decay = Math.pow(0.5, ageDays / SCORE_CONFIDENCE_HALF_LIFE_DAYS);
  const floor = KIND_BASE_CONFIDENCE[entry.kind] * SCORE_MIN_CONFIDENCE_FACTOR;
  return Math.max(floor, Math.min(0.99, entry.confidence * decay));
}

function scoreEntry(entry: PermanentMemoryEntry, nowMs: number): number {
  const ageDays = Math.max(0, nowMs - entry.lastSeenAtMs) / (24 * 60 * 60 * 1000);
  const recency = Math.max(0, 1 - Math.min(90, ageDays) / 90);
  const confidence = resolveDecayedConfidence(entry, nowMs);
  return entry.mentions * 0.45 + confidence * 2.5 + recency;
}

export function rankPermanentMemoryEntries(
  entries: PermanentMemoryEntry[],
  opts?: { nowMs?: number },
): PermanentMemoryEntry[] {
  const nowMs =
    typeof opts?.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  return [...entries].sort((a, b) => {
    const scoreDiff = scoreEntry(b, nowMs) - scoreEntry(a, nowMs);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    if (b.lastSeenAtMs !== a.lastSeenAtMs) {
      return b.lastSeenAtMs - a.lastSeenAtMs;
    }
    return b.mentions - a.mentions;
  });
}

function pruneEntriesByKind(
  entries: PermanentMemoryEntry[],
  nowMs: number,
  maxEntriesPerKind: number,
): PermanentMemoryEntry[] {
  const grouped = new Map<PermanentMemoryKind, PermanentMemoryEntry[]>();
  for (const kind of KIND_ORDER) {
    grouped.set(kind, []);
  }
  for (const entry of entries) {
    const list = grouped.get(entry.kind) ?? [];
    list.push(entry);
    grouped.set(entry.kind, list);
  }
  const pruned: PermanentMemoryEntry[] = [];
  for (const kind of KIND_ORDER) {
    const list = grouped.get(kind) ?? [];
    rankPermanentMemoryEntries(list, { nowMs })
      .slice(0, maxEntriesPerKind)
      .forEach((entry) => pruned.push(entry));
  }
  return pruned.sort((a, b) => b.lastSeenAtMs - a.lastSeenAtMs);
}

function applyCandidates(params: {
  profile: PermanentMemoryProfile;
  candidates: PermanentMemoryCandidate[];
  nowMs: number;
  sourceLabel?: string;
  maxEntriesPerKind: number;
}): { profile: PermanentMemoryProfile; added: number; touched: number } {
  const byKey = new Map<string, PermanentMemoryEntry>();
  for (const entry of params.profile.entries) {
    const normalized = normalizeText(entry.normalizedText || entry.text);
    if (!normalized) {
      continue;
    }
    const key = `${entry.kind}:${normalized}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        ...entry,
        id: makeEntryId(entry.kind, normalized),
        normalizedText: normalized,
      });
      continue;
    }
    existing.firstSeenAtMs = Math.min(existing.firstSeenAtMs, entry.firstSeenAtMs);
    existing.lastSeenAtMs = Math.max(existing.lastSeenAtMs, entry.lastSeenAtMs);
    existing.mentions = Math.max(1, existing.mentions + Math.max(1, entry.mentions));
    existing.confidence = Math.max(existing.confidence, entry.confidence);
    if (entry.text.trim().length > existing.text.trim().length) {
      existing.text = entry.text.trim();
    }
    const mergedSources = new Set([...existing.sources, ...entry.sources].map((value) => value.trim()));
    existing.sources = Array.from(mergedSources)
      .filter(Boolean)
      .slice(-8);
  }
  let added = 0;
  let touched = 0;
  for (const candidate of params.candidates) {
    const normalized = normalizeText(candidate.normalizedText || candidate.text);
    if (!normalized) {
      continue;
    }
    const key = `${candidate.kind}:${normalized}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.lastSeenAtMs = params.nowMs;
      existing.mentions += 1;
      existing.confidence = Math.min(
        0.99,
        Math.max(existing.confidence, candidate.confidence) + candidate.confidence * 0.06,
      );
      if (params.sourceLabel) {
        const source = params.sourceLabel.trim();
        if (source && !existing.sources.includes(source)) {
          existing.sources.push(source);
          if (existing.sources.length > 8) {
            existing.sources = existing.sources.slice(existing.sources.length - 8);
          }
        }
      }
      touched += 1;
      continue;
    }
    byKey.set(key, {
      id: makeEntryId(candidate.kind, normalized),
      kind: candidate.kind,
      text: candidate.text,
      normalizedText: normalized,
      firstSeenAtMs: params.nowMs,
      lastSeenAtMs: params.nowMs,
      mentions: 1,
      confidence: candidate.confidence,
      sources: params.sourceLabel?.trim() ? [params.sourceLabel.trim()] : [],
    });
    added += 1;
    touched += 1;
  }
  const entries = pruneEntriesByKind(
    Array.from(byKey.values()),
    params.nowMs,
    params.maxEntriesPerKind,
  );
  return {
    profile: {
      version: PROFILE_VERSION,
      updatedAtMs: params.nowMs,
      entries,
    },
    added,
    touched,
  };
}

export async function savePermanentMemoryProfile(
  jsonPath: string,
  profile: PermanentMemoryProfile,
): Promise<void> {
  const resolved = path.resolve(jsonPath);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, `${JSON.stringify(profile, null, 2)}\n`, "utf-8");
}

function formatDate(dateMs: number): string {
  const iso = new Date(dateMs).toISOString();
  return iso.slice(0, 10);
}

export function formatPermanentMemoryMarkdown(profile: PermanentMemoryProfile): string {
  const sections: string[] = [];
  sections.push("# Permanent Memory");
  sections.push("");
  sections.push(`Last updated: ${new Date(profile.updatedAtMs).toISOString()}`);
  sections.push("");
  if (profile.entries.length === 0) {
    sections.push("_No long-term memories captured yet._");
    sections.push("");
    return sections.join("\n");
  }
  for (const kind of KIND_ORDER) {
    const entries = profile.entries
      .filter((entry) => entry.kind === kind)
      .sort((a, b) => b.lastSeenAtMs - a.lastSeenAtMs);
    if (entries.length === 0) {
      continue;
    }
    sections.push(`## ${KIND_LABELS[kind]}`);
    sections.push("");
    for (const entry of entries) {
      const badge = `${Math.round(entry.confidence * 100)}% · x${entry.mentions} · ${formatDate(entry.lastSeenAtMs)}`;
      sections.push(`- [${badge}] ${entry.text}`);
    }
    sections.push("");
  }
  return sections.join("\n");
}

export function summarizePermanentMemoryProfile(profile: PermanentMemoryProfile): {
  total: number;
  byKind: Record<PermanentMemoryKind, number>;
  top: PermanentMemoryEntry[];
} {
  const byKind: Record<PermanentMemoryKind, number> = {
    preference: 0,
    fact: 0,
    task: 0,
    project: 0,
    person: 0,
  };
  for (const entry of profile.entries) {
    byKind[entry.kind] += 1;
  }
  const top = rankPermanentMemoryEntries(profile.entries).slice(0, 10);
  return {
    total: profile.entries.length,
    byKind,
    top,
  };
}

export async function updatePermanentMemoryProfile(params: {
  workspaceDir: string;
  sessionContent: string;
  sourceLabel?: string;
  nowMs?: number;
  maxEntriesPerKind?: number;
}): Promise<PermanentMemoryUpdateResult> {
  const nowMs =
    typeof params.nowMs === "number" && Number.isFinite(params.nowMs) ? params.nowMs : Date.now();
  const maxEntriesPerKind =
    typeof params.maxEntriesPerKind === "number" && Number.isFinite(params.maxEntriesPerKind)
      ? Math.max(10, Math.min(500, Math.floor(params.maxEntriesPerKind)))
      : DEFAULT_MAX_ENTRIES_PER_KIND;
  const paths = resolvePermanentMemoryPaths(params.workspaceDir);
  const existing = (await loadPermanentMemoryProfile(paths.jsonPath)) ?? {
    version: PROFILE_VERSION,
    updatedAtMs: nowMs,
    entries: [],
  };
  const candidates = extractPermanentMemoryCandidates(params.sessionContent);
  if (candidates.length === 0) {
    return {
      updated: false,
      extracted: 0,
      added: 0,
      touched: 0,
      profile: existing,
      paths,
    };
  }
  const { profile, added, touched } = applyCandidates({
    profile: existing,
    candidates,
    nowMs,
    sourceLabel: params.sourceLabel,
    maxEntriesPerKind,
  });
  await savePermanentMemoryProfile(paths.jsonPath, profile);
  await fs.mkdir(path.dirname(paths.markdownPath), { recursive: true });
  await fs.writeFile(paths.markdownPath, `${formatPermanentMemoryMarkdown(profile)}\n`, "utf-8");
  return {
    updated: touched > 0,
    extracted: candidates.length,
    added,
    touched,
    profile,
    paths,
  };
}
