create table if not exists public.credit_card_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  issuer text not null,
  cycle_end date not null,
  payment_date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.credit_card_payments enable row level security;

create policy "credit_card_payments_select_own"
on public.credit_card_payments for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "credit_card_payments_insert_own"
on public.credit_card_payments for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "credit_card_payments_update_own"
on public.credit_card_payments for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "credit_card_payments_delete_own"
on public.credit_card_payments for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists credit_card_payments_user_cycle_idx
on public.credit_card_payments(user_id, issuer, cycle_end, payment_date);
