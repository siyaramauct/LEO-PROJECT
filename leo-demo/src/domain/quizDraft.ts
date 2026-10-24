// -----------------------------------------------------------------------------
// Quiz Drafts
//
// The rules for a quiz before it is saved: what a complete question looks
// like, checking the quiz the AI generated, and checking the teacher's edits
// in the review step. Pure functions: no React, no Supabase, so the rules can
// be tested on their own.
// -----------------------------------------------------------------------------

import type { AnswerOption } from "./scoring";

// The kinds of quiz a teacher can pick. Every question is multiple choice:
//   match-definition-mcq   read a definition, choose the word it describes
//   fill-blank-mcq         choose the missing word in a sentence
//   mixed-mcq              both kinds, taking turns
export type QuizFormat = "match-definition-mcq" | "fill-blank-mcq" | "mixed-mcq";

export const QUIZ_FORMATS: QuizFormat[] = ["match-definition-mcq", "fill-blank-mcq", "mixed-mcq"];

export type DraftQuestion = {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: AnswerOption;
};

export type DraftQuiz = { title: string; questions: DraftQuestion[] };

export const ANSWER_OPTIONS: AnswerOption[] = ["A", "B", "C", "D"];

// True for a string with something other than spaces in it.
function hasText(value: unknown) {
  return typeof value === "string" && value.trim() !== "";
}

// A question needs its text, all four options and a valid correct answer.
export function isQuestionComplete(question: DraftQuestion): boolean {
  return (
    hasText(question.question_text) &&
    hasText(question.option_a) &&
    hasText(question.option_b) &&
    hasText(question.option_c) &&
    hasText(question.option_d) &&
    ANSWER_OPTIONS.includes(question.correct_option)
  );
}

// The teacher's edits: a title, at least one question, and every question complete.
export function isQuizComplete(title: string, questions: DraftQuestion[]): boolean {
  if (!hasText(title) || questions.length === 0) {
    return false;
  }

  return questions.every(isQuestionComplete);
}

// Checks the quiz the AI sent back before the review step trusts it:
//   1. A title and exactly one question per flashcard.
//   2. Every question complete.
// Returns the quiz with its title trimmed. Throws if any check fails.
export function checkGeneratedQuiz(reply: unknown, expectedQuestions: number): DraftQuiz {
  const quiz = reply as Partial<DraftQuiz> | null;

  // 1. The overall shape.
  if (
    !quiz ||
    !hasText(quiz.title) ||
    !Array.isArray(quiz.questions) ||
    quiz.questions.length !== expectedQuestions
  ) {
    throw new Error(`The AI must return a title and exactly ${expectedQuestions} questions.`);
  }

  // 2. Every question.
  if (!quiz.questions.every(isQuestionComplete)) {
    throw new Error("The AI returned an incomplete question.");
  }

  return { title: (quiz.title as string).trim(), questions: quiz.questions };
}
