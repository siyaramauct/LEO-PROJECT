// -----------------------------------------------------------------------------
// Flashcard Translations
//
// A shared cache of flashcard translations (flashcard_translations), so each
// card is translated into each language only once, by whoever asks first.
//
// Reading throws a DataError; saving is best effort and only logs.
// -----------------------------------------------------------------------------

import { supabase } from "../supabase-client";
import { DataError, friendlyMessage } from "./errors";

export type Translation = {
  word: string;
  definition: string;
};

// Null when nobody has translated this card into this language yet.
export async function getCachedTranslation(
  flashcardId: string,
  languageCode: string,
): Promise<Translation | null> {
  const { data, error } = await supabase
    .from("flashcard_translations")
    .select("translated_word, translated_definition")
    .eq("flashcard_id", flashcardId)
    .eq("language_code", languageCode)
    .maybeSingle();

  if (error) {
    throw new DataError(
      friendlyMessage(error, "Saved translations could not be checked. Please try again."),
      error,
    );
  }

  if (!data) {
    return null;
  }

  return { word: data.translated_word, definition: data.translated_definition };
}

// If two students translate the same card at once, the first saved one is kept.
export async function cacheTranslation(
  flashcardId: string,
  languageCode: string,
  translation: Translation,
): Promise<void> {
  const { error } = await supabase.from("flashcard_translations").upsert(
    {
      flashcard_id: flashcardId,
      language_code: languageCode,
      translated_word: translation.word,
      translated_definition: translation.definition,
    },
    { onConflict: "flashcard_id,language_code", ignoreDuplicates: true },
  );

  if (error) {
    console.error("Could not save the translation:", error);
  }
}
