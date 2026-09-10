create table if not exists public.market_prices (
  symbol text primary key,
  market text not null default 'TWSE',
  name text,
  close_price numeric,
  price_date date,
  source text not null default 'TWSE',
  source_url text,
  updated_at timestamptz not null default now()
);

alter table public.market_prices enable row level security;

drop policy if exists market_prices_read_authenticated on public.market_prices;
create policy market_prices_read_authenticated
on public.market_prices for select
to authenticated
using (true);

create index if not exists market_prices_price_date_idx on public.market_prices(price_date desc);

