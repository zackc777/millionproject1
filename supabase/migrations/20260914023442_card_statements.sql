-- Additive bill-first ledger. Existing purchases/payments are not migrated or deleted.
create table public.credit_card_statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credit_card_id uuid not null references public.credit_cards(id) on delete restrict,
  cycle_end date not null,
  cycle_start date not null check(cycle_start<=cycle_end),
  due_date date not null check (due_date >= cycle_end),
  total numeric(14,2) not null check(total >= 0),
  carryover numeric(14,2) not null default 0 check(carryover >= 0 and carryover <= total),
  categories jsonb not null default '{}'::jsonb check(jsonb_typeof(categories)='object'),
  one_off boolean not null default false,
  note text not null default '',
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,credit_card_id,cycle_end)
);
create index credit_card_statements_card_idx on public.credit_card_statements(credit_card_id);
alter table public.credit_card_statements enable row level security;
revoke all on public.credit_card_statements from public,anon,authenticated;
grant select,insert,update,delete on public.credit_card_statements to authenticated;
create policy statement_owner_read on public.credit_card_statements for select to authenticated using ((select auth.uid())=user_id);
create policy statement_owner_insert on public.credit_card_statements for insert to authenticated with check ((select auth.uid())=user_id and exists(select 1 from public.credit_cards c where c.id=credit_card_id and c.user_id=(select auth.uid())));
create policy statement_owner_update on public.credit_card_statements for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id and exists(select 1 from public.credit_cards c where c.id=credit_card_id and c.user_id=(select auth.uid())));
create policy statement_owner_delete on public.credit_card_statements for delete to authenticated using ((select auth.uid())=user_id);

create function public.guard_card_statement() returns trigger language plpgsql security invoker set search_path='' as $$
declare item record; allocated numeric:=0;
begin
  if tg_op='DELETE' then
    if exists(select 1 from public.credit_card_payments p join public.credit_cards c on c.id=old.credit_card_id where p.user_id=old.user_id and p.cycle_end>=old.cycle_end and (p.credit_card_id=old.credit_card_id or (p.credit_card_id is null and p.issuer in(c.issuer,c.card_name))))
      or exists(select 1 from public.credit_card_statements s where s.user_id=old.user_id and s.credit_card_id=old.credit_card_id and s.cycle_end>old.cycle_end and s.carryover>0)
    then raise exception '此期或後續已有繳款／欠款銜接，請先處理關聯紀錄'; end if;
    return old;
  end if;
  if not exists(select 1 from public.credit_cards c where c.id=new.credit_card_id and c.user_id=new.user_id) then raise exception '卡片與帳單擁有者不一致'; end if;
  perform 1 from public.credit_cards c where c.id=new.credit_card_id for update;
  if exists(select 1 from public.credit_card_statements s where s.credit_card_id=new.credit_card_id and s.id<>new.id and s.cycle_start<=new.cycle_end and s.cycle_end>=new.cycle_start) then raise exception '帳單期間與既有帳單重疊，請核對起訖日期'; end if;
  if new.cycle_end>(now() at time zone 'Asia/Taipei')::date then raise exception '尚未結帳'; end if;
  if tg_op='UPDATE' then
    if (new.user_id,new.credit_card_id,new.cycle_start,new.cycle_end) is distinct from (old.user_id,old.credit_card_id,old.cycle_start,old.cycle_end) then raise exception '帳單擁有者、卡片與期別不可變更'; end if;
    new.revision:=old.revision+1;
  else new.revision:=1;
  end if;
  for item in select * from jsonb_each_text(new.categories) loop
    if item.key not in ('rent','family','telecom','gym','daily','leisure','other') or item.value is null or item.value !~ '^[0-9]+(\.[0-9]{1,2})?$' then raise exception '分類金額無效'; end if;
    allocated:=allocated+item.value::numeric;
  end loop;
  if allocated>new.total-new.carryover then raise exception '分類超過本期新增消費'; end if;
  new.updated_at:=clock_timestamp();
  return new;
end $$;
revoke all on function public.guard_card_statement() from public,anon,authenticated;
create trigger guard_card_statement before insert or update or delete on public.credit_card_statements for each row execute function public.guard_card_statement();
