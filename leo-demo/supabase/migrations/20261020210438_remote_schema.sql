SET local check_function_bodies = off;

CREATE SCHEMA "leo_private";

CREATE SCHEMA "private";

CREATE TABLE "leo_private"."classroom_invites" (
  "classroom_id" uuid                     NOT NULL,
  "code"         text                     NOT NULL,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "classroom_invites_code_key" UNIQUE (code),
  CONSTRAINT "classroom_invites_pkey" PRIMARY KEY (classroom_id)
);

CREATE TABLE "public"."classroom_students" (
  "student_id"   uuid                     NOT NULL,
  "classroom_id" uuid                     NOT NULL,
  "enrolled_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "classroom_students_pkey" PRIMARY KEY (student_id, classroom_id)
);

ALTER TABLE "public"."classroom_students"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."classrooms" (
  "classroom_id"      uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "teacher_id"        uuid                     NOT NULL,
  "created_date"      timestamp with time zone NOT NULL DEFAULT now(),
  "join_code"         character varying(20)    NOT NULL,
  "language"          text,
  "proficiency_level" text,
  "invite_only"       boolean,
  "cover_image_path"  text,
  "description"       text,
  "classroom_name"    text                     NOT NULL,
  CONSTRAINT "classrooms_join_code_key" UNIQUE (join_code),
  CONSTRAINT "classrooms_pkey" PRIMARY KEY (classroom_id)
);

ALTER TABLE "public"."classrooms"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."flashcard_translations" (
  "translation_id"        uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "flashcard_id"          uuid                     NOT NULL,
  "language_code"         text                     NOT NULL,
  "translated_word"       text                     NOT NULL,
  "translated_definition" text                     NOT NULL,
  "created_at"            timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "flashcard_translations_flashcard_id_language_code_key" UNIQUE (flashcard_id, language_code),
  CONSTRAINT "flashcard_translations_language_code_check" CHECK ((language_code = ANY (ARRAY['zh'::text, 'es'::text, 'fr'::text]))),
  CONSTRAINT "flashcard_translations_pkey" PRIMARY KEY (translation_id)
);

ALTER TABLE "public"."flashcard_translations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."flashcards" (
  "flashcard_id" uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "lesson_id"    uuid                     NOT NULL,
  "word"         text                     NOT NULL,
  "definition"   text                     NOT NULL,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "image_path"   text,
  CONSTRAINT "flashcards_pkey" PRIMARY KEY (flashcard_id)
);

ALTER TABLE "public"."flashcards"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."learning_resources" (
  "resource_id"   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "classroom_id"  uuid                     NOT NULL,
  "resource_type" character varying(50)    NOT NULL,
  "resource_url"  text,
  "uploaded_date" timestamp with time zone NOT NULL DEFAULT now(),
  "lesson_id"     uuid,
  CONSTRAINT "learning_resources_pkey" PRIMARY KEY (resource_id)
);

ALTER TABLE "public"."learning_resources"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."lesson_attempts" (
  "attempt_id"   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "student_id"   uuid                     NOT NULL,
  "lesson_id"    uuid                     NOT NULL,
  "score"        integer,
  "started_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "completed_at" timestamp with time zone,
  CONSTRAINT "lesson_attempts_pkey" PRIMARY KEY (attempt_id)
);

ALTER TABLE "public"."lesson_attempts"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."lessons" (
  "lesson_id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "classroom_id"      uuid                     NOT NULL,
  "title"             text                     NOT NULL,
  "description"       text                     NOT NULL,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "lesson_image_path" text,
  "release_date"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "lessons_pkey" PRIMARY KEY (lesson_id)
);

ALTER TABLE "public"."lessons"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."mcqs" (
  "mcq_id"        uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "lesson_id"     uuid                     NOT NULL,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "score_ceiling" smallint                 NOT NULL,
  "title"         text                     NOT NULL,
  CONSTRAINT "mcqs_pkey" PRIMARY KEY (mcq_id)
);

ALTER TABLE "public"."mcqs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."notifications" (
  "notification_id" bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "recipient_id"    uuid,
  "type"            text                     NOT NULL,
  "title"           text                     NOT NULL,
  "body"            text,
  "link_url"        text,
  "is_read"         boolean                  DEFAULT false,
  "created_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "notifications_pkey" PRIMARY KEY (notification_id)
);

ALTER TABLE "public"."notifications"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
  "id"          uuid                     NOT NULL,
  "name"        text                     NOT NULL,
  "surname"     text                     NOT NULL,
  "user_role"   text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "username"    text,
  "weekly_goal" integer                  NOT NULL DEFAULT 7,
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."questions" (
  "question_id"    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "mcq_id"         uuid                     NOT NULL,
  "question_text"  text                     NOT NULL,
  "option_a"       text                     NOT NULL,
  "option_b"       text                     NOT NULL,
  "option_c"       text                     NOT NULL,
  "option_d"       text                     NOT NULL,
  "correct_option" character(1)             NOT NULL,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "questions_correct_option_check" CHECK ((correct_option = ANY (ARRAY['A'::bpchar, 'B'::bpchar, 'C'::bpchar, 'D'::bpchar]))),
  CONSTRAINT "questions_pkey" PRIMARY KEY (question_id)
);

ALTER TABLE "public"."questions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."student_activity" (
  "student_id"    uuid                     NOT NULL,
  "activity_date" date                     NOT NULL DEFAULT ((now() AT TIME ZONE 'Africa/Johannesburg'::text))::date,
  "source"        text                     NOT NULL DEFAULT 'lesson_quiz'::text,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "student_activity_pkey" PRIMARY KEY (student_id, activity_date)
);

ALTER TABLE "public"."student_activity"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION leo_private.create_classroom_invite()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
    insert into leo_private.classroom_invites (classroom_id, code)
    values (new.classroom_id, upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)));
    return new;
end;
$function$;

CREATE OR REPLACE FUNCTION leo_private.enforce_classroom_lesson_limit()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.classroom_id::text));
    if (select count(*) from public.lessons where classroom_id = new.classroom_id) >= 50 then
        raise exception 'This classroom has reached its 50-lesson limit';
    end if;
    return new;
end;
$function$;

CREATE OR REPLACE FUNCTION leo_private.enforce_lesson_flashcard_limit()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.lesson_id::text));
    if (select count(*) from public.flashcards where lesson_id = new.lesson_id) >= 15 then
        raise exception 'This lesson has reached its 15-flashcard limit';
    end if;
    return new;
end;
$function$;

CREATE OR REPLACE FUNCTION leo_private.validate_resource_lesson_classroom()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION private.after_profile_delete()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if (select auth.uid()) is distinct from old.id then return old; end if;
  delete from auth.users where id = old.id;
  return old;
end;
$function$;

CREATE OR REPLACE FUNCTION private.before_profile_delete()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if (select auth.uid()) is distinct from old.id then return old; end if;
  delete from public.notifications      where recipient_id = old.id;
  delete from public.student_activity   where student_id   = old.id;
  delete from public.lesson_attempts    where student_id   = old.id;
  delete from public.classroom_students where student_id   = old.id;
  delete from public.classrooms         where teacher_id   = old.id;
  return old;
end;
$function$;

CREATE OR REPLACE FUNCTION private.can_edit_classroom (
  p_classroom uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select private.owns_classroom(p_classroom) or private.is_admin();
$function$;

CREATE OR REPLACE FUNCTION private.can_edit_lesson (
  p_lesson uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1 from public.lessons l
    where l.lesson_id = p_lesson
      and ( (l.classroom_id is null and private.is_staff())
            or private.can_edit_classroom(l.classroom_id) )
  );
$function$;

CREATE OR REPLACE FUNCTION private.can_view_classroom (
  p_classroom uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select private.in_classroom(p_classroom)
      or private.owns_classroom(p_classroom)
      or private.is_admin();
$function$;

CREATE OR REPLACE FUNCTION private.can_view_lesson (
  p_lesson uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1 from public.lessons l
    where l.lesson_id = p_lesson
      and (l.classroom_id is null or private.can_view_classroom(l.classroom_id))
  );
$function$;

CREATE OR REPLACE FUNCTION private.check_lesson_attempt()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_ceiling numeric;
  v_has_quiz boolean;
begin
  if (select auth.uid()) is null then
    return new;                       -- dashboard / service role
  end if;
 
  select true, coalesce(m.score_ceiling,
           (select count(*) from public.questions q where q.mcq_id = m.mcq_id))
    into v_has_quiz, v_ceiling
  from public.mcqs m
  where m.lesson_id = new.lesson_id
  limit 1;
 
  if v_has_quiz is null then
    raise exception 'This lesson has no quiz';
  end if;
  if new.score is not null and (new.score < 0 or new.score > v_ceiling) then
    raise exception 'Score must be between 0 and %', v_ceiling;
  end if;
  if new.completed_at is not null and new.completed_at > now() + interval '1 minute' then
    raise exception 'completed_at cannot be in the future';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.flashcard_lesson (
  p_card uuid
)
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$ select lesson_id from public.flashcards where flashcard_id = p_card; $function$;

CREATE OR REPLACE FUNCTION private.guard_user_role()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if tg_op = 'INSERT' then
    if lower(coalesce(new.user_role::text, '')) = 'admin' then
      raise exception 'Admin accounts can only be created by an administrator';
    end if;
    return new;
  end if;
 
  if new.user_role is distinct from old.user_role
     and (select auth.uid()) is not null
     and not private.is_admin() then
    if old.user_role is not null
       or lower(coalesce(new.user_role::text, '')) not in ('student', 'teacher') then
      raise exception 'Your role has already been set';
    end if;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.in_classroom (
  p_classroom uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1 from public.classroom_students
    where classroom_id = p_classroom and student_id = (select auth.uid())
  );
$function$;

CREATE OR REPLACE FUNCTION private.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and lower(user_role::text) = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION private.is_staff()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and lower(user_role::text) in ('teacher', 'admin')
  );
$function$;

CREATE OR REPLACE FUNCTION private.lesson_is_open (
  p_lesson uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
        select exists (
          select 1 from public.lessons l
          where l.lesson_id = p_lesson
            and (l.release_date is null
                 or l.release_date <= now()
                 or private.can_edit_classroom(l.classroom_id))
        );
      $function$;

CREATE OR REPLACE FUNCTION private.make_username_unique()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_base text;
  v_try  int := 0;
begin
  if new.username is null then return new; end if;
  v_base := regexp_replace(new.username, '[0-9]+$', '');
  while exists (
    select 1 from public.profiles
    where lower(username) = lower(new.username) and id <> new.id
  ) loop
    v_try := v_try + 1;
    if v_try > 50 then
      raise exception 'Could not find a free username, please try again';
    end if;
    new.username := v_base || lpad((floor(random() * 10000))::int::text, 4, '0');
  end loop;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.mcq_lesson (
  p_mcq uuid
)
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$ select lesson_id from public.mcqs where mcq_id = p_mcq; $function$;

CREATE OR REPLACE FUNCTION private.notify_attempt_completed()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_lesson  record;
  v_name    text;
  v_ceiling numeric;
begin
  if new.completed_at is null then return new; end if;
 
  select l.title, c.classroom_id, c.teacher_id, c.classroom_name into v_lesson
  from public.lessons l join public.classrooms c on c.classroom_id = l.classroom_id
  where l.lesson_id = new.lesson_id;
  if v_lesson.teacher_id is null then return new; end if;
 
  select nullif(btrim(concat_ws(' ', name, surname)), '') into v_name
  from public.profiles where id = new.student_id;
 
  select score_ceiling into v_ceiling from public.mcqs where lesson_id = new.lesson_id limit 1;
 
  perform set_config('leo.system_notify', 'on', true);
  insert into public.notifications (recipient_id, type, title, body, link_url)
  values (
    v_lesson.teacher_id, 'lesson_completed', 'A student completed a lesson',
    format('%s scored %s/%s on "%s" in "%s".',
           coalesce(v_name, 'A student'), coalesce(new.score::text, '0'),
           coalesce(v_ceiling::text, '?'), v_lesson.title, v_lesson.classroom_name),
    '/teacher-classroom/' || v_lesson.classroom_id
  );
  perform set_config('leo.system_notify', 'off', true);
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.notify_enrolment_removed()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_uid   uuid := (select auth.uid());
  v_class record;
  v_name  text;
begin
  if v_uid is null then return old; end if;
 
  select classroom_id, teacher_id, classroom_name into v_class
  from public.classrooms where classroom_id = old.classroom_id;
  if v_class.classroom_id is null then return old; end if;   -- classroom itself deleted
 
  perform set_config('leo.system_notify', 'on', true);
  if v_uid = old.student_id then
    select nullif(btrim(concat_ws(' ', name, surname)), '') into v_name
    from public.profiles where id = old.student_id;
 
    insert into public.notifications (recipient_id, type, title, body, link_url)
    values (v_class.teacher_id, 'student_left_classroom', 'Student left classroom',
            format('%s left "%s".', coalesce(v_name, 'A student'), v_class.classroom_name),
            '/teacher-classroom/' || v_class.classroom_id);
  elsif v_uid = v_class.teacher_id then
    insert into public.notifications (recipient_id, type, title, body, link_url)
    values (old.student_id, 'removed_from_classroom', 'You were removed from a classroom',
            format('You were removed from "%s".', v_class.classroom_name),
            '/student/classrooms');
  end if;
  perform set_config('leo.system_notify', 'off', true);
  return old;
end;
$function$;

CREATE OR REPLACE FUNCTION private.owns_classroom (
  p_classroom uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1 from public.classrooms
    where classroom_id = p_classroom and teacher_id = (select auth.uid())
  );
$function$;

CREATE OR REPLACE FUNCTION private.skip_app_copy_notifications()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if new.type in ('lesson_completed', 'student_left_classroom', 'removed_from_classroom')
     and (select auth.uid()) is not null
     and coalesce(current_setting('leo.system_notify', true), 'off') <> 'on' then
    return null;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.teaches_student (
  p_student uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1
    from public.classroom_students cs
    join public.classrooms c on c.classroom_id = cs.classroom_id
    where cs.student_id = p_student
      and c.teacher_id = (select auth.uid())
  );
$function$;

CREATE OR REPLACE FUNCTION public.delete_own_account()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to delete your account';
  end if;
  delete from public.profiles where id = (select auth.uid());
end;
$function$;

REVOKE ALL ON FUNCTION "public"."delete_own_account"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.get_classroom_invite_code (
  p_classroom_id uuid
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

REVOKE ALL ON FUNCTION "public"."get_classroom_invite_code"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.get_student_progress()
  RETURNS TABLE (
    current_streak           integer,
    longest_streak           integer,
    last_activity_date       date,
    weekly_lessons_completed integer,
    weekly_goal              integer
  )
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'Africa/Johannesburg')::date;
  v_week_start date := v_today - ((extract(isodow from v_today)::int) - 1);
begin
  return query
  with days as (
    select activity_date from student_activity where student_id = v_uid
  ),
  grp as (
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
    coalesce((select p.weekly_goal from profiles p where p.id = v_uid), 7);
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  insert into public.profiles (id, name, surname, user_role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'surname',
    new.raw_user_meta_data ->> 'user_role'  -- will be NULL if not provided at signup
  );
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.join_classroom (
  p_join_code character varying
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_classroom public.classrooms.classroom_id%type;
begin
  if (select auth.uid()) is null then
    raise exception 'You must be logged in to join a classroom';
  end if;

  select classroom_id into v_classroom
  from public.classrooms
  where join_code = p_join_code;

  if v_classroom is null then
    raise exception 'Invalid join code';
  end if;

  if not exists (
    select 1 from public.classroom_students
    where classroom_id = v_classroom and student_id = (select auth.uid())
  ) then
    insert into public.classroom_students (classroom_id, student_id)
    values (v_classroom, (select auth.uid()));
  end if;

  return v_classroom;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."join_classroom"(character varying) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.join_classroom_with_code (
  p_code text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

REVOKE ALL ON FUNCTION "public"."join_classroom_with_code"(text) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.normalize_auth_profile_metadata()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
    metadata jsonb;
    full_name text;
    first_name text;
    last_name text;
begin
    metadata := coalesce(new.raw_user_meta_data, '{}'::jsonb);
    full_name := coalesce(
        nullif(metadata ->> 'full_name', ''),
        nullif(metadata ->> 'name', ''),
        ''
    );
    first_name := coalesce(
        nullif(case
            when metadata ->> 'given_name' = full_name and position(' ' in full_name) > 0
                then split_part(full_name, ' ', 1)
            else metadata ->> 'given_name'
        end, ''),
        nullif(case
            when metadata ->> 'first_name' = full_name and position(' ' in full_name) > 0
                then split_part(full_name, ' ', 1)
            else metadata ->> 'first_name'
        end, ''),
        nullif(split_part(full_name, ' ', 1), ''),
        nullif(split_part(new.email, '@', 1), ''),
        'Learner'
    );
    last_name := coalesce(
        nullif(metadata ->> 'surname', ''),
        nullif(metadata ->> 'family_name', ''),
        nullif(metadata ->> 'last_name', ''),
        nullif(btrim(substr(full_name, length(split_part(full_name, ' ', 1)) + 1)), ''),
        ''
    );

    new.raw_user_meta_data := metadata || jsonb_build_object(
        'name', first_name,
        'surname', last_name,
        'first_name', first_name,
        'last_name', last_name,
        'given_name', first_name,
        'family_name', last_name
    );
    return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rotate_classroom_invite_code (
  p_classroom_id uuid
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

REVOKE ALL ON FUNCTION "public"."rotate_classroom_invite_code"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.submit_quiz (
  p_lesson_id  uuid,
  p_answers    jsonb,
  p_started_at timestamp with time zone DEFAULT NULL::timestamp WITH time zone
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_uid       uuid := (select auth.uid());
  v_mcq       record;
  v_total     int;
  v_correct   int;
  v_ceiling   numeric;
  v_score     numeric;
  v_results   jsonb;
begin
  if v_uid is null then
    raise exception 'Sign in to submit a quiz';
  end if;
  if not (private.can_view_lesson(p_lesson_id) and private.lesson_is_open(p_lesson_id)) then
    raise exception 'You do not have access to this lesson';
  end if;
 
  select mcq_id, score_ceiling into v_mcq
  from public.mcqs where lesson_id = p_lesson_id limit 1;
  if v_mcq.mcq_id is null then
    raise exception 'This lesson has no quiz';
  end if;
 
  select count(*),
         count(*) filter (where upper(coalesce(p_answers ->> q.question_id::text, '')) = upper(q.correct_option::text)),
         coalesce(jsonb_agg(jsonb_build_object(
           'questionId',    q.question_id,
           'question',      q.question_text,
           'studentAnswer', coalesce(p_answers ->> q.question_id::text, 'Not answered'),
           'correctAnswer', case upper(q.correct_option::text)
                              when 'A' then q.option_a when 'B' then q.option_b
                              when 'C' then q.option_c when 'D' then q.option_d end,
           'isCorrect',     upper(coalesce(p_answers ->> q.question_id::text, '')) = upper(q.correct_option::text)
         ) order by q.created_at), '[]'::jsonb)
    into v_total, v_correct, v_results
  from public.questions q
  where q.mcq_id = v_mcq.mcq_id;
 
  v_ceiling := coalesce(v_mcq.score_ceiling, v_total);
  v_score   := case when v_total > 0 then round(v_correct::numeric / v_total * v_ceiling) else 0 end;
 
  insert into public.lesson_attempts (student_id, lesson_id, score, started_at, completed_at)
  values (v_uid, p_lesson_id, v_score, coalesce(p_started_at, now()), now());
 
  insert into public.student_activity (student_id, source)
  values (v_uid, 'lesson_quiz')
  on conflict do nothing;
 
  return jsonb_build_object(
    'score',          v_score,
    'totalQuestions', v_ceiling,
    'correct',        v_correct,
    'incorrect',      v_total - v_correct,
    'results',        v_results
  );
end;
$function$;

REVOKE ALL ON FUNCTION "public"."submit_quiz"(uuid, jsonb, timestamp WITH time zone) FROM PUBLIC, "anon";

ALTER TABLE "leo_private"."classroom_invites"
  ADD CONSTRAINT "classroom_invites_classroom_id_fkey" FOREIGN KEY (classroom_id) REFERENCES public.classrooms(classroom_id) ON DELETE CASCADE;

ALTER TABLE "public"."classroom_students"
  ADD CONSTRAINT "classroom_students_classroom_id_fkey" FOREIGN KEY (classroom_id) REFERENCES public.classrooms(classroom_id) ON DELETE CASCADE;

ALTER TABLE "public"."flashcard_translations"
  ADD CONSTRAINT "flashcard_translations_sane_size"
    CHECK (((char_length(language_code) <= 10) AND (char_length(COALESCE(translated_word, ''::text)) <= 200) AND (char_length(COALESCE(translated_definition, ''::text)) <= 2000)))
    NOT VALID;

ALTER TABLE "public"."flashcard_translations"
  ADD CONSTRAINT "flashcard_translations_flashcard_id_fkey" FOREIGN KEY (flashcard_id) REFERENCES public.flashcards(flashcard_id) ON DELETE CASCADE;

ALTER TABLE "public"."learning_resources"
  ADD CONSTRAINT "learning_resources_classroom_id_fkey" FOREIGN KEY (classroom_id) REFERENCES public.classrooms(classroom_id) ON DELETE CASCADE;

ALTER TABLE "public"."learning_resources"
  ADD CONSTRAINT "learning_resources_link_is_http" CHECK ((((resource_type)::text <> 'link'::text) OR (resource_url ~* '^https?://\S+$'::text))) NOT VALID;

ALTER TABLE "public"."lessons"
  ADD CONSTRAINT "lessons_classroom_id_fkey" FOREIGN KEY (classroom_id) REFERENCES public.classrooms(classroom_id) ON DELETE CASCADE;

ALTER TABLE "public"."flashcards"
  ADD CONSTRAINT "flashcards_lesson_id_fkey" FOREIGN KEY (lesson_id) REFERENCES public.lessons(lesson_id) ON DELETE CASCADE;

ALTER TABLE "public"."learning_resources"
  ADD CONSTRAINT "learning_resources_lesson_id_fkey" FOREIGN KEY (lesson_id) REFERENCES public.lessons(lesson_id) ON DELETE CASCADE;

ALTER TABLE "public"."lesson_attempts"
  ADD CONSTRAINT "lesson_attempts_lesson_id_fkey" FOREIGN KEY (lesson_id) REFERENCES public.lessons(lesson_id) ON DELETE CASCADE;

ALTER TABLE "public"."mcqs"
  ADD CONSTRAINT "mcqs_lesson_id_fkey" FOREIGN KEY (lesson_id) REFERENCES public.lessons(lesson_id) ON DELETE CASCADE;

ALTER TABLE "public"."notifications"
  ADD CONSTRAINT "notifications_link_is_internal" CHECK (((link_url IS NULL) OR (link_url ~ '^/([^/\\]|$)'::text))) NOT VALID;

ALTER TABLE "public"."notifications"
  ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."classroom_students"
  ADD CONSTRAINT "classroom_students_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."classrooms"
  ADD CONSTRAINT "classrooms_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."lesson_attempts"
  ADD CONSTRAINT "lesson_attempts_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."questions"
  ADD CONSTRAINT "questions_mcq_id_fkey" FOREIGN KEY (mcq_id) REFERENCES public.mcqs(mcq_id) ON DELETE CASCADE;

ALTER TABLE "public"."student_activity"
  ADD CONSTRAINT "student_activity_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX classroom_students_one_enrolment ON public.classroom_students USING btree (classroom_id, student_id);

CREATE UNIQUE INDEX flashcard_translations_flashcard_language_key ON public.flashcard_translations USING btree (flashcard_id, language_code);

CREATE INDEX idx_activity_student ON public.student_activity USING btree (student_id);

CREATE INDEX idx_attempts_lesson ON public.lesson_attempts USING btree (lesson_id);

CREATE INDEX idx_attempts_student ON public.lesson_attempts USING btree (student_id);

CREATE INDEX idx_classrooms_join_code ON public.classrooms USING btree (join_code);

CREATE INDEX idx_classrooms_teacher ON public.classrooms USING btree (teacher_id);

CREATE INDEX idx_cs_classroom ON public.classroom_students USING btree (classroom_id);

CREATE INDEX idx_cs_student ON public.classroom_students USING btree (student_id);

CREATE INDEX idx_flashcards_lesson ON public.flashcards USING btree (lesson_id);

CREATE INDEX idx_lessons_classroom ON public.lessons USING btree (classroom_id);

CREATE INDEX idx_mcqs_lesson ON public.mcqs USING btree (lesson_id);

CREATE INDEX idx_notifications_recipient ON public.notifications USING btree (recipient_id, created_at DESC);

CREATE INDEX idx_questions_mcq ON public.questions USING btree (mcq_id);

CREATE INDEX idx_resources_classroom ON public.learning_resources USING btree (classroom_id);

CREATE INDEX idx_translations_flashcard ON public.flashcard_translations USING btree (flashcard_id);

CREATE INDEX learning_resources_lesson_id_idx ON public.learning_resources USING btree (lesson_id)
  WHERE (lesson_id IS NOT NULL);

CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (lower(username));

CREATE TRIGGER before_auth_user_profile_metadata
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_auth_profile_metadata();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER notify_enrolment_removed
  AFTER DELETE ON public.classroom_students
  FOR EACH ROW
  EXECUTE FUNCTION private.notify_enrolment_removed();

CREATE TRIGGER create_classroom_invite
  AFTER INSERT ON public.classrooms
  FOR EACH ROW
  EXECUTE FUNCTION leo_private.create_classroom_invite();

CREATE TRIGGER enforce_lesson_flashcard_limit
  BEFORE INSERT ON public.flashcards
  FOR EACH ROW
  EXECUTE FUNCTION leo_private.enforce_lesson_flashcard_limit();

CREATE TRIGGER validate_resource_lesson_classroom
  BEFORE INSERT OR UPDATE OF classroom_id, lesson_id ON public.learning_resources
  FOR EACH ROW
  EXECUTE FUNCTION leo_private.validate_resource_lesson_classroom();

CREATE TRIGGER check_lesson_attempt
  BEFORE INSERT OR UPDATE ON public.lesson_attempts
  FOR EACH ROW
  EXECUTE FUNCTION private.check_lesson_attempt();

CREATE TRIGGER notify_attempt_completed
  AFTER INSERT ON public.lesson_attempts
  FOR EACH ROW
  EXECUTE FUNCTION private.notify_attempt_completed();

CREATE TRIGGER enforce_classroom_lesson_limit
  BEFORE INSERT ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION leo_private.enforce_classroom_lesson_limit();

CREATE TRIGGER skip_app_copy_notifications
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION private.skip_app_copy_notifications();

CREATE TRIGGER after_profile_delete
  AFTER DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.after_profile_delete();

CREATE TRIGGER before_profile_delete
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.before_profile_delete();

CREATE TRIGGER guard_user_role
  BEFORE INSERT OR UPDATE OF user_role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_user_role();

CREATE TRIGGER make_username_unique
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.make_username_unique();

CREATE POLICY "enrolment: read own or teacher" ON "public"."classroom_students"
  FOR SELECT
  TO "authenticated"
  USING (((student_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.can_edit_classroom(classroom_students.classroom_id) AS can_edit_classroom)));

CREATE POLICY "enrolment: remove" ON "public"."classroom_students"
  FOR DELETE
  TO "authenticated"
  USING (((student_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.can_edit_classroom(classroom_students.classroom_id) AS can_edit_classroom)));

CREATE POLICY "classrooms: members read" ON "public"."classrooms"
  FOR SELECT
  TO "authenticated"
  USING (( SELECT private.can_view_classroom(classrooms.classroom_id) AS can_view_classroom));

CREATE POLICY "classrooms: teacher creates" ON "public"."classrooms"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((teacher_id = ( SELECT auth.uid() AS uid)) AND ( SELECT private.is_staff() AS is_staff)));

CREATE POLICY "classrooms: teacher deletes" ON "public"."classrooms"
  FOR DELETE
  TO "authenticated"
  USING (( SELECT private.can_edit_classroom(classrooms.classroom_id) AS can_edit_classroom));

CREATE POLICY "classrooms: teacher updates" ON "public"."classrooms"
  FOR UPDATE
  TO "authenticated"
  USING (( SELECT private.can_edit_classroom(classrooms.classroom_id) AS can_edit_classroom))
  WITH
    CHECK
    ((( SELECT private.can_edit_classroom(classrooms.classroom_id) AS can_edit_classroom) AND ((teacher_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_admin() AS
    is_admin))));

CREATE POLICY "content: delete" ON "public"."flashcard_translations"
  FOR DELETE
  TO "authenticated"
  USING (( SELECT private.can_edit_lesson(private.flashcard_lesson(flashcard_translations.flashcard_id)) AS can_edit_lesson));

CREATE POLICY "content: insert" ON "public"."flashcard_translations"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (( SELECT private.can_edit_lesson(private.flashcard_lesson(flashcard_translations.flashcard_id)) AS can_edit_lesson));

CREATE POLICY "content: read" ON "public"."flashcard_translations"
  FOR SELECT
  TO "authenticated"
  USING (( SELECT private.can_view_lesson(private.flashcard_lesson(flashcard_translations.flashcard_id)) AS can_view_lesson));

CREATE POLICY "content: update" ON "public"."flashcard_translations"
  FOR UPDATE
  TO "authenticated"
  USING (( SELECT private.can_edit_lesson(private.flashcard_lesson(flashcard_translations.flashcard_id)) AS can_edit_lesson))
  WITH CHECK (( SELECT private.can_edit_lesson(private.flashcard_lesson(flashcard_translations.flashcard_id)) AS can_edit_lesson));

CREATE POLICY "released lessons only" ON "public"."flashcard_translations"
  AS RESTRICTIVE
  FOR SELECT
  TO "authenticated"
  USING (( SELECT private.lesson_is_open(private.flashcard_lesson(flashcard_translations.flashcard_id)) AS lesson_is_open));

CREATE POLICY "translations: students add to cache" ON "public"."flashcard_translations"
  FOR INSERT
  TO "authenticated"
  WITH
    CHECK
    ((( SELECT private.can_view_lesson(private.flashcard_lesson(flashcard_translations.flashcard_id)) AS can_view_lesson) AND ( SELECT
    private.lesson_is_open(private.flashcard_lesson(flashcard_translations.flashcard_id)) AS lesson_is_open)));

CREATE POLICY "content: delete" ON "public"."flashcards"
  FOR DELETE
  TO "authenticated"
  USING (( SELECT private.can_edit_lesson(flashcards.lesson_id) AS can_edit_lesson));

CREATE POLICY "content: insert" ON "public"."flashcards"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (( SELECT private.can_edit_lesson(flashcards.lesson_id) AS can_edit_lesson));

CREATE POLICY "content: read" ON "public"."flashcards"
  FOR SELECT
  TO "authenticated"
  USING (( SELECT private.can_view_lesson(flashcards.lesson_id) AS can_view_lesson));

CREATE POLICY "content: update" ON "public"."flashcards"
  FOR UPDATE
  TO "authenticated"
  USING (( SELECT private.can_edit_lesson(flashcards.lesson_id) AS can_edit_lesson))
  WITH CHECK (( SELECT private.can_edit_lesson(flashcards.lesson_id) AS can_edit_lesson));

CREATE POLICY "released lessons only" ON "public"."flashcards"
  AS RESTRICTIVE
  FOR SELECT
  TO "authenticated"
  USING (( SELECT private.lesson_is_open(flashcards.lesson_id) AS lesson_is_open));

CREATE POLICY "content: delete" ON "public"."learning_resources"
  FOR DELETE
  TO "authenticated"
  USING ((((classroom_id IS NULL) AND ( SELECT private.is_staff() AS is_staff)) OR ( SELECT private.can_edit_classroom(learning_resources.classroom_id) AS can_edit_classroom)));

CREATE POLICY "content: insert" ON "public"."learning_resources"
  FOR INSERT
  TO "authenticated"
  WITH
    CHECK ((((classroom_id IS NULL) AND ( SELECT private.is_staff() AS is_staff)) OR ( SELECT private.can_edit_classroom(learning_resources.classroom_id) AS can_edit_classroom)));

CREATE POLICY "content: read" ON "public"."learning_resources"
  FOR SELECT
  TO "authenticated"
  USING (((classroom_id IS NULL) OR ( SELECT private.can_view_classroom(learning_resources.classroom_id) AS can_view_classroom)));

CREATE POLICY "content: update" ON "public"."learning_resources"
  FOR UPDATE
  TO "authenticated"
  USING ((((classroom_id IS NULL) AND ( SELECT private.is_staff() AS is_staff)) OR ( SELECT private.can_edit_classroom(learning_resources.classroom_id) AS can_edit_classroom)))
  WITH
    CHECK ((((classroom_id IS NULL) AND ( SELECT private.is_staff() AS is_staff)) OR ( SELECT private.can_edit_classroom(learning_resources.classroom_id) AS can_edit_classroom)));

CREATE POLICY "attempts: student inserts own" ON "public"."lesson_attempts"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((student_id = ( SELECT auth.uid() AS uid)) AND ( SELECT private.can_view_lesson(lesson_attempts.lesson_id) AS can_view_lesson)));

CREATE POLICY "attempts: student reads own" ON "public"."lesson_attempts"
  FOR SELECT
  TO "authenticated"
  USING ((student_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "attempts: teacher reads" ON "public"."lesson_attempts"
  FOR SELECT
  TO "authenticated"
  USING (( SELECT private.can_edit_lesson(lesson_attempts.lesson_id) AS can_edit_lesson));

CREATE POLICY "released lessons only" ON "public"."lesson_attempts"
  AS RESTRICTIVE
  FOR INSERT
  TO "authenticated"
  WITH CHECK (( SELECT private.lesson_is_open(lesson_attempts.lesson_id) AS lesson_is_open));

CREATE POLICY "content: delete" ON "public"."lessons"
  FOR DELETE
  TO "authenticated"
  USING ((((classroom_id IS NULL) AND ( SELECT private.is_staff() AS is_staff)) OR ( SELECT private.can_edit_classroom(lessons.classroom_id) AS can_edit_classroom)));

CREATE POLICY "content: insert" ON "public"."lessons"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((((classroom_id IS NULL) AND ( SELECT private.is_staff() AS is_staff)) OR ( SELECT private.can_edit_classroom(lessons.classroom_id) AS can_edit_classroom)));

CREATE POLICY "content: read" ON "public"."lessons"
  FOR SELECT
  TO "authenticated"
  USING (((classroom_id IS NULL) OR ( SELECT private.can_view_classroom(lessons.classroom_id) AS can_view_classroom)));

CREATE POLICY "content: update" ON "public"."lessons"
  FOR UPDATE
  TO "authenticated"
  USING ((((classroom_id IS NULL) AND ( SELECT private.is_staff() AS is_staff)) OR ( SELECT private.can_edit_classroom(lessons.classroom_id) AS can_edit_classroom)))
  WITH CHECK ((((classroom_id IS NULL) AND ( SELECT private.is_staff() AS is_staff)) OR ( SELECT private.can_edit_classroom(lessons.classroom_id) AS can_edit_classroom)));

CREATE POLICY "released lessons only" ON "public"."lessons"
  AS RESTRICTIVE
  FOR SELECT
  TO "authenticated"
  USING (((release_date IS NULL) OR (release_date <= now()) OR ( SELECT private.can_edit_classroom(lessons.classroom_id) AS can_edit_classroom)));

CREATE POLICY "content: delete" ON "public"."mcqs"
  FOR DELETE
  TO "authenticated"
  USING (( SELECT private.can_edit_lesson(mcqs.lesson_id) AS can_edit_lesson));

CREATE POLICY "content: insert" ON "public"."mcqs"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (( SELECT private.can_edit_lesson(mcqs.lesson_id) AS can_edit_lesson));

CREATE POLICY "content: read" ON "public"."mcqs"
  FOR SELECT
  TO "authenticated"
  USING (( SELECT private.can_view_lesson(mcqs.lesson_id) AS can_view_lesson));

CREATE POLICY "content: update" ON "public"."mcqs"
  FOR UPDATE
  TO "authenticated"
  USING (( SELECT private.can_edit_lesson(mcqs.lesson_id) AS can_edit_lesson))
  WITH CHECK (( SELECT private.can_edit_lesson(mcqs.lesson_id) AS can_edit_lesson));

CREATE POLICY "released lessons only" ON "public"."mcqs"
  AS RESTRICTIVE
  FOR SELECT
  TO "authenticated"
  USING (( SELECT private.lesson_is_open(mcqs.lesson_id) AS lesson_is_open));

CREATE POLICY "notifications: app copies" ON "public"."notifications"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((type = ANY (ARRAY['lesson_completed'::text, 'student_left_classroom'::text, 'removed_from_classroom'::text])));

CREATE POLICY "notifications: delete own" ON "public"."notifications"
  FOR DELETE
  TO "authenticated"
  USING ((recipient_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "notifications: read own" ON "public"."notifications"
  FOR SELECT
  TO "authenticated"
  USING ((recipient_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "notifications: staff send" ON "public"."notifications"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT private.teaches_student(notifications.recipient_id) AS teaches_student) OR ( SELECT private.is_admin() AS is_admin)));

CREATE POLICY "notifications: update own" ON "public"."notifications"
  FOR UPDATE
  TO "authenticated"
  USING ((recipient_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((recipient_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "profiles: admin reads all" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (( SELECT private.is_admin() AS is_admin));

CREATE POLICY "profiles: delete own" ON "public"."profiles"
  FOR DELETE
  TO "authenticated"
  USING ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "profiles: insert own" ON "public"."profiles"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((id = ( SELECT auth.uid() AS uid)) AND (lower(COALESCE(user_role, 'student'::text)) <> 'admin'::text)));

CREATE POLICY "profiles: read own" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "profiles: teacher reads students" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (( SELECT private.teaches_student(profiles.id) AS teaches_student));

CREATE POLICY "profiles: update own" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING ((id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "content: delete" ON "public"."questions"
  FOR DELETE
  TO "authenticated"
  USING (( SELECT private.can_edit_lesson(private.mcq_lesson(questions.mcq_id)) AS can_edit_lesson));

CREATE POLICY "content: insert" ON "public"."questions"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (( SELECT private.can_edit_lesson(private.mcq_lesson(questions.mcq_id)) AS can_edit_lesson));

CREATE POLICY "content: read" ON "public"."questions"
  FOR SELECT
  TO "authenticated"
  USING (( SELECT private.can_view_lesson(private.mcq_lesson(questions.mcq_id)) AS can_view_lesson));

CREATE POLICY "content: update" ON "public"."questions"
  FOR UPDATE
  TO "authenticated"
  USING (( SELECT private.can_edit_lesson(private.mcq_lesson(questions.mcq_id)) AS can_edit_lesson))
  WITH CHECK (( SELECT private.can_edit_lesson(private.mcq_lesson(questions.mcq_id)) AS can_edit_lesson));

CREATE POLICY "released lessons only" ON "public"."questions"
  AS RESTRICTIVE
  FOR SELECT
  TO "authenticated"
  USING (( SELECT private.lesson_is_open(private.mcq_lesson(questions.mcq_id)) AS lesson_is_open));

CREATE POLICY "activity: student inserts own" ON "public"."student_activity"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((student_id = ( SELECT auth.uid() AS uid)) AND (activity_date = ((now() AT TIME ZONE 'Africa/Johannesburg'::text))::date)));

CREATE POLICY "activity: student reads own" ON "public"."student_activity"
  FOR SELECT
  TO "authenticated"
  USING ((student_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "activity: teacher reads" ON "public"."student_activity"
  FOR SELECT
  TO "authenticated"
  USING (( SELECT private.teaches_student(student_activity.student_id) AS teaches_student));

CREATE POLICY "Doc upload policy flreew_0" ON "storage"."objects"
  FOR INSERT
  TO "anon", "authenticated"
  WITH CHECK ((bucket_id = 'documents'::text));

CREATE POLICY "Doc upload policy flreew_1" ON "storage"."objects"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((bucket_id = 'documents'::text));

CREATE POLICY "Doc upload policy flreew_2" ON "storage"."objects"
  FOR UPDATE
  TO "anon", "authenticated"
  USING ((bucket_id = 'documents'::text));

CREATE POLICY "Doc upload policy flreew_3" ON "storage"."objects"
  FOR DELETE
  TO "anon", "authenticated"
  USING ((bucket_id = 'documents'::text));

CREATE POLICY "class members read lesson documents" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING (((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = 'lesson_documents'::text) AND ((EXISTS ( SELECT 1
   FROM public.classrooms
  WHERE (((classrooms.classroom_id)::text = (storage.foldername(objects.name))[2]) AND (classrooms.teacher_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM public.classroom_students
  WHERE (((classroom_students.classroom_id)::text = (storage.foldername(objects.name))[2]) AND (classroom_students.student_id = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "teachers delete own flashcard images" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'images'::text) AND ((storage.foldername(name))[1] = 'flashcards'::text) AND (EXISTS ( SELECT 1
   FROM (public.lessons
     JOIN public.classrooms ON ((classrooms.classroom_id = lessons.classroom_id)))
  WHERE (((lessons.lesson_id)::text = (storage.foldername(objects.name))[2]) AND (classrooms.teacher_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "teachers delete own lesson documents" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = 'lesson_documents'::text) AND (EXISTS ( SELECT 1
   FROM public.classrooms
  WHERE (((classrooms.classroom_id)::text = (storage.foldername(objects.name))[2]) AND (classrooms.teacher_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "teachers update own flashcard images" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'images'::text) AND ((storage.foldername(name))[1] = 'flashcards'::text) AND (EXISTS ( SELECT 1
   FROM (public.lessons
     JOIN public.classrooms ON ((classrooms.classroom_id = lessons.classroom_id)))
  WHERE (((lessons.lesson_id)::text = (storage.foldername(objects.name))[2]) AND (classrooms.teacher_id = ( SELECT auth.uid() AS uid)))))))
  WITH CHECK (((bucket_id = 'images'::text) AND ((storage.foldername(name))[1] = 'flashcards'::text) AND (EXISTS ( SELECT 1
   FROM (public.lessons
     JOIN public.classrooms ON ((classrooms.classroom_id = lessons.classroom_id)))
  WHERE (((lessons.lesson_id)::text = (storage.foldername(objects.name))[2]) AND (classrooms.teacher_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "teachers upload own flashcard images" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'images'::text) AND ((storage.foldername(name))[1] = 'flashcards'::text) AND (EXISTS ( SELECT 1
   FROM (public.lessons
     JOIN public.classrooms ON ((classrooms.classroom_id = lessons.classroom_id)))
  WHERE (((lessons.lesson_id)::text = (storage.foldername(objects.name))[2]) AND (classrooms.teacher_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "teachers upload own lesson documents" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = 'lesson_documents'::text) AND (EXISTS ( SELECT 1
   FROM public.classrooms
  WHERE (((classrooms.classroom_id)::text = (storage.foldername(objects.name))[2]) AND (classrooms.teacher_id = ( SELECT auth.uid() AS uid)))))));

CREATE EVENT TRIGGER "ensure_rls"
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION "public"."rls_auto_enable"();

COMMENT ON COLUMN "public"."flashcards"."image_path" IS 'Optional object path in the Supabase images bucket used by flashcards and image matching.';

GRANT EXECUTE ON FUNCTION "private"."can_edit_classroom"(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "private"."can_edit_lesson"(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "private"."can_view_classroom"(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "private"."can_view_lesson"(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "private"."flashcard_lesson"(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "private"."in_classroom"(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "private"."is_admin"() TO "authenticated";

GRANT EXECUTE ON FUNCTION "private"."is_staff"() TO "authenticated";

GRANT EXECUTE ON FUNCTION "private"."lesson_is_open"(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "private"."mcq_lesson"(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "private"."owns_classroom"(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "private"."teaches_student"(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."delete_own_account"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."delete_own_account"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."delete_own_account"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."delete_own_account"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_classroom_invite_code"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."get_classroom_invite_code"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_classroom_invite_code"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_classroom_invite_code"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_student_progress"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."get_student_progress"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_student_progress"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_student_progress"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."join_classroom"(character varying) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."join_classroom"(character varying) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."join_classroom"(character varying) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."join_classroom"(character varying) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."join_classroom_with_code"(text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."join_classroom_with_code"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."join_classroom_with_code"(text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."join_classroom_with_code"(text) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."normalize_auth_profile_metadata"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."normalize_auth_profile_metadata"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."normalize_auth_profile_metadata"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."normalize_auth_profile_metadata"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."rotate_classroom_invite_code"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."rotate_classroom_invite_code"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."rotate_classroom_invite_code"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."rotate_classroom_invite_code"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."submit_quiz"(uuid, jsonb, timestamp WITH time zone) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."submit_quiz"(uuid, jsonb, timestamp WITH time zone) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."submit_quiz"(uuid, jsonb, timestamp WITH time zone) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."submit_quiz"(uuid, jsonb, timestamp WITH time zone) TO "service_role";

GRANT USAGE ON SCHEMA "private" TO "authenticated";

REVOKE ALL ON SEQUENCE "public"."notifications_notification_id_seq" FROM "anon";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."notifications_notification_id_seq" TO "anon";

REVOKE ALL ON SEQUENCE "public"."notifications_notification_id_seq" FROM "authenticated";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."notifications_notification_id_seq" TO "authenticated";

REVOKE ALL ON SEQUENCE "public"."notifications_notification_id_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."notifications_notification_id_seq" TO "postgres";

REVOKE ALL ON SEQUENCE "public"."notifications_notification_id_seq" FROM "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."notifications_notification_id_seq" TO "service_role";

REVOKE ALL ON TABLE "public"."classroom_students" FROM "anon";

GRANT DELETE, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."classroom_students" TO "anon";

REVOKE ALL ON TABLE "public"."classroom_students" FROM "authenticated";

GRANT DELETE, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."classroom_students" TO "authenticated";

REVOKE ALL ON TABLE "public"."classroom_students" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."classroom_students" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."classroom_students" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."classrooms" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."classrooms" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."classrooms" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."classrooms" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."flashcard_translations" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."flashcard_translations" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."flashcard_translations" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."flashcard_translations" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."flashcards" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."flashcards" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."flashcards" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."flashcards" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."learning_resources" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."learning_resources" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."learning_resources" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."learning_resources" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."lesson_attempts" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."lesson_attempts" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."lesson_attempts" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."lesson_attempts" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."lessons" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."lessons" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."lessons" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."lessons" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."mcqs" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."mcqs" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."mcqs" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."mcqs" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notifications" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."notifications" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notifications" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notifications" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."profiles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."questions" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."questions" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."questions" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."questions" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."student_activity" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."student_activity" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."student_activity" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."student_activity" TO "service_role";

