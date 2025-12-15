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
    environment: "jsdom",
    setupFiles: ["__tests__/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
  },
});
