-- ===========================================================================
-- Lazy Skill — Phase 3: accounts, favorites, collections, preferences
--
-- Every table is protected by row level security and every policy is scoped to
-- auth.uid(). The anon key is public by design; RLS is what actually keeps one
-- user's data away from another.
--
-- Skills themselves live in an external registry, so anything referencing a
-- skill stores its registry id as text. A small denormalised snapshot (name,
-- source) is kept alongside so a favorites list renders without fanning out
-- one API call per row; the detail page remains the source of truth.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles — public-facing identity, one row per auth user
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique,
  display_name text,
  avatar_url  text,
  theme       text not null default 'cyber-purple',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint profiles_username_format
    check (username is null or username ~ '^[a-z0-9_-]{3,24}$'),
  constraint profiles_theme_known
    check (theme in ('cyber-purple','cyber-blue','matrix-green','sakura-pink',
                     'sunset-orange','teal-mint','monochrome'))
);

alter table public.profiles enable row level security;

-- Profiles are readable by anyone: leaderboards and shared collections need a
-- display name. Only the owner may write.
create policy "profiles are publicly readable"
  on public.profiles for select using (true);

create policy "users insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "users update their own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- agent_preferences — which tools the user actually uses (onboarding, §14)
-- ---------------------------------------------------------------------------
create table if not exists public.agent_preferences (
  user_id    uuid not null references auth.users(id) on delete cascade,
  agent_id   text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, agent_id),
  constraint agent_preferences_known
    check (agent_id in ('claude','codex','cursor','copilot','windsurf','gemini','other'))
);

alter table public.agent_preferences enable row level security;

create policy "users read their own agent preferences"
  on public.agent_preferences for select using (auth.uid() = user_id);
create policy "users write their own agent preferences"
  on public.agent_preferences for insert with check (auth.uid() = user_id);
create policy "users delete their own agent preferences"
  on public.agent_preferences for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- favorites
-- ---------------------------------------------------------------------------
create table if not exists public.favorites (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  skill_id     text not null,
  skill_name   text not null,
  skill_source text not null,
  created_at   timestamptz not null default now(),
  unique (user_id, skill_id)
);

create index if not exists favorites_user_created_idx
  on public.favorites (user_id, created_at desc);

alter table public.favorites enable row level security;

create policy "users read their own favorites"
  on public.favorites for select using (auth.uid() = user_id);
create policy "users add their own favorites"
  on public.favorites for insert with check (auth.uid() = user_id);
create policy "users remove their own favorites"
  on public.favorites for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- collections
-- ---------------------------------------------------------------------------
create table if not exists public.collections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint collections_name_len check (char_length(trim(name)) between 1 and 60)
);

create index if not exists collections_user_idx on public.collections (user_id, updated_at desc);

alter table public.collections enable row level security;

-- A collection is visible to its owner always, and to everyone once shared.
create policy "collections readable by owner or when public"
  on public.collections for select using (auth.uid() = user_id or is_public);
create policy "users create their own collections"
  on public.collections for insert with check (auth.uid() = user_id);
create policy "users update their own collections"
  on public.collections for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete their own collections"
  on public.collections for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- collection_skills
-- ---------------------------------------------------------------------------
create table if not exists public.collection_skills (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  skill_id      text not null,
  skill_name    text not null,
  skill_source  text not null,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  unique (collection_id, skill_id)
);

create index if not exists collection_skills_order_idx
  on public.collection_skills (collection_id, position);

alter table public.collection_skills enable row level security;

-- Membership rows inherit the parent collection's visibility rather than
-- carrying their own user_id, so sharing can never drift out of sync.
create policy "collection items follow collection visibility"
  on public.collection_skills for select using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and (c.user_id = auth.uid() or c.is_public)
    )
  );

create policy "users add items to their own collections"
  on public.collection_skills for insert with check (
    exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid())
  );

create policy "users update items in their own collections"
  on public.collection_skills for update using (
    exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid())
  );

create policy "users remove items from their own collections"
  on public.collection_skills for delete using (
    exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- housekeeping
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists collections_touch on public.collections;
create trigger collections_touch before update on public.collections
  for each row execute function public.touch_updated_at();

-- A profile row must exist the moment a user signs up, or every read has to
-- cope with a missing row forever after.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'user_name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
