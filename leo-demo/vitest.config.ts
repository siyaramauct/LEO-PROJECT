// -----------------------------------------------------------------------------
// Vitest: unit tests (npm test)
//
// Fast tests of pure code in src/domain and src/utils. They need no database,
// so the integration tests are left out here (see vitest.integration.config.ts).
// -----------------------------------------------------------------------------

import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "tests/integration/**"],
  },
});
