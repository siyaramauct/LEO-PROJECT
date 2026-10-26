-- Lets students finish flashcards-only lessons.
--
-- check_lesson_attempt used to refuse every attempt on a lesson without a quiz
-- ("This lesson has no quiz"). But finishing a flashcards-only lesson is
-- recorded as an attempt with no score, so those lessons could never be
-- completed. Now a lesson without a quiz accepts an attempt only if it has no
-- score; quiz lessons keep the same checks as before (score range, and no
-- completion time in the future).
--
-- Already applied to the hosted project through the SQL editor on 2026-10-26;
-- this file keeps local Supabase and CI in step with it.

create or replace function private.check_lesson_attempt()
  returns trigger
  language plpgsql
  security definer
  set search_path to ''
as $function$
declare
  v_ceiling numeric;
  v_has_quiz boolean;
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  select true, coalesce(m.score_ceiling,
           (select count(*) from public.questions q where q.mcq_id = m.mcq_id))
    into v_has_quiz, v_ceiling
  from public.mcqs m
  where m.lesson_id = new.lesson_id
  limit 1;

  -- Flashcards-only lesson: an attempt with no score marks it done.
  if v_has_quiz is null then
    if new.score is not null then
      raise exception 'This lesson has no quiz, so an attempt can''t have a score';
    end if;
  elsif new.score is not null and (new.score < 0 or new.score > v_ceiling) then
    raise exception 'Score must be between 0 and %', v_ceiling;
  end if;

  if new.completed_at is not null and new.completed_at > now() + interval '1 minute' then
    raise exception 'completed_at cannot be in the future';
  end if;

  return new;
end;
$function$;
