// -----------------------------------------------------------------------------
// Lesson Validation
//
// The rules a teacher's typing must meet before a lesson can move on or be
// saved. Every text field must:
//   - not be empty (spaces don't count)
//   - contain at least one letter, so "123" or "!!!" is refused
//   - be long enough to mean something (titles and descriptions)
//
// On top of that:
//   - a flashcard's definition can't just repeat its term
//   - two flashcards can't share the same term
//   - a quiz question can't offer the same answer twice
//
// Each check returns the first problem as a message the teacher can read, or
// null when everything is fine. Pure functions: no React, no Supabase, so
// CreateLesson and lessonCreationService share them and they can be tested
// on their own.
// -----------------------------------------------------------------------------

import { ANSWER_OPTIONS, type DraftQuestion } from "./quizDraft";

export const MIN_TITLE_LENGTH = 3;
export const MIN_DESCRIPTION_LENGTH = 10;

type FlashcardText = { term: string; definition: string };

// True when the text has at least one letter, in any alphabet (so "café" and
// "日本" count, "2024" and "?!" don't).
export function hasLetters(text: string): boolean {
  return /\p{L}/u.test(text);
}

// The same text, ignoring case and outer spaces.
export function sameText(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// True when a field passes the text rules, for outlining the fields at fault.
export function isValidText(value: string, minLength = 1): boolean {
  return textFieldError("", value, minLength) === null;
}

// The problem with one text field, or null when it is fine.
export function textFieldError(label: string, value: string, minLength = 1): string | null {
  const text = value.trim();

  if (text === "") {
    return `${label} can't be empty.`;
  }

  if (!hasLetters(text)) {
    return `${label} must contain words, not just numbers or symbols.`;
  }

  if (text.length < minLength) {
    return `${label} must be at least ${minLength} characters long.`;
  }

  return null;
}

// Step 1: the lesson title and description.
export function lessonDetailsError(title: string, description: string): string | null {
  return (
    textFieldError("The lesson title", title, MIN_TITLE_LENGTH) ??
    textFieldError("The description", description, MIN_DESCRIPTION_LENGTH)
  );
}

// One flashcard on its own, as when a scheduled lesson's card is edited.
export function flashcardError(card: FlashcardText, label = "The flashcard"): string | null {
  const problem =
    textFieldError(`${label}'s term`, card.term) ??
    textFieldError(`${label}'s definition`, card.definition);

  if (problem) {
    return problem;
  }

  if (sameText(card.term, card.definition)) {
    return `${label}'s definition can't just repeat the term.`;
  }

  return null;
}

// Step 2: every flashcard the teacher has started.
export function flashcardsError(cards: FlashcardText[]): string | null {
  if (cards.length === 0) {
    return "Add at least one flashcard with a term and a definition.";
  }

  for (const [index, card] of cards.entries()) {
    const problem = flashcardError(card, `Flashcard ${index + 1}`);

    if (problem) {
      return problem;
    }
  }

  // Each word once, so the quiz never has two questions with the same answer.
  for (const [index, card] of cards.entries()) {
    const earlier = cards.slice(0, index).findIndex((other) => sameText(other.term, card.term));

    if (earlier !== -1) {
      return `Flashcards ${earlier + 1} and ${index + 1} both use "${card.term.trim()}". Each term can only appear once.`;
    }
  }

  return null;
}

// Step 4: the quiz title and every question in the review.
export function quizError(title: string, questions: DraftQuestion[]): string | null {
  const titleProblem = textFieldError("The activity title", title, MIN_TITLE_LENGTH);

  if (titleProblem) {
    return titleProblem;
  }

  if (questions.length === 0) {
    return "The activity needs at least one question.";
  }

  for (const [index, question] of questions.entries()) {
    const label = `Question ${index + 1}`;
    const options = [question.option_a, question.option_b, question.option_c, question.option_d];

    const textProblem = textFieldError(label, question.question_text);

    if (textProblem) {
      return textProblem;
    }

    for (const [optionIndex, option] of options.entries()) {
      const optionProblem = textFieldError(
        `${label}, option ${ANSWER_OPTIONS[optionIndex]}`,
        option,
      );

      if (optionProblem) {
        return optionProblem;
      }
    }

    const hasRepeatedOption = options.some((option, optionIndex) =>
      options.slice(0, optionIndex).some((earlier) => sameText(earlier, option)),
    );

    if (hasRepeatedOption) {
      return `${label} offers the same answer more than once. Each option must be different.`;
    }

    if (!ANSWER_OPTIONS.includes(question.correct_option)) {
      return `${label} needs a correct answer marked.`;
    }
  }

  return null;
}
