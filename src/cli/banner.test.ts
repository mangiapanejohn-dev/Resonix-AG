import { describe, expect, it } from "vitest";
import { formatCliBannerLine } from "./banner.js";
import { DEFAULT_TAGLINE } from "./tagline.js";

describe("formatCliBannerLine", () => {
  it("omits separator when tagline mode is quiet", () => {
    const line = formatCliBannerLine("1.2.3", {
      commit: "abc1234",
      richTty: false,
      columns: 200,
      mode: "quiet",
    });
    expect(line).toBe("👾 Resonix 1.2.3 (abc1234)");
  });

  it("shows default tagline in hint mode", () => {
    const line = formatCliBannerLine("1.2.3", {
      commit: "abc1234",
      richTty: false,
      columns: 200,
      mode: "hint",
    });
    expect(line).toBe(`👾 Resonix 1.2.3 (abc1234) — ${DEFAULT_TAGLINE}`);
  });
});
