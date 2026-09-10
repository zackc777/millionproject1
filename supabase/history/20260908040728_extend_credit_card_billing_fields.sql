alter table public.credit_cards add column if not exists statement_balance numeric(12,2) default 0;
alter table public.credit_cards add column if not exists due_date date;
alter table public.credit_cards add column if not exists paid_amount numeric(12,2) default 0;
alter table public.credit_cards add column if not exists payment_status text default '待繳';
