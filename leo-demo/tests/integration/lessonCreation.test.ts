// -----------------------------------------------------------------------------
// Lesson Creation Tests
//
// Creating lessons through the app's real service
// (src/services/lessonCreationService.ts) while signed in, so RLS applies
// exactly as in the browser. The quiz is written by hand rather than generated:
// createLesson saves whatever quiz the teacher approved, so no AI is needed.
// Setup that isn't being tested uses the seed helpers (see helpers.ts).
// -----------------------------------------------------------------------------

import { beforeAll, describe, expect, test } from "vitest";
import { getFlashcards } from "../../src/data/flashcards";
import { deleteLesson, updateLesson } from "../../src/data/lessons";
import { getStudentClassroom } from "../../src/services/classroomService";
import {
  createLesson,
  removeFlashcard,
  saveFlashcardEdit,
} from "../../src/services/lessonCreationService";
import { getClassroomLessonSummaries } from "../../src/services/teacherClassroomService";
import { supabase } from "../../src/supabase-client";
import { releaseDateToIso, toDateKey } from "../../src/utils/releaseDate";
import {
  admin,
  seedClassroom,
  seedEnrolment,
  seedMaterial,
  seedUser,
  signInAs,
  type TestUser,
} from "./helpers";

// -- Lesson content -------------------------------------------------------------------

// Flashcards as the Create Lesson page sends them, with stray spaces a teacher
// might type, to check they're trimmed on save.
const flashcards = [
  { term: " invoice ", definition: "A bill sent to a customer", imageFile: null },
  { term: "deadline", definition: " The latest time to finish something ", imageFile: null },
  { term: "profit", definition: "Money left after paying all costs", imageFile: null },
];

// A business English quiz with one question per flashcard, as approved by the
// teacher in the review step.
const quiz = {
  title: " Business Vocabulary Check ",
  questions: [
    {
      question_text: "Please find the _ for last month's order attached.",
      option_a: "invoice",
      option_b: "agenda",
      option_c: "résumé",
      option_d: "headline",
      correct_option: "A" as const,
    },
    {
      question_text: "We need to extend the _ because the supplier is late.",
      option_a: "salary",
      option_b: "deadline",
      option_c: "budget",
      option_d: "invoice",
      correct_option: "B" as const,
    },
    {
      question_text: "The company made a _ of R2 million after paying all its costs.",
      option_a: "loss",
      option_b: "debt",
      option_c: "profit",
      option_d: "salary",
      correct_option: "C" as const,
    },
  ],
};

// -- Shared steps ---------------------------------------------------------------------

// A "YYYY-MM-DD" key a week from today, for scheduling.
function nextWeekKey() {
  const date = new Date();
  date.setDate(date.getDate() + 7);

  return toDateKey(date);
}

// Creates a full lesson (flashcards and quiz) through the real service, as the
// signed-in teacher. Used by tests about what happens to a lesson afterwards;
// Test A in "Creating a lesson" checks this path itself.
async function createSampleLesson(
  classroomId: string,
  { title = "Meetings and Money", releaseDateKey = "" } = {},
) {
  return createLesson({
    classroomId,
    title,
    description: "Vocabulary for invoices, deadlines and profit.",
    coverImagePath: "lessonImgs/business-illustration.avif",
    releaseDateKey,
    documents: [],
    flashcards,
    quiz,
  });
}

// -- Checks read as admin, so RLS can't hide what really happened -------------------

async function notificationsFor(user: TestUser, type: string) {
  const { data } = await admin
    .from("notifications")
    .select("title, body, link_url")
    .eq("recipient_id", user.id)
    .eq("type", type);

  return data ?? [];
}

async function lessonRow(lessonId: string) {
  const { data } = await admin
    .from("lessons")
    .select("title, description, release_date")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  return data;
}

// How many rows of a table still belong to the lesson.
async function rowsInLesson(table: string, lessonId: string) {
  const { count } = await admin
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("lesson_id", lessonId);

  return count ?? 0;
}

// -- Creating a lesson ----------------------------------------------------------------

describe("Creating a lesson", () => {
  let teacher: TestUser;
  let classroomId: string;

  beforeAll(async () => {
    teacher = await seedUser("teacher");
    classroomId = await seedClassroom(teacher, "Business English");
  });

  test("Test A - A teacher creates a lesson with flashcards and a quiz, and every part is saved", async () => {
    await signInAs(teacher);

    const lessonId = await createLesson({
      classroomId,
      title: "  Meetings and Money  ",
      description: "  Vocabulary for invoices, deadlines and profit.  ",
      coverImagePath: "lessonImgs/business-illustration.avif",
      releaseDateKey: "", // Release now.
      documents: [],
      flashcards,
      quiz,
    });

    // Every part is read back as admin, so RLS can't hide what was saved.

    // 1. The lesson, in the right classroom, with its text trimmed.
    const { data: lesson } = await admin
      .from("lessons")
      .select("classroom_id, title, description, lesson_image_path")
      .eq("lesson_id", lessonId)
      .single();

    expect(lesson).toEqual({
      classroom_id: classroomId,
      title: "Meetings and Money",
      description: "Vocabulary for invoices, deadlines and profit.",
      lesson_image_path: "lessonImgs/business-illustration.avif",
    });

    // 2. One flashcard per card, trimmed, with no images.
    const { data: savedCards } = await admin
      .from("flashcards")
      .select("word, definition, image_path")
      .eq("lesson_id", lessonId)
      .order("word");

    expect(savedCards).toEqual([
      { word: "deadline", definition: "The latest time to finish something", image_path: null },
      { word: "invoice", definition: "A bill sent to a customer", image_path: null },
      { word: "profit", definition: "Money left after paying all costs", image_path: null },
    ]);

    // 3. The quiz, out of one mark per question.
    const { data: savedQuiz } = await admin
      .from("mcqs")
      .select("mcq_id, title, score_ceiling")
      .eq("lesson_id", lessonId)
      .single();

    expect(savedQuiz?.title).toBe("Business Vocabulary Check");
    expect(savedQuiz?.score_ceiling).toBe(3);

    // 4. Its questions, each with the right answer.
    const { data: savedQuestions } = await admin
      .from("questions")
      .select("question_text, correct_option")
      .eq("mcq_id", savedQuiz?.mcq_id)
      .order("question_text");

    expect(savedQuestions).toEqual([
      {
        question_text: "Please find the _ for last month's order attached.",
        correct_option: "A",
      },
      {
        question_text: "The company made a _ of R2 million after paying all its costs.",
        correct_option: "C",
      },
      {
        question_text: "We need to extend the _ because the supplier is late.",
        correct_option: "B",
      },
    ]);
  });
});

// -- Notifying students ---------------------------------------------------------------

describe("Notifying students", () => {
  let teacher: TestUser;
  let student: TestUser; // Enrolled in the classroom.
  let outsider: TestUser; // A student in no classroom of this teacher's.
  let classroomId: string;

  beforeAll(async () => {
    teacher = await seedUser("teacher");
    student = await seedUser("student");
    outsider = await seedUser("student");

    classroomId = await seedClassroom(teacher, "Business English");
    await seedEnrolment(student, classroomId);
  });

  test("Test A - Enrolled students are told about a lesson released now", async () => {
    await signInAs(teacher);

    const lessonId = await createSampleLesson(classroomId, { title: "  Negotiation Basics  " });

    expect(await notificationsFor(student, "new_lesson")).toContainEqual({
      title: "New lesson available",
      body: 'Your teacher added "Negotiation Basics".',
      link_url: `/lesson/${lessonId}`,
    });
  });

  test("Test B - Students aren't told about a scheduled lesson yet", async () => {
    await signInAs(teacher);

    const lessonId = await createSampleLesson(classroomId, {
      title: "Next Week's Lesson",
      releaseDateKey: nextWeekKey(),
    });

    const notices = await notificationsFor(student, "new_lesson");

    expect(notices.map((notice) => notice.link_url)).not.toContain(`/lesson/${lessonId}`);
  });

  test("Test C - Students outside the classroom aren't told", async () => {
    await signInAs(teacher);

    await createSampleLesson(classroomId, { title: "Classroom Only" });

    expect(await notificationsFor(outsider, "new_lesson")).toEqual([]);
  });
});

// -- Deleting a lesson ----------------------------------------------------------------

describe("Deleting a lesson", () => {
  let teacher: TestUser;
  let otherTeacher: TestUser;
  let student: TestUser; // Enrolled in the classroom.
  let classroomId: string;

  beforeAll(async () => {
    teacher = await seedUser("teacher");
    otherTeacher = await seedUser("teacher");
    student = await seedUser("student");

    classroomId = await seedClassroom(teacher, "Business English");
    await seedEnrolment(student, classroomId);
  });

  test("Test A - A teacher deletes a lesson, with its flashcards, quiz and questions", async () => {
    await signInAs(teacher);
    const lessonId = await createSampleLesson(classroomId);

    const { data: savedQuiz } = await admin
      .from("mcqs")
      .select("mcq_id")
      .eq("lesson_id", lessonId)
      .single();

    await deleteLesson(lessonId);

    // ON DELETE CASCADE removes everything that belongs to the lesson.
    const { count: questionsLeft } = await admin
      .from("questions")
      .select("*", { count: "exact", head: true })
      .eq("mcq_id", savedQuiz?.mcq_id);

    expect(await lessonRow(lessonId)).toBeNull();
    expect(await rowsInLesson("flashcards", lessonId)).toBe(0);
    expect(await rowsInLesson("mcqs", lessonId)).toBe(0);
    expect(questionsLeft).toBe(0);
  });

  test("Test B - A deleted lesson disappears from the student's classroom", async () => {
    await signInAs(teacher);
    const lessonId = await createSampleLesson(classroomId, { title: "Soon Gone" });
    await deleteLesson(lessonId);

    await signInAs(student);
    const result = await getStudentClassroom(student.id, classroomId);

    expect(result.lessons.map((lesson) => lesson.lesson_id)).not.toContain(lessonId);
  });

  test("Test C - Another teacher can't delete the lesson", async () => {
    await signInAs(teacher);
    const lessonId = await createSampleLesson(classroomId);

    await signInAs(otherTeacher);
    // RLS doesn't raise an error for a refused delete; it deletes nothing.
    await deleteLesson(lessonId);

    expect(await lessonRow(lessonId)).not.toBeNull();
  });

  test("Test D - A student can't delete the lesson", async () => {
    await signInAs(teacher);
    const lessonId = await createSampleLesson(classroomId);

    await signInAs(student);
    await deleteLesson(lessonId);

    expect(await lessonRow(lessonId)).not.toBeNull();
  });

  // KNOWN GAP: deleting a lesson removes its rows but not its files, so its
  // PDFs stay in the documents bucket with nothing pointing at them. Marked
  // `fails` until cleanup is added; then delete `.fails`.
  test.fails("Test E - The lesson's PDFs are removed from storage", async () => {
    await signInAs(teacher);
    const lessonId = await createSampleLesson(classroomId);
    await seedMaterial(classroomId, { lessonId, fileName: "handout.pdf" });

    await deleteLesson(lessonId);

    const { data: files } = await admin.storage
      .from("documents")
      .list(`lesson_documents/${classroomId}/${lessonId}`);

    expect(files ?? []).toEqual([]);
  });
});

// -- Editing a lesson -----------------------------------------------------------------

describe("Editing a lesson", () => {
  let teacher: TestUser;
  let otherTeacher: TestUser;
  let student: TestUser; // Enrolled in the classroom.
  let classroomId: string;

  beforeAll(async () => {
    teacher = await seedUser("teacher");
    otherTeacher = await seedUser("teacher");
    student = await seedUser("student");

    classroomId = await seedClassroom(teacher, "Business English");
    await seedEnrolment(student, classroomId);
  });

  test("Test A - A teacher changes the title, description and release date", async () => {
    await signInAs(teacher);
    const lessonId = await createSampleLesson(classroomId, { releaseDateKey: nextWeekKey() });

    // What the dashboard planner sends after an edit.
    const newDate = nextWeekKey();
    await updateLesson(lessonId, {
      title: "Meetings, Money and Margins",
      description: "Now with profit margins.",
      releaseDateIso: releaseDateToIso(newDate),
    });

    const lesson = await lessonRow(lessonId);

    expect(lesson?.title).toBe("Meetings, Money and Margins");
    expect(lesson?.description).toBe("Now with profit margins.");
    expect(new Date(lesson?.release_date as string).toISOString()).toBe(releaseDateToIso(newDate));
  });

  test("Test B - Moving a released lesson to next week hides it from students", async () => {
    await signInAs(teacher);
    const lessonId = await createSampleLesson(classroomId, { title: "Rescheduled" });

    await updateLesson(lessonId, {
      title: "Rescheduled",
      description: "Moved to next week.",
      releaseDateIso: releaseDateToIso(nextWeekKey()),
    });

    await signInAs(student);
    const result = await getStudentClassroom(student.id, classroomId);

    expect(result.lessons.map((lesson) => lesson.lesson_id)).not.toContain(lessonId);
  });

  test("Test C - Another teacher can't edit the lesson", async () => {
    await signInAs(teacher);
    const lessonId = await createSampleLesson(classroomId, { title: "Original Title" });

    await signInAs(otherTeacher);
    // RLS doesn't raise an error for a refused update; it changes nothing.
    await updateLesson(lessonId, {
      title: "Hijacked",
      description: "Not my lesson.",
      releaseDateIso: new Date().toISOString(),
    });

    expect((await lessonRow(lessonId))?.title).toBe("Original Title");
  });

  test("Test D - A student can't edit the lesson", async () => {
    await signInAs(teacher);
    const lessonId = await createSampleLesson(classroomId, { title: "Original Title" });

    await signInAs(student);
    await updateLesson(lessonId, {
      title: "Student Edit",
      description: "Not allowed.",
      releaseDateIso: new Date().toISOString(),
    });

    expect((await lessonRow(lessonId))?.title).toBe("Original Title");
  });

  test("Test E - A teacher edits a flashcard's word and definition in a scheduled lesson", async () => {
    await signInAs(teacher);
    const lessonId = await createSampleLesson(classroomId, { releaseDateKey: nextWeekKey() });
    const card = (await getFlashcards(lessonId)).find((row) => row.word === "invoice");

    await saveFlashcardEdit({
      lessonId,
      card: card!,
      word: "receipt",
      definition: "Proof that a payment was made",
      newImage: null,
      removeImage: false,
    });

    const cards = await getFlashcards(lessonId);

    expect(cards).toContainEqual(
      expect.objectContaining({ word: "receipt", definition: "Proof that a payment was made" }),
    );
    expect(cards.map((row) => row.word)).not.toContain("invoice");
  });

  test("Test F - A teacher removes a flashcard from a scheduled lesson", async () => {
    await signInAs(teacher);
    const lessonId = await createSampleLesson(classroomId, { releaseDateKey: nextWeekKey() });
    const card = (await getFlashcards(lessonId)).find((row) => row.word === "profit");

    await removeFlashcard(card!);

    const words = (await getFlashcards(lessonId)).map((row) => row.word);

    expect(words).toEqual(expect.arrayContaining(["invoice", "deadline"]));
    expect(words).not.toContain("profit");
  });

  // Once a lesson is released, students may already have studied its cards or
  // taken its quiz, so its flashcards are locked. The lesson can still be deleted.

  test("Test G - A released lesson's flashcards can't be edited", async () => {
    await signInAs(teacher);
    const lessonId = await createSampleLesson(classroomId); // Released now.
    const card = (await getFlashcards(lessonId)).find((row) => row.word === "invoice");

    await expect(
      saveFlashcardEdit({
        lessonId,
        card: card!,
        word: "receipt",
        definition: "Proof that a payment was made",
        newImage: null,
        removeImage: false,
      }),
    ).rejects.toThrow("This lesson has been released");

    // Read as admin, so RLS can't hide a change that slipped through.
    const { data } = await admin
      .from("flashcards")
      .select("word, definition")
      .eq("flashcard_id", card!.flashcard_id)
      .single();

    expect(data).toEqual({ word: "invoice", definition: "A bill sent to a customer" });
  });

  test("Test H - A released lesson's flashcards can't be removed", async () => {
    await signInAs(teacher);
    const lessonId = await createSampleLesson(classroomId); // Released now.
    const card = (await getFlashcards(lessonId)).find((row) => row.word === "profit");

    await expect(removeFlashcard(card!)).rejects.toThrow("This lesson has been released");

    expect(await rowsInLesson("flashcards", lessonId)).toBe(3);
  });

  test("Test I - A released lesson can still be deleted, flashcards and all", async () => {
    await signInAs(teacher);
    const lessonId = await createSampleLesson(classroomId); // Released now.

    await deleteLesson(lessonId);

    expect(await lessonRow(lessonId)).toBeNull();
    expect(await rowsInLesson("flashcards", lessonId)).toBe(0);
  });
});

// -- Scheduling a lesson --------------------------------------------------------------

describe("Scheduling a lesson", () => {
  let teacher: TestUser;
  let student: TestUser; // Enrolled in the classroom.
  let classroomId: string;

  beforeAll(async () => {
    teacher = await seedUser("teacher");
    student = await seedUser("student");

    classroomId = await seedClassroom(teacher, "Business English");
    await seedEnrolment(student, classroomId);
  });

  test("Test A - A scheduled lesson is saved to release at midnight on the chosen day", async () => {
    await signInAs(teacher);

    const releaseDateKey = nextWeekKey();
    const lessonId = await createSampleLesson(classroomId, { releaseDateKey });

    const lesson = await lessonRow(lessonId);

    // Midnight at the start of that day, in the teacher's time zone.
    expect(new Date(lesson?.release_date as string).toISOString()).toBe(
      releaseDateToIso(releaseDateKey),
    );
  });

  test("Test B - Students can't see a scheduled lesson before its release date", async () => {
    await signInAs(teacher);
    const lessonId = await createSampleLesson(classroomId, {
      title: "Coming Soon",
      releaseDateKey: nextWeekKey(),
    });

    await signInAs(student);

    // Not through the app...
    const result = await getStudentClassroom(student.id, classroomId);
    expect(result.lessons.map((lesson) => lesson.lesson_id)).not.toContain(lessonId);

    // ...and not by querying directly: the "released lessons only" policy hides it.
    const { data } = await supabase.from("lessons").select("lesson_id").eq("lesson_id", lessonId);
    expect(data).toEqual([]);
  });

  test("Test C - Students can't open a scheduled lesson's flashcards or quiz early", async () => {
    await signInAs(teacher);
    const lessonId = await createSampleLesson(classroomId, { releaseDateKey: nextWeekKey() });

    await signInAs(student);

    // The lesson_is_open policy closes its content too, so a student who
    // guessed the lesson's id still gets nothing.
    const { data: cards } = await supabase
      .from("flashcards")
      .select("word")
      .eq("lesson_id", lessonId);
    const { data: quizzes } = await supabase
      .from("mcqs")
      .select("mcq_id")
      .eq("lesson_id", lessonId);

    expect(cards).toEqual([]);
    expect(quizzes).toEqual([]);
  });

  test("Test D - The teacher still sees a scheduled lesson, marked as scheduled", async () => {
    await signInAs(teacher);
    const lessonId = await createSampleLesson(classroomId, {
      title: "Teacher Preview",
      releaseDateKey: nextWeekKey(),
    });

    const lessons = await getClassroomLessonSummaries(classroomId);
    const scheduled = lessons.find((lesson) => lesson.lesson_id === lessonId);

    expect(scheduled?.isScheduled).toBe(true);
    expect(scheduled?.hasQuiz).toBe(true);
    expect(scheduled?.wordCount).toBe(3);
  });

  test("Test E - Once the release date has passed, students can open the lesson", async () => {
    await signInAs(teacher);
    const lessonId = await createSampleLesson(classroomId, {
      title: "Now Open",
      releaseDateKey: nextWeekKey(),
    });

    // Simulate the week passing: move the release date to yesterday.
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await admin.from("lessons").update({ release_date: yesterday }).eq("lesson_id", lessonId);

    await signInAs(student);
    const result = await getStudentClassroom(student.id, classroomId);
    const { data: cards } = await supabase
      .from("flashcards")
      .select("word")
      .eq("lesson_id", lessonId);

    expect(result.lessons.map((lesson) => lesson.lesson_id)).toContain(lessonId);
    expect(cards).toHaveLength(3);
  });
});
