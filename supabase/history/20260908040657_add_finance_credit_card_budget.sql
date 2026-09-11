create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  issuer text not null,
  card_name text,
  credit_limit numeric(12,2) default 0,
  statement_day integer,
  due_day integer,
  monthly_spend_cap numeric(12,2) default 0,
  current_spend numeric(12,2) default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, issuer, card_name)
);
alter table public.credit_cards enable row level security;
drop policy if exists "credit_cards_select_own" on public.credit_cards;
drop policy if exists "credit_cards_insert_own" on public.credit_cards;
drop policy if exists "credit_cards_update_own" on public.credit_cards;
drop policy if exists "credit_cards_delete_own" on public.credit_cards;
create policy "credit_cards_select_own" on public.credit_cards for select using (auth.uid() = user_id);
create policy "credit_cards_insert_own" on public.credit_cards for insert with check (auth.uid() = user_id);
create policy "credit_cards_update_own" on public.credit_cards for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "credit_cards_delete_own" on public.credit_cards for delete using (auth.uid() = user_id);

create table if not exists public.salary_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  income numeric(12,2) default 0,
  necessary_expense numeric(12,2) default 0,
  discretionary_expense numeric(12,2) default 0,
  emergency_fund numeric(12,2) default 0,
  core_investment numeric(12,2) default 0,
  opportunity_cash numeric(12,2) default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, month)
);
alter table public.salary_allocations enable row level security;
drop policy if exists "salary_allocations_select_own" on public.salary_allocations;
drop policy if exists "salary_allocations_insert_own" on public.salary_allocations;
drop policy if exists "salary_allocations_update_own" on public.salary_allocations;
drop policy if exists "salary_allocations_delete_own" on public.salary_allocations;
create policy "salary_allocations_select_own" on public.salary_allocations for select using (auth.uid() = user_id);
create policy "salary_allocations_insert_own" on public.salary_allocations for insert with check (auth.uid() = user_id);
create policy "salary_allocations_update_own" on public.salary_allocations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "salary_allocations_delete_own" on public.salary_allocations for delete using (auth.uid() = user_id);

