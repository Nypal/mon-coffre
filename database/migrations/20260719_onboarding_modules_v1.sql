-- Mon Coffre production migration: mandatory onboarding, planning modules, income attachments.
-- Safe to run once on an existing project that already has the base Mon Coffre schema.

create extension if not exists pgcrypto with schema extensions;

-- Store the mandatory onboarding answers and feature-module settings as user-owned JSON.
create table if not exists public.user_financial_plans (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  onboarding_completed    boolean not null default false,
  onboarding_completed_at timestamptz,
  plan                    jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Income attachments need a composite parent reference to prevent cross-user metadata links.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'income_id_user_unique'
      and conrelid = 'public.income'::regclass
  ) then
    alter table public.income
      add constraint income_id_user_unique unique (id, user_id);
  end if;
end
$$;

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

alter table public.user_financial_plans enable row level security;
alter table public.income_attachments enable row level security;

drop policy if exists "owner all" on public.user_financial_plans;
create policy "owner all" on public.user_financial_plans
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "owner all" on public.income_attachments;
create policy "owner all" on public.income_attachments
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists idx_user_financial_plans_user
  on public.user_financial_plans(user_id);

create index if not exists idx_user_financial_plans_updated
  on public.user_financial_plans(user_id, updated_at desc);

create index if not exists idx_income_attachments_user
  on public.income_attachments(user_id);

create index if not exists idx_income_attachments_income
  on public.income_attachments(income_id);

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
