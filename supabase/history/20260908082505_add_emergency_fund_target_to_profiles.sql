alter table public.profiles add column if not exists emergency_fund_target numeric not null default 70000;
