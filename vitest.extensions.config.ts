import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^resonix\/plugin-sdk\/account-id$/,
        replacement: fileURLToPath(new URL("./src/plugin-sdk/account-id.ts", import.meta.url)),
      },
      {
        find: /^resonix\/plugin-sdk$/,
        replacement: fileURLToPath(new URL("./src/plugin-sdk/index.ts", import.meta.url)),
      },
    ],
  },
  test: {
    include: ["extensions/**/*.test.ts"],
    environment: "node",
    passWithNoTests: true,
  },
});
