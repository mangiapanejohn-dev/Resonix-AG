import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setActivePluginRegistry } from "../plugins/runtime.js";
import { createTestRegistry } from "../test-utils/channel-plugins.js";
import { formatGatewayChannelsStatusLines } from "./channels/status.js";

describe("channels command", () => {
  afterEach(() => {
    setActivePluginRegistry(createTestRegistry([]));
  });

  it("surfaces runtime errors in channels status output", () => {
    const lines = formatGatewayChannelsStatusLines({
      channelAccounts: {
        telegram: [
          {
            accountId: "default",
            enabled: true,
            configured: true,
            running: false,
            lastError: "telegram error",
          },
        ],
      },
    });
    expect(lines.join("\n")).toMatch(/Warnings:/);
    expect(lines.join("\n")).toMatch(/telegram/i);
    expect(lines.join("\n")).toMatch(/Channel error/i);
  });
});
