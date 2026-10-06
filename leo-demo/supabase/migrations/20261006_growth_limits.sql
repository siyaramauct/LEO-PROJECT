begin;

-- Serialise joins for one classroom, then enforce the hard 30-student cap.
-- The advisory lock prevents two simultaneous joins both seeing slot 30 free.
create or replace function public.join_classroom_with_code(p_code text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
    target_classroom_id uuid;
begin
    if (select auth.uid()) is null then
        raise exception 'Sign in to join a classroom';
    end if;
    if not exists (
        select 1 from public.profiles
        where id = (select auth.uid()) and user_role = 'student'
    ) then
        raise exception 'Only student accounts can join classrooms';
    end if;

    select classroom_id into target_classroom_id
    from leo_private.classroom_invites
    where code = upper(regexp_replace(coalesce(p_code, ''), '[^a-zA-Z0-9]', '', 'g'));

    if target_classroom_id is null then
        raise exception 'This classroom code is invalid';
    end if;

    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(target_classroom_id::text));

    if exists (
        select 1 from public.classroom_students
        where classroom_id = target_classroom_id and student_id = (select auth.uid())
    ) then
        raise exception 'You have already joined this classroom';
    end if;

    if (select count(*) from public.classroom_students where classroom_id = target_classroom_id) >= 30 then
        raise exception 'This classroom has reached its 30-student limit';
    end if;

    insert into public.classroom_students (classroom_id, student_id, enrolled_at)
    values (target_classroom_id, (select auth.uid()), now());
    return target_classroom_id;
end;
$$;

revoke execute on function public.join_classroom_with_code(text) from public, anon;
grant execute on function public.join_classroom_with_code(text) to authenticated;

-- Enforce no more than 50 lessons in one classroom. This is a trigger rather
-- than only a UI check so direct API/database inserts cannot bypass the cap.
create or replace function leo_private.enforce_classroom_lesson_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.classroom_id::text));
    if (select count(*) from public.lessons where classroom_id = new.classroom_id) >= 50 then
        raise exception 'This classroom has reached its 50-lesson limit';
    end if;
    return new;
end;
$$;

drop trigger if exists enforce_classroom_lesson_limit on public.lessons;
create trigger enforce_classroom_lesson_limit
before insert on public.lessons
for each row execute function leo_private.enforce_classroom_lesson_limit();

-- The interface already caps flashcards at 15. Mirror that rule in the DB to
-- bound AI question generation, image uploads, and matching-game size.
create or replace function leo_private.enforce_lesson_flashcard_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.lesson_id::text));
    if (select count(*) from public.flashcards where lesson_id = new.lesson_id) >= 15 then
        raise exception 'This lesson has reached its 15-flashcard limit';
    end if;
    return new;
end;
$$;

drop trigger if exists enforce_lesson_flashcard_limit on public.flashcards;
create trigger enforce_lesson_flashcard_limit
before insert on public.flashcards
for each row execute function leo_private.enforce_lesson_flashcard_limit();

commit;

notify pgrst, 'reload schema';
