// -----------------------------------------------------------------------------
// Journey: signing up and choosing a role
//
// Run signed out, through the real sign-up and login forms:
//   - a new person signs up and is asked to choose a role
//   - an email that's already registered can't be used to sign up again
//   - someone who signed up but never chose a role is sent back to the role
//     page when they sign in, and can't skip it by opening a dashboard
//
// Locally, email confirmation is off (supabase/config.toml), so Supabase
// refuses a registered email straight away and the form shows that error.
// -----------------------------------------------------------------------------

import { expect, test, type Page } from "@playwright/test";
import { admin, seedUser, TEST_PASSWORD } from "./helpers";

// Meets the sign-up form's rules: 8+ characters with a lowercase letter, an
// uppercase letter and a digit.
const STRONG_PASSWORD = "LeoTest2026";

// The role page every new account starts on.
const ROLE_PAGE_URL = /\/select-role$/;

// Fills in and sends the sign-up form.
async function signUp(page: Page, email: string) {
  await page.goto("/signup");
  await page.getByLabel("First Name").fill("Lerato");
  await page.getByLabel("Last Name").fill("Nkosi");
  await page.getByLabel("Email Address").fill(email);
  await page.getByLabel("Password").fill(STRONG_PASSWORD);
  await page.getByRole("button", { name: "Create Account" }).click();
}

// How many accounts use this email, read as admin.
async function accountsWithEmail(email: string) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });

  return data.users.filter((user) => user.email === email).length;
}

test("Test A - A new person signs up and is asked to choose a role", async ({ page }) => {
  const email = `signup-${crypto.randomUUID()}@test.local`;

  await signUp(page, email);

  await expect(page).toHaveURL(ROLE_PAGE_URL);
  await expect(page.getByRole("heading", { name: "How will you use the platform?" })).toBeVisible();
  expect(await accountsWithEmail(email)).toBe(1);
});

test("Test B - An email that's already registered can't be used to sign up again", async ({
  page,
}) => {
  // Someone already has an account with this email.
  const existing = await seedUser("student");

  // 1. A new person tries to sign up with the same email.
  await signUp(page, existing.email);

  // 2. The form explains in plain words, and they stay on the sign-up page.
  await expect(
    page.getByText("An account with this email already exists. Sign in instead."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/signup$/);

  // 3. No second account was made, and the existing one is untouched.
  expect(await accountsWithEmail(existing.email)).toBe(1);

  const { data: profile } = await admin
    .from("profiles")
    .select("name, surname, user_role")
    .eq("id", existing.id)
    .single();

  expect(profile).toEqual({ name: "Test", surname: "Student", user_role: "student" });
});

test("Test C - Someone who never chose a role is sent back to choose one when they sign in", async ({
  page,
}) => {
  // An account whose owner left before choosing a role.
  const newUser = await seedUser(null);

  // 1. They sign in.
  await page.goto("/login");
  await page.getByLabel("Email Address").fill(newUser.email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();

  // 2. Instead of a dashboard, they're asked to choose a role.
  await expect(page).toHaveURL(ROLE_PAGE_URL);
  await expect(page.getByRole("heading", { name: "How will you use the platform?" })).toBeVisible();

  // 3. Opening a dashboard directly sends them back too.
  await page.goto("/student/dashboard");
  await expect(page).toHaveURL(ROLE_PAGE_URL);

  await page.goto("/teacher-dashboard");
  await expect(page).toHaveURL(ROLE_PAGE_URL);
});
