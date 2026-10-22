// -----------------------------------------------------------------------------
// Saved Session Tests
//
// Checks that the sessions saved by auth.setup.ts work: a journey that loads
// one starts signed in as that person, without the login form, in both the
// desktop and phone layouts.
// -----------------------------------------------------------------------------

import { expect, test } from "@playwright/test";
import { DASHBOARD_URL, STUDENT_STATE, TEACHER_STATE } from "./helpers";

test.describe("Signed in as the teacher", () => {
  test.use({ storageState: TEACHER_STATE });

  test("Test A - Opening the app goes straight to the teacher dashboard", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(DASHBOARD_URL.teacher);
  });

  test("Test B - The login page sends a signed-in teacher on to their dashboard", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(page).toHaveURL(DASHBOARD_URL.teacher);
  });
});

test.describe("Signed in as the student", () => {
  test.use({ storageState: STUDENT_STATE });

  test("Test A - Opening the app goes straight to the student dashboard", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(DASHBOARD_URL.student);
  });

  test("Test B - A student is kept out of teacher pages", async ({ page }) => {
    await page.goto("/teacher-dashboard");

    // GuardRoute sends anyone without the teacher role back to their own home.
    await expect(page).toHaveURL(DASHBOARD_URL.student);
  });
});
