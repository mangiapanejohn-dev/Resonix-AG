import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/gateway/**/*.test.ts", "src/gateway/**/*.e2e.test.ts"],
    environment: "node",
    passWithNoTests: false,
  },
});
