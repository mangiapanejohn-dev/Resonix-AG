import { beforeEach, describe, expect, it, vi } from "vitest";

const listChannelPluginsMock = vi.hoisted(() => vi.fn());

vi.mock("../channels/plugins/index.js", () => ({
  listChannelPlugins: (...args: unknown[]) => listChannelPluginsMock(...args),
}));

const { collectChannelStatusIssues } = await import("./channels-status-issues.js");

describe("collectChannelStatusIssues", () => {
  beforeEach(() => {
    listChannelPluginsMock.mockReset();
  });

  it("surfaces generic probe failures when plugin does not provide status collectors", () => {
    listChannelPluginsMock.mockReturnValue([{ id: "telegram" }]);

    const issues = collectChannelStatusIssues({
      channelAccounts: {
        telegram: [
          {
            accountId: "default",
            probe: { ok: false, error: "network timeout" },
          },
        ],
      },
    });

    expect(issues).toEqual([
      {
        channel: "telegram",
        accountId: "default",
        kind: "runtime",
        message: "Probe failed: network timeout",
      },
    ]);
  });

  it("formats HTTP probe failures when only status code is available", () => {
    listChannelPluginsMock.mockReturnValue([{ id: "discord" }]);

    const issues = collectChannelStatusIssues({
      channelAccounts: {
        discord: [
          {
            accountId: "work",
            probe: { ok: false, status: 503 },
          },
        ],
      },
    });

    expect(issues).toEqual([
      {
        channel: "discord",
        accountId: "work",
        kind: "runtime",
        message: "Probe failed (HTTP 503).",
      },
    ]);
  });

  it("does not duplicate runtime issues when plugin already reports one", () => {
    listChannelPluginsMock.mockReturnValue([
      {
        id: "signal",
        status: {
          collectStatusIssues: () => [
            {
              channel: "signal",
              accountId: "default",
              kind: "runtime",
              message: "Channel error: already handled",
            },
          ],
        },
      },
    ]);

    const issues = collectChannelStatusIssues({
      channelAccounts: {
        signal: [
          {
            accountId: "default",
            probe: { ok: false, error: "ignored by dedupe" },
          },
        ],
      },
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toBe("Channel error: already handled");
  });

  it("ignores successful probes", () => {
    listChannelPluginsMock.mockReturnValue([{ id: "imessage" }]);

    const issues = collectChannelStatusIssues({
      channelAccounts: {
        imessage: [
          {
            accountId: "default",
            probe: { ok: true },
          },
        ],
      },
    });

    expect(issues).toEqual([]);
  });
});
