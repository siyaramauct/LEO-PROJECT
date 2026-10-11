-- RLS hardening from the 2026-10-10 audit. Safe to run with the current app:
-- nothing below removes access a page relies on. It runs as one transaction,
-- so if any statement fails nothing is applied; fix the cause and re-run.
begin;

-- 1. Role escalation -------------------------------------------------------
-- "profiles: update own" allowed any column, so a student could run
-- update profiles set user_role = 'admin'. A role may now only be chosen once
-- (null -> student/teacher). Dashboard and service-role edits (no auth.uid())
-- are unaffected, which is how admins are created.
create or replace function private.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if tg_op = 'INSERT' then
        if new.user_role is not null and lower(new.user_role) not in ('student', 'teacher') then
            raise exception 'Invalid account role';
        end if;
    elsif new.user_role is distinct from old.user_role and (select auth.uid()) is not null then
        if old.user_role is not null or lower(coalesce(new.user_role, '')) not in ('student', 'teacher') then
            raise exception 'Your account role cannot be changed';
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
before insert or update of user_role on public.profiles
for each row execute function private.guard_profile_role();

-- Usernames must be unique; the app's availability check cannot see other
-- users' rows under RLS, so only an index can enforce it.
create unique index if not exists profiles_username_key
on public.profiles (lower(username)) where username is not null;

-- 2. Scheduled lessons ------------------------------------------------------
-- The restrictive policy from 20261009_lesson_release_date.sql is not live.
-- It is recreated here and extended to lesson content, because flashcards,
-- quizzes and documents of an unreleased lesson were readable by students.
create or replace function private.lesson_is_open(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.lessons l
        join public.classrooms c on c.classroom_id = l.classroom_id
        where l.lesson_id = p_lesson_id
          and (l.release_date <= now() or c.teacher_id = (select auth.uid()))
    ) or private.is_admin();
$$;

revoke execute on function private.lesson_is_open(uuid) from public, anon;
grant execute on function private.lesson_is_open(uuid) to authenticated;

drop policy if exists "students only read released lessons" on public.lessons;
create policy "students only read released lessons"
on public.lessons as restrictive for select to authenticated
using (
    release_date <= now()
    or (select private.is_admin())
    or exists (
        select 1 from public.classrooms
        where classrooms.classroom_id = lessons.classroom_id
          and classrooms.teacher_id = (select auth.uid())
    )
);

drop policy if exists "released lessons only" on public.flashcards;
create policy "released lessons only"
on public.flashcards as restrictive for select to authenticated
using ((select private.lesson_is_open(flashcards.lesson_id)));

drop policy if exists "released lessons only" on public.mcqs;
create policy "released lessons only"
on public.mcqs as restrictive for select to authenticated
using ((select private.lesson_is_open(mcqs.lesson_id)));

drop policy if exists "released lessons only" on public.questions;
create policy "released lessons only"
on public.questions as restrictive for select to authenticated
using ((select private.lesson_is_open(private.mcq_lesson(questions.mcq_id))));

drop policy if exists "released lessons only" on public.flashcard_translations;
create policy "released lessons only"
on public.flashcard_translations as restrictive for select to authenticated
using ((select private.lesson_is_open(private.flashcard_lesson(flashcard_translations.flashcard_id))));

drop policy if exists "released lessons only" on public.learning_resources;
create policy "released lessons only"
on public.learning_resources as restrictive for select to authenticated
using (lesson_id is null or (select private.lesson_is_open(learning_resources.lesson_id)));

drop policy if exists "released lessons only" on public.lesson_attempts;
create policy "released lessons only"
on public.lesson_attempts as restrictive for insert to authenticated
with check ((select private.lesson_is_open(lesson_attempts.lesson_id)));

-- 3. Legacy flashcard policies ---------------------------------------------
-- Duplicates of the "content:" policies that skipped the shared helpers.
drop policy if exists "teachers manage own classroom flashcards" on public.flashcards;
drop policy if exists "students read enrolled classroom flashcards" on public.flashcards;

-- 4. Quiz scores ------------------------------------------------------------
-- Students could insert any score and edit it afterwards. The app never
-- updates an attempt, so the update policy goes, and inserted scores must fit
-- the lesson's quiz. (Grading still happens in the browser; see the audit.)
drop policy if exists "attempts: student updates own" on public.lesson_attempts;

create or replace function private.validate_lesson_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    ceiling integer;
begin
    if new.score is not null then
        select score_ceiling into ceiling from public.mcqs where lesson_id = new.lesson_id limit 1;
        if ceiling is null then
            raise exception 'This lesson has no quiz to score';
        end if;
        if new.score < 0 or new.score > ceiling then
            raise exception 'Score must be between 0 and %', ceiling;
        end if;
    end if;
    if new.completed_at is not null and new.completed_at > now() + interval '5 minutes' then
        raise exception 'An attempt cannot be completed in the future';
    end if;
    return new;
end;
$$;

drop trigger if exists validate_lesson_attempt on public.lesson_attempts;
create trigger validate_lesson_attempt
before insert or update on public.lesson_attempts
for each row execute function private.validate_lesson_attempt();

-- 5. Streak padding ---------------------------------------------------------
-- Students could insert activity for any past date and fake a streak. Also
-- drops the duplicate policies granted to the public role.
drop policy if exists "students read own activity" on public.student_activity;
drop policy if exists "students insert own activity" on public.student_activity;
drop policy if exists "activity: student inserts own" on public.student_activity;
create policy "activity: student inserts own"
on public.student_activity for insert to authenticated
with check (
    student_id = (select auth.uid())
    and activity_date = (now() at time zone 'Africa/Johannesburg')::date
);

-- 6. Enrolment --------------------------------------------------------------
-- Teachers could add any user (even another teacher) to a classroom, which
-- also made that user's profile and activity readable via teaches_student().
-- Joining goes through join_classroom_with_code(), so these are not needed.
drop policy if exists "enrolment: teacher adds" on public.classroom_students;
drop policy if exists "enrolment: teacher updates" on public.classroom_students;
drop policy if exists "Students can read their own classroom links" on public.classroom_students;

-- 7. Classroom ownership ----------------------------------------------------
-- A teacher could hand a classroom to any account by changing teacher_id.
drop policy if exists "classrooms: teacher updates" on public.classrooms;
create policy "classrooms: teacher updates"
on public.classrooms for update to authenticated
using ((select private.can_edit_classroom(classrooms.classroom_id)))
with check (
    (select private.can_edit_classroom(classrooms.classroom_id))
    and (teacher_id = (select auth.uid()) or (select private.is_admin()))
);

-- 8. Unsafe links -----------------------------------------------------------
-- Students open shared links and notification links directly. A javascript:
-- URL stored there would run in the student's session.
alter table public.learning_resources drop constraint if exists learning_resources_link_is_http;
alter table public.learning_resources add constraint learning_resources_link_is_http
check (resource_type <> 'link' or resource_url ~* '^https?://') not valid;

alter table public.notifications drop constraint if exists notifications_link_is_internal;
alter table public.notifications add constraint notifications_link_is_internal
check (link_url is null or (link_url like '/%' and link_url not like '//%')) not valid;

-- 9. Student -> teacher notifications ---------------------------------------
-- "notifications: staff send" only lets teachers notify their students, so the
-- browser's "lesson completed" and "student left" notifications to teachers
-- have always been rejected. The database now sends them itself.
create or replace function private.notify_teacher_of_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    student_name text;
    lesson_title text;
    room_id uuid;
    room_name text;
    room_teacher uuid;
    ceiling integer;
begin
    if new.score is null or new.completed_at is null then
        return new;
    end if;
    select l.title, c.classroom_id, c.classroom_name, c.teacher_id
    into lesson_title, room_id, room_name, room_teacher
    from public.lessons l join public.classrooms c on c.classroom_id = l.classroom_id
    where l.lesson_id = new.lesson_id;
    select score_ceiling into ceiling from public.mcqs where lesson_id = new.lesson_id limit 1;
    select nullif(btrim(concat_ws(' ', name, surname)), '') into student_name
    from public.profiles where id = new.student_id;

    if room_teacher is not null then
        insert into public.notifications (recipient_id, type, title, body, link_url, is_read, created_at)
        values (
            room_teacher, 'lesson_completed', 'A student completed a lesson',
            format('%s scored %s/%s on "%s" in "%s".', coalesce(student_name, 'A student'), new.score, ceiling, lesson_title, room_name),
            '/teacher-classroom/' || room_id, false, now()
        );
    end if;
    return new;
end;
$$;

drop trigger if exists notify_teacher_of_attempt on public.lesson_attempts;
create trigger notify_teacher_of_attempt
after insert on public.lesson_attempts
for each row execute function private.notify_teacher_of_attempt();

create or replace function private.notify_teacher_of_leave()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    student_name text;
    room_name text;
    room_teacher uuid;
begin
    -- Only a student leaving on their own; a teacher removing them is not news to the teacher.
    if old.student_id is distinct from (select auth.uid()) then
        return old;
    end if;
    select classroom_name, teacher_id into room_name, room_teacher
    from public.classrooms where classroom_id = old.classroom_id;
    select nullif(btrim(concat_ws(' ', name, surname)), '') into student_name
    from public.profiles where id = old.student_id;

    if room_teacher is not null then
        insert into public.notifications (recipient_id, type, title, body, link_url, is_read, created_at)
        values (
            room_teacher, 'student_left_classroom', 'Student left classroom',
            format('%s left "%s".', coalesce(student_name, 'A student'), room_name),
            '/teacher-classroom/' || old.classroom_id, false, now()
        );
    end if;
    return old;
end;
$$;

drop trigger if exists notify_teacher_of_leave on public.classroom_students;
create trigger notify_teacher_of_leave
after delete on public.classroom_students
for each row execute function private.notify_teacher_of_leave();

-- 10. Translation cache key -------------------------------------------------
-- Flashcard.tsx upserts with onConflict (flashcard_id, language_code), which
-- needs a unique index on exactly those columns.
create unique index if not exists flashcard_translations_flashcard_language_key
on public.flashcard_translations (flashcard_id, language_code);

commit;

notify pgrst, 'reload schema';
