-- Integration test: ephemeral identities/records inside a rolled-back transaction.
begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); ca uuid:=gen_random_uuid(); cb uuid:=gen_random_uuid();
begin
  insert into auth.users(id) values(a),(b);
  insert into public.credit_cards(id,user_id,issuer,card_name,statement_day,due_day,credit_limit) values
    (ca,a,'statement-test-A','test',17,2,20000),(cb,b,'statement-test-B','test',24,9,20000);
  perform set_config('test.owner',a::text,true);perform set_config('test.other',b::text,true);
  perform set_config('test.card',ca::text,true);perform set_config('test.other_card',cb::text,true);
  perform set_config('request.jwt.claim.sub',a::text,true);
end $$;
set local role authenticated;
do $$
declare sid uuid; n integer; failed boolean;
begin
  insert into public.credit_card_statements(user_id,credit_card_id,cycle_start,cycle_end,due_date,total,categories)
    values(current_setting('test.owner')::uuid,current_setting('test.card')::uuid,'2026-07-18','2026-08-17','2026-09-02',8500,'{"daily":2500}') returning id into sid;
  perform set_config('test.statement',sid::text,true);
  if (select count(*) from public.credit_card_statements where id=sid)<>1 then raise exception 'own SELECT failed'; end if;
  update public.credit_card_statements set total=8000 where id=sid and revision=1;
  if (select revision from public.credit_card_statements where id=sid)<>2 then raise exception 'revision failed'; end if;
  update public.credit_card_statements set total=9000 where id=sid and revision=1;
  get diagnostics n=row_count;if n<>0 then raise exception 'stale overwrite allowed'; end if;
  failed:=false;
  begin
    insert into public.credit_card_statements(user_id,credit_card_id,cycle_start,cycle_end,due_date,total) values(current_setting('test.owner')::uuid,current_setting('test.card')::uuid,'2026-07-18','2026-08-17','2026-09-02',8500);
  exception when others then failed:=true; end;
  if not failed then raise exception 'duplicate allowed'; end if;
  failed:=false;
  begin
    insert into public.credit_card_statements(user_id,credit_card_id,cycle_start,cycle_end,due_date,total) values(current_setting('test.owner')::uuid,current_setting('test.other_card')::uuid,'2026-07-25','2026-08-24','2026-09-09',500);
  exception when others then failed:=true; end;
  if not failed then raise exception 'cross-owner card allowed'; end if;
  failed:=false;begin update public.credit_card_statements set categories='{"daily":99999}' where id=sid;exception when others then failed:=true;end;
  if not failed then raise exception 'invalid category allowed'; end if;
  insert into public.credit_card_payments(user_id,credit_card_id,issuer,cycle_end,payment_date,amount) values(current_setting('test.owner')::uuid,current_setting('test.card')::uuid,'statement-test-A','2026-08-17','2026-09-02',1000);
  failed:=false;begin delete from public.credit_card_statements where id=sid;exception when others then failed:=true;end;
  if not failed then raise exception 'linked payment deletion allowed'; end if;
  perform set_config('request.jwt.claim.sub',current_setting('test.other'),true);
  if (select count(*) from public.credit_card_statements where id=sid)<>0 then raise exception 'cross-owner read allowed'; end if;
  update public.credit_card_statements set total=100 where id=sid;get diagnostics n=row_count;if n<>0 then raise exception 'cross-owner update allowed'; end if;
  delete from public.credit_card_statements where id=sid;get diagnostics n=row_count;if n<>0 then raise exception 'cross-owner delete allowed'; end if;
  perform set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
  delete from public.credit_card_payments where user_id=current_setting('test.owner')::uuid;
  delete from public.credit_card_statements where id=sid;get diagnostics n=row_count;if n<>1 then raise exception 'unlinked deletion failed'; end if;
end $$;
reset role;
select 'PASS: ownership, CRUD, duplicate/overlap guard, revision CAS, categories, linked payments; rolled back' as result;
rollback;
