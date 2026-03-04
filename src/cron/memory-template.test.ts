import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderCronMemoryTemplate } from "./memory-template.js";

async function writePermanentProfile(params: {
  workspaceDir: string;
  entries: Array<{
    id: string;
    kind: "preference" | "fact" | "task" | "project" | "person";
    text: string;
    confidence: number;
    mentions: number;
  }>;
}) {
  const profilePath = path.join(params.workspaceDir, ".resonix", "permanent-memory.json");
  await fs.mkdir(path.dirname(profilePath), { recursive: true });
  const now = Date.UTC(2026, 2, 4, 10, 0, 0);
  await fs.writeFile(
    profilePath,
    JSON.stringify(
      {
        version: 1,
        updatedAtMs: now,
        entries: params.entries.map((entry) => ({
          ...entry,
          normalizedText: entry.text.toLowerCase(),
          firstSeenAtMs: now - 1000,
          lastSeenAtMs: now,
          sources: ["memory/2026-03-04.md"],
        })),
      },
      null,
      2,
    ),
  );
}

describe("cron memory template", () => {
  it("returns original text when no token is present", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "resonix-cron-memory-template-"));
    const result = await renderCronMemoryTemplate({
      text: "No memory token here.",
      workspaceDir,
    });
    expect(result.text).toBe("No memory token here.");
    expect(result.replaced).toBe(0);
  });

  it("renders top memory entries", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "resonix-cron-memory-template-"));
    await writePermanentProfile({
      workspaceDir,
      entries: [
        {
          id: "pref-1",
          kind: "preference",
          text: "I prefer concise updates",
          confidence: 0.9,
          mentions: 3,
        },
        {
          id: "task-1",
          kind: "task",
          text: "I need to ship cron reliability fixes",
          confidence: 0.8,
          mentions: 2,
        },
      ],
    });
    const result = await renderCronMemoryTemplate({
      text: "Daily prep:\n{{memory.top}}",
      workspaceDir,
    });
    expect(result.replaced).toBe(1);
    expect(result.profileExists).toBe(true);
    expect(result.entryCount).toBe(2);
    expect(result.text).toContain("I prefer concise updates");
    expect(result.text).toContain("I need to ship cron reliability fixes");
  });

  it("renders scoped sections and fallback when profile is missing", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "resonix-cron-memory-template-"));
    const missingResult = await renderCronMemoryTemplate({
      text: "Tasks:\n{{memory.tasks}}",
      workspaceDir,
    });
    expect(missingResult.text).toContain("No permanent memory captured yet.");

    await writePermanentProfile({
      workspaceDir,
      entries: [
        {
          id: "task-1",
          kind: "task",
          text: "Review gateway logs every morning",
          confidence: 0.84,
          mentions: 2,
        },
        {
          id: "fact-1",
          kind: "fact",
          text: "We run Resonix on macOS",
          confidence: 0.78,
          mentions: 1,
        },
      ],
    });

    const scopedResult = await renderCronMemoryTemplate({
      text: "Tasks:\n{{memory.tasks}}\nFacts:\n{{memory.facts}}",
      workspaceDir,
    });
    expect(scopedResult.text).toContain("Review gateway logs every morning");
    expect(scopedResult.text).toContain("We run Resonix on macOS");
  });
});
