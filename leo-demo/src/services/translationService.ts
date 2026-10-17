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

  const translation = parseTranslation(await askAi(prompt));

  // 3. Save it for everyone else (best effort).
  await cacheTranslation(flashcardId, languageCode, translation);

  return translation;
}

// Checks the AI reply: strip a ```json code fence if the model added one, parse
// the JSON, and require both a word and a definition.
function parseTranslation(result: unknown): Translation {
  const content = typeof result === "string" ? result : JSON.stringify(result);
  const json = content.replace(/^```json\s*|^```|```$/g, "").trim();
  const parsed = JSON.parse(json) as Translation;

  if (!parsed.word?.trim() || !parsed.definition?.trim()) {
    throw new Error("Gemini returned an incomplete translation.");
  }

  return parsed;
}
