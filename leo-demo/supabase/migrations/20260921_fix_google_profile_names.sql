begin;

-- Google stores the complete display name in `name` and the first name in
-- `given_name`. Split `full_name` only when the dedicated fields are absent.
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
$$;

-- Repair only Google profiles whose current first-name value exactly matches
-- Google's full display name. Manually edited profile names remain untouched.
update public.profiles as profile
set name = nullif(split_part(coalesce(
    nullif(auth_user.raw_user_meta_data ->> 'given_name', ''),
    nullif(auth_user.raw_user_meta_data ->> 'first_name', ''),
    coalesce(
        nullif(auth_user.raw_user_meta_data ->> 'full_name', ''),
        nullif(auth_user.raw_user_meta_data ->> 'name', '')
    )
), ' ', 1), '')
from auth.users as auth_user
where profile.id = auth_user.id
  and (
      auth_user.raw_app_meta_data ->> 'provider' = 'google'
      or coalesce(auth_user.raw_app_meta_data -> 'providers', '[]'::jsonb) ? 'google'
  )
  and profile.name in (
      auth_user.raw_user_meta_data ->> 'full_name',
      auth_user.raw_user_meta_data ->> 'name'
  )
  and nullif(split_part(coalesce(
      nullif(auth_user.raw_user_meta_data ->> 'given_name', ''),
      nullif(auth_user.raw_user_meta_data ->> 'first_name', ''),
      coalesce(
          nullif(auth_user.raw_user_meta_data ->> 'full_name', ''),
          nullif(auth_user.raw_user_meta_data ->> 'name', '')
      )
  ), ' ', 1), '') is not null;

commit;
