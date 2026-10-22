// -----------------------------------------------------------------------------
// Sign-In Setup
//
// Runs once before the journeys (the "setup" project in playwright.config.ts).
// Creates a teacher and a student, signs each in through the login form and
// saves the browser session, so journeys can start already signed in. Signing
// in through the real form here also tests the form itself.
// -----------------------------------------------------------------------------

import { test as setup } from "@playwright/test";
import { loginAs, saveSignedInUser, seedUser, STUDENT_STATE, TEACHER_STATE } from "./helpers";

setup("Sign in as a teacher and save the session", async ({ page }) => {
  const teacher = await seedUser("teacher", { metadata: { name: "Thandi", surname: "Mokoena" } });

  await loginAs(page, teacher, "teacher");
  await page.context().storageState({ path: TEACHER_STATE });

  saveSignedInUser("teacher", teacher);
});

setup("Sign in as a student and save the session", async ({ page }) => {
  const student = await seedUser("student", { metadata: { name: "Sipho", surname: "Dlamini" } });

  await loginAs(page, student, "student");
  await page.context().storageState({ path: STUDENT_STATE });

  saveSignedInUser("student", student);
});
