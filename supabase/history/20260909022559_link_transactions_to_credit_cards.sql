alter table public.finance_entries add column if not exists credit_card_id uuid references public.credit_cards(id) on delete set null;
alter table public.credit_card_payments add column if not exists credit_card_id uuid references public.credit_cards(id) on delete set null;
create index if not exists finance_entries_credit_card_id_idx on public.finance_entries(credit_card_id);
create index if not exists credit_card_payments_credit_card_id_idx on public.credit_card_payments(credit_card_id);
with unique_cards as (
  select user_id, issuer, min(id::text)::uuid as card_id
  from public.credit_cards
  group by user_id, issuer
  having count(*)=1
)
update public.finance_entries f
set credit_card_id=u.card_id
from unique_cards u
where f.credit_card_id is null and f.user_id=u.user_id and f.payment_method=u.issuer;
with unique_cards as (
  select user_id, issuer, min(id::text)::uuid as card_id
  from public.credit_cards
  group by user_id, issuer
  having count(*)=1
)
update public.credit_card_payments p
set credit_card_id=u.card_id
from unique_cards u
where p.credit_card_id is null and p.user_id=u.user_id and p.issuer=u.issuer;
