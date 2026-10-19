// -----------------------------------------------------------------------------
// Lesson Service
//
// What a student does while taking lessons, step by step: open a lesson,
// submit a quiz, finish a flashcards-only lesson, and look up which lessons
// are done. Pages
// call these instead of querying Supabase (see src/data for the queries and
// src/domain/scoring.ts for how a quiz is marked).
//
// Functions throw a DataError whose message can be shown to the student.
// -----------------------------------------------------------------------------

import { logStudyDay } from "../data/activity";
import {
  getCompletedAttempts,
  getLatestScoredAttempt,
  saveCompletedAttempt,
} from "../data/attempts";
import { getFlashcards, type LessonFlashcard } from "../data/flashcards";
import { getLessonWithClassroom } from "../data/lessons";
import { getLessonDocuments } from "../data/materials";
import { notifyUser } from "../data/notifications";
import { getQuiz, getQuizCeilings, type Quiz } from "../data/quizzes";
import {
  correctAnswerText,
  scorePercent,
  scoreQuiz,
  type QuizAnswers,
  type QuizQuestion,
} from "../domain/scoring";
import { signLessonDocuments, type LessonDocument } from "./lessonAuthoringService";

// The result the summary page shows. QuickQuiz hands it over in sessionStorage.
export type QuizResult = {
  score: number;
  totalQuestions: number; // The quiz's score ceiling.
  correct: number;
  incorrect: number;
  results: Array<{
    questionId: string;
    question: string;
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }>;
};

// -- Opening a lesson ---------------------------------------------------------------

type OpenedLesson = {
  flashcards: LessonFlashcard[];
  hasQuiz: boolean;
  documents: LessonDocument[]; // Each with a link that works for an hour.
};

// Everything the flashcard step needs. Opening a lesson also counts today
// towards the student's streak.
export async function openLesson(studentId: string, lessonId: string): Promise<OpenedLesson> {
  // 1. Log today as an active day (best effort; never holds up the lesson).
  void logStudyDay(studentId, "flashcard_practice");

  // 2. Together: the flashcards, the quiz and any attached documents.
  const [flashcards, quiz, documents] = await Promise.all([
    getFlashcards(lessonId),
    // A failed quiz lookup counts as no quiz.
    getQuiz(lessonId).catch(() => null),
    // Documents are secondary: a failure leaves the list empty.
    getLessonDocuments(lessonId).catch((documentsError) => {
      console.error("Could not load lesson documents:", documentsError);
      return [];
    }),
  ]);

  // 3. The documents live in a private bucket, so each one gets a signed link.
  return {
    flashcards,
    hasQuiz: quiz !== null,
    documents: await signLessonDocuments(documents),
  };
}

// -- Progress -----------------------------------------------------------------------

export type LessonProgress = {
  completed: boolean;
  hasQuiz: boolean;
  latestScore: number | null; // From the most recent attempt.
  scoreCeiling: number | null;
  latestPercent: number | null;
};

// Each lesson's progress for the student, keyed by lesson id.
export async function getLessonProgress(
  studentId: string,
  lessonIds: string[],
): Promise<Map<string, LessonProgress>> {
  const [attempts, ceilings] = await Promise.all([
    getCompletedAttempts(studentId, lessonIds),
    // A failed quiz lookup comes back as null.
    getQuizCeilings(lessonIds).catch((quizError) => {
      console.error("Failed to load lesson quizzes:", quizError);
      return null;
    }),
  ]);

  const progress = new Map<string, LessonProgress>();

  for (const lessonId of lessonIds) {
    // Attempts are newest first, so the first match is the latest.
    const latest = attempts.find((attempt) => attempt.lesson_id === lessonId);
    const latestScore = latest?.score ?? null;
    const scoreCeiling = ceilings?.get(lessonId) ?? null;

    progress.set(lessonId, {
      completed: latest !== undefined,
      // Without the quiz lookup, assume a quiz rather than mislabel lessons.
      hasQuiz: ceilings === null || ceilings.has(lessonId),
      latestScore,
      scoreCeiling,
      latestPercent: scorePercent(latestScore, scoreCeiling),
    });
  }

  return progress;
}

// Ids of the lessons the student has completed at least once.
export async function getCompletedLessonIds(
  studentId: string,
  lessonIds: string[],
): Promise<string[]> {
  const attempts = await getCompletedAttempts(studentId, lessonIds);
  const completedIds = attempts.map((attempt) => attempt.lesson_id);

  return [...new Set(completedIds)];
}

type SubmitQuizInput = {
  studentId: string;
  studentName: string;
  lessonId: string;
  quiz: Quiz;
  questions: QuizQuestion[];
  answers: QuizAnswers;
  startedAt: string;
};

export async function submitQuiz({
  studentId,
  studentName,
  lessonId,
  quiz,
  questions,
  answers,
  startedAt,
}: SubmitQuizInput): Promise<QuizResult> {
  // 1. Mark the answers and save the attempt.
  const { correctCount, score, scoreCeiling } = scoreQuiz(questions, answers, quiz.score_ceiling);

  await saveCompletedAttempt({ studentId, lessonId, score, startedAt });

  // 2. Tell the teacher (best effort; a failure never hides the result).
  await notifyTeacherOfQuiz({ lessonId, studentName, score, scoreCeiling });

  // 3. Count today towards the streak (best effort).
  await logStudyDay(studentId, "lesson_quiz");

  // 4. The detailed result for the summary page.
  return {
    score,
    totalQuestions: scoreCeiling,
    correct: correctCount,
    incorrect: questions.length - correctCount,
    results: questions.map((question) => ({
      questionId: question.question_id,
      question: question.question_text,
      studentAnswer: answers[question.question_id] ?? "Not answered",
      correctAnswer: correctAnswerText(question),
      isCorrect: answers[question.question_id] === question.correct_option,
    })),
  };
}

type QuizNotification = {
  lessonId: string;
  studentName: string;
  score: number;
  scoreCeiling: number;
};

async function notifyTeacherOfQuiz({
  lessonId,
  studentName,
  score,
  scoreCeiling,
}: QuizNotification) {
  const lesson = await getLessonWithClassroom(lessonId).catch((lookupError) => {
    console.error("Could not find the lesson's teacher:", lookupError);
    return null;
  });

  if (!lesson?.classroom?.teacher_id) {
    return;
  }

  const { classroom } = lesson;

  await notifyUser({
    recipient_id: classroom.teacher_id,
    type: "lesson_completed",
    title: "A student completed a lesson",
    body: `${studentName} scored ${score}/${scoreCeiling} on "${lesson.title}" in "${classroom.classroom_name}".`,
    link_url: `/teacher-classroom/${classroom.classroom_id}`,
  });
}

type FinishLessonInput = {
  studentId: string;
  lessonId: string;
  startedAt: string;
};

// Completes a flashcards-only lesson: an attempt with no score marks it done.
export async function finishLesson({
  studentId,
  lessonId,
  startedAt,
}: FinishLessonInput): Promise<void> {
  await saveCompletedAttempt({ studentId, lessonId, score: null, startedAt });

  // Today may already be logged from opening the lesson; repeats are ignored.
  await logStudyDay(studentId, "lesson_completed");
}

// The student's latest quiz result, for when the summary page is opened
// without one (for example after a refresh in a new tab). Only the score is
// stored, so the answer review is empty and each mark counts as one question.
export async function getLatestQuizResult(studentId: string): Promise<QuizResult | null> {
  const attempt = await getLatestScoredAttempt(studentId);

  if (!attempt || attempt.score === null) {
    return null;
  }

  const ceilings = await getQuizCeilings([attempt.lesson_id]);
  const scoreCeiling = ceilings.get(attempt.lesson_id) ?? attempt.score;

  return {
    score: attempt.score,
    totalQuestions: scoreCeiling,
    correct: attempt.score,
    incorrect: Math.max(scoreCeiling - attempt.score, 0),
    results: [],
  };
}
