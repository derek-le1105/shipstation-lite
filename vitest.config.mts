import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./__tests__/mocks/server-only.ts", import.meta.url)
      ),
    },
  },
  test: {
    dir: "__tests__/unit",
    environment: "jsdom",
    setupFiles: ["__tests__/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{coverage,playwright-report,test-results}/**",
      "__tests__/e2e/**",
    ],
  },
});
