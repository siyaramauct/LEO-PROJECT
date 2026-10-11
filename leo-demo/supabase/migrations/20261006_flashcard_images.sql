-- Flashcard images are optional and stored in the existing public images
-- bucket. This column stores only the object path, not a complete public URL.
alter table public.flashcards
  add column if not exists image_path text;

comment on column public.flashcards.image_path is
  'Optional object path in the Supabase images bucket used by flashcards and image matching.';
