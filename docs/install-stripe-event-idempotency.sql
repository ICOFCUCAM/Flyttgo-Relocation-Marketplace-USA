-- ============================================================================
-- FlyttGo — Stripe webhook event idempotency
-- ============================================================================
--
-- Stripe delivers each webhook event at-least-once. The stripe-webhook
-- edge function already short-circuits via payment_status checks on
-- the bookings / driver_subscriptions rows it writes to, but as soon as
-- a future handler does MULTIPLE writes per event the partial-retry
-- hazard reappears: a retry could re-execute side effects in cases
-- where the first attempt succeeded only partially.
--
-- This table makes event-level idempotency atomic. The webhook does:
--
--   INSERT INTO processed_stripe_events (id, event_type) VALUES (...)
--
-- on every incoming event. The first delivery succeeds; any retry
-- collides on the primary key (PG error 23505) and the function
-- short-circuits with { idempotent: true }.
--
-- DEPLOY
-- ------
-- Apply once before re-deploying stripe-webhook:
--   supabase db query "$(cat docs/install-stripe-event-idempotency.sql)"
--   # or paste the contents into the SQL editor in the dashboard.
--
-- The webhook tolerates the table not existing yet (it logs and falls
-- back to per-row idempotency) so deploy ordering is forgiving.
-- ============================================================================

create table if not exists public.processed_stripe_events (
  id           text primary key,
  event_type   text not null,
  processed_at timestamptz not null default now()
);

-- Service-role only. Anon / authenticated roles never touch this
-- table — only the stripe-webhook edge function (running with
-- SUPABASE_SERVICE_ROLE_KEY) writes here.
alter table public.processed_stripe_events enable row level security;
revoke all  on public.processed_stripe_events from anon, authenticated;

-- Garbage collection: prune events older than 30 days. Stripe's
-- own retry window is much shorter (a few hours) so 30 days is a
-- generous safety margin.
create index if not exists processed_stripe_events_processed_at_idx
  on public.processed_stripe_events (processed_at);

-- Optional: nightly pg_cron job to delete old rows. Uncomment if
-- pg_cron is installed in your project.
-- select cron.schedule(
--   'prune-processed-stripe-events',
--   '0 4 * * *',
--   $$ delete from public.processed_stripe_events where processed_at < now() - interval '30 days' $$
-- );
