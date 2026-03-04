import { beforeEach, describe, expect, it, vi } from "vitest";

const { createBrowserRouteContextMock, listKnownProfileNamesMock } = vi.hoisted(() => ({
  createBrowserRouteContextMock: vi.fn(),
  listKnownProfileNamesMock: vi.fn(),
}));

vi.mock("./server-context.js", () => ({
  createBrowserRouteContext: createBrowserRouteContextMock,
  listKnownProfileNames: listKnownProfileNamesMock,
}));

import { ensureExtensionRelayForProfiles, stopKnownBrowserProfiles } from "./server-lifecycle.js";

describe("ensureExtensionRelayForProfiles", () => {
  it("is a no-op after extension relay retirement", async () => {
    const onWarn = vi.fn();

    await ensureExtensionRelayForProfiles({
      resolved: { profiles: { resonix: {} } } as never,
      onWarn,
    });

    expect(onWarn).not.toHaveBeenCalled();
  });
});

describe("stopKnownBrowserProfiles", () => {
  beforeEach(() => {
    createBrowserRouteContextMock.mockReset();
    listKnownProfileNamesMock.mockReset();
  });

  it("stops all known profiles and ignores per-profile failures", async () => {
    listKnownProfileNamesMock.mockReturnValue(["resonix", "chrome"]);
    const stopMap: Record<string, ReturnType<typeof vi.fn>> = {
      resonix: vi.fn(async () => {}),
      chrome: vi.fn(async () => {
        throw new Error("profile stop failed");
      }),
    };
    createBrowserRouteContextMock.mockReturnValue({
      forProfile: (name: string) => ({
        stopRunningBrowser: stopMap[name],
      }),
    });
    const onWarn = vi.fn();
    const state = { resolved: { profiles: {} }, profiles: new Map() };

    await stopKnownBrowserProfiles({
      getState: () => state as never,
      onWarn,
    });

    expect(stopMap.resonix).toHaveBeenCalledTimes(1);
    expect(stopMap.chrome).toHaveBeenCalledTimes(1);
    expect(onWarn).not.toHaveBeenCalled();
  });

  it("warns when profile enumeration fails", async () => {
    listKnownProfileNamesMock.mockImplementation(() => {
      throw new Error("oops");
    });
    createBrowserRouteContextMock.mockReturnValue({
      forProfile: vi.fn(),
    });
    const onWarn = vi.fn();

    await stopKnownBrowserProfiles({
      getState: () => ({ resolved: { profiles: {} }, profiles: new Map() }) as never,
      onWarn,
    });

    expect(onWarn).toHaveBeenCalledWith("resonix browser stop failed: Error: oops");
  });
});
