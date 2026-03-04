import type { ResolvedBrowserConfig } from "./config.js";
import {
  type BrowserServerState,
  createBrowserRouteContext,
  listKnownProfileNames,
} from "./server-context.js";

export async function ensureExtensionRelayForProfiles(params: {
  resolved: ResolvedBrowserConfig;
  onWarn: (message: string) => void;
}) {
  // Runtime no longer uses the legacy extension relay flow.
  void params;
}

export async function stopKnownBrowserProfiles(params: {
  getState: () => BrowserServerState | null;
  onWarn: (message: string) => void;
}) {
  const current = params.getState();
  if (!current) {
    return;
  }
  const ctx = createBrowserRouteContext({
    getState: params.getState,
    refreshConfigFromDisk: true,
  });
  try {
    for (const name of listKnownProfileNames(current)) {
      try {
        await ctx.forProfile(name).stopRunningBrowser();
      } catch {
        // ignore
      }
    }
  } catch (err) {
    params.onWarn(`resonix browser stop failed: ${String(err)}`);
  }
}
