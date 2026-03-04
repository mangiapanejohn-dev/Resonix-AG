import { describe, expect, it } from "vitest";
import { validateConfigObject } from "./config.js";

describe("Telegram streaming alias", () => {
  it("accepts channels.telegram.streaming=true", () => {
    const res = validateConfigObject({
      channels: { telegram: { streaming: true } },
    });
    expect(res.ok).toBe(true);
  });

  it("accepts channels.telegram.streaming=false", () => {
    const res = validateConfigObject({
      channels: { telegram: { streaming: false } },
    });
    expect(res.ok).toBe(true);
  });
});
