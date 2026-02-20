import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPluginManifest } from "./manifest.js";
import { createPluginRegistry } from "./registry.js";
import { createPluginRuntime } from "./runtime/index.js";
import type { ProviderPlugin } from "./types.js";

// Lightweight plugin loader - only loads specific plugin by ID
export async function loadSinglePlugin(params: {
  pluginId: string;
  config?: Record<string, unknown>;
}): Promise<ProviderPlugin | null> {
  // Direct plugin mapping - avoid expensive discovery
  const pluginRootDirs: Record<string, string> = {
    "minimax-portal-auth": "extensions/minimax-portal-auth",
    "qwen-portal-auth": "extensions/qwen-portal-auth",
    "google-antigravity-auth": "extensions/google-antigravity-auth",
    "google-gemini-cli-auth": "extensions/google-gemini-cli-auth",
    "copilot-proxy-auth": "extensions/copilot-proxy-auth",
  };

  const rootDir = pluginRootDirs[params.pluginId];
  if (!rootDir) {
    return null;
  }

  // Load manifest
  const manifestResult = loadPluginManifest(rootDir);
  if (!manifestResult.ok || !manifestResult.manifest) {
    return null;
  }

  // Check if provider is declared
  const providers = manifestResult.manifest.providers ?? [];
  if (providers.length === 0) {
    return null;
  }

  const providerId = providers[0]; // Use first provider

  // Build the plugin entry point path
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const entryPoint = path.join(__dirname, "..", rootDir, "index.ts");

  // Direct dynamic import - faster than jiti
  let mod: unknown;
  try {
    mod = await import(entryPoint + "?t=" + Date.now());
  } catch {
    // Try .mjs fallback
    try {
      const mjsPath = entryPoint.replace(".ts", ".mjs");
      mod = await import(mjsPath + "?t=" + Date.now());
    } catch {
      return null;
    }
  }

  // Get default export
  const pluginModule = mod && typeof mod === "object" && "default" in mod ? (mod as { default: unknown }).default : mod;

  // Call register function
  const register = typeof pluginModule === "function" ? pluginModule : (pluginModule as { register?: unknown })?.register;
  if (typeof register !== "function") {
    return null;
  }

  // Create mock API for provider registration
  const runtime = createPluginRuntime();
  const { registry, createApi } = createPluginRegistry({
    logger: () => ({ debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }),
    runtime,
  });

  const api = createApi(
    {
      id: manifestResult.manifest.id,
      name: manifestResult.manifest.name ?? manifestResult.manifest.id,
      description: manifestResult.manifest.description,
      version: manifestResult.manifest.version,
      source: "index.ts",
      origin: "bundled",
      workspaceDir: undefined,
      enabled: true,
      status: "loaded",
      toolNames: [],
      hookNames: [],
      channelIds: [],
      providerIds: [],
      gatewayMethods: [],
      cliCommands: [],
      services: [],
      commands: [],
      httpHandlers: 0,
      hookCount: 0,
      configSchema: Boolean(manifestResult.manifest.configSchema),
      configJsonSchema: undefined,
      configUiHints: undefined,
    },
    { config: {} },
  );

  try {
    register(api);
  } catch {
    return null;
  }

  // Return the provider
  const providerEntry = registry.providers.find((p) => p.id === providerId);
  return providerEntry?.provider ?? null;
}

// Export the provider registration function types
export type { ProviderAuthContext, ProviderAuthResult } from "resonix/plugin-sdk";
