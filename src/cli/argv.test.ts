import { describe, expect, it } from "vitest";
import {
  buildParseArgv,
  getFlagValue,
  getCommandPath,
  getPrimaryCommand,
  getPositiveIntFlagValue,
  getVerboseFlag,
  hasHelpOrVersion,
  hasFlag,
  shouldMigrateState,
  shouldMigrateStateFromPath,
} from "./argv.js";

describe("argv helpers", () => {
  it.each([
    {
      name: "help flag",
      argv: ["node", "resonix", "--help"],
      expected: true,
    },
    {
      name: "version flag",
      argv: ["node", "resonix", "-V"],
      expected: true,
    },
    {
      name: "normal command",
      argv: ["node", "resonix", "status"],
      expected: false,
    },
    {
      name: "root -v alias",
      argv: ["node", "resonix", "-v"],
      expected: true,
    },
    {
      name: "root -v alias with profile",
      argv: ["node", "resonix", "--profile", "work", "-v"],
      expected: true,
    },
    {
      name: "subcommand -v should not be treated as version",
      argv: ["node", "resonix", "acp", "-v"],
      expected: false,
    },
    {
      name: "root -v alias with equals profile",
      argv: ["node", "resonix", "--profile=work", "-v"],
      expected: true,
    },
    {
      name: "subcommand path after global root flags should not be treated as version",
      argv: ["node", "resonix", "--dev", "skills", "list", "-v"],
      expected: false,
    },
  ])("detects help/version flags: $name", ({ argv, expected }) => {
    expect(hasHelpOrVersion(argv)).toBe(expected);
  });

  it.each([
    {
      name: "single command with trailing flag",
      argv: ["node", "resonix", "status", "--json"],
      expected: ["status"],
    },
    {
      name: "two-part command",
      argv: ["node", "resonix", "agents", "list"],
      expected: ["agents", "list"],
    },
    {
      name: "terminator cuts parsing",
      argv: ["node", "resonix", "status", "--", "ignored"],
      expected: ["status"],
    },
  ])("extracts command path: $name", ({ argv, expected }) => {
    expect(getCommandPath(argv, 2)).toEqual(expected);
  });

  it.each([
    {
      name: "returns first command token",
      argv: ["node", "resonix", "agents", "list"],
      expected: "agents",
    },
    {
      name: "returns null when no command exists",
      argv: ["node", "resonix"],
      expected: null,
    },
  ])("returns primary command: $name", ({ argv, expected }) => {
    expect(getPrimaryCommand(argv)).toBe(expected);
  });

  it.each([
    {
      name: "detects flag before terminator",
      argv: ["node", "resonix", "status", "--json"],
      flag: "--json",
      expected: true,
    },
    {
      name: "ignores flag after terminator",
      argv: ["node", "resonix", "--", "--json"],
      flag: "--json",
      expected: false,
    },
  ])("parses boolean flags: $name", ({ argv, flag, expected }) => {
    expect(hasFlag(argv, flag)).toBe(expected);
  });

  it.each([
    {
      name: "value in next token",
      argv: ["node", "resonix", "status", "--timeout", "5000"],
      expected: "5000",
    },
    {
      name: "value in equals form",
      argv: ["node", "resonix", "status", "--timeout=2500"],
      expected: "2500",
    },
    {
      name: "missing value",
      argv: ["node", "resonix", "status", "--timeout"],
      expected: null,
    },
    {
      name: "next token is another flag",
      argv: ["node", "resonix", "status", "--timeout", "--json"],
      expected: null,
    },
    {
      name: "flag appears after terminator",
      argv: ["node", "resonix", "--", "--timeout=99"],
      expected: undefined,
    },
  ])("extracts flag values: $name", ({ argv, expected }) => {
    expect(getFlagValue(argv, "--timeout")).toBe(expected);
  });

  it("parses verbose flags", () => {
    expect(getVerboseFlag(["node", "resonix", "status", "--verbose"])).toBe(true);
    expect(getVerboseFlag(["node", "resonix", "status", "--debug"])).toBe(false);
    expect(getVerboseFlag(["node", "resonix", "status", "--debug"], { includeDebug: true })).toBe(
      true,
    );
  });

  it.each([
    {
      name: "missing flag",
      argv: ["node", "resonix", "status"],
      expected: undefined,
    },
    {
      name: "missing value",
      argv: ["node", "resonix", "status", "--timeout"],
      expected: null,
    },
    {
      name: "valid positive integer",
      argv: ["node", "resonix", "status", "--timeout", "5000"],
      expected: 5000,
    },
    {
      name: "invalid integer",
      argv: ["node", "resonix", "status", "--timeout", "nope"],
      expected: undefined,
    },
  ])("parses positive integer flag values: $name", ({ argv, expected }) => {
    expect(getPositiveIntFlagValue(argv, "--timeout")).toBe(expected);
  });

  it("builds parse argv from raw args", () => {
    const cases = [
      {
        rawArgs: ["node", "resonix", "status"],
        expected: ["node", "resonix", "status"],
      },
      {
        rawArgs: ["node-22", "resonix", "status"],
        expected: ["node-22", "resonix", "status"],
      },
      {
        rawArgs: ["node-22.2.0.exe", "resonix", "status"],
        expected: ["node-22.2.0.exe", "resonix", "status"],
      },
      {
        rawArgs: ["node-22.2", "resonix", "status"],
        expected: ["node-22.2", "resonix", "status"],
      },
      {
        rawArgs: ["node-22.2.exe", "resonix", "status"],
        expected: ["node-22.2.exe", "resonix", "status"],
      },
      {
        rawArgs: ["/usr/bin/node-22.2.0", "resonix", "status"],
        expected: ["/usr/bin/node-22.2.0", "resonix", "status"],
      },
      {
        rawArgs: ["nodejs", "resonix", "status"],
        expected: ["nodejs", "resonix", "status"],
      },
      {
        rawArgs: ["node-dev", "resonix", "status"],
        expected: ["node", "resonix", "node-dev", "resonix", "status"],
      },
      {
        rawArgs: ["resonix", "status"],
        expected: ["node", "resonix", "status"],
      },
      {
        rawArgs: ["bun", "src/entry.ts", "status"],
        expected: ["bun", "src/entry.ts", "status"],
      },
    ] as const;

    for (const testCase of cases) {
      const parsed = buildParseArgv({
        programName: "resonix",
        rawArgs: [...testCase.rawArgs],
      });
      expect(parsed).toEqual([...testCase.expected]);
    }
  });

  it("builds parse argv from fallback args", () => {
    const fallbackArgv = buildParseArgv({
      programName: "resonix",
      fallbackArgv: ["status"],
    });
    expect(fallbackArgv).toEqual(["node", "resonix", "status"]);
  });

  it("decides when to migrate state", () => {
    const nonMutatingArgv = [
      ["node", "resonix", "status"],
      ["node", "resonix", "health"],
      ["node", "resonix", "sessions"],
      ["node", "resonix", "config", "get", "update"],
      ["node", "resonix", "config", "unset", "update"],
      ["node", "resonix", "models", "list"],
      ["node", "resonix", "models", "status"],
      ["node", "resonix", "memory", "status"],
      ["node", "resonix", "agent", "--message", "hi"],
    ] as const;
    const mutatingArgv = [
      ["node", "resonix", "agents", "list"],
      ["node", "resonix", "message", "send"],
    ] as const;

    for (const argv of nonMutatingArgv) {
      expect(shouldMigrateState([...argv])).toBe(false);
    }
    for (const argv of mutatingArgv) {
      expect(shouldMigrateState([...argv])).toBe(true);
    }
  });

  it.each([
    { path: ["status"], expected: false },
    { path: ["config", "get"], expected: false },
    { path: ["models", "status"], expected: false },
    { path: ["agents", "list"], expected: true },
  ])("reuses command path for migrate state decisions: $path", ({ path, expected }) => {
    expect(shouldMigrateStateFromPath(path)).toBe(expected);
  });
});
