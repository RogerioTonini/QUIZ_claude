import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Route handlers against a real Postgres: TEST_DATABASE_URL locally (PGlite or a throwaway database),
// the service container's DATABASE_URL in CI. Files share the database, so they run serially.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["./tests/integration/setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
