#!/usr/bin/env node

import module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Get the directory where the script is located
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptDir = __dirname;

// https://nodejs.org/api/module.html#module-compile-cache
if (module.enableCompileCache && !process.env.NODE_DISABLE_COMPILE_CACHE) {
  try {
    module.enableCompileCache();
  } catch {
    // Ignore errors
  }
}

const isModuleNotFoundError = (err) =>
  err && typeof err === "object" && "code" in err && err.code === "ERR_MODULE_NOT_FOUND";

const installProcessWarningFilter = async () => {
  // Keep bootstrap warnings consistent with the TypeScript runtime.
  for (const specifier of ["./dist/warning-filter.js", "./dist/warning-filter.mjs"]) {
    try {
      const mod = await import(specifier);
      if (typeof mod.installProcessWarningFilter === "function") {
        mod.installProcessWarningFilter();
        return;
      }
    } catch (err) {
      if (isModuleNotFoundError(err)) {
        continue;
      }
      throw err;
    }
  }
};

await installProcessWarningFilter();

const tryImport = async (specifier) => {
  try {
    await import(specifier);
    return true;
  } catch (err) {
    // Only swallow missing-module errors; rethrow real runtime errors.
    if (isModuleNotFoundError(err)) {
      return false;
    }
    throw err;
  }
};

const distIndexJs = path.join(scriptDir, "dist", "index.js");
const distIndexMjs = path.join(scriptDir, "dist", "index.mjs");

if (await tryImport(distIndexJs)) {
  // OK
} else if (await tryImport(distIndexMjs)) {
  // OK
} else {
  throw new Error("resonix: missing dist/index.(m)js (build output).");
}
