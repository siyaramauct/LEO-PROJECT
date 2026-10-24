// -----------------------------------------------------------------------------
// Quiz Generation Service
//
// Turns a lesson's flashcards into a multiple-choice quiz with AI, step by
// step: build the prompt, ask the AI, and check its reply (see
// src/domain/quizDraft.ts for the rules). Nothing is saved here; the teacher
// reviews the quiz first and createLesson saves it.
//
// The prompt is written for English language learners: questions test what a
// word means and how it is used, and the wrong answers are close enough to
// make learners think, while only one answer is ever right.
//
// Throws an Error if the AI can't be reached or its quiz is incomplete.
// -----------------------------------------------------------------------------

import { askAi } from "../data/ai";
import { checkGeneratedQuiz, type DraftQuiz, type QuizFormat } from "../domain/quizDraft";

type QuizFlashcard = { term: string; definition: string };

type GenerateQuizInput = {
  format: QuizFormat;
  flashcards: QuizFlashcard[];
  lessonTitle: string;
  lessonDescription: string;
};

// How to write each kind of question.
const MATCH_DEFINITION_RULES = `MATCH-THE-DEFINITION question: question_text gives the flashcard's definition, reworded slightly in simple English if that makes it clearer, without using the target word or any form of it, e.g. Which word means "a document asking a customer to pay for goods or services"?. The four options are single words or short phrases; the correct option is the flashcard's word.`;

const FILL_BLANK_RULES = `FILL-IN-THE-BLANK question: question_text is one natural, everyday sentence (8 to 20 words) that uses the flashcard's word in the meaning given by its definition, with the word replaced by "_____". The sentence must give enough context that only the target word fits. The correct option is the word in the exact form the sentence needs (for example plural or past tense). All four options must fit the blank grammatically, in the same form, so learners must choose by meaning, not by grammar.`;

function questionTypeRules(format: QuizFormat): string {
  if (format === "match-definition-mcq") {
    return `Write every question as a ${MATCH_DEFINITION_RULES}`;
  }

  if (format === "fill-blank-mcq") {
    return `Write every question as a ${FILL_BLANK_RULES}`;
  }

  return `Mix two question types, taking turns for example: questions 1, 3, 5 and so on are match-the-definition, and questions 2, 4, 6 and so on are fill-in-the-blank. A ${MATCH_DEFINITION_RULES} A ${FILL_BLANK_RULES}`;
}

function buildQuizPrompt(
  format: QuizFormat,
  flashcards: QuizFlashcard[],
  lessonTitle: string,
  lessonDescription: string,
): string {
  const cards = flashcards.map(({ term, definition }) => ({ term, definition }));
  const count = flashcards.length;

  return [
    `You are an experienced teacher of English as a second language writing a vocabulary quiz for a lesson called "${lessonTitle.trim()}" (${lessonDescription.trim()}).`,
    `The quiz checks that learners know what each word means and how it is used in real English, not general knowledge about the topic.`,
    `Write exactly ${count} multiple-choice questions, one per flashcard, in the same order as the flashcards, using each flashcard once.`,
    questionTypeRules(format),
    `Wrong answers (distractors) must be challenging but clearly wrong: use the same part of speech and a similar length and level as the correct answer; prefer other words from this lesson's flashcards, then words close in meaning or easily confused with the target (near-synonyms, words from the same topic, similar-looking or similar-sounding words). Each distractor must be definitely wrong for this question, so exactly one option is correct. Never use joke answers, "all of the above", "none of the above", or options that are obviously wrong.`,
    `Keep question wording short and simple for language learners, and never put the correct answer, or a form of it, in question_text. Use four different options in every question. Spread the correct answer evenly across A, B, C and D.`,
    `Give the quiz a short, clear title.`,
    `Return only valid JSON with no Markdown or code fences, using this exact schema: {"title":"string","questions":[{"question_text":"string","option_a":"string","option_b":"string","option_c":"string","option_d":"string","correct_option":"A|B|C|D"}]}. The questions array must contain exactly ${count} items, and correct_option must be the letter of the option that holds the correct answer.`,
    `Flashcards: ${JSON.stringify(cards)}`,
  ].join("\n\n");
}

export async function generateQuiz({
  format,
  flashcards,
  lessonTitle,
  lessonDescription,
}: GenerateQuizInput): Promise<DraftQuiz> {
  // 1. The prompt: the chosen format, the exact JSON shape, and the flashcards.
  const prompt = buildQuizPrompt(format, flashcards, lessonTitle, lessonDescription);

  // 2. Ask the AI.
  const reply = await askAi(prompt);

  // 3. Require a title and one complete question per flashcard.
  return checkGeneratedQuiz(reply, flashcards.length);
}

// -- The prompt -------------------------------------------------------------------
