import { beforeEach, describe, expect, it } from "vitest";
import {
  clearPluginCommands,
  getPluginCommandSpecs,
  listPluginCommands,
  registerPluginCommand,
} from "./commands.js";

describe("plugin command registration hardening", () => {
  beforeEach(() => {
    clearPluginCommands();
  });

  it("normalizes missing descriptions to an empty string", () => {
    const result = registerPluginCommand("plugin-a", {
      name: "health",
      description: undefined as unknown as string,
      handler: async () => ({ text: "ok" }),
    });

    expect(result.ok).toBe(true);
    expect(getPluginCommandSpecs()).toEqual([{ name: "health", description: "" }]);
    expect(listPluginCommands()).toEqual([
      {
        name: "health",
        description: "",
        pluginId: "plugin-a",
      },
    ]);
  });

  it("rejects non-string command names with a clear error", () => {
    const result = registerPluginCommand("plugin-a", {
      name: 42 as unknown as string,
      description: "test",
      handler: async () => ({ text: "ok" }),
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Command name must be a string");
  });
});
