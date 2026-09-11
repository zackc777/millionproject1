create index if not exists advisor_updates_category_idx on public.advisor_updates(user_id, category, created_at desc);
