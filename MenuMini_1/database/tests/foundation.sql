-- This file is run only in the disposable cluster created by check-menu-db.py.
create function pg_temp.ok(condition boolean, label text) returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'FAIL: %',label; end if;
  raise notice 'PASS: %',label;
end $$;
create function pg_temp.reject(command text, expected_state text, label text) returns void language plpgsql as $$
begin
  begin
    execute command;
    set constraints all immediate;
    raise exception 'operation unexpectedly succeeded';
  exception when others then
    if sqlstate <> expected_state then raise exception 'FAIL: %; expected %, got %: %',label,expected_state,sqlstate,sqlerrm; end if;
  end;
  set constraints all deferred;
  raise notice 'PASS: %',label;
end $$;

begin;
insert into menumini.app_users(id,email,display_name) values
('00000000-0000-4000-8000-000000000011','owner-a@example.test','Owner A'),
('00000000-0000-4000-8000-000000000012','owner-b@example.test','Owner B');
insert into menumini.merchants(id,name,slug) values
('00000000-0000-4000-8000-000000000001','Merchant A','merchant-a'),
('00000000-0000-4000-8000-000000000002','Merchant B','merchant-b');
insert into menumini.merchant_memberships(merchant_id,user_id,role) values
('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','OWNER'),
('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000012','OWNER');
insert into menumini.venues(id,merchant_id,name,public_slug) values
('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001','Venue A','venue-a'),
('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000002','Venue B','venue-b');
insert into menumini.dining_tables(id,merchant_id,venue_id,label,qr_token_hash) values
('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','4',repeat('a',64)),
('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000102','4',repeat('b',64));
insert into menumini.dining_sessions(id,merchant_id,venue_id,table_id,capability_hash,expires_at) values
('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000201',repeat('c',64),now()+interval '1 day'),
('00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000202',repeat('d',64),now()+interval '1 day');
insert into menumini.menu_publications(id,merchant_id,venue_id,revision,snapshot,content_hash,published_by) values
('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101',1,'{"items":[]}',repeat('e',64),'00000000-0000-4000-8000-000000000011'),
('00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000102',1,'{"items":[]}',repeat('f',64),'00000000-0000-4000-8000-000000000012');
insert into menumini.venue_routes(slug,merchant_id,venue_id,publication_id) values
('venue-a','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000401'),
('venue-b','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000402');
insert into menumini.menu_sections(id,merchant_id,venue_id,name_en) values
('00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','Coffee'),
('00000000-0000-4000-8000-000000000502','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000102','Coffee');
insert into menumini.menu_items(id,merchant_id,venue_id,section_id,name_en,base_price) values
('00000000-0000-4000-8000-000000000601','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000501','Macchiato',70),
('00000000-0000-4000-8000-000000000602','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000502','Macchiato',70);
insert into menumini.payment_accounts(id,merchant_id,provider,account_identifier,holder_name,ownership_verified_at) values
('00000000-0000-4000-8000-000000000801','00000000-0000-4000-8000-000000000001','CBE','DEMO-ACCOUNT','Merchant A',now()),
('00000000-0000-4000-8000-000000000803','00000000-0000-4000-8000-000000000002','CBE','DEMO-ACCOUNT','Merchant B',now());
insert into menumini.venue_payment_accounts values
('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000801'),
('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000803');
commit;

create function pg_temp.make_order(target uuid, merchant uuid default '00000000-0000-4000-8000-000000000001', line_quantity integer default 2) returns uuid language plpgsql as $$
declare venue uuid; guest uuid; dining_table uuid; pub uuid; item uuid;
begin
  select id into venue from menumini.venues where merchant_id = merchant;
  select id,table_id into guest,dining_table from menumini.dining_sessions where merchant_id = merchant;
  select id into pub from menumini.menu_publications where merchant_id = merchant;
  select id into item from menumini.menu_items where merchant_id = merchant;
  insert into menumini.orders(id,merchant_id,venue_id,dining_session_id,table_id,publication_id,client_request_key,request_hash,table_label_snapshot,subtotal,total_amount)
    values(target,merchant,venue,guest,dining_table,pub,target,repeat('1',64),'4',140,140);
  insert into menumini.order_lines(merchant_id,venue_id,order_id,item_id,item_snapshot,quantity,unit_price)
    values(merchant,venue,target,item,'{"nameEn":"Macchiato"}',line_quantity,70);
  update menumini.orders set is_sealed = true where id = target;
  insert into menumini.order_events(merchant_id,venue_id,order_id,event_type,event_version)
    values(merchant,venue,target,'ORDER_SUBMITTED',1);
  insert into menumini.outbox_events(merchant_id,venue_id,aggregate_id,event_type,payload)
    values(merchant,venue,target,'ORDER_SUBMITTED','{"version":1}');
  return target;
end $$;
create function pg_temp.progress(target uuid, next_state text) returns void language plpgsql as $$
declare o menumini.orders%rowtype;
begin
  update menumini.orders set status = next_state where id = target returning * into o;
  insert into menumini.order_events(merchant_id,venue_id,order_id,event_type,event_version)
    values(o.merchant_id,o.venue_id,o.id,'ORDER_STATUS_CHANGED',o.version);
  insert into menumini.outbox_events(merchant_id,venue_id,aggregate_id,event_type,payload)
    values(o.merchant_id,o.venue_id,o.id,'ORDER_STATUS_CHANGED',jsonb_build_object('version',o.version));
end $$;
create function pg_temp.receipt(target uuid, value numeric, ledger_id uuid, account uuid default null, ref text default null, claim uuid default null, kind text default 'RECEIPT') returns void language plpgsql as $$
declare o menumini.orders%rowtype; actor uuid; event_name text;
begin
  select * into o from menumini.orders where id = target;
  select user_id into actor from menumini.merchant_memberships where merchant_id = o.merchant_id and role = 'OWNER';
  event_name := case when kind = 'RECEIPT' then 'PAYMENT_RECORDED' else 'REFUND_RECORDED' end;
  insert into menumini.payment_ledger(id,merchant_id,venue_id,order_id,claim_id,account_id,kind,method,provider_reference,verification_source,amount,client_request_key,request_hash,recorded_by)
    values(ledger_id,o.merchant_id,o.venue_id,o.id,claim,account,kind,
      case when account is null then 'CASH' else 'BANK_TRANSFER' end,ref,
      case when account is null then 'CASH_CONFIRMED' else 'BANK_STATEMENT' end,value,ledger_id,repeat('2',64),actor);
  insert into menumini.audit_events(merchant_id,actor_user_id,action,entity_type,entity_id)
    values(o.merchant_id,actor,event_name,'payment_ledger',ledger_id);
  insert into menumini.outbox_events(merchant_id,venue_id,aggregate_id,event_type,payload)
    values(o.merchant_id,o.venue_id,o.id,event_name,jsonb_build_object('ledgerId',ledger_id::text));
end $$;

begin;
select pg_temp.make_order('00000000-0000-4000-8000-000000000701');
select pg_temp.make_order('00000000-0000-4000-8000-000000000702');
select pg_temp.make_order('00000000-0000-4000-8000-000000000703');
select pg_temp.make_order('00000000-0000-4000-8000-000000000704','00000000-0000-4000-8000-000000000002');
commit;
select pg_temp.ok((select subtotal = 140 and total_amount = 140 from menumini.orders where id = '00000000-0000-4000-8000-000000000701'),'two coffees commit exact totals');
select pg_temp.ok((select payment_status = 'UNPAID' from menumini.order_payment_balances where order_id = '00000000-0000-4000-8000-000000000701'),'new order is unpaid');
select pg_temp.reject($q$ select pg_temp.make_order('00000000-0000-4000-8000-000000000701') $q$,'23505','duplicate order identity rejected');
select pg_temp.reject($q$ select pg_temp.make_order(uuidv7(),'00000000-0000-4000-8000-000000000001',1) $q$,'23514','order total must equal its actual lines');
select pg_temp.reject($q$ insert into menumini.orders(merchant_id,venue_id,dining_session_id,table_id,publication_id,client_request_key,request_hash,table_label_snapshot,subtotal,total_amount) values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000701',repeat('1',64),'4',140,140) $q$,'23505','same request key cannot create a different order ID');
select pg_temp.reject($q$ insert into menumini.menu_items(merchant_id,venue_id,section_id,name_en,base_price) values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000502','Cross tenant',70) $q$,'23503','cross-merchant section link rejected');
select pg_temp.reject($q$ update menumini.menu_items set base_price = -1 where id = '00000000-0000-4000-8000-000000000601' $q$,'23514','negative catalog price rejected');
select pg_temp.reject($q$ insert into menumini.venues(merchant_id,name,public_slug) values('00000000-0000-4000-8000-000000000001','Second venue','second-venue') $q$,'23505','MenuMini single venue limit');
select pg_temp.reject($q$ update menumini.orders set subtotal = 1,total_amount = 1 where id = '00000000-0000-4000-8000-000000000701' $q$,'23514','sealed order price cannot change');
select pg_temp.reject($q$ insert into menumini.order_lines(merchant_id,venue_id,order_id,item_id,item_snapshot,quantity,unit_price) values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000701','00000000-0000-4000-8000-000000000601','{}',1,0) $q$,'23514','cannot append a free line after sealing');
select pg_temp.reject($q$ insert into menumini.orders(merchant_id,venue_id,dining_session_id,table_id,publication_id,client_request_key,request_hash,table_label_snapshot,subtotal,total_amount) values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000401',uuidv7(),repeat('3',64),'4',140,140) $q$,'23514','incomplete order cannot commit');
select pg_temp.reject($q$ update menumini.orders set status = 'READY' where id = '00000000-0000-4000-8000-000000000701' $q$,'23514','invalid status jump rejected');
select pg_temp.reject($q$ update menumini.orders set status = 'ACCEPTED' where id = '00000000-0000-4000-8000-000000000701' $q$,'23514','status change without event/outbox cannot commit');
begin;
select pg_temp.progress('00000000-0000-4000-8000-000000000701','ACCEPTED');
commit;
select pg_temp.ok((select o.status = 'ACCEPTED' and p.payment_status = 'UNPAID' from menumini.orders o join menumini.order_payment_balances p on p.order_id=o.id where o.id='00000000-0000-4000-8000-000000000701'),'staff can accept an unpaid order');
select pg_temp.ok((select version = 2 from menumini.orders where id='00000000-0000-4000-8000-000000000701'),'order version advances with status');

insert into menumini.payment_claims(id,merchant_id,venue_id,order_id,dining_session_id,account_id,client_request_key,request_hash,provider_reference,reported_amount)
values('00000000-0000-4000-8000-000000000851','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000701','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000801',uuidv7(),repeat('4',64),'DEMO-TXN',140);
select pg_temp.ok((select payment_status = 'UNPAID' from menumini.order_payment_balances where order_id='00000000-0000-4000-8000-000000000701'),'customer claim never marks paid');
select pg_temp.reject($q$ select pg_temp.receipt('00000000-0000-4000-8000-000000000701',140,uuidv7(),'00000000-0000-4000-8000-000000000801','DEMO-TXN','00000000-0000-4000-8000-000000000851') $q$,'23514','unapproved claim cannot become a receipt');
select pg_temp.reject($q$ update menumini.payment_claims set status='APPROVED',reviewed_by='00000000-0000-4000-8000-000000000011',reviewed_at=now() where id='00000000-0000-4000-8000-000000000851' $q$,'23514','approval without ledger cannot commit');
begin;
update menumini.payment_claims set status='APPROVED',reviewed_by='00000000-0000-4000-8000-000000000011',reviewed_at=now() where id='00000000-0000-4000-8000-000000000851';
select pg_temp.receipt('00000000-0000-4000-8000-000000000701',140,'00000000-0000-4000-8000-000000000901','00000000-0000-4000-8000-000000000801','DEMO-TXN','00000000-0000-4000-8000-000000000851');
commit;
select pg_temp.ok((select payment_status='PAID' and outstanding_amount=0 from menumini.order_payment_balances where order_id='00000000-0000-4000-8000-000000000701'),'recorded verification changes balance to paid');
select pg_temp.reject($q$ select pg_temp.receipt('00000000-0000-4000-8000-000000000702',140,uuidv7(),'00000000-0000-4000-8000-000000000801','DEMO-TXN') $q$,'23505','bank reference cannot pay another order');
select pg_temp.reject($q$ select pg_temp.receipt('00000000-0000-4000-8000-000000000704',140,uuidv7(),'00000000-0000-4000-8000-000000000803','DEMO-TXN') $q$,'23505','same physical bank transfer cannot be reused by a different merchant');
select pg_temp.reject($q$ select pg_temp.receipt('00000000-0000-4000-8000-000000000701',1,uuidv7()) $q$,'23514','overpayment allocation rejected');
select pg_temp.reject($q$ select pg_temp.receipt('00000000-0000-4000-8000-000000000701',141,uuidv7(),null,null,null,'REFUND') $q$,'23514','refund cannot exceed recorded receipts');
select pg_temp.reject($q$ update menumini.payment_ledger set amount=1 where id='00000000-0000-4000-8000-000000000901' $q$,'23514','ledger cannot be rewritten');
select pg_temp.reject($q$ update menumini.menu_publications set snapshot='{}' where id='00000000-0000-4000-8000-000000000401' $q$,'23514','published menu is immutable');
select pg_temp.reject($q$ update menumini.payment_accounts set account_identifier='OTHER' where id='00000000-0000-4000-8000-000000000801' $q$,'23514','receiving account identity cannot rewrite payment history');
select pg_temp.reject($q$ insert into menumini.payment_ledger(merchant_id,venue_id,order_id,kind,method,verification_source,amount,client_request_key,request_hash,recorded_by) values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000702','RECEIPT','CASH','CASH_CONFIRMED',140,uuidv7(),repeat('8',64),'00000000-0000-4000-8000-000000000011') $q$,'23514','receipt without audit and outbox cannot commit');

set role menu_runtime;
select pg_temp.ok((select count(*)=0 from menumini.orders),'missing tenant context denies reads');
begin;
set local menu.merchant_id='00000000-0000-4000-8000-000000000001';
select pg_temp.ok((select count(*)=3 from menumini.orders),'runtime sees only merchant A orders');
select pg_temp.ok((select count(*)=3 from menumini.order_payment_balances),'balance view preserves tenant isolation');
select pg_temp.ok((select count(*)=2 from menumini.venue_routes),'public directory has only routing metadata');
select pg_temp.reject($q$ select * from menumini.staff_sessions $q$,'42501','order runtime cannot read staff session hashes');
select pg_temp.reject($q$ insert into menumini.outbox_events(merchant_id,venue_id,event_type,aggregate_id) values('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000102','ORDER_SUBMITTED',uuidv7()) $q$,'42501','runtime cross-merchant write denied');
commit;
select pg_temp.ok((select count(*)=0 from menumini.orders),'transaction-local context clears after commit');
reset role;
select pg_temp.ok((select count(*)=23 from information_schema.tables where table_schema='menumini' and table_type='BASE TABLE'),'complete foundation has 23 relational tables');
