alter table public.advisor_updates alter column effective_month set default date_trunc('month', current_date)::date;
