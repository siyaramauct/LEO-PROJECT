// -----------------------------------------------------------------------------
// Journey: a teacher creates a lesson
//
// Signed in as the saved teacher, in one of their classrooms: go through the
// four steps of Create Lesson (details, flashcards, quiz format, review) and
// check the lesson appears in the classroom and was saved. The AI is faked
// (mockAiReply / mockAiFailure), so the quiz is the same every run and no real
// AI is called; everything else, including checking the AI's reply, is real.
// -----------------------------------------------------------------------------

import { expect, test, type Page } from "@playwright/test";
import {
  admin,
  mockAiFailure,
  mockAiReply,
  quizForFlashcards,
  seedClassroom,
  signedInUsers,
  TEACHER_STATE,
  uniqueName,
  visible,
} from "./helpers";

test.use({ storageState: TEACHER_STATE });

const flashcards = [
  { term: "invoice", definition: "A bill sent to a customer" },
  { term: "deadline", definition: "The latest time to finish something" },
  { term: "profit", definition: "Money left after paying all costs" },
];

// -- Shared steps ---------------------------------------------------------------------

// Steps 1 and 2 of Create Lesson: open it from the classroom page, fill in the
// details and the flashcards, and arrive at the quiz step.
async function fillDetailsAndFlashcards(page: Page, classroomId: string, title: string) {
  // 1. From the classroom page. The link reads "Create lesson" on desktop and
  //    "Lesson" on phones.
  await page.goto(`/teacher-classroom/${classroomId}`);
  await visible(page.getByRole("link", { name: /^(create )?lesson$/i })).click();
  await expect(page).toHaveURL(/\/create-lesson\?classroomId=/);

  // 2. Lesson details.
  await page.getByLabel("Lesson title").fill(title);
  await page.getByLabel("Description").fill("Words for invoices, deadlines and profit.");
  await page.getByRole("button", { name: "Continue" }).click();

  // 3. The flashcards, typed as a list ("word - definition" per line), become
  //    one editable card each.
  const list = flashcards.map((card) => `${card.term} - ${card.definition}`).join("\n");
  await page.getByLabel("Words and definitions").fill(list);
  await page.getByRole("button", { name: `Add ${flashcards.length} flashcards` }).click();

  for (const [index, card] of flashcards.entries()) {
    await expect(page.getByLabel("Term", { exact: true }).nth(index)).toHaveValue(card.term);
    await expect(page.getByLabel("Definition", { exact: true }).nth(index)).toHaveValue(
      card.definition,
    );
  }

  await page.getByRole("button", { name: "Choose activity" }).click();
  await expect(page.getByRole("heading", { name: "Choose the MCQ activity" })).toBeVisible();
}

// The saved lesson, with how many flashcards and quiz questions it has.
async function savedLesson(classroomId: string, title: string) {
  const { data: lesson } = await admin
    .from("lessons")
    .select("lesson_id, description, flashcards(count), mcqs(mcq_id, title, questions(count))")
    .eq("classroom_id", classroomId)
    .eq("title", title)
    .single();

  return lesson as {
    lesson_id: string;
    description: string;
    flashcards: { count: number }[];
    mcqs: { mcq_id: string; title: string; questions: { count: number }[] }[];
  } | null;
}

// -- Journeys -------------------------------------------------------------------------

test("Test A - A teacher creates a lesson with flashcards and an AI quiz", async ({ page }) => {
  const { teacher } = signedInUsers();
  const classroomId = await seedClassroom(teacher, uniqueName("Business English"));
  const title = uniqueName("Meetings and Money");

  // The fake AI answers with one question per flashcard.
  await mockAiReply(page, quizForFlashcards(flashcards));

  // 1. Details and flashcards.
  await fillDetailsAndFlashcards(page, classroomId, title);

  // 2. Pick a quiz format and let "the AI" write the quiz.
  await page.getByRole("button", { name: /Match the definition/ }).click();
  await page.getByRole("button", { name: "Generate activity" }).click();

  // 3. The review step shows the generated quiz, ready to edit.
  await expect(page.getByRole("heading", { name: "Review the generated activity" })).toBeVisible();
  await expect(page.getByLabel("Activity title")).toHaveValue("Business Vocabulary Check");

  // 4. Save, and the app opens the classroom, now listing the lesson.
  await page.getByRole("button", { name: "Create lesson" }).click();
  await expect(page).toHaveURL(new RegExp(`/teacher-classroom/${classroomId}$`));
  await expect(visible(page.getByText(title))).toBeVisible();

  // 5. Everything was saved: the lesson, 3 flashcards and a 3-question quiz.
  const lesson = await savedLesson(classroomId, title);

  expect(lesson?.description).toBe("Words for invoices, deadlines and profit.");
  expect(lesson?.flashcards[0].count).toBe(3);
  expect(lesson?.mcqs).toHaveLength(1);
  expect(lesson?.mcqs[0].title).toBe("Business Vocabulary Check");
  expect(lesson?.mcqs[0].questions[0].count).toBe(3);
});

test("Test B - When the AI fails, the teacher can still save a flashcards-only lesson", async ({
  page,
}) => {
  const { teacher } = signedInUsers();
  const classroomId = await seedClassroom(teacher, uniqueName("Business English"));
  const title = uniqueName("Just Words");

  await mockAiFailure(page);

  // 1. Details and flashcards, then ask for a quiz.
  await fillDetailsAndFlashcards(page, classroomId, title);
  await page.getByRole("button", { name: /Match the definition/ }).click();
  await page.getByRole("button", { name: "Generate activity" }).click();

  // 2. The failure is explained, with a way to carry on without a quiz.
  await expect(page.getByText("Something went wrong generating the activity.")).toBeVisible();
  await page.getByRole("button", { name: "create the lesson with flashcards only" }).click();

  // 3. Save the lesson without a quiz.
  await page.getByRole("button", { name: "Create lesson" }).click();
  await expect(page).toHaveURL(new RegExp(`/teacher-classroom/${classroomId}$`));
  await expect(visible(page.getByText(title))).toBeVisible();

  // 4. Saved with its flashcards and no quiz.
  const lesson = await savedLesson(classroomId, title);

  expect(lesson?.flashcards[0].count).toBe(3);
  expect(lesson?.mcqs).toEqual([]);
});

test("Test C - A teacher who tries to add 20 flashcards is stopped at the limit of 15", async ({
  page,
}) => {
  const { teacher } = signedInUsers();
  const classroomId = await seedClassroom(teacher, uniqueName("Business English"));
  const title = uniqueName("Big Vocabulary List");

  // 1. Lesson details.
  await page.goto(`/create-lesson?classroomId=${classroomId}`);
  await page.getByLabel("Lesson title").fill(title);
  await page.getByLabel("Description").fill("As many business words as the lesson allows.");
  await page.getByRole("button", { name: "Continue" }).click();

  // 2. Paste 20 flashcards. The summary warns that only the first 15 fit.
  const list = Array.from({ length: 20 }, (_, index) => `word${index + 1} - Meaning ${index + 1}`);
  await page.getByLabel("Words and definitions").fill(list.join("\n"));
  await expect(page.getByText("so the last 5 words won't be added")).toBeVisible();
  await page.getByRole("button", { name: "Add 15 flashcards" }).click();

  // 3. The app stopped at 15: the counter is full, and nothing more can be added.
  await expect(page.getByText("15 of 15")).toBeVisible();
  await expect(page.getByLabel("Term", { exact: true })).toHaveCount(15);
  await expect(page.getByLabel("Term", { exact: true }).last()).toHaveValue("word15");
  await expect(page.getByRole("button", { name: "Add a blank card" })).toBeHidden();
  await expect(page.getByText("This lesson already has 15 flashcards")).toBeVisible();

  // 4. The full lesson still saves (without a quiz), with exactly 15 cards.
  await page.getByRole("button", { name: "Choose activity" }).click();
  await page.getByRole("switch", { name: "Include an MCQ activity" }).click();
  await page.getByRole("button", { name: "Create lesson" }).click();
  await expect(page).toHaveURL(new RegExp(`/teacher-classroom/${classroomId}$`));

  const lesson = await savedLesson(classroomId, title);

  expect(lesson?.flashcards[0].count).toBe(15);
  expect(lesson?.mcqs).toEqual([]);
});
