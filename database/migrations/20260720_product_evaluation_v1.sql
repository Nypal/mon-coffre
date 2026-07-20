-- Mon Coffre production migration: privacy-preserving product evaluation.
-- Run after 20260719_onboarding_modules_v1.sql.
-- This stores feature usage signals only. Financial amounts, emails, names,
-- merchants, creditors, file paths, and free-form notes must not be stored here.

create table if not exists public.feature_events (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  session_id       text not null check (length(session_id) between 8 and 80),
  feature_id       text not null check (feature_id ~ '^[a-z0-9_.:-]{2,64}$'),
  event_name       text not null check (event_name in (
    'feature_viewed',
    'feature_started',
    'feature_completed',
    'feature_skipped',
    'feature_failed',
    'feature_feedback'
  )),
  page_id          text check (page_id is null or page_id ~ '^[a-z0-9_.:-]{2,64}$'),
  outcome          text not null default 'info' check (outcome in ('info','started','completed','skipped','failed','feedback')),
  usefulness_score smallint check (usefulness_score between 1 and 5),
  friction_score   smallint check (friction_score between 1 and 5),
  metadata         jsonb not null default '{}'::jsonb,
  device_mode      text not null default 'unknown' check (device_mode in ('desktop','mobile','unknown')),
  app_version      text not null default 'web',
  created_at       timestamptz not null default now(),
  constraint feature_events_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint feature_events_metadata_size check (length(metadata::text) <= 2000),
  constraint feature_events_metadata_privacy check (
    metadata::text !~* '(email|password|secret|token|service_role|amount|merchant|payee|file_path|file_name|creditor|borrower|full_name)'
  )
);

create table if not exists public.feature_feedback (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  feature_id    text not null check (feature_id ~ '^[a-z0-9_.:-]{2,64}$'),
  feedback_type text not null default 'usefulness' check (feedback_type in ('usefulness','friction','missing','bug','idea')),
  rating        smallint not null check (rating between 1 and 5),
  reason        text check (reason is null or reason ~ '^[a-z0-9_.:-]{2,80}$'),
  created_at    timestamptz not null default now()
);

alter table public.feature_events enable row level security;
alter table public.feature_feedback enable row level security;

drop policy if exists "feature events select own" on public.feature_events;
create policy "feature events select own" on public.feature_events
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "feature events insert own" on public.feature_events;
create policy "feature events insert own" on public.feature_events
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "feature events delete own" on public.feature_events;
create policy "feature events delete own" on public.feature_events
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "feature feedback select own" on public.feature_feedback;
create policy "feature feedback select own" on public.feature_feedback
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "feature feedback insert own" on public.feature_feedback;
create policy "feature feedback insert own" on public.feature_feedback
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "feature feedback delete own" on public.feature_feedback;
create policy "feature feedback delete own" on public.feature_feedback
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists idx_feature_events_user on public.feature_events(user_id);
create index if not exists idx_feature_events_user_created on public.feature_events(user_id, created_at desc);
create index if not exists idx_feature_events_user_feature_created on public.feature_events(user_id, feature_id, created_at desc);
create index if not exists idx_feature_events_feature_created on public.feature_events(feature_id, created_at desc);
create index if not exists idx_feature_feedback_user on public.feature_feedback(user_id);
create index if not exists idx_feature_feedback_user_feature_created on public.feature_feedback(user_id, feature_id, created_at desc);

grant select, insert, delete on
  public.feature_events,
  public.feature_feedback
to authenticated;
