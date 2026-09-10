create index if not exists advisor_updates_source_idx on public.advisor_updates(user_id, source, created_at desc);
