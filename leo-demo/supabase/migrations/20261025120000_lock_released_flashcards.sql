-- Flashcards can only be edited or deleted while their lesson is scheduled
-- (release_date still in the future). Once released, they're locked.
-- Creating flashcards and deleting whole lessons are not affected: there is
-- no new insert policy, and the lesson's ON DELETE CASCADE bypasses RLS.
--
-- Already applied to the hosted project through the SQL editor on 2026-10-25;
-- this file keeps local Supabase and CI in step with it.

-- 1. True while the lesson's release date is still ahead.
create or replace function private.lesson_is_scheduled(p_lesson uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path to ''
as $function$
  select exists (
    select 1 from public.lessons l
    where l.lesson_id = p_lesson
      and l.release_date > now()
  );
$function$;

grant execute on function private.lesson_is_scheduled(uuid) to authenticated;

-- 2. Restrictive policies: on top of the existing "content: update" and
--    "content: delete" (teacher of the classroom), the lesson must be scheduled.
create policy "scheduled lessons only: update" on public.flashcards
  as restrictive
  for update
  to authenticated
  using ((select private.lesson_is_scheduled(flashcards.lesson_id)))
  with check ((select private.lesson_is_scheduled(flashcards.lesson_id)));

create policy "scheduled lessons only: delete" on public.flashcards
  as restrictive
  for delete
  to authenticated
  using ((select private.lesson_is_scheduled(flashcards.lesson_id)));
