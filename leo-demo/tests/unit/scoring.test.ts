import { describe, test, expect } from "vitest";
import { scoreQuiz, type QuizAnswers, type QuizQuestion } from "../../src/domain/scoring";

// Five business English questions. Each has its own id, because scoreQuiz
// matches the student's answers to questions by id.
const question1: QuizQuestion = {
  question_id: "q1",
  question_text: "The _ wants to purchase a new car.",
  option_a: "store",
  option_b: "customer",
  option_c: "invoice",
  option_d: "warehouse",
  correct_option: "B",
};

const question2: QuizQuestion = {
  question_id: "q2",
  question_text: "Please find the _ for last month's order attached to this email.",
  option_a: "invoice",
  option_b: "agenda",
  option_c: "résumé",
  option_d: "headline",
  correct_option: "A",
};

const question3: QuizQuestion = {
  question_id: "q3",
  question_text: "We need to _ the deadline because the supplier is late.",
  option_a: "attend",
  option_b: "hire",
  option_c: "extend",
  option_d: "invest",
  correct_option: "C",
};

const question4: QuizQuestion = {
  question_id: "q4",
  question_text: "The company made a _ of R2 million after paying all its costs.",
  option_a: "loss",
  option_b: "debt",
  option_c: "salary",
  option_d: "profit",
  correct_option: "D",
};

const question5: QuizQuestion = {
  question_id: "q5",
  question_text: "Let's _ a meeting for Monday to discuss the budget.",
  option_a: "schedule",
  option_b: "resign",
  option_c: "deliver",
  option_d: "negotiate",
  correct_option: "A",
};

const quizQuestions: QuizQuestion[] = [question1, question2, question3, question4, question5];

// The right letter for every question. Tests copy this and change one or two answers.
const correctAnswers: QuizAnswers = {
  q1: "B",
  q2: "A",
  q3: "C",
  q4: "D",
  q5: "A",
};

describe("scoreQuiz", () => {
  test("Test A - all correct answers get full marks", () => {
    const result = scoreQuiz(quizQuestions, correctAnswers, null);

    expect(result).toEqual({ correctCount: 5, score: 5, scoreCeiling: 5 });
  });

  test("Test B - a wrong answer loses its mark", () => {
    const studentAnswers: QuizAnswers = { ...correctAnswers, q2: "B" };

    const result = scoreQuiz(quizQuestions, studentAnswers, null);

    expect(result).toEqual({ correctCount: 4, score: 4, scoreCeiling: 5 });
  });

  test("Test C - an unanswered question counts as wrong", () => {
    const { q5, ...studentAnswers } = correctAnswers; // q5 left blank.

    const result = scoreQuiz(quizQuestions, studentAnswers, null);

    expect(q5).toBe("A");
    expect(result.correctCount).toBe(4);
    expect(result.score).toBe(4);
  });

  test("Test D - all wrong answers score zero", () => {
    const studentAnswers: QuizAnswers = { q1: "A", q2: "B", q3: "D", q4: "A", q5: "C" };

    const result = scoreQuiz(quizQuestions, studentAnswers, null);

    expect(result).toEqual({ correctCount: 0, score: 0, scoreCeiling: 5 });
  });

  test("Test E - the score is scaled to the teacher's ceiling", () => {
    // 4 of 5 correct on a quiz out of 10 is 8.
    const studentAnswers: QuizAnswers = { ...correctAnswers, q4: "A" };

    const result = scoreQuiz(quizQuestions, studentAnswers, 10);

    expect(result).toEqual({ correctCount: 4, score: 8, scoreCeiling: 10 });
  });

  test("Test F - a scaled score is rounded to a whole mark", () => {
    // 3 of 5 correct on a quiz out of 4 is 2.4, which rounds down to 2.
    const studentAnswers: QuizAnswers = { ...correctAnswers, q1: "A", q2: "B" };

    const result = scoreQuiz(quizQuestions, studentAnswers, 4);

    expect(result.correctCount).toBe(3);
    expect(result.score).toBe(2);
  });

  test("Test G - an empty quiz scores zero instead of dividing by zero", () => {
    const result = scoreQuiz([], {}, 10);

    expect(result.score).toBe(0);
  });
});
