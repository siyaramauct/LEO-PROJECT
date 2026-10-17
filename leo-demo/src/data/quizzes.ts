// -----------------------------------------------------------------------------
// Quizzes
//
// Reads a lesson's multiple-choice quiz (mcqs) and its questions. A lesson has
// at most one quiz; flashcards-only lessons have none.
//
// Every function throws a DataError when Supabase reports a problem.
// -----------------------------------------------------------------------------

import type { QuizQuestion } from "../domain/scoring";
import { supabase } from "../supabase-client";
import { DataError } from "./errors";

export type Quiz = {
  mcq_id: string;
  title: string | null;
  score_ceiling: number | null;
};

// Null for a flashcards-only lesson.
export async function getQuiz(lessonId: string): Promise<Quiz | null> {
  const { data, error } = await supabase
    .from("mcqs")
    .select("mcq_id, title, score_ceiling")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (error) {
    throw new DataError("The quiz could not be loaded right now.", error);
  }

  return data as Quiz | null;
}

export async function getQuizQuestions(mcqId: string): Promise<QuizQuestion[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("question_id, question_text, option_a, option_b, option_c, option_d, correct_option")
    .eq("mcq_id", mcqId);

  if (error) {
    throw new DataError("The quiz questions could not be loaded right now.", error);
  }

  return data as QuizQuestion[];
}

// Each lesson's score ceiling, keyed by lesson id. A lesson missing from the
// map has no quiz.
export async function getQuizCeilings(lessonIds: string[]): Promise<Map<string, number | null>> {
  if (lessonIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("mcqs")
    .select("lesson_id, score_ceiling")
    .in("lesson_id", lessonIds);

  if (error) {
    throw new DataError("Lesson quizzes could not be loaded right now.", error);
  }

  return new Map(
    data.map((quiz) => [quiz.lesson_id as string, quiz.score_ceiling as number | null]),
  );
}

type NewQuiz = {
  lessonId: string;
  title: string;
  scoreCeiling: number;
};

// Returns the new quiz's id.
export async function insertQuiz({ lessonId, title, scoreCeiling }: NewQuiz): Promise<string> {
  const { data, error } = await supabase
    .from("mcqs")
    .insert({ lesson_id: lessonId, score_ceiling: scoreCeiling, title })
    .select("mcq_id")
    .single();

  if (error) {
    throw new DataError(error.message || "The MCQ activity could not be created.", error);
  }

  return data.mcq_id as string;
}

export type NewQuestion = Omit<QuizQuestion, "question_id">;

export async function insertQuestions(mcqId: string, questions: NewQuestion[]): Promise<void> {
  const { error } = await supabase
    .from("questions")
    .insert(questions.map((question) => ({ ...question, mcq_id: mcqId })));

  if (error) {
    throw new DataError(error.message || "The quiz questions could not be saved.", error);
  }
}
