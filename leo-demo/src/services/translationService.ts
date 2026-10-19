// -----------------------------------------------------------------------------
// Translation Service
//
// Translates a flashcard for a student, step by step: use a translation
// another student already requested, otherwise ask the AI and save its answer
// for everyone else.
//
// Throws an Error whose message can be shown to the student.
// -----------------------------------------------------------------------------

import { askAi } from "../data/ai";
import { cacheTranslation, getCachedTranslation, type Translation } from "../data/translations";

type TranslateInput = {
  flashcardId: string;
  word: string;
  definition: string;
  languageCode: string;
  languageName: string; // e.g. "Spanish", for the AI prompt.
};

export async function translateFlashcard({
  flashcardId,
  word,
  definition,
  languageCode,
  languageName,
}: TranslateInput): Promise<Translation> {
  // 1. A translation another student already requested.
  const cached = await getCachedTranslation(flashcardId, languageCode);

  if (cached) {
    return cached;
  }

  // 2. Nothing saved yet: ask the AI.
  const prompt = `Translate the following language-learning flashcard into ${languageName}. Return only valid JSON with no Markdown or code fences, using this exact schema: {"word":"string","definition":"string"}. Word: ${JSON.stringify(word)}. Definition: ${JSON.stringify(definition)}.`;

  const translation = checkTranslation(await askAi(prompt));

  // 3. Save it for everyone else (best effort).
  await cacheTranslation(flashcardId, languageCode, translation);

  return translation;
}

// Checks the AI's reply (already parsed by askAi): it must have both a
// word and a definition.
function checkTranslation(reply: unknown): Translation {
  const translation = reply as Partial<Translation> | null;

  if (
    typeof translation?.word !== "string" ||
    typeof translation.definition !== "string" ||
    !translation.word.trim() ||
    !translation.definition.trim()
  ) {
    throw new Error("The AI returned an incomplete translation. Please try again.");
  }

  return { word: translation.word, definition: translation.definition };
}
