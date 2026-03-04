import { describe, expect, it } from "vitest";
import { ResonixSchema } from "./zod-schema.js";

describe("discord disableAudioPreflight config", () => {
  it("accepts disableAudioPreflight", () => {
    const parsed = ResonixSchema.safeParse({
      channels: {
        discord: {
          disableAudioPreflight: true,
        },
      },
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    expect(parsed.data.channels?.discord?.disableAudioPreflight).toBe(true);
  });
});
