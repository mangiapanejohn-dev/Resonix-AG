import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildTelegramMessageContext } from "./bot-message-context.js";

const transcribeFirstAudioMock = vi.fn();

vi.mock("../media-understanding/audio-preflight.js", () => ({
  transcribeFirstAudio: (...args: unknown[]) => transcribeFirstAudioMock(...args),
}));

describe("buildTelegramMessageContext audio transcript body", () => {
  beforeEach(() => {
    transcribeFirstAudioMock.mockReset();
  });

  it("uses preflight transcript as BodyForAgent for mention-gated group voice messages", async () => {
    transcribeFirstAudioMock.mockResolvedValueOnce("hey bot please help");

    const ctx = await buildTelegramMessageContext({
      primaryCtx: {
        message: {
          message_id: 1,
          chat: { id: -1001234567890, type: "supergroup", title: "Test Group" },
          date: 1700000000,
          from: { id: 42, first_name: "Alice" },
          voice: { file_id: "voice-1" },
        },
        me: { id: 7, username: "bot" },
      } as never,
      allMedia: [{ path: "/tmp/voice.ogg", contentType: "audio/ogg" }],
      storeAllowFrom: [],
      options: { forceWasMentioned: true },
      bot: {
        api: {
          sendChatAction: vi.fn(),
          sendMessage: vi.fn(),
          setMessageReaction: vi.fn(),
        },
      } as never,
      cfg: {
        agents: { defaults: { model: "anthropic/claude-opus-4-5", workspace: "/tmp/resonix" } },
        channels: { telegram: {} },
        messages: { groupChat: { mentionPatterns: ["\\bbot\\b"] } },
      } as never,
      account: { accountId: "default" } as never,
      historyLimit: 0,
      groupHistories: new Map(),
      dmPolicy: "open",
      allowFrom: [],
      groupAllowFrom: [],
      ackReactionScope: "off",
      logger: { info: vi.fn() },
      resolveGroupActivation: () => true,
      resolveGroupRequireMention: () => true,
      resolveTelegramGroupConfig: () => ({
        groupConfig: { requireMention: true },
        topicConfig: undefined,
      }),
    });

    expect(ctx).not.toBeNull();
    expect(transcribeFirstAudioMock).toHaveBeenCalledTimes(1);
    expect(ctx?.ctxPayload?.BodyForAgent).toBe("hey bot please help");
    expect(ctx?.ctxPayload?.Body).toContain("hey bot please help");
    expect(ctx?.ctxPayload?.Body).not.toContain("<media:audio>");
  });

  it("skips preflight transcription when disabled by group config", async () => {
    transcribeFirstAudioMock.mockResolvedValueOnce("hey bot please help");

    const ctx = await buildTelegramMessageContext({
      primaryCtx: {
        message: {
          message_id: 2,
          chat: { id: -1001234567890, type: "supergroup", title: "Test Group" },
          date: 1700000000,
          from: { id: 42, first_name: "Alice" },
          voice: { file_id: "voice-1" },
        },
        me: { id: 7, username: "bot" },
      } as never,
      allMedia: [{ path: "/tmp/voice.ogg", contentType: "audio/ogg" }],
      storeAllowFrom: [],
      options: { forceWasMentioned: true },
      bot: {
        api: {
          sendChatAction: vi.fn(),
          sendMessage: vi.fn(),
          setMessageReaction: vi.fn(),
        },
      } as never,
      cfg: {
        agents: { defaults: { model: "anthropic/claude-opus-4-5", workspace: "/tmp/resonix" } },
        channels: { telegram: {} },
        messages: { groupChat: { mentionPatterns: ["\\bbot\\b"] } },
      } as never,
      account: { accountId: "default" } as never,
      historyLimit: 0,
      groupHistories: new Map(),
      dmPolicy: "open",
      allowFrom: [],
      groupAllowFrom: [],
      ackReactionScope: "off",
      logger: { info: vi.fn() },
      resolveGroupActivation: () => true,
      resolveGroupRequireMention: () => true,
      resolveTelegramGroupConfig: () => ({
        groupConfig: { requireMention: true, disableAudioPreflight: true },
        topicConfig: undefined,
      }),
    });

    expect(ctx).not.toBeNull();
    expect(transcribeFirstAudioMock).not.toHaveBeenCalled();
    expect(ctx?.ctxPayload?.BodyForAgent).toBe("<media:audio>");
  });

  it("sends transcript echo when configured", async () => {
    transcribeFirstAudioMock.mockResolvedValueOnce("hey bot please help");
    const sendMessage = vi.fn().mockResolvedValue(undefined);

    const ctx = await buildTelegramMessageContext({
      primaryCtx: {
        message: {
          message_id: 3,
          chat: { id: -1001234567890, type: "supergroup", title: "Test Group" },
          date: 1700000000,
          from: { id: 42, first_name: "Alice" },
          voice: { file_id: "voice-1" },
        },
        me: { id: 7, username: "bot" },
      } as never,
      allMedia: [{ path: "/tmp/voice.ogg", contentType: "audio/ogg" }],
      storeAllowFrom: [],
      options: { forceWasMentioned: true },
      bot: {
        api: {
          sendChatAction: vi.fn(),
          sendMessage,
          setMessageReaction: vi.fn(),
        },
      } as never,
      cfg: {
        agents: { defaults: { model: "anthropic/claude-opus-4-5", workspace: "/tmp/resonix" } },
        channels: { telegram: {} },
        messages: { groupChat: { mentionPatterns: ["\\bbot\\b"] } },
        tools: {
          media: {
            audio: {
              echoTranscript: true,
              echoFormat: "Heard this: {transcript}",
            },
          },
        },
      } as never,
      account: { accountId: "default" } as never,
      historyLimit: 0,
      groupHistories: new Map(),
      dmPolicy: "open",
      allowFrom: [],
      groupAllowFrom: [],
      ackReactionScope: "off",
      logger: { info: vi.fn() },
      resolveGroupActivation: () => true,
      resolveGroupRequireMention: () => true,
      resolveTelegramGroupConfig: () => ({
        groupConfig: { requireMention: true },
        topicConfig: undefined,
      }),
    });

    expect(ctx).not.toBeNull();
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(-1001234567890, "Heard this: hey bot please help", undefined);
  });
});
