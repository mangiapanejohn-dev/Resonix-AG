import { telegramPlugin } from "../../extensions/telegram/src/channel.js";
import { setActivePluginRegistry } from "../plugins/runtime.js";
import { createTestRegistry } from "../test-utils/channel-plugins.js";

export function setDefaultChannelPluginRegistryForTests(): void {
  const channels = [
    { pluginId: "telegram", plugin: telegramPlugin, source: "test" },
  ] as unknown as Parameters<typeof createTestRegistry>[0];
  setActivePluginRegistry(createTestRegistry(channels));
}
