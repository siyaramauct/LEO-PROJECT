// -----------------------------------------------------------------------------
// Vitest: integration tests (npm run test:integration)
//
// Runs the app's real services against the local Supabase in Docker. Start it
// first with `npx supabase start`, and fill in .env.test with the local values
// from `npx supabase status -o env`.
// -----------------------------------------------------------------------------

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],

    // Loads every variable in .env.test, including SUPABASE_SECRET_KEY, which
    // isn't a VITE_ variable and so wouldn't reach the tests otherwise.
    env: loadEnv("test", process.cwd(), ""),

    // The test files share one database, so run them one after another.
    fileParallelism: false,

    // Real network calls are slower than pure functions.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
