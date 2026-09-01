-- ===========================================================================
-- Lazy Skill — Phase 4: XP, levels, streaks, achievements, quests
--
-- XP is an append-only ledger. Nothing writes a balance directly; a trigger
-- rolls each event up onto the profile. There is deliberately no "grant me
-- XP" path — every event is inserted by the same server action that performs
-- the underlying deed, so points cannot be minted from the client.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- profile rollups
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists total_xp        integer not null default 0,
  add column if not exists current_streak  integer not null default 0,
  add column if not exists longest_streak  integer not null default 0,
  add column if not exists last_active_on  date;

create index if not exists profiles_xp_idx on public.profiles (total_xp desc);

-- ---------------------------------------------------------------------------
-- xp_events — the ledger
-- ---------------------------------------------------------------------------
create table if not exists public.xp_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,
  amount     integer not null,
  -- What the event was about (a skill id, a collection id, a quest code).
  -- Null for events with no subject.
  subject_id text,
  created_at timestamptz not null default now(),

  constraint xp_events_kind_known check (kind in (
    'skill_installed', 'skill_favorited', 'collection_created',
    'category_explored', 'quest_completed'
  )),
  -- Awards are capped at the largest rule so a bug cannot mint a fortune.
  constraint xp_events_amount_sane check (amount > 0 and amount <= 100)
);

-- Earning the same thing twice is not earning it twice. Un-favouriting and
-- re-favouriting a skill cannot farm points.
create unique index if not exists xp_events_once_per_subject
  on public.xp_events (user_id, kind, subject_id)
  where subject_id is not null;

create index if not exists xp_events_user_time_idx
  on public.xp_events (user_id, created_at desc);

alter table public.xp_events enable row level security;

-- Readable by the owner; never writable or deletable from the client. Inserts
-- happen through award_xp(), which is security definer.
create policy "users read their own xp events"
  on public.xp_events for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_achievements — unlocks only; definitions live in code
-- ---------------------------------------------------------------------------
create table if not exists public.user_achievements (
  user_id     uuid not null references auth.users(id) on delete cascade,
  code        text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, code)
);

alter table public.user_achievements enable row level security;

create policy "achievements are publicly readable"
  on public.user_achievements for select using (true);

-- ---------------------------------------------------------------------------
-- quest_progress — one row per user per day per quest
-- ---------------------------------------------------------------------------
create table if not exists public.quest_progress (
  user_id      uuid not null references auth.users(id) on delete cascade,
  quest_date   date not null,
  quest_code   text not null,
  progress     integer not null default 0,
  target       integer not null,
  completed_at timestamptz,
  primary key (user_id, quest_date, quest_code),
  constraint quest_progress_sane check (progress >= 0 and target > 0)
);

alter table public.quest_progress enable row level security;

create policy "users read their own quest progress"
  on public.quest_progress for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- award_xp — the only way points enter the system
-- ---------------------------------------------------------------------------
create or replace function public.award_xp(
  p_kind       text,
  p_amount     integer,
  p_subject_id text default null
)
returns table (awarded boolean, total_xp integer, current_streak integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_today  date := (now() at time zone 'utc')::date;
  v_last   date;
  v_streak integer;
  v_did    boolean := false;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  -- The ledger's unique index decides whether this is a genuinely new award.
  -- Attributing it to auth.uid() rather than a parameter means a caller cannot
  -- award points to somebody else.
  insert into public.xp_events (user_id, kind, amount, subject_id)
  values (v_user, p_kind, p_amount, p_subject_id)
  on conflict do nothing;

  v_did := found;

  select p.last_active_on, p.current_streak
    into v_last, v_streak
    from public.profiles p
   where p.id = v_user
   for update;

  -- Any activity counts toward the streak, even a repeat that earned nothing.
  if v_last is null or v_last < v_today - 1 then
    v_streak := 1;
  elsif v_last = v_today - 1 then
    v_streak := coalesce(v_streak, 0) + 1;
  end if;

  update public.profiles p
     set total_xp = p.total_xp + case when v_did then p_amount else 0 end,
         current_streak = v_streak,
         longest_streak = greatest(p.longest_streak, v_streak),
         last_active_on = v_today
   where p.id = v_user
   returning p.total_xp, p.current_streak into total_xp, current_streak;

  awarded := v_did;
  return next;
end;
$$;

revoke all on function public.award_xp(text, integer, text) from public;
grant execute on function public.award_xp(text, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- advance_quest — increments today's quest and pays out once on completion
-- ---------------------------------------------------------------------------
create or replace function public.advance_quest(
  p_quest_code text,
  p_target     integer,
  p_reward     integer default 100
)
returns table (progress integer, target integer, completed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_row   public.quest_progress%rowtype;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  insert into public.quest_progress (user_id, quest_date, quest_code, progress, target)
  values (v_user, v_today, p_quest_code, 1, p_target)
  on conflict (user_id, quest_date, quest_code) do update
    -- Never overshoot the target, so a completed quest stays completed at
    -- exactly its target rather than creeping upward.
    set progress = least(public.quest_progress.progress + 1, public.quest_progress.target)
  returning * into v_row;

  if v_row.progress >= v_row.target and v_row.completed_at is null then
    update public.quest_progress q
       set completed_at = now()
     where q.user_id = v_user and q.quest_date = v_today and q.quest_code = p_quest_code;

    -- Subject is the quest+date, so the reward can only ever land once.
    perform public.award_xp('quest_completed', p_reward, p_quest_code || ':' || v_today::text);
    completed := true;
  else
    completed := false;
  end if;

  progress := v_row.progress;
  target := v_row.target;
  return next;
end;
$$;

revoke all on function public.advance_quest(text, integer, integer) from public;
grant execute on function public.advance_quest(text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- unlock_achievement — idempotent
-- ---------------------------------------------------------------------------
create or replace function public.unlock_achievement(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  insert into public.user_achievements (user_id, code)
  values (v_user, p_code)
  on conflict do nothing;

  return found;
end;
$$;

revoke all on function public.unlock_achievement(text) from public;
grant execute on function public.unlock_achievement(text) to authenticated;

-- ---------------------------------------------------------------------------
-- leaderboard — a view so ranking logic lives in one place
-- ---------------------------------------------------------------------------
create or replace view public.leaderboard_all_time
with (security_invoker = true) as
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.total_xp,
    p.current_streak,
    rank() over (order by p.total_xp desc) as rank
  from public.profiles p
  where p.total_xp > 0;

-- Windowed boards are computed from the ledger rather than a second running
-- total, so they can never drift out of step with all-time XP.
create or replace view public.leaderboard_weekly
with (security_invoker = true) as
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    sum(e.amount)::integer as total_xp,
    p.current_streak,
    rank() over (order by sum(e.amount) desc) as rank
  from public.xp_events e
  join public.profiles p on p.id = e.user_id
  where e.created_at >= now() - interval '7 days'
  group by p.id, p.username, p.display_name, p.avatar_url, p.current_streak;

create or replace view public.leaderboard_monthly
with (security_invoker = true) as
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    sum(e.amount)::integer as total_xp,
    p.current_streak,
    rank() over (order by sum(e.amount) desc) as rank
  from public.xp_events e
  join public.profiles p on p.id = e.user_id
  where e.created_at >= now() - interval '30 days'
  group by p.id, p.username, p.display_name, p.avatar_url, p.current_streak;
