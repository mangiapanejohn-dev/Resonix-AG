import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResonixConfig } from "../config/config.js";

const transcribeFirstAudioMock = vi.hoisted(() => vi.fn());

vi.mock("./audio-preflight.js", () => ({
  transcribeFirstAudio: (...args: unknown[]) => transcribeFirstAudioMock(...args),
}));

import { transcribeAudioFile } from "./stt-runtime.js";

describe("runtime stt transcribeAudioFile", () => {
  const cfg = {} as ResonixConfig;

  beforeEach(() => {
    transcribeFirstAudioMock.mockReset();
  });

  it("returns undefined for an empty file path", async () => {
    await expect(
      transcribeAudioFile({
        filePath: "   ",
        cfg,
      }),
    ).resolves.toBeUndefined();
    expect(transcribeFirstAudioMock).not.toHaveBeenCalled();
  });

  it("forwards normalized context and active model to preflight transcription", async () => {
    transcribeFirstAudioMock.mockResolvedValueOnce("hello transcript");

    await expect(
      transcribeAudioFile({
        filePath: " /tmp/voice.wav ",
        cfg,
        provider: " openai ",
        model: " whisper-1 ",
        mime: " audio/wav ",
        accountId: " acc-1 ",
        agentDir: "/workspace/agent",
      }),
    ).resolves.toBe("hello transcript");

    expect(transcribeFirstAudioMock).toHaveBeenCalledWith({
      ctx: {
        MediaPath: "/tmp/voice.wav",
        MediaType: "audio/wav",
        AccountId: "acc-1",
      },
      cfg,
      agentDir: "/workspace/agent",
      providers: undefined,
      activeModel: {
        provider: "openai",
        model: "whisper-1",
      },
    });
  });
});
