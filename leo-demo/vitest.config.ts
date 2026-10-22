// -----------------------------------------------------------------------------
// Vitest: unit tests (npm test)
//
// The project has three layers of tests, each with its own runner:
//   1. unit         tests/unit         Vitest (this file): pure code, no database
//   2. integration  tests/integration  Vitest (vitest.integration.config.ts):
//                                      services and RLS against local Supabase
//   3. end-to-end   tests/e2e          Playwright (playwright.config.ts): whole
//                                      user journeys in a real browser
//
// This run leaves the other two layers out. Vitest would otherwise also pick up
// Playwright's *.spec.ts files, which only Playwright can run.
// -----------------------------------------------------------------------------

import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "tests/integration/**", "tests/e2e/**"],
  },
});
