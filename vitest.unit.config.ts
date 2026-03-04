import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.e2e.test.ts"],
    exclude: ["src/gateway/**/*.test.ts", "src/gateway/**/*.e2e.test.ts", "extensions/**/*.test.ts"],
    environment: "node",
    passWithNoTests: false,
  },
});
