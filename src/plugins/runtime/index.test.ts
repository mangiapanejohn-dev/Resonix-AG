import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResonixConfig } from "../../config/config.js";

const runCommandWithTimeoutMock = vi.hoisted(() => vi.fn());
const requestHeartbeatNowMock = vi.hoisted(() => vi.fn());
const onAgentEventMock = vi.hoisted(() => vi.fn());
const onSessionTranscriptUpdateMock = vi.hoisted(() => vi.fn());
const transcribeAudioFileMock = vi.hoisted(() => vi.fn());

vi.mock("../../process/exec.js", () => ({
  runCommandWithTimeout: (...args: unknown[]) => runCommandWithTimeoutMock(...args),
}));
vi.mock("../../infra/heartbeat-wake.js", () => ({
  requestHeartbeatNow: (...args: unknown[]) => requestHeartbeatNowMock(...args),
}));
vi.mock("../../infra/agent-events.js", () => ({
  onAgentEvent: (...args: unknown[]) => onAgentEventMock(...args),
}));
vi.mock("../../sessions/transcript-events.js", () => ({
  onSessionTranscriptUpdate: (...args: unknown[]) => onSessionTranscriptUpdateMock(...args),
}));
vi.mock("../../media-understanding/stt-runtime.js", () => ({
  transcribeAudioFile: (...args: unknown[]) => transcribeAudioFileMock(...args),
}));

import { createPluginRuntime } from "./index.js";

describe("plugin runtime command execution", () => {
  const cfg = {} as ResonixConfig;

  beforeEach(() => {
    runCommandWithTimeoutMock.mockReset();
    requestHeartbeatNowMock.mockReset();
    onAgentEventMock.mockReset();
    onSessionTranscriptUpdateMock.mockReset();
    transcribeAudioFileMock.mockReset();
  });

  it("exposes runtime.system.runCommandWithTimeout by default", async () => {
    const commandResult = {
      stdout: "hello\n",
      stderr: "",
      code: 0,
      signal: null,
      killed: false,
      termination: "exit" as const,
    };
    runCommandWithTimeoutMock.mockResolvedValue(commandResult);

    const runtime = createPluginRuntime();
    await expect(
      runtime.system.runCommandWithTimeout(["echo", "hello"], { timeoutMs: 1000 }),
    ).resolves.toEqual(commandResult);
    expect(runCommandWithTimeoutMock).toHaveBeenCalledWith(["echo", "hello"], { timeoutMs: 1000 });
  });

  it("forwards runtime.system.runCommandWithTimeout errors", async () => {
    runCommandWithTimeoutMock.mockRejectedValue(new Error("boom"));
    const runtime = createPluginRuntime();
    await expect(
      runtime.system.runCommandWithTimeout(["echo", "hello"], { timeoutMs: 1000 }),
    ).rejects.toThrow("boom");
    expect(runCommandWithTimeoutMock).toHaveBeenCalledWith(["echo", "hello"], { timeoutMs: 1000 });
  });

  it("exposes runtime.system.requestHeartbeatNow", () => {
    const runtime = createPluginRuntime();
    runtime.system.requestHeartbeatNow({ reason: "manual", coalesceMs: 0 });
    expect(requestHeartbeatNowMock).toHaveBeenCalledWith({ reason: "manual", coalesceMs: 0 });
  });

  it("exposes runtime.events subscriptions", () => {
    const runtime = createPluginRuntime();
    const onAgent = vi.fn();
    const onTranscript = vi.fn();
    runtime.events.onAgentEvent(onAgent);
    runtime.events.onSessionTranscriptUpdate(onTranscript);
    expect(onAgentEventMock).toHaveBeenCalledWith(onAgent);
    expect(onSessionTranscriptUpdateMock).toHaveBeenCalledWith(onTranscript);
  });

  it("exposes runtime.stt.transcribeAudioFile", async () => {
    transcribeAudioFileMock.mockResolvedValueOnce("audio transcript");
    const runtime = createPluginRuntime();
    await expect(
      runtime.stt.transcribeAudioFile({
        filePath: "/tmp/voice.wav",
        cfg,
      }),
    ).resolves.toBe("audio transcript");
    expect(transcribeAudioFileMock).toHaveBeenCalledWith({
      filePath: "/tmp/voice.wav",
      cfg,
    });
  });
});
