import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatCliCommand } from "./command-format.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./profile.js";

describe("parseCliProfileArgs", () => {
  it("leaves gateway --dev for subcommands", () => {
    const res = parseCliProfileArgs([
      "node",
      "resonix",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "resonix", "gateway", "--dev", "--allow-unconfigured"]);
  });

  it("still accepts global --dev before subcommand", () => {
    const res = parseCliProfileArgs(["node", "resonix", "--dev", "gateway"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "resonix", "gateway"]);
  });

  it("parses --profile value and strips it", () => {
    const res = parseCliProfileArgs(["node", "resonix", "--profile", "work", "status"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "resonix", "status"]);
  });

  it("rejects missing profile value", () => {
    const res = parseCliProfileArgs(["node", "resonix", "--profile"]);
    expect(res.ok).toBe(false);
  });

  it.each([
    ["--dev first", ["node", "resonix", "--dev", "--profile", "work", "status"]],
    ["--profile first", ["node", "resonix", "--profile", "work", "--dev", "status"]],
  ])("rejects combining --dev with --profile (%s)", (_name, argv) => {
    const res = parseCliProfileArgs(argv);
    expect(res.ok).toBe(false);
  });
});

describe("applyCliProfileEnv", () => {
  it("fills env defaults for dev profile", () => {
    const env: Record<string, string | undefined> = {};
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    const expectedStateDir = path.join(path.resolve("/home/peter"), ".resonix-dev");
    expect(env.RESONIX_PROFILE).toBe("dev");
    expect(env.RESONIX_STATE_DIR).toBe(expectedStateDir);
    expect(env.RESONIX_CONFIG_PATH).toBe(path.join(expectedStateDir, "resonix.json"));
    expect(env.RESONIX_GATEWAY_PORT).toBe("19001");
  });

  it("does not override explicit env values", () => {
    const env: Record<string, string | undefined> = {
      RESONIX_STATE_DIR: "/custom",
      RESONIX_GATEWAY_PORT: "19099",
    };
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    expect(env.RESONIX_STATE_DIR).toBe("/custom");
    expect(env.RESONIX_GATEWAY_PORT).toBe("19099");
    expect(env.RESONIX_CONFIG_PATH).toBe(path.join("/custom", "resonix.json"));
  });

  it("uses RESONIX_HOME when deriving profile state dir", () => {
    const env: Record<string, string | undefined> = {
      RESONIX_HOME: "/srv/resonix-home",
      HOME: "/home/other",
    };
    applyCliProfileEnv({
      profile: "work",
      env,
      homedir: () => "/home/fallback",
    });

    const resolvedHome = path.resolve("/srv/resonix-home");
    expect(env.RESONIX_STATE_DIR).toBe(path.join(resolvedHome, ".resonix-work"));
    expect(env.RESONIX_CONFIG_PATH).toBe(
      path.join(resolvedHome, ".resonix-work", "resonix.json"),
    );
  });
});

describe("formatCliCommand", () => {
  it.each([
    {
      name: "no profile is set",
      cmd: "resonix doctor --fix",
      env: {},
      expected: "resonix doctor --fix",
    },
    {
      name: "profile is default",
      cmd: "resonix doctor --fix",
      env: { RESONIX_PROFILE: "default" },
      expected: "resonix doctor --fix",
    },
    {
      name: "profile is Default (case-insensitive)",
      cmd: "resonix doctor --fix",
      env: { RESONIX_PROFILE: "Default" },
      expected: "resonix doctor --fix",
    },
    {
      name: "profile is invalid",
      cmd: "resonix doctor --fix",
      env: { RESONIX_PROFILE: "bad profile" },
      expected: "resonix doctor --fix",
    },
    {
      name: "--profile is already present",
      cmd: "resonix --profile work doctor --fix",
      env: { RESONIX_PROFILE: "work" },
      expected: "resonix --profile work doctor --fix",
    },
    {
      name: "--dev is already present",
      cmd: "resonix --dev doctor",
      env: { RESONIX_PROFILE: "dev" },
      expected: "resonix --dev doctor",
    },
  ])("returns command unchanged when $name", ({ cmd, env, expected }) => {
    expect(formatCliCommand(cmd, env)).toBe(expected);
  });

  it("inserts --profile flag when profile is set", () => {
    expect(formatCliCommand("resonix doctor --fix", { RESONIX_PROFILE: "work" })).toBe(
      "resonix --profile work doctor --fix",
    );
  });

  it("trims whitespace from profile", () => {
    expect(formatCliCommand("resonix doctor --fix", { RESONIX_PROFILE: "  jbresonix  " })).toBe(
      "resonix --profile jbresonix doctor --fix",
    );
  });

  it("handles command with no args after resonix", () => {
    expect(formatCliCommand("resonix", { RESONIX_PROFILE: "test" })).toBe(
      "resonix --profile test",
    );
  });

  it("handles pnpm wrapper", () => {
    expect(formatCliCommand("pnpm resonix doctor", { RESONIX_PROFILE: "work" })).toBe(
      "pnpm resonix --profile work doctor",
    );
  });
});
