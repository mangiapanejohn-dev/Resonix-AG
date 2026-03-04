import { describe, expect, it } from "vitest";
import {
  buildCronBoardRows,
  computeCronBoardMetrics,
  deriveCronBoardInsights,
  summarizeCronBoard,
} from "./board.js";
import type { CronRunLogEntry } from "./run-log.js";
import type { CronJob } from "./types.js";

function makeJob(params: {
  id: string;
  name: string;
  enabled?: boolean;
  nextRunAtMs?: number;
  runningAtMs?: number;
}): CronJob {
  const now = 1_700_000_000_000;
  return {
    id: params.id,
    name: params.name,
    enabled: params.enabled ?? true,
    createdAtMs: now - 10_000,
    updatedAtMs: now - 5_000,
    schedule: { kind: "every", everyMs: 60_000 },
    sessionTarget: "main",
    wakeMode: "now",
    payload: { kind: "systemEvent", text: "tick" },
    state: {
      nextRunAtMs: params.nextRunAtMs,
      runningAtMs: params.runningAtMs,
    },
  };
}

function makeRun(params: {
  jobId: string;
  ts: number;
  status: "ok" | "error" | "skipped";
  durationMs?: number;
  error?: string;
}): CronRunLogEntry {
  return {
    action: "finished",
    jobId: params.jobId,
    ts: params.ts,
    status: params.status,
    durationMs: params.durationMs,
    error: params.error,
  };
}

describe("cron board", () => {
  it("computes aggregate and window metrics", () => {
    const now = 1_700_000_000_000;
    const job = makeJob({
      id: "job-1",
      name: "job-1",
      nextRunAtMs: now + 30_000,
    });
    const runs: CronRunLogEntry[] = [
      makeRun({ jobId: job.id, ts: now - 4 * 60 * 60 * 1000, status: "ok", durationMs: 800 }),
      makeRun({
        jobId: job.id,
        ts: now - 2 * 60 * 60 * 1000,
        status: "error",
        durationMs: 2_400,
        error: "boom",
      }),
      makeRun({ jobId: job.id, ts: now - 20 * 60 * 1000, status: "ok", durationMs: 1_000 }),
      makeRun({ jobId: job.id, ts: now - 5 * 60 * 1000, status: "skipped", durationMs: 400 }),
    ];

    const metrics = computeCronBoardMetrics({
      job,
      runs,
      nowMs: now,
      windowHours: 3,
    });

    expect(metrics.totalRuns).toBe(4);
    expect(metrics.okRuns).toBe(2);
    expect(metrics.errorRuns).toBe(1);
    expect(metrics.skippedRuns).toBe(1);
    expect(metrics.windowRuns).toBe(3);
    expect(metrics.windowErrorRuns).toBe(1);
    expect(metrics.windowSkippedRuns).toBe(1);
    expect(metrics.successRate).toBeCloseTo(2 / 3, 6);
    expect(metrics.averageDurationMs).toBeCloseTo(1_150, 4);
    expect(metrics.p95DurationMs).toBe(2_400);
    expect(metrics.lastError).toBe("boom");
    expect(metrics.dueInMs).toBe(30_000);
  });

  it("tracks consecutive streaks from newest runs", () => {
    const now = 1_700_000_000_000;
    const job = makeJob({ id: "job-2", name: "job-2", nextRunAtMs: now - 1000 });
    const runs: CronRunLogEntry[] = [
      makeRun({ jobId: job.id, ts: now - 10_000, status: "ok" }),
      makeRun({ jobId: job.id, ts: now - 9_000, status: "error" }),
      makeRun({ jobId: job.id, ts: now - 8_000, status: "error" }),
    ];
    const metrics = computeCronBoardMetrics({ job, runs, nowMs: now });
    expect(metrics.consecutiveErrors).toBe(2);
    expect(metrics.consecutiveOk).toBe(0);
    expect(metrics.dueInMs).toBe(-1000);
  });

  it("builds sorted board rows and summary", () => {
    const now = 1_700_000_000_000;
    const jobA = {
      ...makeJob({ id: "a", name: "A", nextRunAtMs: now + 20_000 }),
      payload: { kind: "systemEvent" as const, text: "Daily prep\n{{memory.top}}" },
    };
    const jobB = makeJob({ id: "b", name: "B", nextRunAtMs: now - 1_000, runningAtMs: now - 500 });
    const jobC = makeJob({ id: "c", name: "C", enabled: false });

    const rows = buildCronBoardRows({
      jobs: [jobA, jobC, jobB],
      runsByJobId: {
        b: [makeRun({ jobId: "b", ts: now - 10_000, status: "error", error: "x" })],
      },
      nowMs: now,
      windowHours: 12,
    });

    expect(rows.map((row) => row.job.id)).toEqual(["b", "a", "c"]);
    expect(rows.find((row) => row.job.id === "a")?.memoryTemplate?.tokenCount).toBe(1);
    expect(rows.find((row) => row.job.id === "a")?.memoryTemplate?.scopes).toEqual(["top"]);

    const summary = summarizeCronBoard({ rows, nowMs: now });
    expect(summary.totalJobs).toBe(3);
    expect(summary.enabledJobs).toBe(2);
    expect(summary.runningJobs).toBe(1);
    expect(summary.dueNowJobs).toBe(1);
    expect(summary.recentErrorJobs).toBe(1);
  });

  it("derives actionable board insights", () => {
    const now = 1_700_000_000_000;
    const rowA = {
      job: makeJob({ id: "a", name: "A", nextRunAtMs: now - 10_000 }),
      metrics: {
        ...computeCronBoardMetrics({
          job: makeJob({ id: "a", name: "A", nextRunAtMs: now - 10_000 }),
          runs: [makeRun({ jobId: "a", ts: now - 1000, status: "error", error: "x" })],
          nowMs: now,
        }),
        consecutiveErrors: 4,
        averageDurationMs: 90_000,
      },
    };
    const rowB = {
      job: makeJob({ id: "b", name: "B", nextRunAtMs: now + 10_000 }),
      metrics: {
        ...computeCronBoardMetrics({
          job: makeJob({ id: "b", name: "B", nextRunAtMs: now + 10_000 }),
          runs: [makeRun({ jobId: "b", ts: now - 1000, status: "ok", durationMs: 75_000 })],
          nowMs: now,
        }),
        averageDurationMs: 75_000,
      },
    };
    const summary = summarizeCronBoard({ rows: [rowA, rowB], nowMs: now });
    const insights = deriveCronBoardInsights({ rows: [rowA, rowB], summary, windowHours: 24 });
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.some((line) => line.includes("failed"))).toBe(true);
    expect(insights.some((line) => line.includes("Repeated failures"))).toBe(true);
  });

  it("reports memory-template coverage in insights", () => {
    const now = 1_700_000_000_000;
    const row = {
      job: {
        ...makeJob({ id: "m", name: "memory-job", nextRunAtMs: now + 60_000 }),
        payload: { kind: "systemEvent" as const, text: "Run brief\n{{memory.tasks}}" },
      },
      metrics: computeCronBoardMetrics({
        job: makeJob({ id: "m", name: "memory-job", nextRunAtMs: now + 60_000 }),
        runs: [makeRun({ jobId: "m", ts: now - 2_000, status: "ok", durationMs: 1_200 })],
        nowMs: now,
      }),
      memoryTemplate: {
        tokenCount: 1,
        scopes: ["tasks"],
      },
    };
    const summary = summarizeCronBoard({ rows: [row], nowMs: now });
    const insights = deriveCronBoardInsights({ rows: [row], summary, windowHours: 24 });
    expect(insights.some((line) => line.includes("inject permanent-memory templates"))).toBe(true);
  });
});
