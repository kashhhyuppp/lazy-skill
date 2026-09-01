-- ===========================================================================
-- Lazy Skill — Phase 8: remote installation
--
-- The server queues *intent*, never commands. A job names one operation from a
-- fixed vocabulary and carries validated parameters; it can never carry a
-- command line. The CLI re-validates everything it reads here before acting,
-- so a compromised server still cannot make a device run something arbitrary
-- (§21/§23/§56).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- device_jobs — the queue
-- ---------------------------------------------------------------------------
create table if not exists public.device_jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  device_id   uuid not null references public.devices(id) on delete cascade,

  -- The entire vocabulary. Anything outside this list is not expressible.
  command     text not null,
  -- Structured parameters only. Validated on write here and again by the CLI.
  payload     jsonb not null default '{}'::jsonb,

  status      text not null default 'queued',
  stage       text,
  error       text,

  created_at  timestamptz not null default now(),
  claimed_at  timestamptz,
  finished_at timestamptz,
  -- A job nobody collects must not sit in the queue forever.
  expires_at  timestamptz not null default now() + interval '15 minutes',

  constraint device_jobs_command_known check (
    command in ('INSTALL_SKILL', 'CHECK_STATUS', 'LIST_SKILLS', 'DISCONNECT')
  ),
  constraint device_jobs_status_known check (
    status in ('queued', 'claimed', 'running', 'succeeded', 'failed', 'expired', 'cancelled')
  )
);

create index if not exists device_jobs_queue_idx
  on public.device_jobs (device_id, created_at)
  where status = 'queued';

create index if not exists device_jobs_user_idx
  on public.device_jobs (user_id, created_at desc);

alter table public.device_jobs enable row level security;

-- Owners may watch their own jobs. Writes are service-role only: queueing goes
-- through a validating route, and progress comes from an authenticated device.
create policy "users read their own jobs"
  on public.device_jobs for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- installations — user-facing history, one row per skill per agent
-- ---------------------------------------------------------------------------
alter table public.installations
  add column if not exists job_id uuid references public.device_jobs(id) on delete set null,
  add column if not exists stage  text;

create index if not exists installations_job_idx on public.installations (job_id);

-- The same skill can be installed to several agents, and reinstalled later,
-- so uniqueness is scoped to the job rather than the skill.
create unique index if not exists installations_job_agent_idx
  on public.installations (job_id, agent_id)
  where job_id is not null;

-- ---------------------------------------------------------------------------
-- claim_next_job — atomic hand-off to exactly one CLI
-- ---------------------------------------------------------------------------
create or replace function public.claim_next_job(p_device_id uuid)
returns setof public.device_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
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

revoke all on function public.claim_next_job(uuid) from public;

-- ---------------------------------------------------------------------------
-- expire_stale_jobs — queued work nobody collected
-- ---------------------------------------------------------------------------
create or replace function public.expire_stale_jobs()
returns integer language plpgsql security definer set search_path = public as $$
declare
  affected integer;
begin
  update public.device_jobs
     set status = 'expired', finished_at = now(),
         error = 'The computer never picked this up.'
   where status in ('queued', 'claimed', 'running')
     and expires_at < now();
  get diagnostics affected = row_count;

  update public.installations i
     set status = 'failed',
         error = 'The computer never picked this up.',
         finished_at = now()
    from public.device_jobs j
   where i.job_id = j.id
     and j.status = 'expired'
     and i.status in ('pending', 'running');

  return affected;
end;
$$;
