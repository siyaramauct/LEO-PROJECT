// -----------------------------------------------------------------------------
// App Limits
//
// Size limits shown and checked in the interface. The database enforces the
// same numbers with triggers (see supabase/migrations/20261006_growth_limits.sql),
// so change both places together.
// -----------------------------------------------------------------------------

export const MAX_CLASSROOM_STUDENTS = 30;
export const MAX_LESSONS_PER_CLASSROOM = 50;
export const MAX_FLASHCARDS_PER_LESSON = 15;
export const MAX_FLASHCARD_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
