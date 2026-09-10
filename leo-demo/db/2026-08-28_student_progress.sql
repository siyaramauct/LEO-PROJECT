-- Student progress card: real learning streak + weekly progress
-- Run this in the Supabase SQL editor (Database -> SQL Editor).
--
-- Adds:
--   * profiles.weekly_goal        - per-student weekly lesson target (default 7)
--   * public.student_activity      - one row per student per day of qualifying activity
--   * public.get_student_progress  - RPC returning streak + weekly progress for auth.uid()

-- 1. Weekly lesson goal on the profile ---------------------------------------
alter table public.profiles
  add column if not exists weekly_goal integer not null default 7;

-- 2. Activity log ----------------------------------------------------------------
-- A day is "active" when the student completes a lesson quiz. The activity_date
-- default resolves to "today" in the app timezone, so the client only has to
-- upsert and let ON CONFLICT DO NOTHING dedupe repeat visits on the same day.
create table if not exists public.student_activity (
  student_id    uuid not null references public.profiles(id) on delete cascade,
  activity_date date not null default (now() at time zone 'Africa/Johannesburg')::date,
  source        text not null default 'lesson_quiz',
  created_at    timestamptz not null default now(),
  primary key (student_id, activity_date)
);

alter table public.student_activity enable row level security;

drop policy if exists "students read own activity" on public.student_activity;
create policy "students read own activity"
  on public.student_activity for select
  using (student_id = auth.uid());

drop policy if exists "students insert own activity" on public.student_activity;
create policy "students insert own activity"
  on public.student_activity for insert
  with check (student_id = auth.uid());

-- 3. Progress RPC --------------------------------------------------------------
-- Returns a single row for the calling student:
--   current_streak            consecutive active days ending today or yesterday
--   longest_streak            longest run of consecutive active days ever
--   last_activity_date        most recent active day (null if none)
--   weekly_lessons_completed  distinct lessons completed this ISO week
--   weekly_goal               the student's weekly target
create or replace function public.get_student_progress()
returns table (
  current_streak            integer,
  longest_streak            integer,
  last_activity_date        date,
  weekly_lessons_completed  integer,
  weekly_goal               integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_today      date := (now() at time zone 'Africa/Johannesburg')::date;
  v_week_start date := v_today - ((extract(isodow from v_today)::int) - 1);
begin
  return query
  with days as (
    select activity_date from student_activity where student_id = v_uid
  ),
  grp as (
    -- gap-and-island: consecutive dates share the same streak_key
    select activity_date,
           activity_date - (row_number() over (order by activity_date))::int as streak_key
    from days
  ),
  runs as (
    select count(*)::int as len, max(activity_date) as run_end
    from grp
    group by streak_key
  )
  select
    coalesce((select len from runs
              where run_end >= v_today - 1
              order by run_end desc
              limit 1), 0),
    coalesce((select max(len) from runs), 0),
    (select max(activity_date) from days),
    (select count(distinct lesson_id)::int
       from lesson_attempts
      where student_id = v_uid
        and completed_at is not null
        and (completed_at at time zone 'Africa/Johannesburg')::date >= v_week_start),
    coalesce((select weekly_goal from profiles where id = v_uid), 7);
end;
$$;

grant execute on function public.get_student_progress() to authenticated;
