-- ---------------------------------------------------------------------------
-- Scheduled sweeps.
--
-- Two housekeeping functions existed with nothing calling them:
--
--   purge_expired_pairings  had no caller anywhere in the codebase. Every
--   pairing code ever generated was still in the table; its first real run
--   during the security review deleted 33 rows.
--
--   expire_stale_jobs       ran only when a CLI happened to poll for work. If
--   nobody's laptop was listening, an abandoned install stayed 'pending'
--   forever and the phone showed a spinner with nothing behind it.
--
-- Both are now on a schedule, so neither depends on someone being online.
-- The 0006 migration made them service-role only; pg_cron runs as the table
-- owner rather than through PostgREST, so the schedule is unaffected by that.
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron;

-- Re-running this migration should not stack duplicate schedules.
select cron.unschedule(jobid)
  from cron.job
 where jobname in ('lazyskill-purge-pairings', 'lazyskill-expire-jobs');

-- Hourly, at :17 rather than :00 — the top of the hour is where every other
-- scheduled job on a shared host piles up.
select cron.schedule(
  'lazyskill-purge-pairings',
  '17 * * * *',
  $$select public.purge_expired_pairings()$$
);

-- Every five minutes. A person watching a spinner on their phone is the one
-- waiting for this, so it wants to be tighter than the hourly sweep: an
-- install that will never happen should say so within about the time it takes
-- to wonder whether it is stuck.
select cron.schedule(
  'lazyskill-expire-jobs',
  '*/5 * * * *',
  $$select public.expire_stale_jobs()$$
);
