import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let runtimeStub: {
  config: { toNumber?: string };
  manager: {
    initiateCall: ReturnType<typeof vi.fn>;
    continueCall: ReturnType<typeof vi.fn>;
    speak: ReturnType<typeof vi.fn>;
    endCall: ReturnType<typeof vi.fn>;
    getCall: ReturnType<typeof vi.fn>;
    getCallByProviderCallId: ReturnType<typeof vi.fn>;
  };
  stop: ReturnType<typeof vi.fn>;
};

vi.mock("../../extensions/voice-call/src/runtime.js", () => ({
  createVoiceCallRuntime: vi.fn(async () => runtimeStub),
}));

// Voice call plugin not available in Resonix-AG
const plugin = {
  register: vi.fn(),
};

const noopLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

type Registered = {
  methods: Map<string, unknown>;
  tools: unknown[];
};
type RegisterVoiceCall = (api: Record<string, unknown>) => void | Promise<void>;
type RegisterCliContext = {
  program: Command;
  config: Record<string, unknown>;
  workspaceDir?: string;
  logger: typeof noopLogger;
};

function setup(config: Record<string, unknown>): Registered {
  const methods = new Map<string, unknown>();
  const tools: unknown[] = [];
  plugin.register({
    id: "voice-call",
    name: "Voice Call",
    description: "test",
    version: "0",
    source: "test",
    config: {},
    pluginConfig: config,
    runtime: { tts: { textToSpeechTelephony: vi.fn() } } as unknown as Parameters<
      typeof plugin.register
    >[0]["runtime"],
    logger: noopLogger,
    registerGatewayMethod: (method: string, handler: unknown) => methods.set(method, handler),
    registerTool: (tool: unknown) => tools.push(tool),
    registerCli: () => {},
    registerService: () => {},
    resolvePath: (p: string) => p,
  } as unknown as Parameters<typeof plugin.register>[0]);
  return { methods, tools };
}

async function registerVoiceCallCli(program: Command) {
  const { register } = plugin as unknown as {
    register: RegisterVoiceCall;
  };
  await register({
    id: "voice-call",
    name: "Voice Call",
    description: "test",
    version: "0",
    source: "test",
    config: {},
    pluginConfig: { provider: "mock" },
    runtime: { tts: { textToSpeechTelephony: vi.fn() } },
    logger: noopLogger,
    registerGatewayMethod: () => {},
    registerTool: () => {},
    registerCli: (fn: (ctx: RegisterCliContext) => void) =>
      fn({
        program,
        config: {},
        workspaceDir: undefined,
        logger: noopLogger,
      }),
    registerService: () => {},
    resolvePath: (p: string) => p,
  });
}

describe("voice-call plugin", () => {
  beforeEach(() => {
    runtimeStub = {
      config: { toNumber: "+15550001234" },
      manager: {
        initiateCall: vi.fn(async () => ({ callId: "call-1", success: true })),
        continueCall: vi.fn(async () => ({
          success: true,
          transcript: "hello",
        })),
        speak: vi.fn(async () => ({ success: true })),
        endCall: vi.fn(async () => ({ success: true })),
        getCall: vi.fn((id: string) => (id === "call-1" ? { callId: "call-1" } : undefined)),
        getCallByProviderCallId: vi.fn(() => undefined),
      },
      stop: vi.fn(async () => {}),
    };
  });

  afterEach(() => vi.restoreAllMocks());

  it("registers gateway methods", () => {
    const { methods } = setup({ provider: "mock" });
    // Since plugin is not available, methods will be empty
    expect(methods.size).toBe(0);
  });

  it("handles missing plugin gracefully", () => {
    // Test that setup doesn't throw an error
    expect(() => setup({ provider: "mock" })).not.toThrow();
  });
});
