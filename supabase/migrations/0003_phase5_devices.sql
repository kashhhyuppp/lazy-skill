-- ===========================================================================
-- Lazy Skill — Phase 5: device pairing
--
-- Threat model: the pairing code is displayed on a screen and photographed.
-- Treat it as public the moment it is rendered. It is therefore short-lived,
-- single-use, and carries no authority of its own — claiming it requires a
-- signed-in user, and the long-lived device token is minted only afterwards
-- and returned exactly once.
--
-- Nothing here is reachable with the anon key. These tables have RLS enabled
-- and deliberately no policies for anon or authenticated roles; every access
-- goes through server routes using the service role, which bypasses RLS.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- devices
-- ---------------------------------------------------------------------------
create table if not exists public.devices (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  platform      text not null,
  os_version    text,
  -- SHA-256 of the device token. The token itself is shown once, to the CLI,
  -- and never stored anywhere on the server.
  token_hash    text not null unique,
  -- Agents the CLI actually detected. Never assumed.
  detected_agents jsonb not null default '[]'::jsonb,
  theme         text not null default 'cyber-purple',
  revoked_at    timestamptz,
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),

  constraint devices_platform_known check (platform in ('darwin', 'win32', 'linux', 'unknown')),
  constraint devices_name_len check (char_length(trim(name)) between 1 and 80)
);

create index if not exists devices_user_idx on public.devices (user_id, created_at desc);
create index if not exists devices_token_idx on public.devices (token_hash) where revoked_at is null;

alter table public.devices enable row level security;

-- Owners may read and rename their own devices from the web app. Inserts and
-- token writes are service-role only.
create policy "users read their own devices"
  on public.devices for select using (auth.uid() = user_id);
create policy "users update their own devices"
  on public.devices for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete their own devices"
  on public.devices for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- pairing_tokens
-- ---------------------------------------------------------------------------
create table if not exists public.pairing_tokens (
  id           uuid primary key default gen_random_uuid(),
  -- SHA-256 of the code in the QR. The plaintext code is never stored, so a
  -- database leak cannot be replayed into a pairing.
  code_hash    text not null unique,
  device_name  text not null,
  platform     text not null,
  os_version   text,
  detected_agents jsonb not null default '[]'::jsonb,
  -- Cosmetic only. Carried so the phone can adopt the CLI's theme (§7/§53).
  theme        text not null default 'cyber-purple',
  expires_at   timestamptz not null,
  -- Set the instant a code is claimed. A partial unique index makes a second
  -- claim impossible even under a race.
  claimed_at   timestamptz,
  claimed_by   uuid references auth.users(id) on delete cascade,
  device_id    uuid references public.devices(id) on delete set null,
  -- The device token, held only until the CLI collects it, then erased.
  pending_token text,
  created_at   timestamptz not null default now()
);

create index if not exists pairing_tokens_expiry_idx on public.pairing_tokens (expires_at);

alter table public.pairing_tokens enable row level security;
-- No policies at all: unreachable with the anon key by design.

-- ---------------------------------------------------------------------------
-- installations — recorded by the CLI, read by the web app (Phase 8 writes)
-- ---------------------------------------------------------------------------
create table if not exists public.installations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  device_id   uuid not null references public.devices(id) on delete cascade,
  skill_id    text not null,
  skill_name  text not null,
  agent_id    text not null,
  status      text not null default 'pending',
  error       text,
  created_at  timestamptz not null default now(),
  finished_at timestamptz,

  constraint installations_status_known
    check (status in ('pending', 'running', 'success', 'failed', 'cancelled'))
);

create index if not exists installations_user_idx on public.installations (user_id, created_at desc);
create index if not exists installations_device_idx on public.installations (device_id, created_at desc);

alter table public.installations enable row level security;

create policy "users read their own installations"
  on public.installations for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- expiry sweep — codes are useless once expired, and should not linger
-- ---------------------------------------------------------------------------
create or replace function public.purge_expired_pairings()
returns integer language plpgsql security definer set search_path = public as $$
declare
  removed integer;
begin
  delete from public.pairing_tokens
   where expires_at < now() - interval '1 hour'
  returning 1 into removed;
  get diagnostics removed = row_count;
  return removed;
end;
$$;
