begin;

-- Codes live outside the public API, so a student cannot list or guess them
-- by reading the classrooms table (whose legacy join_code is no longer used).
create schema if not exists leo_private;
revoke all on schema leo_private from public, anon, authenticated;

create table if not exists leo_private.classroom_invites (
    classroom_id uuid primary key references public.classrooms(classroom_id) on delete cascade,
    code text not null unique,
    created_at timestamptz not null default now()
);
revoke all on leo_private.classroom_invites from public, anon, authenticated;

create or replace function leo_private.create_classroom_invite()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
    insert into leo_private.classroom_invites (classroom_id, code)
    values (new.classroom_id, upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)));
    return new;
end;
$$;

drop trigger if exists create_classroom_invite on public.classrooms;
create trigger create_classroom_invite
after insert on public.classrooms
for each row execute function leo_private.create_classroom_invite();

insert into leo_private.classroom_invites (classroom_id, code)
select classroom_id, upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))
from public.classrooms
on conflict (classroom_id) do nothing;

create or replace function public.get_classroom_invite_code(p_classroom_id uuid)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
    invite_code text;
begin
    select i.code into invite_code
    from leo_private.classroom_invites i
    join public.classrooms c on c.classroom_id = i.classroom_id
    where c.classroom_id = p_classroom_id and c.teacher_id = (select auth.uid());

    if invite_code is null then
        raise exception 'Classroom invitation not found or access denied';
    end if;
    return invite_code;
end;
$$;

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
    if exists (
        select 1 from public.classroom_students
        where classroom_id = target_classroom_id and student_id = (select auth.uid())
    ) then
        raise exception 'You have already joined this classroom';
    end if;

    insert into public.classroom_students (classroom_id, student_id, enrolled_at)
    values (target_classroom_id, (select auth.uid()), now());
    return target_classroom_id;
end;
$$;

create or replace function public.rotate_classroom_invite_code(p_classroom_id uuid)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
    new_code text;
begin
    if not exists (
        select 1 from public.classrooms
        where classroom_id = p_classroom_id and teacher_id = (select auth.uid())
    ) then
        raise exception 'Classroom not found or access denied';
    end if;

    update leo_private.classroom_invites
    set code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
        created_at = now()
    where classroom_id = p_classroom_id
    returning code into new_code;
    return new_code;
end;
$$;

revoke execute on function public.get_classroom_invite_code(uuid) from public, anon;
revoke execute on function public.join_classroom_with_code(text) from public, anon;
revoke execute on function public.rotate_classroom_invite_code(uuid) from public, anon;
grant execute on function public.get_classroom_invite_code(uuid) to authenticated;
grant execute on function public.join_classroom_with_code(text) to authenticated;
grant execute on function public.rotate_classroom_invite_code(uuid) to authenticated;

-- RLS is intentionally deferred. Revoke direct enrolment writes so the
-- checked join RPC is the only browser-accessible insertion path for now.
-- This does not protect classroom reads, edits, or other tables without RLS.
revoke insert, update on public.classroom_students from public, anon, authenticated;
create unique index if not exists classroom_students_one_enrolment
on public.classroom_students (classroom_id, student_id);

commit;

notify pgrst, 'reload schema';
