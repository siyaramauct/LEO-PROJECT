// -----------------------------------------------------------------------------
// Quiz Generation Service
//
// Turns a lesson's flashcards into a multiple-choice quiz with AI, step by
// step: build the prompt, ask the AI, and check its reply (see
// src/domain/quizDraft.ts for the rules). Nothing is saved here; the teacher
// reviews the quiz first and createLesson saves it.
//
// Throws an Error if the AI can't be reached or its quiz is incomplete.
// -----------------------------------------------------------------------------

import { askAi } from "../data/ai";
import { checkGeneratedQuiz, type DraftQuiz, type QuizFormat } from "../domain/quizDraft";

type QuizFlashcard = { term: string; definition: string };

type GenerateQuizInput = {
  format: QuizFormat;
  flashcards: QuizFlashcard[];
};

export async function generateQuiz({ format, flashcards }: GenerateQuizInput): Promise<DraftQuiz> {
  // 1. The prompt: the chosen format, the exact JSON shape, and the flashcards.
  const prompt = buildQuizPrompt(format, flashcards);

  // 2. Ask the AI.
  const reply = await askAi(prompt);

  // 3. Require a title and one complete question per flashcard.
  return checkGeneratedQuiz(reply, flashcards.length);
}

function buildQuizPrompt(format: QuizFormat, flashcards: QuizFlashcard[]): string {
  const activity = format === "basic-mcq" ? "multiple-choice" : "fill-in-the-blank multiple-choice";
  const cards = flashcards.map(({ term, definition }) => ({ term, definition }));

  return `You are an experienced language educator and teacher. Create a strictly language learning  ${activity} activity from the ${flashcards.length} flashcards below. Create exactly one question per flashcard and use each flashcard once. Every question must have one correct answer and three plausible but clearly incorrect filler answers. Return only valid JSON with no Markdown or code fences, using this exact schema: {"title":"string","questions":[{"question_text":"string","option_a":"string","option_b":"string","option_c":"string","option_d":"string","correct_option":"A|B|C|D"}]}. The questions array must contain exactly ${flashcards.length} items. The value of correct_option must match the option that contains the correct answer. Flashcards: ${JSON.stringify(cards)} . Focus on the language learning aspect of the activity not the general concepts themselves.`;
}
