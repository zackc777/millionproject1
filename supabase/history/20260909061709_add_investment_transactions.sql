create table if not exists public.investment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id bigint null references public.investment_plans(id) on delete set null,
  finance_entry_id uuid null references public.finance_entries(id) on delete set null,
  trade_date date not null default current_date,
  symbol text not null,
  name text null,
  strategy text not null default '核心ETF',
  amount numeric not null check (amount > 0),
  quantity numeric not null check (quantity > 0),
  trade_price numeric not null check (trade_price > 0),
  fees numeric not null default 0 check (fees >= 0),
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists investment_transactions_finance_entry_uidx on public.investment_transactions(finance_entry_id) where finance_entry_id is not null;
create index if not exists investment_transactions_user_symbol_date_idx on public.investment_transactions(user_id,symbol,trade_date);
alter table public.investment_transactions enable row level security;
drop policy if exists investment_transactions_select_own on public.investment_transactions;
drop policy if exists investment_transactions_insert_own on public.investment_transactions;
drop policy if exists investment_transactions_update_own on public.investment_transactions;
drop policy if exists investment_transactions_delete_own on public.investment_transactions;
create policy investment_transactions_select_own on public.investment_transactions for select to authenticated using ((select auth.uid()) = user_id);
create policy investment_transactions_insert_own on public.investment_transactions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy investment_transactions_update_own on public.investment_transactions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy investment_transactions_delete_own on public.investment_transactions for delete to authenticated using ((select auth.uid()) = user_id);
