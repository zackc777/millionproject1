create index if not exists advisor_updates_title_idx on public.advisor_updates using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(summary,'')));
