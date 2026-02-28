import { beforeEach } from "vitest";
import { telegramPlugin } from "../../extensions/telegram/src/channel.js";
import { setTelegramRuntime } from "../../extensions/telegram/src/runtime.js";
import type { ChannelPlugin } from "../channels/plugins/types.plugin.js";
import { setActivePluginRegistry } from "../plugins/runtime.js";
import { createPluginRuntime } from "../plugins/runtime/index.js";
import { createTestRegistry } from "../test-utils/channel-plugins.js";

const telegramChannelPlugin = telegramPlugin as unknown as ChannelPlugin;

export function installHeartbeatRunnerTestRuntime(params?: { includeSlack?: boolean }): void {
  beforeEach(() => {
    const runtime = createPluginRuntime();
    setTelegramRuntime(runtime);
    setActivePluginRegistry(
      createTestRegistry([{ pluginId: "telegram", plugin: telegramChannelPlugin, source: "test" }]),
    );
  });
}
