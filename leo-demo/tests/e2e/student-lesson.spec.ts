// -----------------------------------------------------------------------------
// Journey: a student completes a lesson
//
// Signed in as the saved student, enrolled in a classroom with a lesson: open
// the lesson from the classroom page, study its flashcards, take the quiz and
// check the result screen and the saved attempt. The lesson is seeded with the
// three-question quiz from tests/shared/seed.ts (correct answers A, B and C).
// -----------------------------------------------------------------------------

import { expect, test, type Page } from "@playwright/test";
import {
  admin,
  seedClassroom,
  seedEnrolment,
  seedFlashcards,
  seedLesson,
  seedQuiz,
  seedUser,
  signedInUsers,
  STUDENT_STATE,
  uniqueName,
  visible,
} from "./helpers";

test.use({ storageState: STUDENT_STATE });

// -- Shared steps ---------------------------------------------------------------------

// A classroom the student has joined, with one released lesson of three
// flashcards, and a quiz unless `withQuiz` is false.
async function seedClassroomWithLesson({ withQuiz = true } = {}) {
  const { student } = signedInUsers();
  const teacher = await seedUser("teacher");
  const classroomId = await seedClassroom(teacher, uniqueName("Business English"));
  await seedEnrolment(student, classroomId);

  const title = uniqueName(withQuiz ? "Meetings and Money" : "Just Words");
  const lessonId = await seedLesson(classroomId, { title });
  await seedFlashcards(lessonId);

  if (withQuiz) {
    await seedQuiz(lessonId);
  }

  return { student, classroomId, lessonId, title };
}

// Opens the lesson from the student's classroom page, as a student would.
async function openLessonFromClassroom(
  page: Page,
  classroomId: string,
  lessonId: string,
  title: string,
) {
  await page.goto(`/student/classrooms/${classroomId}`);
  await visible(page.getByRole("link", { name: new RegExp(title) })).click();
  await expect(page).toHaveURL(new RegExp(`/lesson/${lessonId}$`));
}

// The answer the student gives to each seeded question: the first two are
// right and the third is wrong, so the expected score is 2 out of 3.
const answers: Record<string, string> = {
  "Please find the _ for last month's order attached.": "invoice", // Right (A).
  "We need to extend the _ because the supplier is late.": "deadline", // Right (B).
  "The company made a _ of R2 million after paying all its costs.": "loss", // Wrong (C is profit).
};

// -- Journeys -------------------------------------------------------------------------

test("Test A - A student studies the flashcards, takes the quiz and sees their score", async ({
  page,
}) => {
  const { student, classroomId, lessonId, title } = await seedClassroomWithLesson();

  // 1. Open the lesson from the classroom page.
  await openLessonFromClassroom(page, classroomId, lessonId, title);

  // 2. Study the three flashcards, one at a time; the last offers the quiz.
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Start quiz" }).click();
  await expect(page).toHaveURL(new RegExp(`/quiz/${lessonId}$`));

  // 3. Answer each question. The order isn't fixed, so read the question first.
  for (let questionNumber = 1; questionNumber <= 3; questionNumber += 1) {
    await expect(page.getByText(`Question ${questionNumber} of 3`)).toBeVisible();

    const question = (await page.getByRole("heading", { level: 2 }).textContent())?.trim() ?? "";
    await page.getByRole("radio").filter({ hasText: answers[question] }).click();

    const nextStep = questionNumber < 3 ? "Next" : "Complete attempt";
    await page.getByRole("button", { name: nextStep }).click();
  }

  // 4. The result screen shows 2 out of 3.
  await expect(page).toHaveURL(/\/summary$/);
  await expect(page.getByRole("heading", { name: "Quiz result" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "67%" })).toBeVisible();
  await expect(page.getByText("Score 2 out of 3")).toBeVisible();

  // 5. The attempt was saved with that score.
  const { data: attempts } = await admin
    .from("lesson_attempts")
    .select("score, completed_at")
    .eq("student_id", student.id)
    .eq("lesson_id", lessonId);

  expect(attempts).toHaveLength(1);
  expect(attempts?.[0].score).toBe(2);
  expect(attempts?.[0].completed_at).not.toBeNull();
});

// Guards the check_lesson_attempt fix (migration 20261026120000): "Finish lesson"
// on a flashcards-only lesson saves an unscored attempt and returns to the classrooms.
test("Test B - A student finishes a flashcards-only lesson", async ({ page }) => {
  const { student, classroomId, lessonId, title } = await seedClassroomWithLesson({
    withQuiz: false,
  });

  // 1. Open the lesson and study its flashcards; the last offers "Finish lesson".
  await openLessonFromClassroom(page, classroomId, lessonId, title);
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Finish lesson" }).click();

  // 2. Finishing returns to the classrooms and records the lesson as done.
  await expect(page).toHaveURL(/\/student\/classrooms$/, { timeout: 5_000 });

  const { data: attempts } = await admin
    .from("lesson_attempts")
    .select("score")
    .eq("student_id", student.id)
    .eq("lesson_id", lessonId);

  expect(attempts).toEqual([{ score: null }]);
});
