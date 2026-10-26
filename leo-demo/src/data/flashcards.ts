// -----------------------------------------------------------------------------
// Flashcards
//
// Reads a lesson's flashcards (the flashcards table), in the order the teacher
// added them.
//
// Every function throws a DataError when Supabase reports a problem.
// -----------------------------------------------------------------------------

import { supabase } from "../supabase-client";
import { DataError, friendlyMessage } from "./errors";

export type LessonFlashcard = {
  flashcard_id: string;
  lesson_id: string;
  word: string;
  definition: string;
  image_path: string | null; // Storage path in the images bucket.
};

type FlashcardOptions = {
  imagesOnly?: boolean; // Only cards with a picture, for the matching game.
};

export async function getFlashcards(
  lessonId: string,
  { imagesOnly = false }: FlashcardOptions = {},
): Promise<LessonFlashcard[]> {
  let query = supabase
    .from("flashcards")
    .select("flashcard_id, lesson_id, word, definition, image_path")
    .eq("lesson_id", lessonId);

  if (imagesOnly) {
    query = query.not("image_path", "is", null);
  }

  const { data, error } = await query.order("created_at");

  if (error) {
    throw new DataError("The flashcards could not be loaded right now.", error);
  }

  return data as LessonFlashcard[];
}

// How many flashcards (words) each lesson has, keyed by lesson id.
export async function getFlashcardCounts(lessonIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  if (lessonIds.length === 0) {
    return counts;
  }

  const { data, error } = await supabase
    .from("flashcards")
    .select("lesson_id")
    .in("lesson_id", lessonIds);

  if (error) {
    throw new DataError("Lesson word counts could not be loaded right now.", error);
  }

  for (const card of data) {
    counts.set(card.lesson_id, (counts.get(card.lesson_id) ?? 0) + 1);
  }

  return counts;
}

export type NewFlashcard = {
  lesson_id: string;
  word: string;
  definition: string;
  image_path: string | null;
};

export async function insertFlashcards(flashcards: NewFlashcard[]): Promise<void> {
  const { error } = await supabase.from("flashcards").insert(flashcards);

  if (error) {
    throw new DataError(
      friendlyMessage(error, "The flashcards could not be saved. Please try again."),
      error,
    );
  }
}

type FlashcardChanges = {
  word: string;
  definition: string;
  image_path: string | null;
};

export async function updateFlashcard(flashcardId: string, changes: FlashcardChanges) {
  const { error } = await supabase
    .from("flashcards")
    .update(changes)
    .eq("flashcard_id", flashcardId);

  if (error) {
    throw new DataError(
      friendlyMessage(error, "The flashcard could not be saved. Please try again."),
      error,
    );
  }
}

export async function deleteFlashcard(flashcardId: string): Promise<void> {
  const { error } = await supabase.from("flashcards").delete().eq("flashcard_id", flashcardId);

  if (error) {
    throw new DataError(
      friendlyMessage(error, "The flashcard could not be deleted. Please try again."),
      error,
    );
  }
}
