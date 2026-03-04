import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createNoopLogger } from "./service.test-harness.js";
import { CronService } from "./service.js";

async function withCronService(
  run: (params: {
    cron: CronService;
    resolveCronText: ReturnType<typeof vi.fn>;
    enqueueSystemEvent: ReturnType<typeof vi.fn>;
    requestHeartbeatNow: ReturnType<typeof vi.fn>;
    runIsolatedAgentJob: ReturnType<typeof vi.fn>;
  }) => Promise<void>,
) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "resonix-cron-memory-integration-"));
  const storePath = path.join(tempDir, "cron", "jobs.json");
  const logger = createNoopLogger();
  const resolveCronText = vi.fn(async ({ text }: { text: string }) =>
    text.replace("{{memory.top}}", "- synthetic memory"),
  );
  const enqueueSystemEvent = vi.fn();
  const requestHeartbeatNow = vi.fn();
  const runIsolatedAgentJob = vi.fn(async () => ({ status: "ok" as const, summary: "ok" }));
  const nowMs = Date.UTC(2026, 2, 4, 12, 0, 0);
  const cron = new CronService({
    storePath,
    cronEnabled: true,
    nowMs: () => nowMs,
    log: logger,
    resolveCronText,
    enqueueSystemEvent,
    requestHeartbeatNow,
    runIsolatedAgentJob,
  });

  try {
    await cron.start();
    await run({ cron, resolveCronText, enqueueSystemEvent, requestHeartbeatNow, runIsolatedAgentJob });
  } finally {
    cron.stop();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

describe("cron + memory template integration", () => {
  it("resolves memory template for main session jobs", async () => {
    await withCronService(async ({ cron, resolveCronText, enqueueSystemEvent }) => {
      const runAt = new Date(Date.UTC(2026, 2, 4, 11, 59, 0)).toISOString();
      const job = await cron.add({
        name: "main-memory-job",
        schedule: { kind: "at", at: runAt },
        sessionTarget: "main",
        wakeMode: "next-heartbeat",
        payload: { kind: "systemEvent", text: "Morning summary:\n{{memory.top}}" },
      });

      const result = await cron.run(job.id, "force");
      expect(result.ok).toBe(true);
      expect(resolveCronText).toHaveBeenCalledWith(
        expect.objectContaining({
          job: expect.objectContaining({ id: job.id }),
          target: "main",
        }),
      );
      expect(enqueueSystemEvent).toHaveBeenCalledWith(
        expect.stringContaining("synthetic memory"),
        expect.objectContaining({ contextKey: `cron:${job.id}` }),
      );
    });
  });

  it("resolves memory template for isolated agent jobs", async () => {
    await withCronService(async ({ cron, resolveCronText, runIsolatedAgentJob }) => {
      const runAt = new Date(Date.UTC(2026, 2, 4, 11, 59, 0)).toISOString();
      const job = await cron.add({
        name: "isolated-memory-job",
        schedule: { kind: "at", at: runAt },
        sessionTarget: "isolated",
        wakeMode: "next-heartbeat",
        payload: { kind: "agentTurn", message: "Use this:\n{{memory.top}}" },
      });

      const result = await cron.run(job.id, "force");
      expect(result.ok).toBe(true);
      expect(resolveCronText).toHaveBeenCalledWith(
        expect.objectContaining({
          job: expect.objectContaining({ id: job.id }),
          target: "isolated",
        }),
      );
      expect(runIsolatedAgentJob).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("synthetic memory"),
        }),
      );
    });
  });
});
