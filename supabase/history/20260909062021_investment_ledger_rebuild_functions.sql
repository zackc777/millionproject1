alter table public.portfolio add column if not exists opening_quantity numeric not null default 0;
alter table public.portfolio add column if not exists opening_avg_cost numeric not null default 0;
alter table public.portfolio add column if not exists opening_date date;
alter table public.portfolio add column if not exists source_mode text not null default 'transactions';
do $$ begin
  alter table public.portfolio add constraint portfolio_source_mode_check check (source_mode in ('transactions','opening','mixed'));
exception when duplicate_object then null; end $$;
create unique index if not exists portfolio_user_symbol_uidx on public.portfolio(user_id,symbol);
alter table public.investment_transactions add column if not exists side text not null default 'buy';
do $$ begin
  alter table public.investment_transactions add constraint investment_transactions_side_check check (side in ('buy'));
exception when duplicate_object then null; end $$;

create or replace function public.rebuild_investment_holding(p_symbol text)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_symbol text := upper(trim(p_symbol));
  v_row public.portfolio%rowtype;
  v_open_qty numeric := 0;
  v_open_cost numeric := 0;
  v_tx_qty numeric := 0;
  v_tx_cost numeric := 0;
  v_total_qty numeric := 0;
  v_total_cost numeric := 0;
  v_name text;
  v_type text;
  v_price numeric := 0;
  v_price_date date;
  v_mode text := 'transactions';
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  select * into v_row from public.portfolio where user_id=v_user and upper(symbol)=v_symbol limit 1;
  if found then
    v_open_qty := coalesce(v_row.opening_quantity,0);
    v_open_cost := coalesce(v_row.opening_avg_cost,0);
    v_name := v_row.name;
    v_type := v_row.asset_type;
  end if;
  select coalesce(sum(quantity),0), coalesce(sum(amount),0),
         coalesce((array_agg(name order by trade_date desc, created_at desc))[1], v_name),
         coalesce((array_agg(strategy order by trade_date desc, created_at desc))[1], v_type)
    into v_tx_qty,v_tx_cost,v_name,v_type
  from public.investment_transactions
  where user_id=v_user and upper(symbol)=v_symbol and side='buy';
  v_total_qty := v_open_qty + v_tx_qty;
  v_total_cost := (v_open_qty * v_open_cost) + v_tx_cost;
  if v_open_qty>0 and v_tx_qty>0 then v_mode:='mixed';
  elsif v_open_qty>0 then v_mode:='opening'; else v_mode:='transactions'; end if;
  select close_price,price_date into v_price,v_price_date
  from public.market_prices where upper(symbol)=v_symbol order by price_date desc limit 1;
  if coalesce(v_price,0)<=0 and v_row.id is not null then v_price:=coalesce(v_row.current_price,0); v_price_date:=v_row.as_of_date; end if;
  if v_total_qty<=0 then
    if v_row.id is not null then delete from public.portfolio where id=v_row.id and user_id=v_user; end if;
    return;
  end if;
  if v_row.id is null then
    insert into public.portfolio(user_id,symbol,name,asset_type,quantity,avg_cost,current_price,current_value,as_of_date,opening_quantity,opening_avg_cost,opening_date,source_mode,notes,updated_at)
    values(v_user,v_symbol,coalesce(v_name,v_symbol),case when coalesce(v_type,'') ilike '%ETF%' then 'ETF' when coalesce(v_type,'') ilike '%個股%' then '上市個股' else coalesce(v_type,'其他') end,
      v_total_qty,case when v_total_qty>0 then v_total_cost/v_total_qty else 0 end,coalesce(v_price,0),v_total_qty*coalesce(v_price,0),v_price_date,
      v_open_qty,v_open_cost,null,v_mode,'由投資交易自動重建',now());
  else
    update public.portfolio set
      symbol=v_symbol,name=coalesce(v_name,name),asset_type=coalesce(v_type,asset_type),quantity=v_total_qty,
      avg_cost=case when v_total_qty>0 then v_total_cost/v_total_qty else 0 end,
      current_price=coalesce(nullif(v_price,0),current_price),
      current_value=v_total_qty*coalesce(nullif(v_price,0),current_price,0),
      as_of_date=coalesce(v_price_date,as_of_date),source_mode=v_mode,updated_at=now()
    where id=v_row.id and user_id=v_user;
  end if;
end $$;

create or replace function public.save_investment_trade(
  p_id uuid,
  p_finance_entry_id uuid,
  p_trade_date date,
  p_symbol text,
  p_name text,
  p_strategy text,
  p_amount numeric,
  p_quantity numeric,
  p_trade_price numeric,
  p_notes text,
  p_plan_id bigint default null
)
returns table(transaction_id uuid, finance_entry_id uuid)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_fe uuid := p_finance_entry_id;
  v_old_symbol text;
  v_symbol text := upper(trim(p_symbol));
  v_note text;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if v_symbol='' or p_amount<=0 or p_quantity<=0 or p_trade_price<=0 then raise exception 'invalid investment trade'; end if;
  v_note := format('[INVESTMENT_TX:%s][SYMBOL:%s][QTY:%s][PRICE:%s] %s',v_id,v_symbol,p_quantity,p_trade_price,coalesce(p_notes,''));
  if p_id is not null then
    select symbol,finance_entry_id into v_old_symbol,v_fe from public.investment_transactions where id=p_id and user_id=v_user;
    if not found then raise exception 'transaction not found'; end if;
  end if;
  if v_fe is not null then
    update public.finance_entries set entry_date=p_trade_date,month=date_trunc('month',p_trade_date)::date,entry_type='investment',
      category=v_symbol||'／'||coalesce(nullif(p_strategy,''),'核心ETF'),amount=p_amount,payment_method='證券交割',note=v_note,updated_at=now()
    where id=v_fe and user_id=v_user;
    if not found then raise exception 'finance entry not found'; end if;
  else
    insert into public.finance_entries(user_id,entry_date,month,entry_type,category,amount,payment_method,note,updated_at)
    values(v_user,p_trade_date,date_trunc('month',p_trade_date)::date,'investment',v_symbol||'／'||coalesce(nullif(p_strategy,''),'核心ETF'),p_amount,'證券交割',v_note,now())
    returning id into v_fe;
  end if;
  if p_id is null then
    insert into public.investment_transactions(id,user_id,plan_id,finance_entry_id,trade_date,symbol,name,strategy,amount,quantity,trade_price,notes,side,updated_at)
    values(v_id,v_user,p_plan_id,v_fe,p_trade_date,v_symbol,p_name,coalesce(nullif(p_strategy,''),'核心ETF'),p_amount,p_quantity,p_trade_price,p_notes,'buy',now());
  else
    update public.investment_transactions set plan_id=p_plan_id,finance_entry_id=v_fe,trade_date=p_trade_date,symbol=v_symbol,name=p_name,
      strategy=coalesce(nullif(p_strategy,''),'核心ETF'),amount=p_amount,quantity=p_quantity,trade_price=p_trade_price,notes=p_notes,updated_at=now()
    where id=p_id and user_id=v_user;
  end if;
  if v_old_symbol is not null and upper(v_old_symbol)<>v_symbol then perform public.rebuild_investment_holding(v_old_symbol); end if;
  perform public.rebuild_investment_holding(v_symbol);
  return query select v_id,v_fe;
end $$;

create or replace function public.delete_investment_trade(p_id uuid, p_finance_entry_id uuid default null)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_symbol text;
  v_fe uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_id is not null then
    select symbol,finance_entry_id into v_symbol,v_fe from public.investment_transactions where id=p_id and user_id=v_user;
    if found then delete from public.investment_transactions where id=p_id and user_id=v_user; end if;
  else
    v_fe := p_finance_entry_id;
  end if;
  if v_fe is not null then delete from public.finance_entries where id=v_fe and user_id=v_user and entry_type='investment'; end if;
  if v_symbol is not null then perform public.rebuild_investment_holding(v_symbol); end if;
end $$;

create or replace function public.save_opening_holding(
  p_id bigint,
  p_symbol text,
  p_name text,
  p_asset_type text,
  p_quantity numeric,
  p_avg_cost numeric,
  p_opening_date date,
  p_notes text
)
returns bigint
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_id bigint;
  v_symbol text := upper(trim(p_symbol));
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if v_symbol='' or p_quantity<=0 or p_avg_cost<0 then raise exception 'invalid opening holding'; end if;
  if p_id is not null then
    update public.portfolio set name=p_name,asset_type=p_asset_type,opening_quantity=p_quantity,opening_avg_cost=p_avg_cost,
      opening_date=p_opening_date,notes=p_notes,updated_at=now() where id=p_id and user_id=v_user returning id into v_id;
    if v_id is null then raise exception 'holding not found'; end if;
  else
    select id into v_id from public.portfolio where user_id=v_user and symbol=v_symbol limit 1;
    if v_id is null then
      insert into public.portfolio(user_id,symbol,name,asset_type,quantity,avg_cost,current_price,current_value,as_of_date,opening_quantity,opening_avg_cost,opening_date,source_mode,notes,updated_at)
      values(v_user,v_symbol,p_name,p_asset_type,p_quantity,p_avg_cost,0,0,p_opening_date,p_quantity,p_avg_cost,p_opening_date,'opening',p_notes,now()) returning id into v_id;
    else
      update public.portfolio set name=p_name,asset_type=p_asset_type,opening_quantity=p_quantity,opening_avg_cost=p_avg_cost,opening_date=p_opening_date,notes=p_notes,updated_at=now() where id=v_id;
    end if;
  end if;
  perform public.rebuild_investment_holding(v_symbol);
  return v_id;
end $$;

create or replace function public.delete_opening_holding(p_id bigint)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_symbol text;
begin
  select symbol into v_symbol from public.portfolio where id=p_id and user_id=v_user;
  if v_symbol is null then raise exception 'holding not found'; end if;
  update public.portfolio set opening_quantity=0,opening_avg_cost=0,opening_date=null,updated_at=now() where id=p_id and user_id=v_user;
  perform public.rebuild_investment_holding(v_symbol);
end $$;
