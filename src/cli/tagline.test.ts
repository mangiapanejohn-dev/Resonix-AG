import { describe, expect, it } from "vitest";
import { DEFAULT_TAGLINE, TAGLINES, pickTagline } from "./tagline.js";

describe("pickTagline", () => {
  it("returns empty tagline in quiet mode", () => {
    expect(pickTagline({ mode: "quiet" })).toBe("");
  });

  it("returns default hint tagline in hint mode", () => {
    expect(pickTagline({ mode: "hint" })).toBe(DEFAULT_TAGLINE);
  });

  it("uses playful pool by default", () => {
    expect(pickTagline({ random: () => 0 })).toBe(TAGLINES[0]);
  });

  it("accepts mode from environment", () => {
    expect(pickTagline({ env: { RESONIX_CLI_TAGLINE_MODE: "quiet" } as NodeJS.ProcessEnv })).toBe(
      "",
    );
  });
});
