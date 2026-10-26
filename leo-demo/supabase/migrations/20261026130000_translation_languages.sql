-- Lets Russian and Portuguese translations be saved.
--
-- The flashcards offer French, Russian, Spanish and Portuguese (languageOptions
-- in src/Components/Flashcard.tsx), but flashcard_translations only accepted
-- zh, es and fr. Russian and Portuguese translations were refused when saved,
-- so every request for them went back to the AI. zh stays allowed so any
-- existing Chinese translations still satisfy the rule.
--
-- Already applied to the hosted project through the SQL editor on 2026-10-26;
-- this file keeps local Supabase and CI in step with it.

alter table public.flashcard_translations
  drop constraint flashcard_translations_language_code_check;

alter table public.flashcard_translations
  add constraint flashcard_translations_language_code_check
  check (language_code = any (array['fr', 'ru', 'es', 'pt', 'zh']));
