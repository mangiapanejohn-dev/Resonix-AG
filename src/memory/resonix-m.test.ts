import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { syncResonixMFromEvent } from "./resonix-m.js";

const createdDirs: string[] = [];

async function makeTempDir(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  createdDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    createdDirs.splice(0).map(async (dir) => {
      await fs.rm(dir, { recursive: true, force: true });
    }),
  );
});

describe("resonix-M sync", () => {
  it("creates resonix-M scaffold on first sync", async () => {
    const workspaceDir = await makeTempDir("resonix-workspace-");
    const desktopDir = await makeTempDir("resonix-desktop-");

    await syncResonixMFromEvent({
      workspaceDir,
      source: "message:received",
      inboundText: "I love jazz and I need to finish project roadmap this week.",
      desktopDirOverride: desktopDir,
    });

    const rootDir = path.join(desktopDir, "resonix-M");
    const readme = await fs.readFile(path.join(rootDir, "README.md"), "utf-8");
    const identity = await fs.readFile(path.join(rootDir, "identity", "ABOUT.md"), "utf-8");
    const autonomy = await fs.readFile(path.join(rootDir, "autonomy", "AUTONOMY_PLAN.md"), "utf-8");

    expect(readme).toContain("Desktop memory workspace for Resonix.");
    expect(identity).toContain("MarkEllington");
    expect(autonomy).toContain("Autonomy Plan");
  });

  it("appends task lessons from task outcomes", async () => {
    const workspaceDir = await makeTempDir("resonix-workspace-");
    const desktopDir = await makeTempDir("resonix-desktop-");

    await syncResonixMFromEvent({
      workspaceDir,
      source: "cron:test-job",
      taskOutcome: {
        status: "ok",
        summary: "Gateway boot now completes without long blocking delays.",
      },
      desktopDirOverride: desktopDir,
    });

    const lessonsPath = path.join(desktopDir, "resonix-M", "retrospectives", "TASK_LESSONS.md");
    const lessons = await fs.readFile(lessonsPath, "utf-8");
    expect(lessons).toContain("Gateway boot now completes without long blocking delays.");
  });
});
