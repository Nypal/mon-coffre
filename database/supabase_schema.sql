-- =====================================================================
-- MON COFFRE - Supabase schema (PostgreSQL)
-- MONEY MODEL: INTEGER MINOR UNITS (bigint). No floating point values.
--   USD / EUR -> cents
--   XOF / XAF -> whole units
-- Each financial row carries its own currency in the currency column.
-- The database never converts currencies and never stores exchange rates.
--
-- Run in Supabase -> SQL Editor -> New query -> Run.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- Supported currencies and minor-unit exponent ----------
create table if not exists public.currencies (
  code           text primary key,
  minor_exponent smallint not null check (minor_exponent in (0, 2))
);

insert into public.currencies (code, minor_exponent) values
  ('USD', 2), ('EUR', 2), ('XOF', 0), ('XAF', 0)
on conflict (code) do nothing;

-- ---------- User profile linked to auth.users ----------
create table if not exists public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  created_at timestamptz not null default now()
);

-- ---------- Mandatory onboarding / financial planning profile ----------
create table if not exists public.user_financial_plans (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  onboarding_completed    boolean not null default false,
  onboarding_completed_at timestamptz,
  plan                    jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ---------- Product evaluation: privacy-preserving feature usage ----------
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

-- ---------- Accounts / available money ----------
create table if not exists public.accounts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  type          text,
  balance_minor bigint not null default 0,
  currency      text not null default 'USD' references public.currencies(code),
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  constraint accounts_id_user_unique unique (id, user_id),
  constraint accounts_id_user_currency_unique unique (id, user_id, currency)
);

-- ---------- Income ----------
create table if not exists public.income (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  account_id     uuid,
  amount_minor   bigint not null check (amount_minor >= 0),
  currency       text not null default 'USD' references public.currencies(code),
  source         text,
  category       text,
  payment_method text,
  income_date    date,
  note           text,
  created_at     timestamptz not null default now(),
  constraint income_id_user_unique unique (id, user_id),
  constraint income_account_owner_currency_fk
    foreign key (account_id, user_id, currency)
    references public.accounts (id, user_id, currency)
);

-- ---------- Income attachments ----------
create table if not exists public.income_attachments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  income_id   uuid not null,
  file_path   text not null,
  file_name   text,
  file_type   text,
  file_size   bigint check (file_size is null or file_size >= 0),
  created_at  timestamptz not null default now(),
  constraint income_attachments_path_owner check (file_path like user_id::text || '/%'),
  constraint income_attachments_parent_fk
    foreign key (income_id, user_id)
    references public.income (id, user_id)
    on delete cascade
);

-- ---------- Expenses ----------
create table if not exists public.expenses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  account_id     uuid,
  amount_minor   bigint not null check (amount_minor >= 0),
  currency       text not null default 'USD' references public.currencies(code),
  category       text,
  merchant       text,
  payment_method text,
  expense_date   date,
  note           text,
  created_at     timestamptz not null default now(),
  constraint expenses_id_user_unique unique (id, user_id),
  constraint expenses_account_owner_currency_fk
    foreign key (account_id, user_id, currency)
    references public.accounts (id, user_id, currency)
);

-- ---------- Expense attachments ----------
create table if not exists public.expense_attachments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  expense_id  uuid not null,
  file_path   text not null,
  file_name   text,
  file_type   text,
  file_size   bigint check (file_size is null or file_size >= 0),
  created_at  timestamptz not null default now(),
  constraint expense_attachments_path_owner check (file_path like user_id::text || '/%'),
  constraint expense_attachments_parent_fk
    foreign key (expense_id, user_id)
    references public.expenses (id, user_id)
    on delete cascade
);

-- ---------- Savings ----------
create table if not exists public.savings_goals (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  name                 text not null,
  target_amount_minor  bigint not null default 0 check (target_amount_minor >= 0),
  current_amount_minor bigint not null default 0 check (current_amount_minor >= 0),
  currency             text not null default 'USD' references public.currencies(code),
  target_date          date,
  category             text,
  status               text default 'En cours',
  note                 text,
  created_at           timestamptz not null default now(),
  constraint savings_goals_id_user_unique unique (id, user_id),
  constraint savings_goals_id_user_currency_unique unique (id, user_id, currency)
);

-- ---------- Savings contributions ----------
create table if not exists public.savings_contributions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  savings_goal_id   uuid not null,
  account_id        uuid,
  amount_minor      bigint not null check (amount_minor > 0),
  currency          text not null default 'USD' references public.currencies(code),
  contribution_date date,
  note              text,
  created_at        timestamptz not null default now(),
  constraint savings_contributions_goal_fk
    foreign key (savings_goal_id, user_id, currency)
    references public.savings_goals (id, user_id, currency)
    on delete cascade,
  constraint savings_contributions_account_fk
    foreign key (account_id, user_id, currency)
    references public.accounts (id, user_id, currency)
);

-- ---------- Purchase funds / purchase goals ----------
create table if not exists public.purchase_goals (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  item_name            text not null,
  description          text,
  target_amount_minor  bigint not null default 0 check (target_amount_minor >= 0),
  current_amount_minor bigint not null default 0 check (current_amount_minor >= 0),
  currency             text not null default 'USD' references public.currencies(code),
  target_date          date,
  priority             text,
  status               text default 'En cours',
  image_url            text,
  note                 text,
  created_at           timestamptz not null default now(),
  constraint purchase_goals_id_user_unique unique (id, user_id),
  constraint purchase_goals_id_user_currency_unique unique (id, user_id, currency)
);

-- ---------- Purchase contributions ----------
create table if not exists public.purchase_contributions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  purchase_goal_id  uuid not null,
  account_id        uuid,
  amount_minor      bigint not null check (amount_minor > 0),
  currency          text not null default 'USD' references public.currencies(code),
  contribution_date date,
  note              text,
  created_at        timestamptz not null default now(),
  constraint purchase_contributions_goal_fk
    foreign key (purchase_goal_id, user_id, currency)
    references public.purchase_goals (id, user_id, currency)
    on delete cascade,
  constraint purchase_contributions_account_fk
    foreign key (account_id, user_id, currency)
    references public.accounts (id, user_id, currency)
);

-- ---------- Debts ----------
create table if not exists public.debts (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  creditor_name          text,
  debt_name              text,
  total_amount_minor     bigint not null default 0 check (total_amount_minor >= 0),
  paid_amount_minor      bigint not null default 0 check (paid_amount_minor >= 0),
  remaining_amount_minor bigint generated always as (total_amount_minor - paid_amount_minor) stored,
  currency               text not null default 'USD' references public.currencies(code),
  start_date             date,
  next_payment_date      date,
  payment_frequency      text,
  status                 text default 'Ã€ jour',
  note                   text,
  created_at             timestamptz not null default now(),
  constraint debts_paid_lte_total check (paid_amount_minor <= total_amount_minor),
  constraint debts_id_user_unique unique (id, user_id),
  constraint debts_id_user_currency_unique unique (id, user_id, currency)
);

-- ---------- Debt payments ----------
create table if not exists public.debt_payments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  debt_id      uuid not null,
  account_id   uuid,
  amount_minor bigint not null check (amount_minor > 0),
  currency     text not null default 'USD' references public.currencies(code),
  payment_date date,
  note         text,
  created_at   timestamptz not null default now(),
  constraint debt_payments_id_user_unique unique (id, user_id),
  constraint debt_payments_debt_fk
    foreign key (debt_id, user_id, currency)
    references public.debts (id, user_id, currency)
    on delete cascade,
  constraint debt_payments_account_fk
    foreign key (account_id, user_id, currency)
    references public.accounts (id, user_id, currency)
);

-- ---------- Debt attachments ----------
create table if not exists public.debt_attachments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  debt_id    uuid not null,
  file_path  text not null,
  file_name  text,
  file_type  text,
  file_size  bigint check (file_size is null or file_size >= 0),
  created_at timestamptz not null default now(),
  constraint debt_attachments_path_owner check (file_path like user_id::text || '/%'),
  constraint debt_attachments_parent_fk
    foreign key (debt_id, user_id)
    references public.debts (id, user_id)
    on delete cascade
);

-- ---------- Debt payment attachments ----------
create table if not exists public.debt_payment_attachments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  debt_payment_id uuid not null,
  file_path       text not null,
  file_name       text,
  file_type       text,
  file_size       bigint check (file_size is null or file_size >= 0),
  created_at      timestamptz not null default now(),
  constraint debt_payment_attachments_path_owner check (file_path like user_id::text || '/%'),
  constraint debt_payment_attachments_parent_fk
    foreign key (debt_payment_id, user_id)
    references public.debt_payments (id, user_id)
    on delete cascade
);

-- ---------- Money lent ----------
create table if not exists public.loans_given (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  borrower_name           text,
  amount_lent_minor       bigint not null default 0 check (amount_lent_minor >= 0),
  amount_repaid_minor     bigint not null default 0 check (amount_repaid_minor >= 0),
  remaining_amount_minor  bigint generated always as (amount_lent_minor - amount_repaid_minor) stored,
  currency                text not null default 'USD' references public.currencies(code),
  loan_date               date,
  expected_repayment_date date,
  repayment_frequency     text,
  status                  text default 'En attente',
  note                    text,
  created_at              timestamptz not null default now(),
  constraint loans_repaid_lte_lent check (amount_repaid_minor <= amount_lent_minor),
  constraint loans_given_id_user_unique unique (id, user_id),
  constraint loans_given_id_user_currency_unique unique (id, user_id, currency)
);

-- ---------- Repayments received ----------
create table if not exists public.loan_repayments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  loan_id        uuid not null,
  account_id     uuid,
  amount_minor   bigint not null check (amount_minor > 0),
  currency       text not null default 'USD' references public.currencies(code),
  repayment_date date,
  note           text,
  created_at     timestamptz not null default now(),
  constraint loan_repayments_id_user_unique unique (id, user_id),
  constraint loan_repayments_loan_fk
    foreign key (loan_id, user_id, currency)
    references public.loans_given (id, user_id, currency)
    on delete cascade,
  constraint loan_repayments_account_fk
    foreign key (account_id, user_id, currency)
    references public.accounts (id, user_id, currency)
);

-- ---------- Loan attachments ----------
create table if not exists public.loan_attachments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  loan_id    uuid not null,
  file_path  text not null,
  file_name  text,
  file_type  text,
  file_size  bigint check (file_size is null or file_size >= 0),
  created_at timestamptz not null default now(),
  constraint loan_attachments_path_owner check (file_path like user_id::text || '/%'),
  constraint loan_attachments_parent_fk
    foreign key (loan_id, user_id)
    references public.loans_given (id, user_id)
    on delete cascade
);

-- ---------- Loan repayment attachments ----------
create table if not exists public.loan_repayment_attachments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  loan_repayment_id uuid not null,
  file_path         text not null,
  file_name         text,
  file_type         text,
  file_size         bigint check (file_size is null or file_size >= 0),
  created_at        timestamptz not null default now(),
  constraint loan_repayment_attachments_path_owner check (file_path like user_id::text || '/%'),
  constraint loan_repayment_attachments_parent_fk
    foreign key (loan_repayment_id, user_id)
    references public.loan_repayments (id, user_id)
    on delete cascade
);

-- =====================================================================
-- SECURITY: Row Level Security - each user sees only their own data
-- =====================================================================
-- Remove an old migration helper: not needed at runtime and flagged by the Advisor.
drop function if exists public.rls_auto_enable();

alter table public.users                       enable row level security;
alter table public.user_financial_plans        enable row level security;
alter table public.feature_events              enable row level security;
alter table public.feature_feedback            enable row level security;
alter table public.accounts                    enable row level security;
alter table public.income                      enable row level security;
alter table public.income_attachments          enable row level security;
alter table public.expenses                    enable row level security;
alter table public.expense_attachments         enable row level security;
alter table public.savings_goals               enable row level security;
alter table public.savings_contributions       enable row level security;
alter table public.purchase_goals              enable row level security;
alter table public.purchase_contributions      enable row level security;
alter table public.debts                       enable row level security;
alter table public.debt_payments               enable row level security;
alter table public.debt_attachments            enable row level security;
alter table public.debt_payment_attachments    enable row level security;
alter table public.loans_given                 enable row level security;
alter table public.loan_repayments             enable row level security;
alter table public.loan_attachments            enable row level security;
alter table public.loan_repayment_attachments  enable row level security;

-- The currencies table is read-only for authenticated users.
alter table public.currencies enable row level security;
drop policy if exists "currencies readable" on public.currencies;
create policy "currencies readable" on public.currencies
  for select to authenticated using (true);

drop policy if exists "users self" on public.users;
create policy "users self" on public.users
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Owner policy for all tables with user_id.
do $$
declare t text;
begin
  foreach t in array array[
    'user_financial_plans',
    'accounts','income','income_attachments','expenses','expense_attachments',
    'savings_goals','savings_contributions',
    'purchase_goals','purchase_contributions',
    'debts','debt_payments','debt_attachments','debt_payment_attachments',
    'loans_given','loan_repayments','loan_attachments','loan_repayment_attachments'
  ]
  loop
    execute format('drop policy if exists "owner all" on public.%I;', t);
    execute format(
      'create policy "owner all" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);',
      t
    );
  end loop;
end $$;

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

-- =====================================================================
-- INDEXES: RLS, keys, and reports
-- =====================================================================
create index if not exists idx_accounts_user on public.accounts(user_id);
create index if not exists idx_accounts_user_currency on public.accounts(user_id, currency);

create index if not exists idx_income_user on public.income(user_id);
create index if not exists idx_income_account on public.income(account_id);
create index if not exists idx_income_user_date on public.income(user_id, income_date desc);
create index if not exists idx_income_user_currency on public.income(user_id, currency);
create index if not exists idx_income_attachments_user on public.income_attachments(user_id);
create index if not exists idx_income_attachments_income on public.income_attachments(income_id);

create index if not exists idx_user_financial_plans_user on public.user_financial_plans(user_id);
create index if not exists idx_user_financial_plans_updated on public.user_financial_plans(user_id, updated_at desc);

create index if not exists idx_feature_events_user on public.feature_events(user_id);
create index if not exists idx_feature_events_user_created on public.feature_events(user_id, created_at desc);
create index if not exists idx_feature_events_user_feature_created on public.feature_events(user_id, feature_id, created_at desc);
create index if not exists idx_feature_events_feature_created on public.feature_events(feature_id, created_at desc);
create index if not exists idx_feature_feedback_user on public.feature_feedback(user_id);
create index if not exists idx_feature_feedback_user_feature_created on public.feature_feedback(user_id, feature_id, created_at desc);

create index if not exists idx_expenses_user on public.expenses(user_id);
create index if not exists idx_expenses_account on public.expenses(account_id);
create index if not exists idx_expenses_user_date on public.expenses(user_id, expense_date desc);
create index if not exists idx_expenses_user_currency on public.expenses(user_id, currency);
create index if not exists idx_expense_attachments_user on public.expense_attachments(user_id);
create index if not exists idx_expense_attachments_expense on public.expense_attachments(expense_id);

create index if not exists idx_savings_goals_user on public.savings_goals(user_id);
create index if not exists idx_savings_goals_user_date on public.savings_goals(user_id, target_date);
create index if not exists idx_savings_contributions_user on public.savings_contributions(user_id);
create index if not exists idx_savings_contributions_goal on public.savings_contributions(savings_goal_id);
create index if not exists idx_savings_contributions_account on public.savings_contributions(account_id);
create index if not exists idx_savings_contributions_user_date on public.savings_contributions(user_id, contribution_date desc);

create index if not exists idx_purchase_goals_user on public.purchase_goals(user_id);
create index if not exists idx_purchase_goals_user_date on public.purchase_goals(user_id, target_date);
create index if not exists idx_purchase_contributions_user on public.purchase_contributions(user_id);
create index if not exists idx_purchase_contributions_goal on public.purchase_contributions(purchase_goal_id);
create index if not exists idx_purchase_contributions_account on public.purchase_contributions(account_id);
create index if not exists idx_purchase_contributions_user_date on public.purchase_contributions(user_id, contribution_date desc);

create index if not exists idx_debts_user on public.debts(user_id);
create index if not exists idx_debts_user_next_payment on public.debts(user_id, next_payment_date);
create index if not exists idx_debt_payments_user on public.debt_payments(user_id);
create index if not exists idx_debt_payments_debt on public.debt_payments(debt_id);
create index if not exists idx_debt_payments_account on public.debt_payments(account_id);
create index if not exists idx_debt_payments_user_date on public.debt_payments(user_id, payment_date desc);
create index if not exists idx_debt_attachments_user on public.debt_attachments(user_id);
create index if not exists idx_debt_attachments_debt on public.debt_attachments(debt_id);
create index if not exists idx_debt_payment_attachments_user on public.debt_payment_attachments(user_id);
create index if not exists idx_debt_payment_attachments_payment on public.debt_payment_attachments(debt_payment_id);

create index if not exists idx_loans_given_user on public.loans_given(user_id);
create index if not exists idx_loans_given_user_expected on public.loans_given(user_id, expected_repayment_date);
create index if not exists idx_loan_repayments_user on public.loan_repayments(user_id);
create index if not exists idx_loan_repayments_loan on public.loan_repayments(loan_id);
create index if not exists idx_loan_repayments_account on public.loan_repayments(account_id);
create index if not exists idx_loan_repayments_user_date on public.loan_repayments(user_id, repayment_date desc);
create index if not exists idx_loan_attachments_user on public.loan_attachments(user_id);
create index if not exists idx_loan_attachments_loan on public.loan_attachments(loan_id);
create index if not exists idx_loan_repayment_attachments_user on public.loan_repayment_attachments(user_id);
create index if not exists idx_loan_repayment_attachments_repayment on public.loan_repayment_attachments(loan_repayment_id);

-- =====================================================================
-- DATA API GRANTS: table access is granted only to signed-in users.
-- RLS remains the authorization boundary for individual rows.
-- =====================================================================
grant usage on schema public to authenticated;
grant select on public.currencies to authenticated;
grant select, insert, update, delete on
  public.users,
  public.user_financial_plans,
  public.accounts,
  public.income,
  public.income_attachments,
  public.expenses,
  public.expense_attachments,
  public.savings_goals,
  public.savings_contributions,
  public.purchase_goals,
  public.purchase_contributions,
  public.debts,
  public.debt_payments,
  public.debt_attachments,
  public.debt_payment_attachments,
  public.loans_given,
  public.loan_repayments,
  public.loan_attachments,
  public.loan_repayment_attachments
to authenticated;

grant select, insert, delete on
  public.feature_events,
  public.feature_feedback
to authenticated;

-- =====================================================================
-- STORAGE: private bucket for attachments (photos, screenshots, PDFs)
-- Object path inside the bucket: <user_id>/<unique_file_name>
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('justificatifs', 'justificatifs', false)
on conflict (id) do update set public = false;

drop policy if exists "justif read own" on storage.objects;
drop policy if exists "justif insert own" on storage.objects;
drop policy if exists "justif update own" on storage.objects;
drop policy if exists "justif delete own" on storage.objects;

create policy "justif read own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'justificatifs'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "justif insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'justificatifs'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "justif update own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'justificatifs'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'justificatifs'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "justif delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'justificatifs'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- =====================================================================
-- Automatically create the users row on sign-up
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end
$$;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- INTEGRITY REMINDERS
--   * Never write to remaining_amount_minor columns.
--     They are generated automatically.
--   * Never add amounts from different currencies together.
--     Always aggregate with GROUP BY currency.
--   * Parent-child references include user_id, and currency when the parent
--     carries an amount. A child row cannot point to another user's data or
--     another user's currency context.
-- =====================================================================
