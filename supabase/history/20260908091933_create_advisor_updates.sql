create table if not exists public.advisor_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  effective_month date,
  category text not null default 'general',
  title text not null,
  summary text,
  facts jsonb not null default '[]'::jsonb,
  analysis jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  action_items jsonb not null default '[]'::jsonb,
  reference_urls jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  source text not null default 'chatgpt',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.advisor_updates enable row level security;

drop policy if exists "advisor_updates_select_own" on public.advisor_updates;
create policy "advisor_updates_select_own" on public.advisor_updates
for select using (auth.uid() = user_id);

drop policy if exists "advisor_updates_insert_own" on public.advisor_updates;
create policy "advisor_updates_insert_own" on public.advisor_updates
for insert with check (auth.uid() = user_id);

drop policy if exists "advisor_updates_update_own" on public.advisor_updates;
create policy "advisor_updates_update_own" on public.advisor_updates
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "advisor_updates_delete_own" on public.advisor_updates;
create policy "advisor_updates_delete_own" on public.advisor_updates
for delete using (auth.uid() = user_id);

create index if not exists advisor_updates_user_created_idx on public.advisor_updates(user_id, created_at desc);
create index if not exists advisor_updates_month_idx on public.advisor_updates(user_id, effective_month desc);

