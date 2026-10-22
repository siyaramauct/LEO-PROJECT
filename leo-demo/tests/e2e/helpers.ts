// -----------------------------------------------------------------------------
// End-to-End Test Helpers
//
// Everything the journeys need, imported from "./helpers":
//   seeding      every seed helper from tests/shared/seed.ts (re-exported), to
//                create the data a journey starts from
//   the AI       mockAiReply / mockAiFailure answer the app's AI requests in the
//                browser, so lesson creation never calls the real AI
//   the page     visible() picks the copy of an element on screen, for pages
//                that render separate phone and desktop layouts
//   signing in   journeys start already signed in. auth.setup.ts runs once
//                before them: it creates a teacher and a student, signs each in
//                through the real login form, and saves each browser session
//                (Supabase keeps it in localStorage) to playwright/.auth/,
//                which is ignored by git. A spec then picks a session:
//
//   test.use({ storageState: TEACHER_STATE });
//   const { teacher } = signedInUsers();   // to seed data for that teacher
//
// Paths are relative to leo-demo/, where the tests are run from.
// -----------------------------------------------------------------------------

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { expect, type Locator, type Page, type Route } from "@playwright/test";
import { TEST_PASSWORD, type TestUser } from "../shared/seed";

export * from "../shared/seed";

const AUTH_DIR = "playwright/.auth";

// The saved browser sessions, for test.use({ storageState }).
export const TEACHER_STATE = `${AUTH_DIR}/teacher.json`;
export const STUDENT_STATE = `${AUTH_DIR}/student.json`;

// Who those sessions belong to, so specs can seed data for them. One file per
// role, so the two setup steps never depend on each other.
const userFile = (role: Role) => `${AUTH_DIR}/${role}.user.json`;

type Role = "teacher" | "student";

export type SignedInUsers = { teacher: TestUser; student: TestUser };

export function saveSignedInUser(role: Role, user: TestUser): void {
  mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(userFile(role), JSON.stringify(user, null, 2));
}

export function signedInUsers(): SignedInUsers {
  const read = (role: Role) => JSON.parse(readFileSync(userFile(role), "utf8")) as TestUser;

  return { teacher: read("teacher"), student: read("student") };
}

// Where Home sends each role after signing in.
export const DASHBOARD_URL = {
  teacher: /\/teacher-dashboard$/,
  student: /\/student\/dashboard$/,
};

// Signs in through the login form, as a person would, and waits until the app
// has opened the user's dashboard. Used by auth.setup.ts, and by any journey
// that needs a second person who isn't one of the saved sessions.
export async function loginAs(page: Page, user: TestUser, role: Role) {
  // 1. Fill in and send the form.
  await page.goto("/login");
  await page.getByLabel("Email Address").fill(user.email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();

  // 2. Signing in redirects to the role's dashboard.
  await expect(page).toHaveURL(DASHBOARD_URL[role]);
}

// -- The page ---------------------------------------------------------------------

// Some pages render a phone layout and a desktop layout at the same time and
// hide one with CSS, so a label or button can exist twice. This keeps only the
// copy on screen, which is the one a person would use.
export function visible(locator: Locator): Locator {
  return locator.filter({ visible: true });
}

// A name no other test or earlier run has used, e.g. "Business English 4f9c1a",
// so journeys can find exactly the item they created.
export function uniqueName(base: string): string {
  return `${base} ${crypto.randomUUID().slice(0, 6)}`;
}

// -- The AI -----------------------------------------------------------------------

// The edge function the app calls for AI help (see src/data/ai.ts).
const AI_FUNCTION_URL = "**/functions/v1/gemini-API-Query";

// The app is served from localhost:5174 but calls Supabase on 127.0.0.1:54321,
// so the browser first asks permission (a CORS preflight). The fake answers
// must give it, or the browser would refuse to hand them to the app.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function answerPreflight(route: Route): Promise<boolean> {
  if (route.request().method() !== "OPTIONS") {
    return false;
  }

  await route.fulfill({ status: 204, headers: CORS_HEADERS });
  return true;
}

// Every AI request from now on gets this reply, in the edge function's own
// shape ({ result: "<JSON text>" }), so the app's real code reads and checks
// it exactly as it would a real answer. Nothing reaches the real AI.
export async function mockAiReply(page: Page, reply: unknown): Promise<void> {
  await page.route(AI_FUNCTION_URL, async (route) => {
    if (await answerPreflight(route)) {
      return;
    }

    await route.fulfill({
      status: 200,
      headers: CORS_HEADERS,
      json: { result: JSON.stringify(reply) },
    });
  });
}

// Every AI request from now on fails, as when the AI service is down.
export async function mockAiFailure(page: Page): Promise<void> {
  await page.route(AI_FUNCTION_URL, async (route) => {
    if (await answerPreflight(route)) {
      return;
    }

    await route.fulfill({
      status: 502,
      headers: CORS_HEADERS,
      json: { error: "All AI providers failed" },
    });
  });
}

// A quiz the AI could have written for these flashcards: one question per card,
// with the card's own word as the right answer (option A).
export function quizForFlashcards(cards: { term: string; definition: string }[]) {
  return {
    title: "Business Vocabulary Check",
    questions: cards.map((card) => ({
      question_text: `Which word means "${card.definition}"?`,
      option_a: card.term,
      option_b: "agenda",
      option_c: "headline",
      option_d: "salary",
      correct_option: "A",
    })),
  };
}
