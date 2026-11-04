-- Add sell transactions without rewriting existing buys or opening positions.
alter table public.investment_transactions drop constraint investment_transactions_side_check;
alter table public.investment_transactions add constraint investment_transactions_side_check check (side in ('buy','sell'));
alter table public.investment_transactions
  add column tax numeric not null default 0 check (tax >= 0 and tax < 1000000000000),
  add column settlement_date date,
  add column trade_sequence integer not null default 1 check (trade_sequence between 1 and 1000000),
  add column cost_basis numeric not null default 0,
  add column realized_pnl numeric;
alter table public.finance_entries drop constraint finance_entries_entry_type_check;
alter table public.finance_entries add constraint finance_entries_entry_type_check check (entry_type in ('income','expense','saving','investment','investment_sale'));
create index if not exists investment_transactions_replay_idx on public.investment_transactions(user_id,symbol,trade_date,trade_sequence,created_at,id);

-- Replay each symbol in execution order. Opening positions survive a complete sale,
-- allowing edits/deletes to restore the correct inventory and cost.
create or replace function public.rebuild_investment_holding(p_symbol text)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  v_user uuid:=auth.uid(); v_symbol text:=upper(trim(p_symbol));
  h public.portfolio%rowtype; r record;
  v_qty numeric:=0; v_cost numeric:=0; v_basis numeric; v_count integer;
  v_name text; v_type text; v_price numeric; v_price_date date; v_mode text;
begin
  if v_user is null then raise exception '請先登入'; end if;
  perform pg_advisory_xact_lock(hashtextextended('investment:'||v_user::text,0));
  select * into h from public.portfolio where user_id=v_user and upper(symbol)=v_symbol for update;
  v_name:=h.name; v_type:=h.asset_type;
  select count(*) into v_count from public.investment_transactions where user_id=v_user and upper(symbol)=v_symbol;
  for r in
    select trade_date as d,1 as kind,trade_sequence as seq,created_at as ct,id,side,quantity,amount,name,strategy
      from public.investment_transactions where user_id=v_user and upper(symbol)=v_symbol
    union all
    select coalesce(h.opening_date,date '0001-01-01'),0,0,null::timestamptz,null::uuid,'opening',h.opening_quantity,h.opening_quantity*h.opening_avg_cost,h.name,h.asset_type
      where coalesce(h.opening_quantity,0)>0
    order by d,kind,seq,ct,id
  loop
    if r.side in ('buy','opening') then
      v_qty:=v_qty+r.quantity; v_cost:=v_cost+r.amount;
      if r.side='buy' then
        update public.investment_transactions set cost_basis=r.amount,realized_pnl=null where id=r.id and user_id=v_user;
      end if;
    else
      if r.quantity>v_qty then raise exception '% 在 % 可賣數量只有 %，無法賣出 %；請核對日期、同日順序或先補買入／期初持倉',v_symbol,r.d,v_qty,r.quantity; end if;
      v_basis:=case when r.quantity=v_qty then v_cost else round(v_cost*r.quantity/v_qty,8) end;
      v_qty:=v_qty-r.quantity; v_cost:=case when v_qty=0 then 0 else v_cost-v_basis end;
      update public.investment_transactions set cost_basis=v_basis,realized_pnl=round(amount-v_basis,2) where id=r.id and user_id=v_user;
    end if;
    v_name:=coalesce(nullif(r.name,''),v_name); v_type:=coalesce(nullif(r.strategy,''),v_type);
  end loop;
  if v_count=0 and coalesce(h.opening_quantity,0)=0 then
    delete from public.portfolio where id=h.id and user_id=v_user; return;
  end if;
  v_mode:=case when coalesce(h.opening_quantity,0)>0 and v_count>0 then 'mixed' when coalesce(h.opening_quantity,0)>0 then 'opening' else 'transactions' end;
  select close_price,price_date into v_price,v_price_date from public.market_prices where upper(symbol)=v_symbol order by price_date desc limit 1;
  v_price:=coalesce(nullif(v_price,0),h.current_price,0); v_price_date:=coalesce(v_price_date,h.as_of_date);
  if h.id is null then
    insert into public.portfolio(user_id,symbol,name,asset_type,quantity,avg_cost,current_price,current_value,as_of_date,opening_quantity,opening_avg_cost,source_mode,notes)
    values(v_user,v_symbol,coalesce(v_name,v_symbol),coalesce(v_type,'ETF'),v_qty,case when v_qty>0 then v_cost/v_qty else 0 end,v_price,v_qty*v_price,v_price_date,0,0,v_mode,'由投資交易自動重建');
  else
    update public.portfolio set quantity=v_qty,avg_cost=case when v_qty>0 then v_cost/v_qty else 0 end,
      name=coalesce(v_name,name),current_price=v_price,current_value=v_qty*v_price,as_of_date=v_price_date,source_mode=v_mode,updated_at=now()
      where id=h.id and user_id=v_user;
  end if;
end $$;

-- An un-settled sell has no cash ledger entry. Its net proceeds remain a receivable.
create or replace function public.save_investment_trade_v2(
  p_id uuid,p_finance_entry_id uuid,p_trade_date date,p_symbol text,p_name text,p_strategy text,
  p_amount numeric,p_quantity numeric,p_trade_price numeric,p_notes text,p_plan_id bigint,
  p_side text,p_fees numeric,p_tax numeric,p_settlement_date date,p_trade_sequence integer,p_expected_updated_at timestamptz,p_request_id uuid default null
) returns table(transaction_id uuid,finance_entry_id uuid)
language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  v_user uuid:=auth.uid(); v_id uuid:=coalesce(p_id,p_request_id,gen_random_uuid()); v_fe uuid;
  v_symbol text:=upper(trim(p_symbol)); v_note text; v_type text; v_date date;
  old public.investment_transactions%rowtype; fe public.finance_entries%rowtype;
  v_today date:=(now() at time zone 'Asia/Taipei')::date;
begin
  if v_user is null then raise exception '請先登入'; end if;
  perform pg_advisory_xact_lock(hashtextextended('investment:'||v_user::text,0));
  if v_symbol is null or v_symbol !~ '^[A-Z0-9][A-Z0-9._-]{0,29}$' or p_side is null or p_side not in ('buy','sell') then raise exception '請填有效標的與買賣方向'; end if;
  if p_trade_date is null or p_trade_date>v_today or p_trade_date<date '1901-01-01' then raise exception '請填有效成交日期，不可為未來'; end if;
  if p_amount is null or not(p_amount>0 and p_amount<1000000000000) or p_quantity is null or not(p_quantity>0 and p_quantity<1000000000) or p_trade_price is null or not(p_trade_price>0 and p_trade_price<1000000000) then raise exception '金額、數量與成交價必須為有效正數'; end if;
  if p_quantity<>round(p_quantity,6) or p_amount<>round(p_amount,2) then raise exception '數量最多六位小數，金額最多兩位小數'; end if;
  if p_fees is null or not(p_fees>=0 and p_fees<1000000000000) or p_tax is null or not(p_tax>=0 and p_tax<1000000000000) or p_trade_sequence is null or p_trade_sequence not between 1 and 1000000 then raise exception '請核對費用、稅額與同日成交順序'; end if;
  if p_side='sell' and (abs(p_amount-(p_quantity*p_trade_price-p_fees-p_tax))>1 or p_amount>p_quantity*p_trade_price+1) then raise exception '賣出淨額需等於成交總額減手續費與稅（允許 1 元取整差）'; end if;
  if p_side='buy' and p_tax<>0 then raise exception '買入不收賣出交易稅'; end if;
  if p_side='sell' and p_settlement_date is not null and (p_settlement_date<p_trade_date or p_settlement_date>v_today) then raise exception '未入帳請留白；實際入帳日需介於成交日與今天之間'; end if;
  if p_plan_id is not null and (p_side<>'buy' or not exists(select 1 from public.investment_plans where id=p_plan_id and user_id=v_user)) then raise exception '投資計畫不屬於此帳號或不適用賣出'; end if;
  if p_id is null and p_request_id is not null then
    select * into old from public.investment_transactions where id=p_request_id and user_id=v_user;
    if found then
      if old.side=p_side and old.trade_date=p_trade_date and old.symbol=v_symbol and old.amount=p_amount and old.quantity=p_quantity and old.trade_price=p_trade_price and old.fees=p_fees and old.tax=p_tax and old.trade_sequence=p_trade_sequence and old.settlement_date is not distinct from (case when p_side='sell' then p_settlement_date else p_trade_date end) then
        return query select old.id,old.finance_entry_id; return;
      end if;
      raise exception '這個表單已儲存另一筆內容，請重新開啟';
    end if;
  end if;
  if p_id is not null then
    select * into old from public.investment_transactions where id=p_id and user_id=v_user for update;
    if not found then raise exception '交易已不存在，請重新載入'; end if;
    if old.side<>p_side then raise exception '已儲存交易不可切換買賣方向，請刪除後重建'; end if;
    if p_expected_updated_at is not null and old.updated_at<>p_expected_updated_at then raise exception '交易已在其他視窗變更，請重新開啟'; end if;
    v_fe:=old.finance_entry_id;
  elsif p_finance_entry_id is not null then
    if p_side<>'buy' then raise exception '舊金流只能轉為買入'; end if;
    select * into fe from public.finance_entries where id=p_finance_entry_id and user_id=v_user and entry_type='investment' for update;
    if not found or exists(select 1 from public.investment_transactions t where t.finance_entry_id=p_finance_entry_id) then raise exception '舊金流不存在或已連結交易'; end if;
    v_fe:=p_finance_entry_id;
  end if;
  v_note:=format('[INVESTMENT_TX:%s][SYMBOL:%s][QTY:%s][PRICE:%s] %s',v_id,v_symbol,p_quantity,p_trade_price,coalesce(p_notes,''));
  v_type:=case when p_side='sell' then 'investment_sale' else 'investment' end;
  v_date:=case when p_side='sell' then p_settlement_date else p_trade_date end;
  if v_date is not null then
    if v_fe is null then
      insert into public.finance_entries(user_id,entry_date,month,entry_type,category,amount,payment_method,note)
      values(v_user,v_date,date_trunc('month',v_date)::date,v_type,v_symbol||'／'||coalesce(nullif(p_strategy,''),'核心ETF'),p_amount,'證券交割',v_note) returning id into v_fe;
    else
      update public.finance_entries set entry_date=v_date,month=date_trunc('month',v_date)::date,entry_type=v_type,category=v_symbol||'／'||coalesce(nullif(p_strategy,''),'核心ETF'),amount=p_amount,payment_method='證券交割',note=v_note,updated_at=now()
      where id=v_fe and user_id=v_user;
      if not found then raise exception '關聯金流不存在，請重新載入'; end if;
    end if;
  else
    if v_fe is not null then delete from public.finance_entries where id=v_fe and user_id=v_user; end if;
    v_fe:=null;
  end if;
  if p_id is null then
    insert into public.investment_transactions(id,user_id,plan_id,finance_entry_id,trade_date,symbol,name,strategy,amount,quantity,trade_price,fees,tax,notes,side,settlement_date,trade_sequence)
    values(v_id,v_user,p_plan_id,v_fe,p_trade_date,v_symbol,p_name,coalesce(nullif(p_strategy,''),'核心ETF'),p_amount,p_quantity,p_trade_price,p_fees,p_tax,p_notes,p_side,case when p_side='sell' then p_settlement_date else p_trade_date end,p_trade_sequence);
  else
    update public.investment_transactions set plan_id=p_plan_id,finance_entry_id=v_fe,trade_date=p_trade_date,symbol=v_symbol,name=p_name,strategy=coalesce(nullif(p_strategy,''),'核心ETF'),amount=p_amount,quantity=p_quantity,trade_price=p_trade_price,fees=p_fees,tax=p_tax,notes=p_notes,settlement_date=case when p_side='sell' then p_settlement_date else p_trade_date end,trade_sequence=p_trade_sequence,updated_at=now() where id=p_id and user_id=v_user;
  end if;
  if old.symbol is not null and upper(old.symbol)<>v_symbol then perform public.rebuild_investment_holding(old.symbol); end if;
  perform public.rebuild_investment_holding(v_symbol);
  return query select v_id,v_fe;
end $$;

-- Keep the existing buy API available to already-open pages and plan shortcuts.
create or replace function public.save_investment_trade(p_id uuid,p_finance_entry_id uuid,p_trade_date date,p_symbol text,p_name text,p_strategy text,p_amount numeric,p_quantity numeric,p_trade_price numeric,p_notes text,p_plan_id bigint default null)
returns table(transaction_id uuid,finance_entry_id uuid) language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_seq integer;
begin
  if auth.uid() is null then raise exception '請先登入'; end if;
  perform pg_advisory_xact_lock(hashtextextended('investment:'||auth.uid()::text,0));
  select trade_sequence into v_seq from public.investment_transactions where id=p_id and user_id=auth.uid();
  if v_seq is null then select coalesce(max(trade_sequence),0)+1 into v_seq from public.investment_transactions where user_id=auth.uid() and upper(symbol)=upper(trim(p_symbol)) and trade_date=p_trade_date; end if;
  return query select * from public.save_investment_trade_v2(p_id,p_finance_entry_id,p_trade_date,p_symbol,p_name,p_strategy,p_amount,p_quantity,p_trade_price,p_notes,p_plan_id,'buy',greatest(0,p_amount-p_quantity*p_trade_price),0,p_trade_date,v_seq,null);
end $$;

create or replace function public.delete_investment_trade(p_id uuid,p_finance_entry_id uuid default null)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); x public.investment_transactions%rowtype;
begin
  if v_user is null then raise exception '請先登入'; end if;
  perform pg_advisory_xact_lock(hashtextextended('investment:'||v_user::text,0));
  select * into x from public.investment_transactions where user_id=v_user and ((p_id is not null and id=p_id) or (p_id is null and finance_entry_id=p_finance_entry_id)) for update;
  if found then
    delete from public.investment_transactions where id=x.id and user_id=v_user;
    delete from public.finance_entries where id=x.finance_entry_id and user_id=v_user;
    perform public.rebuild_investment_holding(x.symbol);
  elsif p_id is not null then raise exception '交易已不存在';
  else
    delete from public.finance_entries where id=p_finance_entry_id and user_id=v_user and entry_type='investment';
  end if;
end $$;

create or replace function public.save_opening_holding(p_id bigint,p_symbol text,p_name text,p_asset_type text,p_quantity numeric,p_avg_cost numeric,p_opening_date date,p_notes text)
returns bigint language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_id bigint; v_symbol text:=upper(trim(p_symbol));
begin
  if v_user is null then raise exception '請先登入'; end if;
  perform pg_advisory_xact_lock(hashtextextended('investment:'||v_user::text,0));
  if v_symbol is null or v_symbol !~ '^[A-Z0-9][A-Z0-9._-]{0,29}$' or p_quantity is null or not(p_quantity>0 and p_quantity<1000000000) or p_quantity<>round(p_quantity,6) or p_avg_cost is null or not(p_avg_cost>=0 and p_avg_cost<1000000000) or p_opening_date is null or p_opening_date>(now() at time zone 'Asia/Taipei')::date then raise exception '請核對期初持倉數量、成本與日期'; end if;
  if p_id is not null then
    select id,symbol into v_id,v_symbol from public.portfolio where id=p_id and user_id=v_user for update;
    if not found then raise exception '持倉不存在'; end if;
  else
    select id into v_id from public.portfolio where user_id=v_user and upper(symbol)=v_symbol for update;
  end if;
  if v_id is null then
    insert into public.portfolio(user_id,symbol,name,asset_type,quantity,avg_cost,current_price,current_value,opening_quantity,opening_avg_cost,opening_date,source_mode,notes)
    values(v_user,v_symbol,p_name,p_asset_type,p_quantity,p_avg_cost,0,0,p_quantity,p_avg_cost,p_opening_date,'opening',p_notes) returning id into v_id;
  else
    update public.portfolio set name=p_name,asset_type=p_asset_type,opening_quantity=p_quantity,opening_avg_cost=p_avg_cost,opening_date=p_opening_date,notes=p_notes,updated_at=now() where id=v_id and user_id=v_user;
  end if;
  perform public.rebuild_investment_holding(v_symbol); return v_id;
end $$;
create or replace function public.delete_opening_holding(p_id bigint)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_symbol text;
begin
  if v_user is null then raise exception '請先登入'; end if;
  perform pg_advisory_xact_lock(hashtextextended('investment:'||v_user::text,0));
  select symbol into v_symbol from public.portfolio where id=p_id and user_id=v_user for update;
  if not found then raise exception '持倉不存在'; end if;
  update public.portfolio set opening_quantity=0,opening_avg_cost=0,opening_date=null,updated_at=now() where id=p_id and user_id=v_user;
  perform public.rebuild_investment_holding(v_symbol);
end $$;

create or replace function public.delete_investment_trade_v2(p_id uuid,p_expected_updated_at timestamptz)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_updated timestamptz;
begin
  if auth.uid() is null then raise exception '請先登入'; end if;
  perform pg_advisory_xact_lock(hashtextextended('investment:'||auth.uid()::text,0));
  select updated_at into v_updated from public.investment_transactions where id=p_id and user_id=auth.uid() for update;
  if not found then raise exception '交易已不存在'; end if;
  if p_expected_updated_at is null or p_expected_updated_at<>v_updated then raise exception '交易已變更，請重新載入後再刪除'; end if;
  perform public.delete_investment_trade(p_id,null);
end $$;
revoke execute on function public.delete_investment_trade_v2(uuid,timestamptz) from public,anon;
grant execute on function public.delete_investment_trade_v2(uuid,timestamptz) to authenticated;

revoke execute on function public.save_investment_trade_v2(uuid,uuid,date,text,text,text,numeric,numeric,numeric,text,bigint,text,numeric,numeric,date,integer,timestamptz,uuid) from public,anon;
grant execute on function public.save_investment_trade_v2(uuid,uuid,date,text,text,text,numeric,numeric,numeric,text,bigint,text,numeric,numeric,date,integer,timestamptz,uuid) to authenticated;
revoke execute on function public.rebuild_investment_holding(text),public.save_investment_trade(uuid,uuid,date,text,text,text,numeric,numeric,numeric,text,bigint),public.delete_investment_trade(uuid,uuid),public.save_opening_holding(bigint,text,text,text,numeric,numeric,date,text),public.delete_opening_holding(bigint) from public,anon;
grant execute on function public.rebuild_investment_holding(text),public.save_investment_trade(uuid,uuid,date,text,text,text,numeric,numeric,numeric,text,bigint),public.delete_investment_trade(uuid,uuid),public.save_opening_holding(bigint,text,text,text,numeric,numeric,date,text),public.delete_opening_holding(bigint) to authenticated;
notify pgrst,'reload schema';
