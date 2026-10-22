// -----------------------------------------------------------------------------
// Vitest: integration tests (npm run test:integration)
//
// Runs the app's real services against the local Supabase in Docker. Start it
// first with `npx supabase start`.
//
// Credentials, always the LOCAL stack's and never the hosted project's:
//   on your machine   .env.test, filled in from .env.test.example
//   in GitHub Actions environment variables the workflow sets from that run's
//                     `supabase status -o env`; these take priority over
//                     .env.test, so no file or GitHub Secret is needed there
// -----------------------------------------------------------------------------

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],

    // Loads every variable from .env.test and from the environment (which
    // wins), including SUPABASE_SECRET_KEY: it isn't a VITE_ variable, so it
    // wouldn't reach the tests otherwise.
    env: loadEnv("test", process.cwd(), ""),

    // The test files share one database, so run them one after another.
    fileParallelism: false,

    // Real network calls are slower than pure functions.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
