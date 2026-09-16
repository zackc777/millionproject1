-- Additive only: no existing finance rows or balances are overwritten.
create table public.cash_reconciliations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  balance_date date not null,
  bank_total numeric(16,2) not null check(bank_total >= 0 and bank_total < 1e12),
  wallet_total numeric(16,2) not null check(wallet_total >= 0 and wallet_total < 1e12),
  emergency numeric(16,2) not null default 0 check(emergency >= 0 and emergency < 1e12),
  other_saving numeric(16,2) not null default 0 check(other_saving >= 0 and other_saving < 1e12),
  expected_cash numeric(16,2) not null check(abs(expected_cash)<1e14),
  note text not null default '' check(length(note)<=1000),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,balance_date),
  check(emergency+other_saving <= bank_total+wallet_total)
);
alter table public.cash_reconciliations enable row level security;
revoke all on public.cash_reconciliations from anon, authenticated;
grant select,insert,update,delete on public.cash_reconciliations to authenticated;
create policy cash_owner_select on public.cash_reconciliations for select to authenticated using ((select auth.uid())=user_id);
create policy cash_owner_insert on public.cash_reconciliations for insert to authenticated with check ((select auth.uid())=user_id);
create policy cash_owner_update on public.cash_reconciliations for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy cash_owner_delete on public.cash_reconciliations for delete to authenticated using ((select auth.uid())=user_id);
create function public.guard_cash_reconciliation() returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if new.balance_date >= (now() at time zone 'Asia/Taipei')::date then
    raise exception '請填昨天或更早日期的日終餘額，避免漏算今天後續金流';
  end if;
  if tg_op='UPDATE' then
    if new.user_id<>old.user_id or new.balance_date<>old.balance_date then
      raise exception '對帳日期不能直接修改，請刪除後重新建立';
    end if;
    new.revision=old.revision+1;
    new.created_at=old.created_at;
  else
    new.revision=1;
  end if;
  new.updated_at=now();
  return new;
end $$;
revoke all on function public.guard_cash_reconciliation() from public;
create trigger cash_reconciliation_guard before insert or update on public.cash_reconciliations for each row execute function public.guard_cash_reconciliation();
