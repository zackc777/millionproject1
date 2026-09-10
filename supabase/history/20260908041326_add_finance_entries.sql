create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  month date not null,
  entry_type text not null check (entry_type in ('income','expense','saving','investment')),
  category text not null,
  subcategory text,
  amount numeric not null default 0 check (amount >= 0),
  payment_method text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists finance_entries_user_month_idx on public.finance_entries(user_id, month desc, entry_date desc);
alter table public.finance_entries enable row level security;
drop policy if exists finance_entries_select_own on public.finance_entries;
drop policy if exists finance_entries_insert_own on public.finance_entries;
drop policy if exists finance_entries_update_own on public.finance_entries;
drop policy if exists finance_entries_delete_own on public.finance_entries;
create policy finance_entries_select_own on public.finance_entries for select using (auth.uid() = user_id);
create policy finance_entries_insert_own on public.finance_entries for insert with check (auth.uid() = user_id);
create policy finance_entries_update_own on public.finance_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy finance_entries_delete_own on public.finance_entries for delete using (auth.uid() = user_id);
