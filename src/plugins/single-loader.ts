import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";
import { loadPluginManifest } from "./manifest.js";
import { createPluginRegistry } from "./registry.js";
import { createPluginRuntime } from "./runtime/index.js";
import type { ProviderPlugin } from "./types.js";

const pluginRootDirs: Record<string, string> = {
  "minimax-portal-auth": "extensions/minimax-portal-auth",
  "qwen-portal-auth": "extensions/qwen-portal-auth",
  "google-antigravity-auth": "extensions/google-antigravity-auth",
  "google-gemini-cli-auth": "extensions/google-gemini-cli-auth",
  "copilot-proxy-auth": "extensions/copilot-proxy-auth",
};

const singleProviderCache = new Map<string, ProviderPlugin>();
let singleLoaderJiti: ReturnType<typeof createJiti> | null = null;

function resolveProjectRoot(): string {
  let cursor = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i += 1) {
    const pkgJson = path.join(cursor, "package.json");
    if (fs.existsSync(pkgJson)) {
      return cursor;
    }
    const parent = path.dirname(cursor);
    if (parent === cursor) {
      break;
    }
    cursor = parent;
  }
  return process.cwd();
}

function resolvePluginEntry(projectRoot: string, rootDir: string): string | null {
  const sourceRoot = path.join(projectRoot, rootDir);
  const distRoot = path.join(projectRoot, "dist", rootDir);
  const candidates = [
    path.join(sourceRoot, "index.ts"),
    path.join(sourceRoot, "index.mjs"),
    path.join(sourceRoot, "index.js"),
    path.join(distRoot, "index.mjs"),
    path.join(distRoot, "index.js"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function resolvePluginSdkAliasFile(projectRoot: string, params: {
  srcFile: string;
  distFile: string;
}): string | null {
  const srcCandidate = path.join(projectRoot, "src", "plugin-sdk", params.srcFile);
  const distCandidate = path.join(projectRoot, "dist", "plugin-sdk", params.distFile);
  const isProduction = process.env.NODE_ENV === "production";
  const orderedCandidates = isProduction
    ? [distCandidate, srcCandidate]
    : [srcCandidate, distCandidate];
  for (const candidate of orderedCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function getSingleLoaderJiti(projectRoot: string): ReturnType<typeof createJiti> {
  if (singleLoaderJiti) {
    return singleLoaderJiti;
  }
  const pluginSdkAlias = resolvePluginSdkAliasFile(projectRoot, {
    srcFile: "index.ts",
    distFile: "index.js",
  });
  const pluginSdkAccountIdAlias = resolvePluginSdkAliasFile(projectRoot, {
    srcFile: "account-id.ts",
    distFile: "account-id.js",
  });
  singleLoaderJiti = createJiti(import.meta.url, {
    interopDefault: true,
    extensions: [".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs", ".json"],
    ...(pluginSdkAlias || pluginSdkAccountIdAlias
      ? {
          alias: {
            ...(pluginSdkAlias ? { "resonix/plugin-sdk": pluginSdkAlias } : {}),
            ...(pluginSdkAccountIdAlias
              ? { "resonix/plugin-sdk/account-id": pluginSdkAccountIdAlias }
              : {}),
          },
        }
      : {}),
  });
  return singleLoaderJiti;
}

// Lightweight plugin loader - only loads specific plugin by ID
export async function loadSinglePlugin(params: {
  pluginId: string;
  config?: Record<string, unknown>;
}): Promise<ProviderPlugin | null> {
  const cached = singleProviderCache.get(params.pluginId);
  if (cached) {
    return cached;
  }

  const rootDir = pluginRootDirs[params.pluginId];
  if (!rootDir) {
    return null;
  }

  const projectRoot = resolveProjectRoot();
  const pluginRoot = path.join(projectRoot, rootDir);

  // Load manifest
  const manifestResult = loadPluginManifest(pluginRoot);
  if (!manifestResult.ok || !manifestResult.manifest) {
    return null;
  }

  // Check if provider is declared
  const providers = manifestResult.manifest.providers ?? [];
  if (providers.length === 0) {
    return null;
  }

  const providerId = providers[0]; // Use first provider

  const entryPoint = resolvePluginEntry(projectRoot, rootDir);
  if (!entryPoint) {
    return null;
  }

  // Use Jiti so both TS plugin entries and SDK aliases resolve reliably.
  let mod: unknown;
  try {
    mod = await getSingleLoaderJiti(projectRoot).import(entryPoint);
  } catch {
    return null;
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
  const provider = providerEntry?.provider ?? null;
  if (provider) {
    singleProviderCache.set(params.pluginId, provider);
  }
  return provider;
}

// Export the provider registration function types
export type { ProviderAuthContext, ProviderAuthResult } from "resonix/plugin-sdk";
