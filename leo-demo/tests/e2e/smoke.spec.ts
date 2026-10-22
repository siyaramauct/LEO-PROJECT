// -----------------------------------------------------------------------------
// Smoke Test
//
// The quickest check that the end-to-end setup works before any journey runs:
// Playwright starts the app, the app loads in the browser, routing works and
// the login page renders, in both the desktop and phone layouts.
// -----------------------------------------------------------------------------

import { expect, test } from "@playwright/test";

test("Test A - The login page opens with its sign-in form", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByLabel("Email Address")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
});

test("Test B - The app talks to the local Supabase, not the hosted project", async ({ page }) => {
  // Record every request the page sends to a Supabase server.
  const supabaseHosts = new Set<string>();

  page.on("request", (request) => {
    const url = new URL(request.url());

    if (url.pathname.startsWith("/auth/") || url.pathname.startsWith("/rest/")) {
      supabaseHosts.add(url.host);
    }
  });

  await page.goto("/login");
  await page.getByLabel("Email Address").fill("nobody@test.local");
  await page.getByLabel("Password").fill("not-a-real-password");
  await page.getByRole("button", { name: "Sign In" }).click();

  // The sign-in fails (no such user), but it must have gone to the local API.
  await expect.poll(() => [...supabaseHosts]).toEqual(["127.0.0.1:54321"]);
});
