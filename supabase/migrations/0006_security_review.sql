-- ---------------------------------------------------------------------------
-- Security review fixes.
--
-- Found by attacking the live project with the public anon key and a second
-- account. Four issues, all in the same family: a `security definer` function
-- that trusts one of its arguments.
--
--   1. claim_next_job(p_device_id) had no ownership check and was executable
--      by any signed-in user. Confirmed: a second account claimed another
--      user's queued install, which both disclosed the job payload and left
--      the victim's install permanently unclaimed by their real machine.
--   2. award_xp took the amount from the caller and never checked that the
--      deed had happened, so 25 calls with invented subject ids produced 2500
--      XP and the top leaderboard place.
--   3. advance_quest took its target and reward from the caller, so a quest
--      could be completed in one call for an arbitrary payout.
--   4. unlock_achievement took an arbitrary code, so any user could award
--      themselves any badge, including codes that do not exist.
--
-- The shape of the fix: the reward rules move into the database, the client
-- passes only *what happened*, and the functions that grant things are no
-- longer reachable from a browser at all.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. claim_next_job — a device's queue belongs to its owner
-- ---------------------------------------------------------------------------
-- The route authenticates the CLI by its token HMAC and then calls this with
-- the service role, so no browser needs to reach it. Revoking is the actual
-- fix; the role guard inside is there so a future grant cannot silently
-- reopen the hole.
create or replace function public.claim_next_job(p_device_id uuid)
returns setof public.device_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only the server may hand out work. A signed-in user reaching this
  -- function directly is not a supported path, and used to be a way to steal
  -- another account's install.
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'claim_next_job is not callable by clients';
  end if;

  -- skip locked means two CLI instances polling the same device cannot both
  -- claim the same job; the loser simply sees the next one, or nothing.
  return query
  update public.device_jobs j
     set status = 'claimed', claimed_at = now()
   where j.id = (
     select id from public.device_jobs
      where device_id = p_device_id
        and status = 'queued'
        and expires_at > now()
      order by created_at
      limit 1
      for update skip locked
   )
  returning *;
end;
$$;

revoke all on function public.claim_next_job(uuid) from public, anon, authenticated;
grant execute on function public.claim_next_job(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 2. maintenance functions are the server's business
-- ---------------------------------------------------------------------------
-- purge_expired_pairings also carried a live bug: `returning 1 into removed`
-- raises P0003 unless the delete happens to touch exactly one row, so the
-- sweep threw instead of sweeping. get diagnostics alone is the right tool.
create or replace function public.purge_expired_pairings()
returns integer language plpgsql security definer set search_path = public as $$
declare
  removed integer;
begin
  delete from public.pairing_tokens
   where expires_at < now() - interval '1 hour';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.purge_expired_pairings() from public, anon, authenticated;
grant execute on function public.purge_expired_pairings() to service_role;

revoke all on function public.expire_stale_jobs() from public, anon, authenticated;
grant execute on function public.expire_stale_jobs() to service_role;

-- ---------------------------------------------------------------------------
-- 3. the reward rules move into the database
-- ---------------------------------------------------------------------------
-- These mirror src/lib/gamification/rules.ts. The TypeScript copy still drives
-- the UI, but it is no longer what decides a payout, so editing it in devtools
-- buys nothing. A drift test keeps the two honest.
create table if not exists public.xp_rules (
  kind   text primary key,
  amount integer not null check (amount > 0 and amount <= 100)
);

insert into public.xp_rules (kind, amount) values
  ('skill_installed',    10),
  ('skill_favorited',     2),
  ('collection_created', 10),
  ('category_explored',   5),
  ('quest_completed',   100)
on conflict (kind) do update set amount = excluded.amount;

create table if not exists public.quest_rules (
  code       text primary key,
  kind       text not null references public.xp_rules(kind),
  target     integer not null check (target > 0),
  reward     integer not null check (reward > 0 and reward <= 100),
  available  boolean not null default true,
  sort_order integer not null
);

insert into public.quest_rules (code, kind, target, reward, available, sort_order) values
  ('favorite_5',   'skill_favorited',   5, 100, true,  1),
  ('collection_1', 'collection_created', 1, 100, true,  2),
  ('install_3',    'skill_installed',    3, 100, false, 3),
  ('explore_2',    'category_explored',  2, 100, false, 4)
on conflict (code) do update
  set kind = excluded.kind, target = excluded.target, reward = excluded.reward,
      available = excluded.available, sort_order = excluded.sort_order;

-- Only these codes exist. An unlock for anything else is a forgery.
create table if not exists public.achievement_rules (
  code text primary key
);

insert into public.achievement_rules (code) values
  ('first_skill'), ('on_fire'), ('collector'), ('ai_explorer'), ('power_user'), ('explorer')
on conflict do nothing;

alter table public.xp_rules          enable row level security;
alter table public.quest_rules       enable row level security;
alter table public.achievement_rules enable row level security;

-- Readable so the app can render goals; no write policy, so nobody can move
-- the goalposts.
-- Postgres has no "create policy if not exists", and this migration should be
-- safe to run twice.
drop policy if exists "xp rules are readable" on public.xp_rules;
drop policy if exists "quest rules are readable" on public.quest_rules;
drop policy if exists "achievement rules are readable" on public.achievement_rules;

create policy "xp rules are readable" on public.xp_rules for select using (true);
create policy "quest rules are readable" on public.quest_rules for select using (true);
create policy "achievement rules are readable" on public.achievement_rules for select using (true);

-- ---------------------------------------------------------------------------
-- 4. today's quest, computed the same way on both sides
-- ---------------------------------------------------------------------------
-- Mirrors questForDate(): the earnable quests in order, indexed by the day
-- number. Deriving it here means the client cannot nominate which quest it is
-- advancing.
create or replace function public.todays_quest()
returns public.quest_rules
language sql stable security definer set search_path = public as $$
  with earnable as (
    select q.*, row_number() over (order by sort_order) - 1 as idx,
           count(*) over () as n
      from public.quest_rules q
     where q.available
  )
  select code, kind, target, reward, available, sort_order
    from earnable
   where idx = floor(extract(epoch from now()) / 86400)::bigint % n;
$$;

-- ---------------------------------------------------------------------------
-- 5. award_xp — the client says what it did, the database decides the reward
-- ---------------------------------------------------------------------------
-- Quest advancement and achievement unlocking are folded in, so the two
-- functions that used to grant things on demand can stop being callable.
drop function if exists public.award_xp(text, integer, text);

create or replace function public.award_xp(
  p_kind       text,
  p_subject_id text default null
)
returns table (
  awarded         boolean,
  total_xp        integer,
  current_streak  integer,
  quest_completed boolean,
  unlocked        text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_today   date := (now() at time zone 'utc')::date;
  v_amount  integer;
  v_last    date;
  v_streak  integer;
  v_did     boolean := false;
  v_quest   public.quest_rules;
  v_qrow    public.quest_progress%rowtype;
  v_qdone   boolean := false;
  v_unlocked text[] := '{}';
  v_total   integer;
  v_collections integer;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  -- The payout comes from the table, never from the caller. This is the line
  -- that used to let a browser request a million points.
  select amount into v_amount from public.xp_rules where kind = p_kind;
  if v_amount is null then
    raise exception 'unknown xp kind: %', p_kind;
  end if;

  -- quest_completed is granted by this function as part of finishing a quest.
  -- A client asking for it directly is claiming a reward it did not earn.
  if p_kind = 'quest_completed' then
    raise exception 'quest_completed is not directly awardable';
  end if;

  -- Verify the deed actually happened and belongs to this user. Without this,
  -- invented subject ids mint XP: the unique index only stops the *same*
  -- subject being counted twice, not a fresh fake one each time.
  if p_kind = 'skill_favorited' then
    if not exists (select 1 from public.favorites
                    where user_id = v_user and skill_id = p_subject_id) then
      raise exception 'no such favorite for this user';
    end if;
  elsif p_kind = 'collection_created' then
    if not exists (select 1 from public.collections
                    where user_id = v_user and id::text = p_subject_id) then
      raise exception 'no such collection for this user';
    end if;
  elsif p_kind = 'skill_installed' then
    if not exists (select 1 from public.installations
                    where user_id = v_user and skill_id = p_subject_id) then
      raise exception 'no such installation for this user';
    end if;
  elsif p_kind = 'category_explored' then
    -- Browsing leaves no record to check against, so this one is bounded
    -- instead: more categories than the registry has cannot be explored in a
    -- day, whatever the client claims.
    if (select count(*) from public.xp_events
         where user_id = v_user and kind = 'category_explored'
           and created_at >= v_today) >= 12 then
      raise exception 'daily category limit reached';
    end if;
  end if;

  -- The ledger's unique index decides whether this is a genuinely new award.
  insert into public.xp_events (user_id, kind, amount, subject_id)
  values (v_user, p_kind, v_amount, p_subject_id)
  on conflict do nothing;

  v_did := found;

  select p.last_active_on, p.current_streak
    into v_last, v_streak
    from public.profiles p where p.id = v_user for update;

  if v_last is null or v_last < v_today - 1 then
    v_streak := 1;
  elsif v_last = v_today - 1 then
    v_streak := coalesce(v_streak, 0) + 1;
  else
    v_streak := greatest(coalesce(v_streak, 0), 1);
  end if;

  update public.profiles p
     set total_xp = p.total_xp + case when v_did then v_amount else 0 end,
         current_streak = v_streak,
         longest_streak = greatest(p.longest_streak, v_streak),
         last_active_on = v_today
   where p.id = v_user
  returning p.total_xp into v_total;

  -- A repeat action still counts for the streak, but must not advance a
  -- quest — otherwise re-favouriting one skill would finish "favorite 5".
  if v_did then
    v_quest := public.todays_quest();

    if v_quest.code is not null and v_quest.kind = p_kind then
      insert into public.quest_progress (user_id, quest_date, quest_code, progress, target)
      values (v_user, v_today, v_quest.code, 1, v_quest.target)
      on conflict (user_id, quest_date, quest_code) do update
        set progress = least(public.quest_progress.progress + 1, public.quest_progress.target)
      returning * into v_qrow;

      if v_qrow.progress >= v_qrow.target and v_qrow.completed_at is null then
        update public.quest_progress q
           set completed_at = now()
         where q.user_id = v_user and q.quest_date = v_today and q.quest_code = v_quest.code;

        insert into public.xp_events (user_id, kind, amount, subject_id)
        values (v_user, 'quest_completed', v_quest.reward, v_quest.code || ':' || v_today)
        on conflict do nothing;

        if found then
          update public.profiles p set total_xp = p.total_xp + v_quest.reward
           where p.id = v_user returning p.total_xp into v_total;
        end if;

        v_qdone := true;
      end if;
    end if;
  end if;

  -- Achievements are evaluated from stored state, so they cannot be claimed.
  -- Level 25 is 30,000 XP on the 50*L*(L-1) curve in levels.ts.
  select count(*) into v_collections from public.collections where user_id = v_user;

  if v_streak >= 7 then
    insert into public.user_achievements (user_id, code) values (v_user, 'on_fire')
    on conflict do nothing;
    if found then v_unlocked := v_unlocked || 'on_fire'; end if;
  end if;

  if v_total >= 30000 then
    insert into public.user_achievements (user_id, code) values (v_user, 'power_user')
    on conflict do nothing;
    if found then v_unlocked := v_unlocked || 'power_user'; end if;
  end if;

  if v_collections >= 3 then
    insert into public.user_achievements (user_id, code) values (v_user, 'collector')
    on conflict do nothing;
    if found then v_unlocked := v_unlocked || 'collector'; end if;
  end if;

  return query select v_did, v_total, v_streak, v_qdone, v_unlocked;
end;
$$;

revoke all on function public.award_xp(text, text) from public, anon;
grant execute on function public.award_xp(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. the two functions that granted things on demand are retired
-- ---------------------------------------------------------------------------
-- Their work now happens inside award_xp, after the deed has been verified,
-- so there is no longer any reason for a browser to reach them.
drop function if exists public.advance_quest(text, integer, integer);
drop function if exists public.unlock_achievement(text);

-- Codes are constrained to the ones that exist, so a stray insert cannot
-- invent a badge even through the service role.
delete from public.user_achievements
 where code not in (select code from public.achievement_rules);

alter table public.user_achievements
  drop constraint if exists user_achievements_code_known;
alter table public.user_achievements
  add constraint user_achievements_code_known
  foreign key (code) references public.achievement_rules(code) on delete cascade;

-- ---------------------------------------------------------------------------
-- 7. install history outlives the hardware
-- ---------------------------------------------------------------------------
-- device_id cascaded, so disconnecting and deleting a computer silently
-- erased every install ever made from it. The history is the user's, not the
-- machine's; the name is denormalised so a deleted device still reads sensibly.
alter table public.installations
  add column if not exists device_name text;

update public.installations i
   set device_name = d.name
  from public.devices d
 where i.device_id = d.id and i.device_name is null;

alter table public.installations alter column device_id drop not null;

alter table public.installations
  drop constraint if exists installations_device_id_fkey;
alter table public.installations
  add constraint installations_device_id_fkey
  foreign key (device_id) references public.devices(id) on delete set null;
