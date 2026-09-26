import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    // Tests hit the real database in .env.local (see README).
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
