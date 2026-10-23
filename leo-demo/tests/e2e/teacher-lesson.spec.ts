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

  // 3. One flashcard per word; the first empty card is already there.
  for (const [index, card] of flashcards.entries()) {
    if (index > 0) {
      await page.getByRole("button", { name: "Add flashcard" }).click();
    }

    await page.getByLabel("Term", { exact: true }).nth(index).fill(card.term);
    await page.getByLabel("Definition", { exact: true }).nth(index).fill(card.definition);
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
  await page.getByRole("button", { name: /Basic multiple choice/ }).click();
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
  await page.getByRole("button", { name: /Basic multiple choice/ }).click();
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
  const addFlashcard = page.getByRole("button", { name: "Add flashcard" });

  // 1. Lesson details.
  await page.goto(`/create-lesson?classroomId=${classroomId}`);
  await page.getByLabel("Lesson title").fill(title);
  await page.getByLabel("Description").fill("As many business words as the lesson allows.");
  await page.getByRole("button", { name: "Continue" }).click();

  // 2. Try to add 20 flashcards. The first card is already there; after each
  //    one, look for "Add flashcard" and stop when it's gone.
  let cardsAdded = 0;

  for (let card = 1; card <= 20; card += 1) {
    if (card > 1) {
      if (!(await addFlashcard.isVisible())) {
        break;
      }

      await addFlashcard.click();
    }

    await page
      .getByLabel("Term", { exact: true })
      .nth(card - 1)
      .fill(`word${card}`);
    await page
      .getByLabel("Definition", { exact: true })
      .nth(card - 1)
      .fill(`Meaning ${card}`);
    cardsAdded = card;
  }

  // 3. The app stopped at 15: the button is gone and the counter is full.
  expect(cardsAdded).toBe(15);
  await expect(addFlashcard).toBeHidden();
  await expect(page.getByText("15 of 15")).toBeVisible();
  await expect(page.getByLabel("Term", { exact: true })).toHaveCount(15);

  // 4. The full lesson still saves (without a quiz), with exactly 15 cards.
  await page.getByRole("button", { name: "Choose activity" }).click();
  await page.getByRole("switch", { name: "Include an MCQ activity" }).click();
  await page.getByRole("button", { name: "Create lesson" }).click();
  await expect(page).toHaveURL(new RegExp(`/teacher-classroom/${classroomId}$`));

  const lesson = await savedLesson(classroomId, title);

  expect(lesson?.flashcards[0].count).toBe(15);
  expect(lesson?.mcqs).toEqual([]);
});
