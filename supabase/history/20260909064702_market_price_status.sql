alter table if exists market_prices add column if not exists price_status text not null default 'official_close';
alter table if exists market_prices add column if not exists source_time text;
comment on column market_prices.price_status is 'official_close or provisional_close';
