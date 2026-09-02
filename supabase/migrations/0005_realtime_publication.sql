-- ===========================================================================
-- Lazy Skill — enable realtime broadcasting
--
-- Subscribing to postgres_changes is not enough on its own: Postgres only
-- publishes changes for tables in the supabase_realtime publication. Without
-- this, a channel connects happily, reports SUBSCRIBED, and then silently
-- never delivers a single event — so the phone sits on "waiting" forever
-- while the install has already finished on the device.
-- ===========================================================================

-- REPLICA IDENTITY FULL makes the old row available on updates, so a
-- subscriber can tell what actually changed rather than only seeing the new
-- values.
alter table public.installations replica identity full;
alter table public.device_jobs   replica identity full;
alter table public.devices       replica identity full;

do $$
begin
  -- Each table is added independently and idempotently: re-running this
  -- migration must not fail, and one already-published table must not stop
  -- the others from being added.
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'installations'
  ) then
    alter publication supabase_realtime add table public.installations;
  end if;

  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'device_jobs'
  ) then
    alter publication supabase_realtime add table public.device_jobs;
  end if;

  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'devices'
  ) then
    alter publication supabase_realtime add table public.devices;
  end if;
end
$$;
