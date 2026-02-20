import { describe, expect, it } from "vitest";
import { resolveIrcInboundTarget } from "./monitor.js";

describe("irc monitor inbound target", () => {
  it("keeps channel target for group messages", () => {
    expect(
      resolveIrcInboundTarget({
        target: "#resonix",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: true,
      target: "#resonix",
      rawTarget: "#resonix",
    });
  });

  it("maps DM target to sender nick and preserves raw target", () => {
    expect(
      resolveIrcInboundTarget({
        target: "resonix-bot",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: false,
      target: "alice",
      rawTarget: "resonix-bot",
    });
  });

  it("falls back to raw target when sender nick is empty", () => {
    expect(
      resolveIrcInboundTarget({
        target: "resonix-bot",
        senderNick: " ",
      }),
    ).toEqual({
      isGroup: false,
      target: "resonix-bot",
      rawTarget: "resonix-bot",
    });
  });
});
