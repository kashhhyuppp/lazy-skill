-- ---------------------------------------------------------------------------
-- Fill in a name and avatar when a provider is linked later.
--
-- handle_new_user only fires when the account is created. Someone who signed
-- up one way and connected Google or GitHub afterwards kept an empty profile
-- forever, because the name and picture those providers return arrive on an
-- update to auth.users, not an insert. The leaderboard reads display_name, so
-- the effect was a real person permanently showing as "Anonymous".
--
-- Blanks are filled, never overwritten: a display name the user has set is
-- theirs, and a later provider link must not quietly rename them.
-- ---------------------------------------------------------------------------

create or replace function public.sync_profile_identity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles p
     set display_name = coalesce(
           p.display_name,
           new.raw_user_meta_data->>'full_name',
           new.raw_user_meta_data->>'name',
           new.raw_user_meta_data->>'user_name'
         ),
         avatar_url = coalesce(
           p.avatar_url,
           new.raw_user_meta_data->>'avatar_url',
           new.raw_user_meta_data->>'picture'
         )
   where p.id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_identity_changed on auth.users;
create trigger on_auth_user_identity_changed
  after update of raw_user_meta_data on auth.users
  for each row execute function public.sync_profile_identity();

-- Google calls them name/picture where GitHub calls them full_name/avatar_url.
-- The original trigger only knew GitHub's spelling, so a brand new Google
-- account would also have arrived without a picture.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'user_name'
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Everyone who is already blank but whose provider told us who they are.
update public.profiles p
   set display_name = coalesce(
         p.display_name,
         u.raw_user_meta_data->>'full_name',
         u.raw_user_meta_data->>'name',
         u.raw_user_meta_data->>'user_name'
       ),
       avatar_url = coalesce(
         p.avatar_url,
         u.raw_user_meta_data->>'avatar_url',
         u.raw_user_meta_data->>'picture'
       )
  from auth.users u
 where u.id = p.id
   and (p.display_name is null or p.avatar_url is null);
