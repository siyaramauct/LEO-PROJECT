begin;

alter table public.learning_resources
  add column if not exists lesson_id uuid references public.lessons(lesson_id) on delete cascade;

create index if not exists learning_resources_lesson_id_idx
  on public.learning_resources (lesson_id)
  where lesson_id is not null;

-- A lesson resource must reference a lesson inside the same classroom as the
-- resource row. Classroom-wide resources continue to use a null lesson_id.
create or replace function leo_private.validate_resource_lesson_classroom()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.lesson_id is not null and not exists (
    select 1 from public.lessons
    where lesson_id = new.lesson_id
      and classroom_id = new.classroom_id
  ) then
    raise exception 'The selected lesson does not belong to this classroom';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_resource_lesson_classroom on public.learning_resources;
create trigger validate_resource_lesson_classroom
before insert or update of classroom_id, lesson_id on public.learning_resources
for each row execute function leo_private.validate_resource_lesson_classroom();

-- Lesson documents use lesson_documents/<classroom-id>/<lesson-id>/<file>.
drop policy if exists "teachers upload own lesson documents" on storage.objects;
create policy "teachers upload own lesson documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'lesson_documents'
  and exists (
    select 1 from public.classrooms
    where classrooms.classroom_id::text = (storage.foldername(name))[2]
      and classrooms.teacher_id = (select auth.uid())
  )
);

drop policy if exists "teachers delete own lesson documents" on storage.objects;
create policy "teachers delete own lesson documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'lesson_documents'
  and exists (
    select 1 from public.classrooms
    where classrooms.classroom_id::text = (storage.foldername(name))[2]
      and classrooms.teacher_id = (select auth.uid())
  )
);

drop policy if exists "class members read lesson documents" on storage.objects;
create policy "class members read lesson documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'lesson_documents'
  and (
    exists (
      select 1 from public.classrooms
      where classrooms.classroom_id::text = (storage.foldername(name))[2]
        and classrooms.teacher_id = (select auth.uid())
    )
    or exists (
      select 1 from public.classroom_students
      where classroom_students.classroom_id::text = (storage.foldername(name))[2]
        and classroom_students.student_id = (select auth.uid())
    )
  )
);

commit;

notify pgrst, 'reload schema';
