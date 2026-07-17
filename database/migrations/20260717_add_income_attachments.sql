-- Add private receipt metadata for income records.
-- Run this migration before deploying frontend code that uploads income files.

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
end $$;

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

alter table public.income_attachments enable row level security;

drop policy if exists "owner all" on public.income_attachments;
create policy "owner all" on public.income_attachments
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists idx_income_attachments_user
  on public.income_attachments(user_id);

create index if not exists idx_income_attachments_income
  on public.income_attachments(income_id);

grant select, insert, update, delete
  on table public.income_attachments
  to authenticated;

