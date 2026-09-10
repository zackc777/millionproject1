alter table public.advisor_updates drop constraint if exists advisor_updates_status_check;
alter table public.advisor_updates add constraint advisor_updates_status_check check (status in ('active','archived'));
