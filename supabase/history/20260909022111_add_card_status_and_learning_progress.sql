alter table public.credit_cards add column if not exists status text not null default 'active';
do $$ begin
  if not exists (select 1 from pg_constraint where conname='credit_cards_status_check') then
    alter table public.credit_cards add constraint credit_cards_status_check check (status in ('active','inactive'));
  end if;
end $$;
alter table public.profiles add column if not exists learning_progress jsonb not null default '{}'::jsonb;
