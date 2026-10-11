-- Teachers can schedule a lesson for a later day. Until its release_date the
-- lesson must stay invisible to students, so the app's student queries filter
-- on it and this policy enforces it for direct links and any query that forgets.
alter table public.lessons
  add column if not exists release_date timestamptz not null default now();

create index if not exists lessons_classroom_release_date_idx
  on public.lessons (classroom_id, release_date);

-- Restrictive policies are ANDed with the existing permissive read policies,
-- so this only narrows who can see a lesson; it never grants access.
drop policy if exists "students only read released lessons" on public.lessons;
create policy "students only read released lessons"
on public.lessons
as restrictive
for select
to authenticated
using (
  release_date <= now()
  or (select private.is_staff())
  or exists (
    select 1
    from public.classrooms
    where classrooms.classroom_id = lessons.classroom_id
      and classrooms.teacher_id = (select auth.uid())
  )
);
