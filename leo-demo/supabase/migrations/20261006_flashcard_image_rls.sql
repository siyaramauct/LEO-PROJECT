-- Flashcard rows belong to a lesson, and each lesson belongs to a classroom.
-- These policies use that chain to prevent teachers editing another teacher's
-- cards while still allowing enrolled students to study them.
alter table public.flashcards enable row level security;

drop policy if exists "teachers manage own classroom flashcards" on public.flashcards;
create policy "teachers manage own classroom flashcards"
on public.flashcards
for all
to authenticated
using (
  exists (
    select 1
    from public.lessons
    join public.classrooms
      on classrooms.classroom_id = lessons.classroom_id
    where lessons.lesson_id = flashcards.lesson_id
      and classrooms.teacher_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.lessons
    join public.classrooms
      on classrooms.classroom_id = lessons.classroom_id
    where lessons.lesson_id = flashcards.lesson_id
      and classrooms.teacher_id = (select auth.uid())
  )
);

drop policy if exists "students read enrolled classroom flashcards" on public.flashcards;
create policy "students read enrolled classroom flashcards"
on public.flashcards
for select
to authenticated
using (
  exists (
    select 1
    from public.lessons
    join public.classroom_students
      on classroom_students.classroom_id = lessons.classroom_id
    where lessons.lesson_id = flashcards.lesson_id
      and classroom_students.student_id = (select auth.uid())
  )
);

-- Supabase Storage writes an uploaded file as a row in storage.objects.
-- The app uses paths shaped like flashcards/<lesson-id>/<generated-name>.
drop policy if exists "teachers upload own flashcard images" on storage.objects;
create policy "teachers upload own flashcard images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = 'flashcards'
  and exists (
    select 1
    from public.lessons
    join public.classrooms
      on classrooms.classroom_id = lessons.classroom_id
    where lessons.lesson_id::text = (storage.foldername(name))[2]
      and classrooms.teacher_id = (select auth.uid())
  )
);

drop policy if exists "teachers update own flashcard images" on storage.objects;
create policy "teachers update own flashcard images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = 'flashcards'
  and exists (
    select 1
    from public.lessons
    join public.classrooms
      on classrooms.classroom_id = lessons.classroom_id
    where lessons.lesson_id::text = (storage.foldername(name))[2]
      and classrooms.teacher_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = 'flashcards'
  and exists (
    select 1
    from public.lessons
    join public.classrooms
      on classrooms.classroom_id = lessons.classroom_id
    where lessons.lesson_id::text = (storage.foldername(name))[2]
      and classrooms.teacher_id = (select auth.uid())
  )
);

drop policy if exists "teachers delete own flashcard images" on storage.objects;
create policy "teachers delete own flashcard images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = 'flashcards'
  and exists (
    select 1
    from public.lessons
    join public.classrooms
      on classrooms.classroom_id = lessons.classroom_id
    where lessons.lesson_id::text = (storage.foldername(name))[2]
      and classrooms.teacher_id = (select auth.uid())
  )
);

notify pgrst, 'reload schema';
