import type { CronRunLogEntry } from "./run-log.js";
import type { CronJob } from "./types.js";

export type CronBoardMetrics = {
  totalRuns: number;
  okRuns: number;
  errorRuns: number;
  skippedRuns: number;
  windowRuns: number;
  windowOkRuns: number;
  windowErrorRuns: number;
  windowSkippedRuns: number;
  successRate: number | null;
  averageDurationMs: number | null;
  p95DurationMs: number | null;
  lastRunAtMs: number | null;
  lastSuccessAtMs: number | null;
  lastErrorAtMs: number | null;
  lastError: string | null;
  consecutiveErrors: number;
  consecutiveOk: number;
  dueInMs: number | null;
};

export type CronBoardRow = {
  job: CronJob;
  metrics: CronBoardMetrics;
  memoryTemplate?: {
    tokenCount: number;
    scopes: string[];
  };
};

export type CronBoardSummary = {
  totalJobs: number;
  enabledJobs: number;
  runningJobs: number;
  dueNowJobs: number;
  recentErrorJobs: number;
};

export type CronBoardInsights = string[];

const DEFAULT_WINDOW_HOURS = 24 * 7;
const MEMORY_TEMPLATE_TOKEN_RE = /{{\s*memory(?:\.([a-z]+))?\s*}}/gi;

function normalizeWindowHours(windowHours?: number) {
  if (!Number.isFinite(windowHours)) {
    return DEFAULT_WINDOW_HOURS;
  }
  return Math.min(24 * 90, Math.max(1, Math.floor(windowHours)));
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function computePercentile(values: number[], percentile: number): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(percentile * sorted.length) - 1),
  );
  return sorted[index] ?? null;
}

function computeConsecutiveStreak(entries: CronRunLogEntry[], status: "ok" | "error") {
  let streak = 0;
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (!entry || entry.status !== status) {
      break;
    }
    streak += 1;
  }
  return streak;
}

function resolvePayloadText(job: CronJob): string {
  if (job.payload.kind === "systemEvent") {
    return job.payload.text ?? "";
  }
  return job.payload.message ?? "";
}

function resolveMemoryTemplateStats(job: CronJob): CronBoardRow["memoryTemplate"] {
  const payloadText = resolvePayloadText(job);
  if (!payloadText.includes("{{memory")) {
    return undefined;
  }

  const scopes = new Set<string>();
  let tokenCount = 0;
  MEMORY_TEMPLATE_TOKEN_RE.lastIndex = 0;
  for (;;) {
    const match = MEMORY_TEMPLATE_TOKEN_RE.exec(payloadText);
    if (!match) {
      break;
    }
    tokenCount += 1;
    const scope = (match[1] ?? "permanent").trim().toLowerCase() || "permanent";
    scopes.add(scope);
  }
  MEMORY_TEMPLATE_TOKEN_RE.lastIndex = 0;
  if (tokenCount <= 0) {
    return undefined;
  }
  return {
    tokenCount,
    scopes: Array.from(scopes).sort(),
  };
}

export function computeCronBoardMetrics(params: {
  job: CronJob;
  runs: CronRunLogEntry[];
  nowMs?: number;
  windowHours?: number;
}): CronBoardMetrics {
  const nowMs = toFiniteNumber(params.nowMs) ?? Date.now();
  const windowHours = normalizeWindowHours(params.windowHours);
  const windowStartMs = nowMs - windowHours * 60 * 60 * 1000;
  const runs = [...params.runs].sort((a, b) => a.ts - b.ts);

  let totalRuns = 0;
  let okRuns = 0;
  let errorRuns = 0;
  let skippedRuns = 0;
  let windowRuns = 0;
  let windowOkRuns = 0;
  let windowErrorRuns = 0;
  let windowSkippedRuns = 0;
  let lastSuccessAtMs: number | null = null;
  let lastErrorAtMs: number | null = null;
  let lastError: string | null = null;
  const durations: number[] = [];

  for (const entry of runs) {
    if (!entry) {
      continue;
    }
    totalRuns += 1;

    if (entry.status === "ok") {
      okRuns += 1;
      lastSuccessAtMs = entry.ts;
    } else if (entry.status === "error") {
      errorRuns += 1;
      lastErrorAtMs = entry.ts;
      const errorText = typeof entry.error === "string" ? entry.error.trim() : "";
      if (errorText) {
        lastError = errorText;
      }
    } else if (entry.status === "skipped") {
      skippedRuns += 1;
    }

    if (entry.ts >= windowStartMs) {
      windowRuns += 1;
      if (entry.status === "ok") {
        windowOkRuns += 1;
      } else if (entry.status === "error") {
        windowErrorRuns += 1;
      } else if (entry.status === "skipped") {
        windowSkippedRuns += 1;
      }
    }

    const duration = toFiniteNumber(entry.durationMs);
    if (duration !== null && duration >= 0) {
      durations.push(duration);
    }
  }

  const resolvedRuns = okRuns + errorRuns;
  const successRate = resolvedRuns > 0 ? okRuns / resolvedRuns : null;
  const averageDurationMs =
    durations.length > 0
      ? durations.reduce((sum, value) => sum + value, 0) / Math.max(1, durations.length)
      : null;
  const p95DurationMs = computePercentile(durations, 0.95);

  const lastRunAtMs = runs.length > 0 ? runs[runs.length - 1]?.ts ?? null : null;
  const nextRunAtMs = toFiniteNumber(params.job.state.nextRunAtMs);
  const dueInMs = params.job.enabled && nextRunAtMs !== null ? nextRunAtMs - nowMs : null;

  return {
    totalRuns,
    okRuns,
    errorRuns,
    skippedRuns,
    windowRuns,
    windowOkRuns,
    windowErrorRuns,
    windowSkippedRuns,
    successRate,
    averageDurationMs,
    p95DurationMs,
    lastRunAtMs,
    lastSuccessAtMs,
    lastErrorAtMs,
    lastError,
    consecutiveErrors: computeConsecutiveStreak(runs, "error"),
    consecutiveOk: computeConsecutiveStreak(runs, "ok"),
    dueInMs,
  };
}

export function buildCronBoardRows(params: {
  jobs: CronJob[];
  runsByJobId: Record<string, CronRunLogEntry[]>;
  nowMs?: number;
  windowHours?: number;
}): CronBoardRow[] {
  const nowMs = toFiniteNumber(params.nowMs) ?? Date.now();
  const windowHours = normalizeWindowHours(params.windowHours);
  return params.jobs
    .map((job) => ({
      job,
      metrics: computeCronBoardMetrics({
        job,
        runs: params.runsByJobId[job.id] ?? [],
        nowMs,
        windowHours,
      }),
      memoryTemplate: resolveMemoryTemplateStats(job),
    }))
    .sort((a, b) => {
      const aNext = toFiniteNumber(a.job.state.nextRunAtMs) ?? Number.POSITIVE_INFINITY;
      const bNext = toFiniteNumber(b.job.state.nextRunAtMs) ?? Number.POSITIVE_INFINITY;
      if (aNext !== bNext) {
        return aNext - bNext;
      }
      return a.job.name.localeCompare(b.job.name);
    });
}

export function summarizeCronBoard(params: {
  rows: CronBoardRow[];
  nowMs?: number;
}): CronBoardSummary {
  const nowMs = toFiniteNumber(params.nowMs) ?? Date.now();
  let enabledJobs = 0;
  let runningJobs = 0;
  let dueNowJobs = 0;
  let recentErrorJobs = 0;

  for (const row of params.rows) {
    if (row.job.enabled) {
      enabledJobs += 1;
    }
    if (typeof row.job.state.runningAtMs === "number") {
      runningJobs += 1;
    }
    if (row.job.enabled && typeof row.job.state.nextRunAtMs === "number") {
      if (row.job.state.nextRunAtMs <= nowMs) {
        dueNowJobs += 1;
      }
    }
    if (row.metrics.windowErrorRuns > 0) {
      recentErrorJobs += 1;
    }
  }

  return {
    totalJobs: params.rows.length,
    enabledJobs,
    runningJobs,
    dueNowJobs,
    recentErrorJobs,
  };
}

export function deriveCronBoardInsights(params: {
  rows: CronBoardRow[];
  summary: CronBoardSummary;
  windowHours?: number;
}): CronBoardInsights {
  const insights: string[] = [];
  const windowHours = normalizeWindowHours(params.windowHours);

  if (params.summary.dueNowJobs > 0) {
    insights.push(
      `${params.summary.dueNowJobs} job(s) are already due; run \`resonix cron board\` and inspect schedule drift or long-running jobs.`,
    );
  }

  if (params.summary.recentErrorJobs > 0) {
    insights.push(
      `${params.summary.recentErrorJobs} job(s) failed in the last ${windowHours}h; inspect with \`resonix cron runs --id <jobId> --limit 50\`.`,
    );
  }

  const noisyErrors = params.rows
    .filter((row) => row.metrics.consecutiveErrors >= 3)
    .sort((a, b) => b.metrics.consecutiveErrors - a.metrics.consecutiveErrors)
    .slice(0, 3);
  if (noisyErrors.length > 0) {
    insights.push(
      `Repeated failures detected: ${noisyErrors
        .map((row) => `${row.job.name} (${row.metrics.consecutiveErrors}x)`)
        .join(", ")}.`,
    );
  }

  const slowRows = params.rows.filter((row) => (row.metrics.averageDurationMs ?? 0) >= 60_000);
  if (slowRows.length > 0 && slowRows.length >= Math.max(2, Math.ceil(params.rows.length / 3))) {
    insights.push(
      `${slowRows.length} job(s) average over 60s runtime; stagger schedules or move heavy jobs to isolated agent turns.`,
    );
  }

  const memoryTemplateRows = params.rows.filter(
    (row) => (row.memoryTemplate?.tokenCount ?? 0) > 0,
  );
  if (memoryTemplateRows.length > 0) {
    const scopes = new Set<string>();
    for (const row of memoryTemplateRows) {
      for (const scope of row.memoryTemplate?.scopes ?? []) {
        scopes.add(scope);
      }
    }
    const scopeLabel = Array.from(scopes).sort().join(", ");
    insights.push(
      `${memoryTemplateRows.length} job(s) inject permanent-memory templates (${scopeLabel}); keep profile entries clean so scheduled prompts stay high-signal.`,
    );
  }

  return insights;
}
