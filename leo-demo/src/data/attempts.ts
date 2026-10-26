// -----------------------------------------------------------------------------
// Lesson Attempts
//
// Reads and saves a student's lesson attempts (lesson_attempts). A completed
// attempt marks the lesson as done; quiz attempts carry a score, while
// flashcards-only attempts have none.
//
// Every function throws a DataError when Supabase reports a problem.
// -----------------------------------------------------------------------------

import { supabase } from "../supabase-client";
import { DataError, friendlyMessage } from "./errors";
import { fetchAllRows } from "./paging";

export type Attempt = {
  lesson_id: string;
  score: number | null;
  completed_at: string;
};

// The student's completed attempts at these lessons, newest first.
export async function getCompletedAttempts(
  studentId: string,
  lessonIds: string[],
): Promise<Attempt[]> {
  if (lessonIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("lesson_attempts")
    .select("lesson_id, score, completed_at")
    .eq("student_id", studentId)
    .in("lesson_id", lessonIds)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false });

  if (error) {
    throw new DataError("Lesson progress could not be loaded right now.", error);
  }

  return data as Attempt[];
}

// The student's most recent quiz attempt, or null if they have none.
export async function getLatestScoredAttempt(studentId: string): Promise<Attempt | null> {
  const { data, error } = await supabase
    .from("lesson_attempts")
    .select("lesson_id, score, completed_at")
    .eq("student_id", studentId)
    // Flashcards-only completions have no score to summarise.
    .not("score", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new DataError("Your latest quiz result could not be loaded.", error);
  }

  return data as Attempt | null;
}

type NewAttempt = {
  studentId: string;
  lessonId: string;
  score: number | null; // Null for a flashcards-only lesson.
  startedAt: string;
};

export async function saveCompletedAttempt({
  studentId,
  lessonId,
  score,
  startedAt,
}: NewAttempt): Promise<void> {
  const { error } = await supabase.from("lesson_attempts").insert({
    student_id: studentId,
    lesson_id: lessonId,
    score,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
  });

  // The database's own messages (for example "This lesson has no quiz") are the most useful.
  if (error) {
    throw new DataError(
      friendlyMessage(error, "Your answers could not be saved. Please try again."),
      error,
    );
  }
}

export type ClassAttempt = {
  student_id: string;
  lesson_id: string;
  score: number | null;
  started_at: string | null;
  completed_at: string;
};

// Every completed attempt by these students at these lessons, oldest first, so
// the first one seen per student and lesson is their first try. Read page by
// page because it grows with class size.
export async function getClassAttempts(
  lessonIds: string[],
  studentIds: string[],
): Promise<ClassAttempt[]> {
  if (lessonIds.length === 0 || studentIds.length === 0) {
    return [];
  }

  try {
    return await fetchAllRows<ClassAttempt>((from, to) =>
      supabase
        .from("lesson_attempts")
        .select("student_id, lesson_id, score, started_at, completed_at")
        .in("lesson_id", lessonIds)
        .in("student_id", studentIds)
        .not("completed_at", "is", null)
        .order("completed_at")
        .order("attempt_id")
        .range(from, to),
    );
  } catch (error) {
    throw new DataError("Class attempts could not be loaded right now.", error);
  }
}
