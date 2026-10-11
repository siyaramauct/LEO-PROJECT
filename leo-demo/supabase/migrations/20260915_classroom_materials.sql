create table if not exists public.learning_resources (
    resource_id uuid primary key default gen_random_uuid (),
    classroom_id uuid not null references public.classrooms (classroom_id) on delete cascade,
    resource_type text not null check (
        resource_type in ('document', 'link')
    ),
    resource_url text not null,
    uploaded_date timestamptz not null default now()
);

alter table public.learning_resources enable row level security;

create policy "enrolled students read learning resources" on public.learning_resources for
select to authenticated using (
        exists (
            select 1
            from public.classroom_students
            where
                classroom_students.classroom_id = learning_resources.classroom_id
                and classroom_students.student_id = auth.uid ()
        )
    );

create policy "teachers manage learning resources" on public.learning_resources for all to authenticated using (
    exists (
        select 1
        from public.classrooms
        where
            classrooms.classroom_id = learning_resources.classroom_id
            and classrooms.teacher_id = auth.uid ()
    )
)
with
    check (
        exists (
            select 1
            from public.classrooms
            where
                classrooms.classroom_id = learning_resources.classroom_id
                and classrooms.teacher_id = auth.uid ()
        )
    );