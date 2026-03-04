import { describe, expect, it } from "vitest";
import { ResonixSchema } from "./zod-schema.js";

describe("tools.media.audio echo config", () => {
  it("accepts echoTranscript and echoFormat", () => {
    const parsed = ResonixSchema.safeParse({
      tools: {
        media: {
          audio: {
            echoTranscript: true,
            echoFormat: "Heard this: {transcript}",
          },
        },
      },
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    expect(parsed.data.tools?.media?.audio?.echoTranscript).toBe(true);
    expect(parsed.data.tools?.media?.audio?.echoFormat).toBe("Heard this: {transcript}");
  });
});
