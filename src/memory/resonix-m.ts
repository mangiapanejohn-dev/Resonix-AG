import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  RESONIX_ABOUT,
  RESONIX_BROWSER_POLICY,
  RESONIX_DEVELOPER,
  RESONIX_NAME,
} from "../identity/resonix-profile.js";
import { createAsyncLock } from "../infra/json-files.js";
import {
  loadPermanentMemoryProfile,
  resolvePermanentMemoryPaths,
  summarizePermanentMemoryProfile,
  updatePermanentMemoryProfile,
  type PermanentMemoryEntry,
  type PermanentMemoryKind,
  type PermanentMemoryProfile,
} from "./permanent-profile.js";

const RESONIX_MEMORY_DIRNAME = "resonix-M";
const MAX_RETROS_CHARS = 400;
const withResonixMLock = createAsyncLock();
const KNOWLEDGE_FILES: ReadonlyArray<{ filename: string; title: string }> = [
  { filename: "preferences.md", title: "Preferences" },
  { filename: "facts.md", title: "Facts" },
  { filename: "projects.md", title: "Projects" },
  { filename: "tasks.md", title: "Tasks" },
  { filename: "people.md", title: "People" },
];

type ResonixMPaths = {
  desktopDir: string;
  rootDir: string;
  identityDir: string;
  knowledgeDir: string;
  autonomyDir: string;
  promptsDir: string;
  retrosDir: string;
  logsDir: string;
  readmePath: string;
  identityPath: string;
  selfGuidePath: string;
  eventsLogPath: string;
  syncLogPath: string;
  autonomyPlanPath: string;
  lessonsPath: string;
};

function trimForLog(value: string, maxChars: number): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  if (maxChars <= 3) {
    return trimmed.slice(0, maxChars);
  }
  return `${trimmed.slice(0, maxChars - 3)}...`;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveDesktopDir(override?: string): Promise<string> {
  const preferred = override?.trim() ? path.resolve(override) : path.join(os.homedir(), "Desktop");
  if (await pathExists(preferred)) {
    return preferred;
  }
  return os.homedir();
}

async function resolveResonixMPaths(desktopOverride?: string): Promise<ResonixMPaths> {
  const desktopDir = await resolveDesktopDir(desktopOverride);
  const rootDir = path.join(desktopDir, RESONIX_MEMORY_DIRNAME);
  const identityDir = path.join(rootDir, "identity");
  const knowledgeDir = path.join(rootDir, "knowledge");
  const autonomyDir = path.join(rootDir, "autonomy");
  const promptsDir = path.join(rootDir, "prompts");
  const retrosDir = path.join(rootDir, "retrospectives");
  const logsDir = path.join(rootDir, "logs");
  return {
    desktopDir,
    rootDir,
    identityDir,
    knowledgeDir,
    autonomyDir,
    promptsDir,
    retrosDir,
    logsDir,
    readmePath: path.join(rootDir, "README.md"),
    identityPath: path.join(identityDir, "ABOUT.md"),
    selfGuidePath: path.join(promptsDir, "SELF-GUIDE.md"),
    eventsLogPath: path.join(logsDir, "events.jsonl"),
    syncLogPath: path.join(logsDir, "sync.log"),
    autonomyPlanPath: path.join(autonomyDir, "AUTONOMY_PLAN.md"),
    lessonsPath: path.join(retrosDir, "TASK_LESSONS.md"),
  };
}

function nowIso(nowMs?: number): string {
  if (typeof nowMs === "number" && Number.isFinite(nowMs)) {
    return new Date(nowMs).toISOString();
  }
  return new Date().toISOString();
}

async function writeFileIfMissing(filePath: string, content: string): Promise<void> {
  if (await pathExists(filePath)) {
    return;
  }
  await fs.writeFile(filePath, content, "utf-8");
}

async function ensureScaffold(paths: ResonixMPaths): Promise<void> {
  await fs.mkdir(paths.rootDir, { recursive: true });
  await fs.mkdir(paths.identityDir, { recursive: true });
  await fs.mkdir(paths.knowledgeDir, { recursive: true });
  await fs.mkdir(paths.autonomyDir, { recursive: true });
  await fs.mkdir(paths.promptsDir, { recursive: true });
  await fs.mkdir(paths.retrosDir, { recursive: true });
  await fs.mkdir(paths.logsDir, { recursive: true });

  await writeFileIfMissing(
    paths.readmePath,
    [
      "# resonix-M",
      "",
      "Desktop memory workspace for Resonix.",
      "",
      "- `identity/`: Resonix identity and About statement",
      "- `knowledge/`: categorized permanent memory mirrors",
      "- `autonomy/`: current autonomy plan and next actions",
      "- `retrospectives/`: task outcome lessons",
      "- `logs/`: sync and event logs",
      "",
      `Developer: ${RESONIX_DEVELOPER}`,
    ].join("\n"),
  );

  await writeFileIfMissing(
    paths.identityPath,
    [
      `# ${RESONIX_NAME} Identity`,
      "",
      `Created and developed by ${RESONIX_DEVELOPER}.`,
      "",
      `About: ${RESONIX_ABOUT}`,
      "",
      `Browser Policy: ${RESONIX_BROWSER_POLICY}`,
      "",
    ].join("\n"),
  );

  await writeFileIfMissing(
    paths.selfGuidePath,
    [
      "# Resonix Self Guide",
      "",
      `- Always keep identity consistent: ${RESONIX_NAME} by ${RESONIX_DEVELOPER}.`,
      "- Keep responses helpful, clear, and task-focused.",
      `- ${RESONIX_BROWSER_POLICY}`,
      "- Keep memory in sync after meaningful user input and completed tasks.",
      "- Keep retrospectives to avoid repeating the same mistakes.",
      "",
    ].join("\n"),
  );

  await writeFileIfMissing(
    paths.autonomyPlanPath,
    [
      "# Autonomy Plan",
      "",
      `Last updated: ${new Date().toISOString()}`,
      "",
      "## Identity Anchor",
      `- Agent: ${RESONIX_NAME}`,
      `- Developer: ${RESONIX_DEVELOPER}`,
      `- About: ${RESONIX_ABOUT}`,
      `- Browser: ${RESONIX_BROWSER_POLICY}`,
      "",
      "## Loop",
      "1. Observe user intent and constraints.",
      "2. Plan smallest safe step that moves work forward.",
      "3. Execute and verify outcomes.",
      "4. Reflect and store lessons in resonix-M.",
      "",
      "## Current Focus",
      "- Total permanent memories: 0",
      "- Tasks tracked: 0",
      "- Projects tracked: 0",
      "",
      "## Top Tasks",
      "- none",
      "",
      "## Top Projects",
      "- none",
      "",
      "## User Preferences",
      "- none",
      "",
    ].join("\n"),
  );

  await Promise.all(
    KNOWLEDGE_FILES.map(async ({ filename, title }) => {
      const filePath = path.join(paths.knowledgeDir, filename);
      await writeFileIfMissing(filePath, formatKnowledgeFile(title, []));
    }),
  );

  await writeFileIfMissing(
    paths.lessonsPath,
    ["# Task Lessons", "", "_Task summaries and outcomes are appended automatically._", ""].join(
      "\n",
    ),
  );
}

function groupEntriesByKind(
  entries: PermanentMemoryEntry[],
): Record<PermanentMemoryKind, PermanentMemoryEntry[]> {
  return {
    preference: entries.filter((entry) => entry.kind === "preference"),
    fact: entries.filter((entry) => entry.kind === "fact"),
    project: entries.filter((entry) => entry.kind === "project"),
    task: entries.filter((entry) => entry.kind === "task"),
    person: entries.filter((entry) => entry.kind === "person"),
  };
}

function formatKnowledgeFile(title: string, entries: PermanentMemoryEntry[]): string {
  const lines = [`# ${title}`, ""];
  if (entries.length === 0) {
    lines.push("_No entries yet._", "");
    return lines.join("\n");
  }
  for (const entry of entries) {
    const badge = `${Math.round(entry.confidence * 100)}% · x${entry.mentions} · ${new Date(entry.lastSeenAtMs).toISOString().slice(0, 10)}`;
    lines.push(`- [${badge}] ${entry.text}`);
  }
  lines.push("");
  return lines.join("\n");
}

async function writeKnowledgeMirror(
  paths: ResonixMPaths,
  profile: PermanentMemoryProfile,
): Promise<void> {
  const byKind = groupEntriesByKind(profile.entries);
  await fs.writeFile(
    path.join(paths.knowledgeDir, "preferences.md"),
    formatKnowledgeFile("Preferences", byKind.preference),
    "utf-8",
  );
  await fs.writeFile(
    path.join(paths.knowledgeDir, "facts.md"),
    formatKnowledgeFile("Facts", byKind.fact),
    "utf-8",
  );
  await fs.writeFile(
    path.join(paths.knowledgeDir, "projects.md"),
    formatKnowledgeFile("Projects", byKind.project),
    "utf-8",
  );
  await fs.writeFile(
    path.join(paths.knowledgeDir, "tasks.md"),
    formatKnowledgeFile("Tasks", byKind.task),
    "utf-8",
  );
  await fs.writeFile(
    path.join(paths.knowledgeDir, "people.md"),
    formatKnowledgeFile("People", byKind.person),
    "utf-8",
  );
}

function buildAutonomyPlan(profile: PermanentMemoryProfile): string {
  const summary = summarizePermanentMemoryProfile(profile);
  const topTasks = profile.entries
    .filter((entry) => entry.kind === "task")
    .slice(0, 5)
    .map((entry) => `- ${entry.text}`);
  const topProjects = profile.entries
    .filter((entry) => entry.kind === "project")
    .slice(0, 3)
    .map((entry) => `- ${entry.text}`);
  const topPreferences = profile.entries
    .filter((entry) => entry.kind === "preference")
    .slice(0, 3)
    .map((entry) => `- ${entry.text}`);

  return [
    "# Autonomy Plan",
    "",
    `Last updated: ${new Date().toISOString()}`,
    "",
    "## Identity Anchor",
    `- Agent: ${RESONIX_NAME}`,
    `- Developer: ${RESONIX_DEVELOPER}`,
    `- About: ${RESONIX_ABOUT}`,
    `- Browser: ${RESONIX_BROWSER_POLICY}`,
    "",
    "## Loop",
    "1. Observe user intent and constraints.",
    "2. Plan smallest safe step that moves work forward.",
    "3. Execute and verify outcomes.",
    "4. Reflect and store lessons in resonix-M.",
    "",
    "## Current Focus",
    `- Total permanent memories: ${summary.total}`,
    `- Tasks tracked: ${summary.byKind.task}`,
    `- Projects tracked: ${summary.byKind.project}`,
    "",
    "## Top Tasks",
    ...(topTasks.length > 0 ? topTasks : ["- none"]),
    "",
    "## Top Projects",
    ...(topProjects.length > 0 ? topProjects : ["- none"]),
    "",
    "## User Preferences",
    ...(topPreferences.length > 0 ? topPreferences : ["- none"]),
    "",
  ].join("\n");
}

async function appendJsonLine(filePath: string, payload: Record<string, unknown>): Promise<void> {
  await fs.appendFile(filePath, `${JSON.stringify(payload)}\n`, "utf-8");
}

async function appendSyncLog(paths: ResonixMPaths, line: string): Promise<void> {
  await fs.appendFile(paths.syncLogPath, `${line}\n`, "utf-8");
}

async function appendTaskLesson(params: {
  paths: ResonixMPaths;
  status: "ok" | "error" | "skipped";
  summary: string;
  source: string;
  nowMs?: number;
}): Promise<void> {
  const iso = nowIso(params.nowMs);
  const statusLabel = params.status.toUpperCase();
  const summary = trimForLog(params.summary, MAX_RETROS_CHARS);
  if (!summary) {
    return;
  }
  await fs.appendFile(
    params.paths.lessonsPath,
    `- ${iso} [${statusLabel}] (${params.source}) ${summary}\n`,
    "utf-8",
  );
}

export async function syncResonixMFromEvent(params: {
  workspaceDir: string;
  source: string;
  inboundText?: string;
  taskOutcome?: {
    status: "ok" | "error" | "skipped";
    summary?: string;
  };
  nowMs?: number;
  desktopDirOverride?: string;
}): Promise<void> {
  await withResonixMLock(async () => {
    const paths = await resolveResonixMPaths(params.desktopDirOverride);
    await ensureScaffold(paths);

    const inboundText = params.inboundText?.trim();
    if (inboundText && !inboundText.startsWith("/")) {
      await updatePermanentMemoryProfile({
        workspaceDir: params.workspaceDir,
        sessionContent: `user: ${inboundText}`,
        sourceLabel: `resonix-m:${params.source}`,
        nowMs: params.nowMs,
      });
    }

    const profilePath = resolvePermanentMemoryPaths(params.workspaceDir).jsonPath;
    const profile = await loadPermanentMemoryProfile(profilePath);
    if (profile) {
      await writeKnowledgeMirror(paths, profile);
      await fs.writeFile(paths.autonomyPlanPath, buildAutonomyPlan(profile), "utf-8");
    }

    if (params.taskOutcome?.summary) {
      await appendTaskLesson({
        paths,
        status: params.taskOutcome.status,
        summary: params.taskOutcome.summary,
        source: params.source,
        nowMs: params.nowMs,
      });
    }

    const eventPayload: Record<string, unknown> = {
      ts: nowIso(params.nowMs),
      source: params.source,
      workspaceDir: params.workspaceDir,
      rootDir: paths.rootDir,
      inbound: inboundText ? trimForLog(inboundText, MAX_RETROS_CHARS) : undefined,
      taskStatus: params.taskOutcome?.status,
      taskSummary: params.taskOutcome?.summary
        ? trimForLog(params.taskOutcome.summary, MAX_RETROS_CHARS)
        : undefined,
    };
    await appendJsonLine(paths.eventsLogPath, eventPayload);
    await appendSyncLog(paths, `${nowIso(params.nowMs)} sync source=${params.source}`);
  });
}
