// -----------------------------------------------------------------------------
// Scoring
//
// The rules for marking a quiz and turning scores into percentages. Pure
// functions: no React, no Supabase, so every page and report scores the same
// way and the rules can be tested on their own.
//
// A quiz's score is the share of correct answers scaled to its score ceiling
// (the maximum the teacher set, normally the number of questions).
// -----------------------------------------------------------------------------

export type AnswerOption = "A" | "B" | "C" | "D";

export type QuizQuestion = {
  question_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: AnswerOption;
};

// The student's chosen option for each question id.
export type QuizAnswers = Record<string, AnswerOption>;

export function scoreQuiz(
  questions: QuizQuestion[],
  answers: QuizAnswers,
  scoreCeiling: number | null,
) {
  const correctCount = questions.filter(
    (question) => answers[question.question_id] === question.correct_option,
  ).length;

  // Without a ceiling, each question is worth one mark.
  const ceiling = scoreCeiling ?? questions.length;

  const score =
    questions.length === 0 ? 0 : Math.round((correctCount / questions.length) * ceiling);

  return { correctCount, score, scoreCeiling: ceiling };
}

// Null when there is nothing to show: no score yet, or no ceiling to divide by.
export function scorePercent(score: number | null, scoreCeiling: number | null) {
  if (score === null || !scoreCeiling) {
    return null;
  }

  return Math.round((score / scoreCeiling) * 100);
}

// The wording of the right answer, e.g. "A portable computer" rather than "B".
export function correctAnswerText(question: QuizQuestion) {
  const optionKey = `option_${question.correct_option.toLowerCase()}` as
    | "option_a"
    | "option_b"
    | "option_c"
    | "option_d";

  return question[optionKey];
}
