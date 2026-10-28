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
  mockAiReply,
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

// -- Reading aloud ----------------------------------------------------------------------

type Spoken = { text: string; lang: string; voice: string | null };

// Replaces the browser's speech with a recorder before the app loads, noting
// what was read, in which language and with which voice. The "device" has an
// English voice and a French one (named the Android way, fr_FR), but no Russian.
async function recordSpeech(page: Page) {
  await page.addInitScript(() => {
    const spoken: Spoken[] = [];
    Object.assign(window, { __spoken: spoken });

    class RecordedUtterance {
      text: string;
      lang = "";
      voice: { lang: string } | null = null;

      constructor(text: string) {
        this.text = text;
      }
    }

    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: RecordedUtterance,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel() {},
        speak(utterance: RecordedUtterance) {
          spoken.push({
            text: utterance.text,
            lang: utterance.lang,
            voice: utterance.voice?.lang ?? null,
          });
        },
        getVoices: () => [
          { lang: "en-GB", name: "English" },
          { lang: "fr_FR", name: "French" },
        ],
      },
    });
  });
}

async function lastSpoken(page: Page): Promise<Spoken | undefined> {
  const spoken = await page.evaluate(() => (window as unknown as { __spoken: Spoken[] }).__spoken);
  return spoken.at(-1);
}

test("Test C - Flashcards are read aloud in the language they're showing", async ({ page }) => {
  const { classroomId, lessonId, title } = await seedClassroomWithLesson();
  await recordSpeech(page);
  await openLessonFromClassroom(page, classroomId, lessonId, title);

  // 1. The English word is read in English, with the English voice.
  await page.getByRole("button", { name: "Read invoice aloud" }).click();
  expect(await lastSpoken(page)).toEqual({ text: "invoice", lang: "en-GB", voice: "en-GB" });

  // 2. Flipped and translated to French, the definition is read in French with
  //    the device's French voice, and there's no note about voices.
  await page.getByRole("button", { name: "Show definition" }).press("Enter");
  await mockAiReply(page, { word: "facture", definition: "Un document de paiement" });
  await page.getByRole("button", { name: "Translate to French" }).click();
  await expect(page.getByText("Un document de paiement")).toBeVisible();
  await page.getByRole("button", { name: "Read definition aloud" }).click();
  expect(await lastSpoken(page)).toEqual({
    text: "Un document de paiement",
    lang: "fr-FR",
    voice: "fr_FR",
  });
  await expect(page.getByText(/has no French voice/)).toHaveCount(0);

  // 3. In Russian, which this device has no voice for, it's still read as
  //    Russian (the browser picks a voice), and a note says how to add one.
  await mockAiReply(page, { word: "счёт", definition: "Документ для оплаты" });
  await page.getByRole("button", { name: "Translate to Russian" }).click();
  await expect(page.getByText("Документ для оплаты")).toBeVisible();
  await page.getByRole("button", { name: "Read definition aloud" }).click();
  expect(await lastSpoken(page)).toEqual({
    text: "Документ для оплаты",
    lang: "ru-RU",
    voice: null,
  });
  await expect(page.getByText(/This device has no Russian voice/)).toBeVisible();

  // 4. Back in English, the note goes and English is read again.
  await page.getByRole("button", { name: "Translate to Russian" }).click();
  await expect(page.getByText(/This device has no Russian voice/)).toHaveCount(0);
  await page.getByRole("button", { name: "Read definition aloud" }).click();
  expect(await lastSpoken(page)).toMatchObject({ lang: "en-GB", voice: "en-GB" });
});
