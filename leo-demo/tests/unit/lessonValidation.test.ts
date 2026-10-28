import { describe, expect, test } from "vitest";
import {
  flashcardsError,
  hasLetters,
  lessonDetailsError,
  quizError,
  textFieldError,
} from "../../src/domain/lessonValidation";
import type { DraftQuestion } from "../../src/domain/quizDraft";

// A valid question and flashcard list. Each test breaks one thing to check one rule.
const question: DraftQuestion = {
  question_text: "Which word means a bill sent to a customer?",
  option_a: "invoice",
  option_b: "agenda",
  option_c: "headline",
  option_d: "salary",
  correct_option: "A",
};

const cards = [
  { term: "invoice", definition: "A bill sent to a customer" },
  { term: "deadline", definition: "The latest time to finish something" },
];

describe("hasLetters", () => {
  test("Test A - words in any alphabet have letters", () => {
    expect(hasLetters("invoice")).toBe(true);
    expect(hasLetters("café")).toBe(true);
    expect(hasLetters("日本")).toBe(true);
    expect(hasLetters("R2 million")).toBe(true);
  });

  test("Test B - numbers and symbols alone have no letters", () => {
    expect(hasLetters("2024")).toBe(false);
    expect(hasLetters("12.5 %")).toBe(false);
    expect(hasLetters("?!")).toBe(false);
  });
});

describe("textFieldError", () => {
  test("Test A - text with words passes", () => {
    expect(textFieldError("Title", "Travel words")).toBeNull();
  });

  test("Test B - empty or space-only text is refused", () => {
    expect(textFieldError("Title", "")).toBe("Title can't be empty.");
    expect(textFieldError("Title", "   ")).toBe("Title can't be empty.");
  });

  test("Test C - numbers-only text is refused", () => {
    expect(textFieldError("Title", "12345")).toMatch(/not just numbers/);
  });

  test("Test D - text shorter than the minimum is refused, ignoring outer spaces", () => {
    expect(textFieldError("Title", "  ab  ", 3)).toMatch(/at least 3 characters/);
    expect(textFieldError("Title", "abc", 3)).toBeNull();
  });
});

describe("lessonDetailsError", () => {
  test("Test A - a real title and description pass", () => {
    expect(lessonDetailsError("Meetings", "Vocabulary for business meetings")).toBeNull();
  });

  test("Test B - a numbers-only title or a too-short description is refused", () => {
    expect(lessonDetailsError("101", "Vocabulary for business meetings")).toMatch(/title/);
    expect(lessonDetailsError("Meetings", "Words")).toMatch(/description/);
  });
});

describe("flashcardsError", () => {
  test("Test A - complete, different flashcards pass", () => {
    expect(flashcardsError(cards)).toBeNull();
  });

  test("Test B - no flashcards is refused", () => {
    expect(flashcardsError([])).toMatch(/at least one flashcard/);
  });

  test("Test C - a missing or numbers-only term or definition is refused", () => {
    expect(flashcardsError([{ term: "invoice", definition: "" }])).toMatch(/definition/);
    expect(flashcardsError([{ term: "42", definition: "A number" }])).toMatch(/term/);
  });

  test("Test D - a definition that repeats the term is refused", () => {
    expect(flashcardsError([{ term: "Profit", definition: " profit " }])).toMatch(/repeat/);
  });

  test("Test E - the same term twice is refused, ignoring case", () => {
    expect(flashcardsError([...cards, { term: "INVOICE", definition: "A bill" }])).toMatch(
      /Flashcards 1 and 3/,
    );
  });
});

describe("quizError", () => {
  test("Test A - a titled quiz with complete, distinct questions passes", () => {
    expect(quizError("Business check", [question])).toBeNull();
  });

  test("Test B - a missing or numbers-only title is refused", () => {
    expect(quizError("", [question])).toMatch(/activity title/);
    expect(quizError("2024", [question])).toMatch(/activity title/);
  });

  test("Test C - a numbers-only question or option is refused", () => {
    expect(quizError("Business check", [{ ...question, question_text: "123" }])).toMatch(
      /Question 1/,
    );
    expect(quizError("Business check", [{ ...question, option_c: "" }])).toMatch(/option C/);
  });

  test("Test D - the same answer twice in one question is refused", () => {
    expect(quizError("Business check", [{ ...question, option_d: " Invoice" }])).toMatch(
      /same answer more than once/,
    );
  });

  test("Test E - no questions is refused", () => {
    expect(quizError("Business check", [])).toMatch(/at least one question/);
  });
});
