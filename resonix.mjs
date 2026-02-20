#!/usr/bin/env node

import module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

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

// Forward all arguments to the actual CLI
const args = process.argv.slice(2);
const nodeBin = process.execPath;
const indexPath = path.join(scriptDir, "dist", "index.mjs");

const child = spawn(nodeBin, [indexPath, ...args], {
  stdio: 'inherit',
  cwd: scriptDir,
  env: process.env
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
