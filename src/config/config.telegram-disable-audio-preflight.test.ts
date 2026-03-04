import { describe, expect, it } from "vitest";
import { ResonixSchema } from "./zod-schema.js";

describe("telegram disableAudioPreflight config", () => {
  it("accepts group/topic disableAudioPreflight", () => {
    const parsed = ResonixSchema.safeParse({
      channels: {
        telegram: {
          groups: {
            "-1001234567890": {
              disableAudioPreflight: true,
              topics: {
                "123": {
                  disableAudioPreflight: false,
                },
              },
            },
          },
        },
      },
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    const group = parsed.data.channels?.telegram?.groups?.["-1001234567890"];
    expect(group?.disableAudioPreflight).toBe(true);
    expect(group?.topics?.["123"]?.disableAudioPreflight).toBe(false);
  });
});
