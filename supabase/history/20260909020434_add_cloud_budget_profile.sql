alter table public.profiles add column if not exists budget_profile jsonb not null default '{}'::jsonb;
