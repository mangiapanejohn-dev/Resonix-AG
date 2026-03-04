import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CliDeps } from "../cli/deps.js";
import type { ResonixConfig } from "../config/config.js";
import { SsrFBlockedError } from "../infra/net/ssrf.js";

const enqueueSystemEventMock = vi.fn();
const requestHeartbeatNowMock = vi.fn();
const loadConfigMock = vi.fn();
const fetchWithSsrFGuardMock = vi.fn();
const updatePermanentMemoryProfileMock = vi.fn(async () => ({
  updated: true,
  extracted: 1,
  added: 1,
  touched: 1,
  profile: {
    version: 1 as const,
    updatedAtMs: Date.now(),
    entries: [],
  },
  paths: {
    jsonPath: "/tmp/permanent-memory.json",
    markdownPath: "/tmp/permanent-memory.md",
  },
}));

vi.mock("../infra/system-events.js", () => ({
  enqueueSystemEvent: (...args: unknown[]) => enqueueSystemEventMock(...args),
}));

vi.mock("../infra/heartbeat-wake.js", () => ({
  requestHeartbeatNow: (...args: unknown[]) => requestHeartbeatNowMock(...args),
}));

vi.mock("../config/config.js", async () => {
  const actual = await vi.importActual<typeof import("../config/config.js")>("../config/config.js");
  return {
    ...actual,
    loadConfig: () => loadConfigMock(),
  };
});

vi.mock("../infra/net/fetch-guard.js", () => ({
  fetchWithSsrFGuard: (...args: unknown[]) => fetchWithSsrFGuardMock(...args),
}));

vi.mock("../memory/permanent-profile.js", async () => {
  const actual = await vi.importActual<typeof import("../memory/permanent-profile.js")>(
    "../memory/permanent-profile.js",
  );
  return {
    ...actual,
    updatePermanentMemoryProfile: (...args: unknown[]) => updatePermanentMemoryProfileMock(...args),
  };
});

import { buildGatewayCronService } from "./server-cron.js";

describe("buildGatewayCronService", () => {
  beforeEach(() => {
    enqueueSystemEventMock.mockReset();
    requestHeartbeatNowMock.mockReset();
    loadConfigMock.mockReset();
    fetchWithSsrFGuardMock.mockReset();
    updatePermanentMemoryProfileMock.mockReset();
    updatePermanentMemoryProfileMock.mockResolvedValue({
      updated: true,
      extracted: 1,
      added: 1,
      touched: 1,
      profile: {
        version: 1 as const,
        updatedAtMs: Date.now(),
        entries: [],
      },
      paths: {
        jsonPath: "/tmp/permanent-memory.json",
        markdownPath: "/tmp/permanent-memory.md",
      },
    });
  });

  it("canonicalizes non-agent sessionKey to agent store key for enqueue + wake", async () => {
    const tmpDir = path.join(os.tmpdir(), `server-cron-${Date.now()}`);
    const cfg = {
      session: {
        mainKey: "main",
      },
      cron: {
        store: path.join(tmpDir, "cron.json"),
      },
    } as ResonixConfig;
    loadConfigMock.mockReturnValue(cfg);

    const state = buildGatewayCronService({
      cfg,
      deps: {} as CliDeps,
      broadcast: () => {},
    });
    try {
      const job = await state.cron.add({
        name: "canonicalize-session-key",
        enabled: true,
        schedule: { kind: "at", at: new Date(1).toISOString() },
        sessionTarget: "main",
        wakeMode: "next-heartbeat",
        sessionKey: "discord:channel:ops",
        payload: { kind: "systemEvent", text: "hello" },
      });

      await state.cron.run(job.id, "force");

      expect(enqueueSystemEventMock).toHaveBeenCalledWith(
        "hello",
        expect.objectContaining({
          sessionKey: "agent:main:discord:channel:ops",
        }),
      );
      expect(requestHeartbeatNowMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionKey: "agent:main:discord:channel:ops",
        }),
      );
    } finally {
      state.cron.stop();
    }
  });

  it("blocks private webhook URLs via SSRF-guarded fetch", async () => {
    const tmpDir = path.join(os.tmpdir(), `server-cron-ssrf-${Date.now()}`);
    const cfg = {
      session: {
        mainKey: "main",
      },
      cron: {
        store: path.join(tmpDir, "cron.json"),
      },
    } as ResonixConfig;

    loadConfigMock.mockReturnValue(cfg);
    fetchWithSsrFGuardMock.mockRejectedValue(
      new SsrFBlockedError("Blocked: private/internal IP address"),
    );

    const state = buildGatewayCronService({
      cfg,
      deps: {} as CliDeps,
      broadcast: () => {},
    });
    try {
      const job = await state.cron.add({
        name: "ssrf-webhook-blocked",
        enabled: true,
        schedule: { kind: "at", at: new Date(1).toISOString() },
        sessionTarget: "main",
        wakeMode: "next-heartbeat",
        payload: { kind: "systemEvent", text: "hello" },
        delivery: {
          mode: "webhook",
          to: "http://127.0.0.1:8080/cron-finished",
        },
      });

      await state.cron.run(job.id, "force");

      expect(fetchWithSsrFGuardMock).toHaveBeenCalledOnce();
      expect(fetchWithSsrFGuardMock).toHaveBeenCalledWith({
        url: "http://127.0.0.1:8080/cron-finished",
        init: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: expect.stringContaining('"action":"finished"'),
          signal: expect.any(AbortSignal),
        },
      });
    } finally {
      state.cron.stop();
    }
  });

  it("captures cron outcome into permanent memory", async () => {
    const tmpDir = path.join(os.tmpdir(), `server-cron-memory-${Date.now()}`);
    const cfg = {
      agents: {
        defaults: {
          workspace: tmpDir,
        },
      },
      session: {
        mainKey: "main",
      },
      cron: {
        store: path.join(tmpDir, "cron.json"),
      },
    } as ResonixConfig;
    loadConfigMock.mockReturnValue(cfg);

    const state = buildGatewayCronService({
      cfg,
      deps: {} as CliDeps,
      broadcast: () => {},
    });
    try {
      const job = await state.cron.add({
        name: "capture-outcome",
        enabled: true,
        schedule: { kind: "at", at: new Date(1).toISOString() },
        sessionTarget: "main",
        wakeMode: "next-heartbeat",
        payload: { kind: "systemEvent", text: "daily run complete" },
      });

      await state.cron.run(job.id, "force");
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(updatePermanentMemoryProfileMock).toHaveBeenCalled();
      expect(updatePermanentMemoryProfileMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceDir: tmpDir,
          sourceLabel: `cron:${job.id}`,
        }),
      );
      expect(updatePermanentMemoryProfileMock.mock.calls[0]?.[0]?.sessionContent).toContain(
        "scheduled job",
      );
    } finally {
      state.cron.stop();
    }
  });
});
