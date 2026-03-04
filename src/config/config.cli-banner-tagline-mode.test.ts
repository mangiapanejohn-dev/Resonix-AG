import { describe, expect, it } from "vitest";
import { validateConfigObject } from "./config.js";

describe("CLI banner tagline mode", () => {
  it.each(["quiet", "hint", "playful"] as const)("accepts %s", (mode) => {
    const res = validateConfigObject({
      cli: { banner: { taglineMode: mode } },
    });
    expect(res.ok).toBe(true);
  });

  it("rejects unknown mode", () => {
    const res = validateConfigObject({
      cli: { banner: { taglineMode: "chaos" } },
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.issues[0]?.path).toBe("cli.banner.taglineMode");
    }
  });
});
