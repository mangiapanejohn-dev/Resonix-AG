import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMessageSlackMock = vi.fn(async () => undefined);

vi.mock("../send.js", () => ({
  sendMessageSlack: (...args: unknown[]) => sendMessageSlackMock(...args),
}));

const { deliverReplies, deliverSlackSlashReplies } = await import("./replies.js");

describe("slack reply delivery normalization", () => {
  beforeEach(() => {
    sendMessageSlackMock.mockClear();
  });

  it("coerces primitive reply text before trimming", async () => {
    await deliverReplies({
      replies: [{ text: 42 as unknown as string }],
      target: "C123",
      token: "xoxb-test",
      runtime: { log: vi.fn() } as never,
      textLimit: 4000,
    });

    expect(sendMessageSlackMock).toHaveBeenCalledTimes(1);
    expect(sendMessageSlackMock).toHaveBeenCalledWith(
      "C123",
      "42",
      expect.objectContaining({ token: "xoxb-test" }),
    );
  });

  it("ignores invalid media URL entries in mixed arrays", async () => {
    await deliverReplies({
      replies: [
        {
          text: "" as string,
          mediaUrls: [" https://example.com/a.png ", undefined, 9] as unknown as string[],
        },
      ],
      target: "C123",
      token: "xoxb-test",
      runtime: { log: vi.fn() } as never,
      textLimit: 4000,
    });

    expect(sendMessageSlackMock).toHaveBeenCalledTimes(1);
    expect(sendMessageSlackMock).toHaveBeenCalledWith(
      "C123",
      "",
      expect.objectContaining({
        token: "xoxb-test",
        mediaUrl: "https://example.com/a.png",
      }),
    );
  });

  it("normalizes slash reply payloads with non-string text/media values", async () => {
    const respond = vi.fn(async () => undefined);

    await deliverSlackSlashReplies({
      replies: [
        {
          text: 123 as unknown as string,
          mediaUrls: [" https://example.com/a.png ", null] as unknown as string[],
        },
      ],
      respond,
      ephemeral: false,
      textLimit: 4000,
    });

    expect(respond).toHaveBeenCalledTimes(1);
    expect(respond).toHaveBeenCalledWith({
      text: "123\nhttps://example.com/a.png",
      response_type: "in_channel",
    });
  });

  it("drops unsupported object text payloads instead of throwing", async () => {
    const respond = vi.fn(async () => undefined);

    await deliverSlackSlashReplies({
      replies: [{ text: { value: "bad" } as unknown as string }],
      respond,
      ephemeral: true,
      textLimit: 4000,
    });

    expect(respond).not.toHaveBeenCalled();
  });
});
