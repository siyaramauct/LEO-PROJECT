// -----------------------------------------------------------------------------
// Student Lesson Tests
//
// What a student does while taking lessons, through the app's real service
// (src/services/studentLessonService.ts) while signed in as the student, so
// RLS applies exactly as in the browser: open a lesson, submit a quiz, finish
// a flashcards-only lesson, and look up progress and results. Setup that isn't
// being tested uses the seed helpers (see helpers.ts).
//
// Database triggers involved:
//   check_lesson_attempt       refuses impossible attempts (scores out of range,
//                              lessons without a quiz)
//   notify_attempt_completed   tells the teacher when a student completes a lesson
// -----------------------------------------------------------------------------

import { beforeAll, describe, expect, test, vi } from "vitest";
import {
  finishLesson,
  getCompletedLessonIds,
  getLatestQuizResult,
  getLessonProgress,
  openLesson,
  submitQuiz,
} from "../../src/services/studentLessonService";
import { supabase } from "../../src/supabase-client";
import {
  admin,
  seedClassroom,
  seedEnrolment,
  seedFlashcards,
  seedLesson,
  seedMaterial,
  seedQuiz,
  seedUser,
  signInAs,
  type TestUser,
} from "./helpers";

// -- Shared steps ---------------------------------------------------------------------

// A classroom with a teacher and one enrolled student.
async function seedClassWithStudent() {
  const teacher = await seedUser("teacher");
  const student = await seedUser("student");
  const classroomId = await seedClassroom(teacher, "Business English");
  await seedEnrolment(student, classroomId);

  return { teacher, student, classroomId };
}

// A released lesson with three flashcards and a three-question quiz.
async function seedQuizLesson(classroomId: string, { scheduled = false } = {}) {
  const lessonId = await seedLesson(classroomId, { title: "Meetings and Money", scheduled });
  await seedFlashcards(lessonId);
  const { quiz, questions } = await seedQuiz(lessonId);

  return { lessonId, quiz, questions };
}

// Today's activity row for the student, if any (read as admin).
async function activityToday(student: TestUser) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
  const { data } = await admin
    .from("student_activity")
    .select("source")
    .eq("student_id", student.id)
    .eq("activity_date", today)
    .maybeSingle();

  return data;
}

async function attemptsFor(student: TestUser, lessonId: string) {
  const { data } = await admin
    .from("lesson_attempts")
    .select("score, started_at, completed_at")
    .eq("student_id", student.id)
    .eq("lesson_id", lessonId);

  return data ?? [];
}

// When the student started the quiz, as QuickQuiz records it.
const startedAt = () => new Date(Date.now() - 5 * 60 * 1000).toISOString();

// -- Opening a lesson -----------------------------------------------------------------

describe("Opening a lesson", () => {
  let student: TestUser;
  let classroomId: string;

  beforeAll(async () => {
    ({ student, classroomId } = await seedClassWithStudent());
  });

  test("Test A - An enrolled student gets the lesson's flashcards and learns it has a quiz", async () => {
    const { lessonId } = await seedQuizLesson(classroomId);

    await signInAs(student);
    const lesson = await openLesson(student.id, lessonId);

    expect(lesson.flashcards.map((card) => card.word).sort()).toEqual([
      "deadline",
      "invoice",
      "profit",
    ]);
    expect(lesson.hasQuiz).toBe(true);
    expect(lesson.documents).toEqual([]);
  });

  test("Test B - A flashcards-only lesson is reported as having no quiz", async () => {
    const lessonId = await seedLesson(classroomId, { title: "Just Words" });
    await seedFlashcards(lessonId, ["agenda", "minutes"]);

    await signInAs(student);
    const lesson = await openLesson(student.id, lessonId);

    expect(lesson.flashcards).toHaveLength(2);
    expect(lesson.hasQuiz).toBe(false);
  });

  test("Test C - Attached PDFs come with a link the student can open", async () => {
    const { lessonId } = await seedQuizLesson(classroomId);
    await seedMaterial(classroomId, { lessonId, fileName: "glossary.pdf" });

    await signInAs(student);
    const lesson = await openLesson(student.id, lessonId);

    expect(lesson.documents).toHaveLength(1);
    expect(lesson.documents[0].resource_url).toMatch(/-glossary\.pdf$/);
    expect(lesson.documents[0].signedUrl).toContain("token=");
  });

  test("Test D - Opening a lesson counts today towards the student's streak", async () => {
    const { student: freshStudent, classroomId: freshClassroom } = await seedClassWithStudent();
    const { lessonId } = await seedQuizLesson(freshClassroom);

    await signInAs(freshStudent);
    await openLesson(freshStudent.id, lessonId);

    // openLesson logs the day without waiting for it, so allow it a moment.
    await vi.waitFor(async () => {
      expect(await activityToday(freshStudent)).toEqual({ source: "flashcard_practice" });
    });
  });

  test("Test E - A student who hasn't joined the classroom gets nothing", async () => {
    const { lessonId } = await seedQuizLesson(classroomId);
    const outsider = await seedUser("student");

    await signInAs(outsider);
    const lesson = await openLesson(outsider.id, lessonId);

    expect(lesson.flashcards).toEqual([]);
    expect(lesson.hasQuiz).toBe(false);
  });
});

// -- Submitting a quiz ----------------------------------------------------------------

describe("Submitting a quiz", () => {
  let teacher: TestUser;
  let classroomId: string;

  beforeAll(async () => {
    teacher = await seedUser("teacher");
    classroomId = await seedClassroom(teacher, "Business English");
  });

  // Each test gets its own student, so attempts and activity never overlap.
  async function newStudent() {
    const student = await seedUser("student");
    await seedEnrolment(student, classroomId);

    return student;
  }

  test("Test A - The answers are marked, the attempt is saved, and the full result comes back", async () => {
    const student = await newStudent();
    const { lessonId, quiz, questions } = await seedQuizLesson(classroomId);
    const [first, second, third] = questions; // Correct answers A, B, C.

    await signInAs(student);
    const result = await submitQuiz({
      studentId: student.id,
      studentName: "Test Student",
      lessonId,
      quiz,
      questions,
      answers: { [first.question_id]: "A", [second.question_id]: "D" }, // Third left blank.
      startedAt: startedAt(),
    });

    expect(result).toMatchObject({ score: 1, totalQuestions: 3, correct: 1, incorrect: 2 });
    expect(result.results).toContainEqual({
      questionId: second.question_id,
      question: second.question_text,
      studentAnswer: "D",
      correctAnswer: "deadline",
      isCorrect: false,
    });
    expect(result.results.find((row) => row.questionId === third.question_id)?.studentAnswer).toBe(
      "Not answered",
    );

    const attempts = await attemptsFor(student, lessonId);
    expect(attempts).toHaveLength(1);
    expect(attempts[0].score).toBe(1);
    expect(attempts[0].completed_at).not.toBeNull();
  });

  test("Test B - The teacher is told the student's name and score, once", async () => {
    const student = await newStudent();
    const { lessonId, quiz, questions } = await seedQuizLesson(classroomId);

    await signInAs(student);
    await submitQuiz({
      studentId: student.id,
      studentName: "Test Student",
      lessonId,
      quiz,
      questions,
      answers: Object.fromEntries(questions.map((q) => [q.question_id, q.correct_option])),
      startedAt: startedAt(),
    });

    // The database sends this (notify_attempt_completed); the app's own copy
    // is dropped, so there must be exactly one.
    const { data: notices } = await admin
      .from("notifications")
      .select("title, body, link_url")
      .eq("recipient_id", teacher.id)
      .eq("type", "lesson_completed")
      .like("body", "Test Student scored 3/3%");

    expect(notices).toHaveLength(1);
    expect(notices?.[0]).toEqual({
      title: "A student completed a lesson",
      body: 'Test Student scored 3/3 on "Meetings and Money" in "Business English".',
      link_url: `/teacher-classroom/${classroomId}`,
    });
  });

  test("Test C - Submitting a quiz counts today towards the student's streak", async () => {
    const student = await newStudent();
    const { lessonId, quiz, questions } = await seedQuizLesson(classroomId);

    await signInAs(student);
    await submitQuiz({
      studentId: student.id,
      studentName: "Test Student",
      lessonId,
      quiz,
      questions,
      answers: {},
      startedAt: startedAt(),
    });

    expect(await activityToday(student)).toEqual({ source: "lesson_quiz" });
  });

  test("Test D - A scheduled lesson's quiz can't be submitted before it opens", async () => {
    const student = await newStudent();
    const { lessonId, quiz, questions } = await seedQuizLesson(classroomId, { scheduled: true });

    await signInAs(student);
    await expect(
      submitQuiz({
        studentId: student.id,
        studentName: "Test Student",
        lessonId,
        quiz,
        questions,
        answers: {},
        startedAt: startedAt(),
      }),
    ).rejects.toThrow();

    expect(await attemptsFor(student, lessonId)).toEqual([]);
  });

  test("Test E - A student who hasn't joined the classroom can't submit", async () => {
    const outsider = await seedUser("student");
    const { lessonId, quiz, questions } = await seedQuizLesson(classroomId);

    await signInAs(outsider);
    await expect(
      submitQuiz({
        studentId: outsider.id,
        studentName: "Outsider",
        lessonId,
        quiz,
        questions,
        answers: {},
        startedAt: startedAt(),
      }),
    ).rejects.toThrow();

    expect(await attemptsFor(outsider, lessonId)).toEqual([]);
  });
});

// -- Progress and results -------------------------------------------------------------

describe("Progress and results", () => {
  let student: TestUser;
  let classroomId: string;

  beforeAll(async () => {
    ({ student, classroomId } = await seedClassWithStudent());
  });

  test("Test A - Progress shows which lessons are done, with the latest score", async () => {
    const done = await seedQuizLesson(classroomId);
    const notDone = await seedQuizLesson(classroomId);

    await signInAs(student);
    await submitQuiz({
      studentId: student.id,
      studentName: "Test Student",
      lessonId: done.lessonId,
      quiz: done.quiz,
      questions: done.questions,
      answers: { [done.questions[0].question_id]: "A", [done.questions[1].question_id]: "B" },
      startedAt: startedAt(),
    });

    const progress = await getLessonProgress(student.id, [done.lessonId, notDone.lessonId]);

    expect(progress.get(done.lessonId)).toEqual({
      completed: true,
      hasQuiz: true,
      latestScore: 2,
      scoreCeiling: 3,
      latestPercent: 67,
    });
    expect(progress.get(notDone.lessonId)?.completed).toBe(false);
    expect(await getCompletedLessonIds(student.id, [done.lessonId, notDone.lessonId])).toEqual([
      done.lessonId,
    ]);
  });

  test("Test B - After a retake, progress shows the newest score", async () => {
    const { lessonId, quiz, questions } = await seedQuizLesson(classroomId);
    const allRight = Object.fromEntries(questions.map((q) => [q.question_id, q.correct_option]));

    await signInAs(student);
    for (const answers of [{}, allRight]) {
      await submitQuiz({
        studentId: student.id,
        studentName: "Test Student",
        lessonId,
        quiz,
        questions,
        answers,
        startedAt: startedAt(),
      });
    }

    const progress = await getLessonProgress(student.id, [lessonId]);

    expect(progress.get(lessonId)?.latestScore).toBe(3);
    expect(await attemptsFor(student, lessonId)).toHaveLength(2);
  });

  test("Test C - The latest quiz result can be loaded again, without the answer review", async () => {
    const { student: freshStudent, classroomId: freshClassroom } = await seedClassWithStudent();
    const { lessonId, quiz, questions } = await seedQuizLesson(freshClassroom);

    await signInAs(freshStudent);
    expect(await getLatestQuizResult(freshStudent.id)).toBeNull();

    await submitQuiz({
      studentId: freshStudent.id,
      studentName: "Test Student",
      lessonId,
      quiz,
      questions,
      answers: { [questions[2].question_id]: "C" },
      startedAt: startedAt(),
    });

    expect(await getLatestQuizResult(freshStudent.id)).toEqual({
      score: 1,
      totalQuestions: 3,
      correct: 1,
      incorrect: 2,
      results: [],
    });
  });
});

// -- Finishing a flashcards-only lesson -----------------------------------------------

describe("Finishing a flashcards-only lesson", () => {
  // KNOWN BUG: the check_lesson_attempt trigger refuses every attempt on a
  // lesson without a quiz ("This lesson has no quiz"), so finishLesson, which
  // exists for exactly those lessons, always fails and students can't complete
  // them. Marked `fails` until the trigger allows unscored attempts on
  // flashcards-only lessons; then delete `.fails`.
  test.fails("Test A - Finishing records the lesson as done, without a score", async () => {
    const { student, classroomId } = await seedClassWithStudent();
    const lessonId = await seedLesson(classroomId, { title: "Just Words" });
    await seedFlashcards(lessonId, ["agenda", "minutes"]);

    await signInAs(student);
    await finishLesson({ studentId: student.id, lessonId, startedAt: startedAt() });

    const progress = await getLessonProgress(student.id, [lessonId]);

    expect(progress.get(lessonId)).toMatchObject({
      completed: true,
      hasQuiz: false,
      latestScore: null,
    });
  });
});

// -- Rules the database should enforce ------------------------------------------------

describe("Quiz protections", () => {
  let student: TestUser;
  let classroomId: string;

  beforeAll(async () => {
    ({ student, classroomId } = await seedClassWithStudent());
  });

  test("Test A - A score above the quiz's maximum is refused", async () => {
    const { lessonId } = await seedQuizLesson(classroomId);

    await signInAs(student);
    const { error } = await supabase.from("lesson_attempts").insert({
      student_id: student.id,
      lesson_id: lessonId,
      score: 4, // Out of 3.
      started_at: startedAt(),
      completed_at: new Date().toISOString(),
    });

    expect(error?.message).toContain("Score must be between 0 and 3");
  });

  test("Test B - A student can't save an attempt for someone else", async () => {
    const { lessonId } = await seedQuizLesson(classroomId);
    const classmate = await seedUser("student");
    await seedEnrolment(classmate, classroomId);

    await signInAs(student);
    const { error } = await supabase.from("lesson_attempts").insert({
      student_id: classmate.id,
      lesson_id: lessonId,
      score: 3,
      started_at: startedAt(),
      completed_at: new Date().toISOString(),
    });

    expect(error).not.toBeNull();
    expect(await attemptsFor(classmate, lessonId)).toEqual([]);
  });

  // KNOWN GAP: quizzes are marked in the browser, and students insert their own
  // score. Any score from 0 to the maximum is accepted, so a student can record
  // full marks without answering. Fixing it means marking on the server (for
  // example an RPC that takes the answers). Marked `fails` until then.
  test.fails("Test C - A student can't record full marks without answering", async () => {
    const { lessonId } = await seedQuizLesson(classroomId);

    await signInAs(student);
    const { error } = await supabase.from("lesson_attempts").insert({
      student_id: student.id,
      lesson_id: lessonId,
      score: 3,
      started_at: startedAt(),
      completed_at: new Date().toISOString(),
    });

    expect(error).not.toBeNull();
  });

  // KNOWN GAP: students can read questions.correct_option, so the answers are
  // visible before they submit. Marked `fails` until the answers are hidden
  // from students (for example served without correct_option and marked on the
  // server); then delete `.fails`.
  test.fails("Test D - A student can't read a quiz's correct answers", async () => {
    const { quiz } = await seedQuizLesson(classroomId);

    await signInAs(student);
    const { data } = await supabase
      .from("questions")
      .select("correct_option")
      .eq("mcq_id", quiz.mcq_id);

    expect(data ?? []).toEqual([]);
  });
});
