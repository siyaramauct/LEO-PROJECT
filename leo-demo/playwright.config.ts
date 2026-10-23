// -----------------------------------------------------------------------------
// Playwright: end-to-end tests (npm run test:e2e)
//
// The third test layer: whole user journeys (creating a classroom, creating a
// lesson, completing a lesson) clicked through the real app in a browser.
// Unit and integration tests use Vitest (see vitest.config.ts).
//
// Before running: start the local Supabase (npx supabase start) and fill in
// .env.test (see .env.test.example). Playwright then starts the app itself,
// pointed at that local Supabase, so tests never touch the hosted project.
// -----------------------------------------------------------------------------

import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// -- Local Supabase credentials --------------------------------------------------

// Playwright runs in Node rather than Vite, so .env.test is loaded here. The
// tests need the secret key to seed users and data; the app gets the same file
// through `vite --mode test` below.
if (!existsSync(".env.test")) {
  throw new Error(
    "E2E tests need .env.test with the local Supabase values (see .env.test.example).",
  );
}

process.loadEnvFile(".env.test");

// Refuse to run against anything but the local Supabase: the tests create and
// delete data.
const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";

if (!supabaseUrl.startsWith("http://127.0.0.1") && !supabaseUrl.startsWith("http://localhost")) {
  throw new Error(`E2E tests must use local Supabase, not "${supabaseUrl}". Check .env.test.`);
}

// The app's address during the tests. A port of its own (not Vite's usual
// 5173) so a normal `npm run dev`, which uses the hosted project, is never
// mistaken for the test server.
const PORT = 5174;
const BASE_URL = `http://localhost:${PORT}`;

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests/e2e",

  // Journeys sign in and change data, so they run one at a time for now. Each
  // test seeds its own users, so this can be raised later for speed.
  fullyParallel: false,
  workers: 1,

  // A stray test.only would skip every other test, so CI refuses it.
  forbidOnly: isCI,

  // One retry in CI only, to tell a flaky test from a broken one. The report
  // marks tests that only passed on retry.
  retries: isCI ? 1 : 0,

  // A journey clicks through several pages, so it gets more time than a unit
  // test; each `expect` waits up to 10 seconds for the page to catch up.
  timeout: 60_000,
  expect: { timeout: 10_000 },

  // A line per test in the terminal, plus an HTML report with traces, kept in
  // playwright-report/ (open it with `npx playwright show-report`).
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,

    // Optional slow motion for watching a run: SLOW_MO=600 waits 600ms after
    // every click and keystroke. Off unless set, so normal runs and CI stay fast.
    launchOptions: { slowMo: Number(process.env.SLOW_MO ?? 0) },

    // Evidence for failures only: a step-by-step trace, a screenshot and a
    // video of what the browser did.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  // Starts the app before the tests and stops it after. `--mode test` makes
  // Vite read .env.test, so the app in the browser uses the local Supabase.
  webServer: {
    command: `npm run dev -- --mode test --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },

  projects: [
    // Runs first: creates a teacher and a student, signs them in through the
    // login form and saves their sessions (tests/e2e/auth.setup.ts).
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },

    // Every test runs in both layouts the app has: the desktop sidebar (1024px
    // and up) and the phone bottom navigation, after the sign-in setup. Both
    // use Chromium, the only browser CI installs.
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      dependencies: ["setup"],
    },
  ],
});
