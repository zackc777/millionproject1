create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

drop trigger if exists advisor_updates_set_updated_at on public.advisor_updates;
create trigger advisor_updates_set_updated_at before update on public.advisor_updates for each row execute function public.set_updated_at();
