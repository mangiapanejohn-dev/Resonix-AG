import { describe, expect, it } from "vitest";
import type { ResonixConfig } from "../config/config.js";
import { resolveHumanDelayConfig } from "./identity.js";

describe("resolveHumanDelayConfig", () => {
  it("returns undefined when no humanDelay config is set", () => {
    const cfg: ResonixConfig = {};
    expect(resolveHumanDelayConfig(cfg, "main")).toBeUndefined();
  });

  it("merges defaults with per-agent overrides", () => {
    const cfg: ResonixConfig = {
      agents: {
        defaults: {
          humanDelay: { mode: "natural", minMs: 800, maxMs: 1800 },
        },
        list: [{ id: "main", humanDelay: { mode: "custom", minMs: 400 } }],
      },
    };

    expect(resolveHumanDelayConfig(cfg, "main")).toEqual({
      mode: "custom",
      minMs: 400,
      maxMs: 1800,
    });
  });
});
