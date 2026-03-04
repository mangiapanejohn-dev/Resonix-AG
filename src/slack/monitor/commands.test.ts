import { describe, expect, it } from "vitest";
import {
  normalizeSlackSlashCommandName,
  stripSlackMentionsForCommandDetection,
} from "./commands.js";

describe("slack command text normalization", () => {
  it("strips mentions from regular string input", () => {
    expect(stripSlackMentionsForCommandDetection("<@U1> /new")).toBe("/new");
  });

  it("handles non-string mention payloads without throwing", () => {
    expect(stripSlackMentionsForCommandDetection({ text: "bad" } as unknown as string)).toBe("");
    expect(stripSlackMentionsForCommandDetection(123 as unknown as string)).toBe("123");
  });

  it("normalizes slash command names with runtime-safe coercion", () => {
    expect(normalizeSlackSlashCommandName("/resonix")).toBe("resonix");
    expect(normalizeSlackSlashCommandName(42 as unknown as string)).toBe("42");
    expect(normalizeSlackSlashCommandName({} as unknown as string)).toBe("");
  });
});
