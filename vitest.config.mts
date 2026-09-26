import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    // Neon may need a few seconds to wake a suspended database.
    testTimeout: 15_000,
    // Tests hit the real database in .env.local (see README).
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
