import { describe, expect, it } from "vitest";
import { ResonixSchema } from "./zod-schema.js";

describe("ResonixSchema browser driver normalization", () => {
  it("normalizes legacy browser profile driver aliases to resonix", () => {
    const parsed = ResonixSchema.parse({
      browser: {
        profiles: {
          "legacy-ext": {
            cdpPort: 19012,
            color: "#00AA00",
            driver: "extension",
          },
          "legacy-clawd": {
            cdpPort: 19013,
            color: "#00AA11",
            driver: "clawd",
          },
        },
      },
    });

    expect(parsed.browser?.profiles?.["legacy-ext"]?.driver).toBe("resonix");
    expect(parsed.browser?.profiles?.["legacy-clawd"]?.driver).toBe("resonix");
  });
});
