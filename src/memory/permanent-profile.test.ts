import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractPermanentMemoryCandidates,
  loadPermanentMemoryProfile,
  resolvePermanentMemoryPaths,
  summarizePermanentMemoryProfile,
  updatePermanentMemoryProfile,
} from "./permanent-profile.js";

describe("permanent memory profile", () => {
  it("extracts structured candidates from user lines", () => {
    const candidates = extractPermanentMemoryCandidates(
      [
        "user: I prefer concise status updates and I love clean logs.",
        "assistant: noted",
        "user: I need to ship release notes by Friday.",
        "user: We use Resonix for project automation.",
      ].join("\n"),
    );

    const kinds = new Set(candidates.map((entry) => entry.kind));
    expect(kinds.has("preference")).toBe(true);
    expect(kinds.has("task")).toBe(true);
    expect(kinds.has("project")).toBe(true);
  });

  it("updates profile, deduplicates entries, and writes markdown", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "resonix-perm-memory-"));
    const now = Date.UTC(2026, 2, 4, 10, 0, 0);

    const first = await updatePermanentMemoryProfile({
      workspaceDir,
      nowMs: now,
      sourceLabel: "memory/2026-03-04-session.md",
      sessionContent: [
        "user: I prefer dark mode in dashboards.",
        "user: I need to finish cron observability today.",
      ].join("\n"),
    });
    expect(first.updated).toBe(true);
    expect(first.extracted).toBeGreaterThan(0);
    expect(first.added).toBeGreaterThan(0);

    const second = await updatePermanentMemoryProfile({
      workspaceDir,
      nowMs: now + 60_000,
      sourceLabel: "memory/2026-03-04-followup.md",
      sessionContent: "user: I prefer dark mode in dashboards.",
    });
    expect(second.updated).toBe(true);
    expect(second.added).toBe(0);
    expect(second.touched).toBeGreaterThan(0);

    const paths = resolvePermanentMemoryPaths(workspaceDir);
    const profile = await loadPermanentMemoryProfile(paths.jsonPath);
    expect(profile).toBeTruthy();
    expect(profile?.entries.length).toBeGreaterThan(0);

    const stats = summarizePermanentMemoryProfile(profile!);
    expect(stats.total).toBe(profile?.entries.length);
    expect(stats.byKind.preference).toBeGreaterThanOrEqual(1);

    const markdown = await fs.readFile(paths.markdownPath, "utf-8");
    expect(markdown).toContain("# Permanent Memory");
    expect(markdown).toContain("Preferences");
    expect(markdown).toContain("I prefer dark mode in dashboards");
  });

  it("merges duplicate entries while loading edited profiles", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "resonix-perm-memory-merge-"));
    const paths = resolvePermanentMemoryPaths(workspaceDir);
    try {
      await fs.mkdir(path.dirname(paths.jsonPath), { recursive: true });
      const now = Date.UTC(2026, 2, 4, 12, 0, 0);
      await fs.writeFile(
        paths.jsonPath,
        JSON.stringify(
          {
            version: 1,
            updatedAtMs: now,
            entries: [
              {
                id: "entry-a",
                kind: "preference",
                text: "I prefer concise updates.",
                normalizedText: "i prefer concise updates",
                firstSeenAtMs: now - 2_000,
                lastSeenAtMs: now - 2_000,
                mentions: 2,
                confidence: 0.82,
                sources: ["memory/one.md"],
              },
              {
                id: "entry-b",
                kind: "preference",
                text: "I prefer concise updates",
                normalizedText: "i prefer concise updates",
                firstSeenAtMs: now - 1_000,
                lastSeenAtMs: now - 500,
                mentions: 1,
                confidence: 0.91,
                sources: ["memory/two.md"],
              },
            ],
          },
          null,
          2,
        ),
      );

      const loaded = await loadPermanentMemoryProfile(paths.jsonPath);
      expect(loaded).toBeTruthy();
      expect(loaded?.entries.length).toBe(1);
      expect(loaded?.entries[0]?.mentions).toBe(3);
      expect(loaded?.entries[0]?.confidence).toBeCloseTo(0.91, 6);
      expect(new Set(loaded?.entries[0]?.sources ?? [])).toEqual(
        new Set(["memory/one.md", "memory/two.md"]),
      );
    } finally {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it("prefers fresher entries in top ranking when stale confidence decays", () => {
    const now = Date.now();
    const staleAt = now - 400 * 24 * 60 * 60 * 1000;
    const freshAt = now - 60_000;

    const summary = summarizePermanentMemoryProfile({
      version: 1,
      updatedAtMs: now,
      entries: [
        {
          id: "stale-high",
          kind: "fact",
          text: "I use old tooling",
          normalizedText: "i use old tooling",
          firstSeenAtMs: staleAt,
          lastSeenAtMs: staleAt,
          mentions: 1,
          confidence: 0.99,
          sources: ["memory/stale.md"],
        },
        {
          id: "fresh-medium",
          kind: "fact",
          text: "I use Resonix automation",
          normalizedText: "i use resonix automation",
          firstSeenAtMs: freshAt,
          lastSeenAtMs: freshAt,
          mentions: 1,
          confidence: 0.62,
          sources: ["memory/fresh.md"],
        },
      ],
    });

    expect(summary.top[0]?.id).toBe("fresh-medium");
  });
});
