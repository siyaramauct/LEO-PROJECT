import { describe, expect, test } from "vitest";
import {
  checkGeneratedQuiz,
  isQuestionComplete,
  isQuizComplete,
  type DraftQuestion,
} from "../../src/domain/quizDraft";

// A complete question. Each test breaks one field to check one rule.
const question: DraftQuestion = {
  question_text: "What does 'bonjour' mean?",
  option_a: "Goodbye",
  option_b: "Hello",
  option_c: "Thank you",
  option_d: "Please",
  correct_option: "B",
};

describe("isQuestionComplete", () => {
  test("Test A - a question with text, four options and a valid answer is complete", () => {
    expect(isQuestionComplete(question)).toBe(true);
  });

  test("Test B - blank or space-only question text is incomplete", () => {
    expect(isQuestionComplete({ ...question, question_text: "" })).toBe(false);
    expect(isQuestionComplete({ ...question, question_text: "   " })).toBe(false);
  });

  test("Test C - any blank option makes the question incomplete", () => {
    expect(isQuestionComplete({ ...question, option_a: "" })).toBe(false);
    expect(isQuestionComplete({ ...question, option_d: "  " })).toBe(false);
  });

  test("Test D - the correct answer must be A, B, C or D", () => {
    const wrongLetter = { ...question, correct_option: "E" } as unknown as DraftQuestion;

    expect(isQuestionComplete(wrongLetter)).toBe(false);
  });
});

describe("isQuizComplete", () => {
  test("Test A - a titled quiz with complete questions is complete", () => {
    expect(isQuizComplete("Greetings", [question, question])).toBe(true);
  });

  test("Test B - a blank title makes the quiz incomplete", () => {
    expect(isQuizComplete("  ", [question])).toBe(false);
  });

  test("Test C - a quiz needs at least one question", () => {
    expect(isQuizComplete("Greetings", [])).toBe(false);
  });

  test("Test D - one incomplete question makes the whole quiz incomplete", () => {
    expect(isQuizComplete("Greetings", [question, { ...question, option_b: "" }])).toBe(false);
  });
});

describe("checkGeneratedQuiz", () => {
  test("Test A - a valid quiz is returned with its title trimmed", () => {
    const reply = { title: "  Greetings  ", questions: [question] };

    expect(checkGeneratedQuiz(reply, 1)).toEqual({ title: "Greetings", questions: [question] });
  });

  test("Test B - the AI must return exactly one question per flashcard", () => {
    const reply = { title: "Greetings", questions: [question] };

    expect(() => checkGeneratedQuiz(reply, 2)).toThrow();
    expect(() => checkGeneratedQuiz({ ...reply, questions: [question, question] }, 1)).toThrow();
  });

  test("Test C - a missing title is rejected", () => {
    expect(() => checkGeneratedQuiz({ questions: [question] }, 1)).toThrow();
  });

  test("Test D - a reply that isn't a quiz at all is rejected", () => {
    expect(() => checkGeneratedQuiz(null, 1)).toThrow();
    expect(() => checkGeneratedQuiz({ title: "Greetings", questions: "none" }, 1)).toThrow();
  });

  test("Test E - an incomplete question from the AI is rejected", () => {
    const reply = { title: "Greetings", questions: [{ ...question, option_c: "" }] };

    expect(() => checkGeneratedQuiz(reply, 1)).toThrow();
  });

  test("Test F - an option that isn't text is rejected instead of crashing", () => {
    // Models sometimes send numbers, e.g. for a quiz about counting.
    const reply = { title: "Numbers", questions: [{ ...question, option_a: 5 }] };

    expect(() => checkGeneratedQuiz(reply, 1)).toThrow("incomplete question");
  });
});
