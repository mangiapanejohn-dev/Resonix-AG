import { captureEnv } from "../test-utils/env.js";

export function snapshotStateDirEnv() {
  return captureEnv(["RESONIX_STATE_DIR", "RESONIXDBOT_STATE_DIR"]);
}

export function restoreStateDirEnv(snapshot: ReturnType<typeof snapshotStateDirEnv>): void {
  snapshot.restore();
}

export function setStateDirEnv(stateDir: string): void {
  process.env.RESONIX_STATE_DIR = stateDir;
  delete process.env.RESONIXDBOT_STATE_DIR;
}
