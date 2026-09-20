-- Supply non-null name aliases before an Auth user profile trigger runs.
create or replace function public.normalize_auth_profile_metadata()
returns trigger
language plpgsql
set search_path = ''
as $$
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
        nullif(metadata ->> 'given_name', ''),
        nullif(metadata ->> 'first_name', ''),
        nullif(metadata ->> 'name', ''),
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
$$;

drop trigger if exists before_auth_user_profile_metadata on auth.users;
create trigger before_auth_user_profile_metadata
before insert on auth.users
for each row execute function public.normalize_auth_profile_metadata();
