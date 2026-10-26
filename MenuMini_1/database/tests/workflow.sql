-- Fictional fixtures, disposable PostgreSQL only; no merchant or bank access.
create function pg_temp.id(n integer) returns uuid language sql immutable as $$
 select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid
$$;
create function pg_temp.ok(value boolean,label text) returns void language plpgsql as $$ begin
 if value is not true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label;
end $$;
create function pg_temp.reject(command text,state text,label text) returns void language plpgsql as $$ begin
 begin execute command; set constraints all immediate; raise exception 'unexpected success';
 exception when others then if sqlstate<>state then raise exception 'FAIL: % expected %, got %: %',label,state,sqlstate,sqlerrm; end if; end;
 set constraints all deferred; raise notice 'PASS: %',label;
end $$;
insert into menumini.app_users(id,email,display_name) values
(pg_temp.id(11),'owner-a@example.test','Owner A'),(pg_temp.id(12),'owner-b@example.test','Owner B'),
(pg_temp.id(13),'owner-c@example.test','Owner C'),(pg_temp.id(21),'waiter@example.test','Waiter'),
(pg_temp.id(22),'cashier@example.test','Cashier'),(pg_temp.id(23),'preparation@example.test','Preparation'),
(pg_temp.id(24),'editor@example.test','Editor'),(pg_temp.id(99),'platform@example.test','Platform operator');
insert into menumini.platform_operators values(pg_temp.id(99),true);
insert into menumini.merchants(id,name,slug) values(pg_temp.id(1),'Fictional A','fictional-a'),(pg_temp.id(2),'Fictional B','fictional-b'),(pg_temp.id(3),'Fictional C','fictional-c');
insert into menumini.merchant_memberships values
(pg_temp.id(1),pg_temp.id(11),'OWNER',true,now()),(pg_temp.id(2),pg_temp.id(12),'OWNER',true,now()),(pg_temp.id(3),pg_temp.id(13),'OWNER',true,now()),
(pg_temp.id(1),pg_temp.id(21),'OPERATOR',true,now()),(pg_temp.id(1),pg_temp.id(22),'OPERATOR',true,now()),
(pg_temp.id(1),pg_temp.id(23),'OPERATOR',true,now()),(pg_temp.id(1),pg_temp.id(24),'OPERATOR',true,now());
create temporary table ids(name text primary key,id uuid);
grant select,insert,update on ids to menu_runtime;
begin;
set local role menu_runtime;
set local menu.merchant_id='00000000-0000-4000-8000-000000000001';
set local menu.user_id='00000000-0000-4000-8000-000000000011';
insert into ids values('venue',menumini.create_branch('Fictional Cafe','fictional-cafe',pg_temp.id(101)));
commit;

select pg_temp.ok((select count(*)=1 from menumini.venues where merchant_id=pg_temp.id(1)),'Free can create one persistent branch');

create function pg_temp.ctx(merchant integer,staff integer default null,guest integer default null,access_id uuid default null) returns void language plpgsql as $$ begin
 perform set_config('menu.merchant_id',pg_temp.id(merchant)::text,true);
 perform set_config('menu.user_id',case when staff is null then '' else pg_temp.id(staff)::text end,true);
 perform set_config('menu.guest_session_id',case when guest is null then '' else pg_temp.id(guest)::text end,true);
 perform set_config('menu.bill_access_id',coalesce(access_id::text,''),true);
end $$;
begin;
set local role menu_runtime; select pg_temp.ctx(1,11);
select pg_temp.reject($q$select menumini.create_branch('Another','another',pg_temp.id(102))$q$,'23514','Free branch capacity cannot be bypassed');
select pg_temp.reject($q$insert into menumini.merchants(name,slug,plan,branch_limit) values('Spoof','spoof','PRO',50)$q$,'42501','restaurant runtime cannot self-upgrade plan');
select pg_temp.reject($q$select menumini.apply_plan(pg_temp.id(1),'PRO',2,true,now(),now()+interval '1 month','fake')$q$,'42501','restaurant owner cannot invoke platform billing');
commit;
insert into menumini.dining_tables(id,merchant_id,venue_id,label,qr_token_hash) values
 (pg_temp.id(201),pg_temp.id(1),(select id from ids where name='venue'),'Table 1',repeat('a',64)),
 (pg_temp.id(202),pg_temp.id(1),(select id from ids where name='venue'),'Table 2',repeat('b',64)),
 (pg_temp.id(203),pg_temp.id(1),(select id from ids where name='venue'),'Table 3',repeat('c',64)),
 (pg_temp.id(204),pg_temp.id(1),(select id from ids where name='venue'),'Table 4',repeat('d',64));
begin; set local role menu_runtime; select pg_temp.ctx(1,11);
select pg_temp.reject($q$select menumini.open_visit((select id from ids where name='venue'),pg_temp.id(201),repeat('1',64),now()+interval '1 hour',pg_temp.id(501))$q$,'42501','Free cannot start paid ordering workflow');
commit;
begin; set local role menu_platform; select pg_temp.ctx(1,99);
select menumini.apply_plan(pg_temp.id(1),'MINI',1,true,now(),now()+interval '1 month','FICTIONAL-SUBSCRIPTION-A');
select menumini.apply_plan(pg_temp.id(3),'MINI',1,true,now(),now()+interval '1 month','FICTIONAL-SUBSCRIPTION-C');
commit;
update menumini.venues set ordering_enabled=true,settings=settings||'{"pricing":{"confirmed":true,"taxMode":"NONE","taxRateBps":0,"serviceRateBps":0,"taxOnService":false}}'::jsonb;
insert into menumini.menu_sections(id,merchant_id,venue_id,name_en) values(pg_temp.id(601),pg_temp.id(1),(select id from ids where name='venue'),'Coffee');
insert into menumini.menu_items(id,merchant_id,venue_id,section_id,name_en,base_price) values
 (pg_temp.id(701),pg_temp.id(1),(select id from ids where name='venue'),pg_temp.id(601),'Coffee',70),
 (pg_temp.id(702),pg_temp.id(1),(select id from ids where name='venue'),pg_temp.id(601),'Tea',50);
insert into menumini.menu_publications(id,merchant_id,venue_id,revision,snapshot,content_hash,published_by)
values(pg_temp.id(401),pg_temp.id(1),(select id from ids where name='venue'),1,
 '{"sections":[{"id":"00000000-0000-4000-8000-000000000601","items":[{"id":"00000000-0000-4000-8000-000000000701","nameEn":"Coffee","basePrice":"70.00","modifiers":[]},{"id":"00000000-0000-4000-8000-000000000702","nameEn":"Tea","availableNow":false,"basePrice":"50.00","modifiers":[{"id":"00000000-0000-4000-8000-000000000901","mode":"SINGLE_SELECT","minSelections":1,"maxSelections":1,"choices":[{"id":"00000000-0000-4000-8000-000000000902","label":"Large","priceDelta":"10.00","isAvailable":true}]}]}]}]}'::jsonb,repeat('e',64),pg_temp.id(11));
insert into menumini.venue_routes(slug,merchant_id,venue_id,publication_id) values('fictional-cafe',pg_temp.id(1),(select id from ids where name='venue'),pg_temp.id(401));
insert into menumini.dining_sessions(id,merchant_id,venue_id,table_id,capability_hash,expires_at) values
 (pg_temp.id(301),pg_temp.id(1),(select id from ids where name='venue'),pg_temp.id(201),repeat('f',64),now()+interval '3 hours'),
 (pg_temp.id(302),pg_temp.id(1),(select id from ids where name='venue'),pg_temp.id(201),repeat('0',64),now()+interval '3 hours');
insert into menumini.payment_accounts(id,merchant_id,provider,account_identifier,holder_name,ownership_verified_at)
values(pg_temp.id(801),pg_temp.id(1),'CBE','FICTIONAL-RECIPIENT','Fictional A',now());
insert into menumini.venue_payment_accounts values(pg_temp.id(1),(select id from ids where name='venue'),pg_temp.id(801));
begin; set local role menu_runtime; select pg_temp.ctx(1,11);
select menumini.assign_staff((select id from ids where name='venue'),pg_temp.id(21),'WAITER',true);
select menumini.assign_staff((select id from ids where name='venue'),pg_temp.id(22),'CASHIER',true);
select menumini.assign_staff((select id from ids where name='venue'),pg_temp.id(23),'PREPARATION',true);
select menumini.assign_staff((select id from ids where name='venue'),pg_temp.id(24),'EDITOR',true);
insert into ids values('visit',menumini.open_visit((select id from ids where name='venue'),pg_temp.id(201),encode(sha256(convert_to(repeat('P',64),'UTF8')),'hex'),now()+interval '2 hours',pg_temp.id(501)));
insert into ids select 'bill',id from menumini.bills where visit_id=(select id from ids where name='visit');
select pg_temp.reject($q$select menumini.create_branch('Another','another',pg_temp.id(102))$q$,'23514','base Mini term remains one branch until the quoted second-branch entitlement is applied');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(1,21);
select pg_temp.ok(menumini.has_permission((select id from ids where name='venue'),'orders.submit'),'waiter has order entry permission');
select pg_temp.ok(not menumini.has_permission((select id from ids where name='venue'),'payments.record'),'waiter does not inherit payment verification');
select pg_temp.reject($q$select menumini.assign_staff((select id from ids where name='venue'),pg_temp.id(21),'MANAGER',true)$q$,'42501','waiter cannot escalate own role');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(1,null,301);
select pg_temp.reject($q$select menumini.pair_visit((select id from ids where name='visit'),repeat('WRONG',12))$q$,'42501','public table context is insufficient to join seating');
select pg_temp.reject($q$select menumini.pair_visit((select id from ids where name='visit'),null)$q$,'42501','null pairing token cannot bypass private visit confirmation');
select menumini.pair_visit((select id from ids where name='visit'),repeat('P',64));
select pg_temp.reject($q$select menumini.read_bill((select id from ids where name='bill'))$q$,'42501','paired guest does not automatically see table bill');
select pg_temp.reject($q$select menumini.submit_workflow_order((select id from ids where name='venue'),(select id from ids where name='visit'),pg_temp.id(401),jsonb_build_array(jsonb_build_object('itemId',pg_temp.id(701),'quantity',1,'choiceIds','[]'::jsonb,'unitPrice','0.01')),'','GUEST',pg_temp.id(601))$q$,'23514','database command rejects client-supplied prices');
insert into ids values('order1',menumini.submit_workflow_order((select id from ids where name='venue'),(select id from ids where name='visit'),pg_temp.id(401),jsonb_build_array(jsonb_build_object('itemId',pg_temp.id(701),'quantity',2,'choiceIds','[]'::jsonb)),'','GUEST',pg_temp.id(602)));
select pg_temp.ok((select total_amount=140 and status='SUBMITTED' from menumini.orders where id=(select id from ids where name='order1')),'guest order stores server-computed 140 ETB');
commit;
select pg_temp.ok((select coalesce(sum(amount),0)=0 from menumini.bill_charges where bill_id=(select id from ids where name='bill')),'unaccepted requests are not bill charges');
begin; set local role menu_runtime; select pg_temp.ctx(1,21);
select pg_temp.reject($q$select menumini.transition_order((select id from ids where name='order1'),null,'ACCEPTED','',pg_temp.id(679))$q$,'40001','null expected version cannot bypass order concurrency check');
select menumini.transition_order((select id from ids where name='order1'),1,'ACCEPTED','',pg_temp.id(603));
insert into ids values('order2',menumini.submit_workflow_order((select id from ids where name='venue'),(select id from ids where name='visit'),pg_temp.id(401),jsonb_build_array(jsonb_build_object('itemId',pg_temp.id(701),'quantity',1,'choiceIds','[]'::jsonb)),'','STAFF',pg_temp.id(604)));
select menumini.transition_order((select id from ids where name='order2'),1,'ACCEPTED','',pg_temp.id(605));
select pg_temp.ok(menumini.read_bill((select id from ids where name='bill'))->>'chargeAmount'='210.00','additional staff order joins the same 210 ETB bill');
select pg_temp.ok(menumini.read_bill((select id from ids where name='bill'))->>'settlement'='UNPAID','orders accepted while bill remains unpaid');
commit;

begin; set local role menu_runtime; select pg_temp.ctx(1,null,302);
select menumini.pair_visit((select id from ids where name='visit'),repeat('P',64));
select pg_temp.ok((select count(*)=0 from menumini.orders),'another guest cannot read the first guest or staff orders');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(1,23);
select pg_temp.ok((select count(*)=0 from menumini.recorded_receipts),'preparation role cannot read financial receipts');
select pg_temp.reject($q$select menumini.read_bill((select id from ids where name='bill'))$q$,'42501','preparation role cannot access bill totals');
select menumini.transition_order((select id from ids where name='order1'),2,'PREPARING','',pg_temp.id(606));
select menumini.transition_order((select id from ids where name='order1'),3,'READY','',pg_temp.id(607));
select pg_temp.reject($q$select menumini.transition_order((select id from ids where name='order1'),4,'COMPLETED','',pg_temp.id(608))$q$,'42501','preparation cannot falsely record serving');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(1,22);
select menumini.change_bill_state((select id from ids where name='bill'),(select version from menumini.bills where id=(select id from ids where name='bill')),'FINALIZED',pg_temp.id(609));
select pg_temp.reject($q$select menumini.change_bill_state((select id from ids where name='bill'),(select version from menumini.bills where id=(select id from ids where name='bill')),'CLOSED',pg_temp.id(610))$q$,'23514','unpaid bill cannot be financially closed');
insert into ids values('grant',menumini.issue_bill_grant((select id from ids where name='bill'),pg_temp.id(301),repeat('9',64),now()+interval '1 hour'));
commit;
begin; set local role menu_runtime; select pg_temp.ctx(1,null,302,(select id from ids where name='grant'));
select pg_temp.reject($q$select menumini.read_bill((select id from ids where name='bill'))$q$,'42501','payer grant is bound to its actual guest session');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(1,null,301,(select id from ids where name='grant'));
select pg_temp.ok(menumini.read_bill((select id from ids where name='bill'))->>'chargeAmount'='210.00','authorized payer can read combined bill');
insert into ids values('claim',menumini.submit_bill_claim((select id from ids where name='bill'),pg_temp.id(801),'FICTIONAL-TXN-ONE',210,null,pg_temp.id(611)));
select pg_temp.ok(menumini.read_bill((select id from ids where name='bill'))->>'settlement'='UNPAID','transfer claim never marks bill paid');
select pg_temp.ok((select count(*)=0 from menumini.recorded_receipts),'guest cannot inspect other payer financial evidence');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(1,21);
select pg_temp.reject($q$select menumini.review_bill_claim((select id from ids where name='claim'),1,'APPROVE',210,210,'fictional funds checked',pg_temp.id(612))$q$,'42501','waiter cannot verify transfers');
select menumini.transition_order((select id from ids where name='order1'),4,'COMPLETED','',pg_temp.id(613));
select pg_temp.reject($q$select menumini.transition_order((select id from ids where name='order2'),2,'CANCELLED','cancel',pg_temp.id(614))$q$,'42501','accepted cancellation with financial credit needs manager permission');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(1,22);
select pg_temp.reject($q$select menumini.review_bill_claim((select id from ids where name='claim'),1,null,null,null,'invalid decision',pg_temp.id(680))$q$,'23514','null claim decision cannot silently become rejection');
select menumini.review_bill_claim((select id from ids where name='claim'),1,'APPROVE',210,210,'Fictional statement checked',pg_temp.id(615));
insert into ids select 'receipt',id from menumini.recorded_receipts where claim_id=(select id from ids where name='claim');
select pg_temp.ok(menumini.read_bill((select id from ids where name='bill'))->>'settlement'='PAID','one verified transfer settles both orders');
select pg_temp.ok(menumini.read_receipt((select id from ids where name='receipt'))->>'receivedAmount'='210.00','actual received funds recorded once');
select menumini.review_bill_claim((select id from ids where name='claim'),1,'APPROVE',210,210,'Fictional statement checked',pg_temp.id(615));
select pg_temp.ok((select count(*)=1 from menumini.recorded_receipts),'identical review retry creates no second receipt');
select pg_temp.reject($q$select menumini.record_receipt((select id from ids where name='bill'),'BANK_TRANSFER',210,null,null,pg_temp.id(801),'FICTIONAL-TXN-ONE','duplicate',pg_temp.id(616))$q$,'23505','same bank transfer cannot be recorded twice');
select pg_temp.reject($q$select menumini.record_receipt((select id from ids where name='bill'),'BANK_TRANSFER',1,null,null,pg_temp.id(801),null,'missing reference',pg_temp.id(681))$q$,'23514','null bank reference cannot create undeduplicated transfer receipts');
select pg_temp.reject($q$select menumini.allocate_receipt((select id from ids where name='receipt'),(select id from ids where name='bill'),(select version from menumini.bills where id=(select id from ids where name='bill')),1,pg_temp.id(617))$q$,'23514','allocated funds cannot be spent again');
select pg_temp.reject($q$update menumini.recorded_receipts set received_amount=1$q$,'42501','runtime cannot rewrite recorded money');
select pg_temp.reject($q$insert into menumini.payment_ledger select * from menumini.payment_ledger$q$,'42501','retired order-linked ledger is not an alternate write path');
commit;

begin; set local role menu_runtime; select pg_temp.ctx(1,11);
select menumini.transition_order((select id from ids where name='order2'),2,'CANCELLED','Second round cancelled by manager',pg_temp.id(618));
select pg_temp.ok(menumini.read_bill((select id from ids where name='bill'))->>'chargeAmount'='140.00','accepted cancellation appends bill credit');
select pg_temp.ok(menumini.read_receipt((select id from ids where name='receipt'))->>'allocatedAmount'='140.00','credit reverses excess allocation without changing receipt');
select pg_temp.ok(menumini.read_receipt((select id from ids where name='receipt'))->>'unappliedAmount'='70.00','cancelled prepaid amount remains visible for resolution');
select menumini.end_visit((select id from ids where name='visit'),1,pg_temp.id(619));
insert into ids values('visit-next',menumini.open_visit((select id from ids where name='venue'),pg_temp.id(201),encode(sha256(convert_to(repeat('N',64),'UTF8')),'hex'),now()+interval '2 hours',pg_temp.id(620)));
select pg_temp.ok((select status='ENDED' from menumini.table_visits where id=(select id from ids where name='visit')),'seating ends without concealing outstanding refund money');
select pg_temp.ok((select count(*)=1 from menumini.table_visits where table_id=pg_temp.id(201) and status='OPEN'),'same table can start a new seating while prior money is unresolved');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(1,null,301);
select pg_temp.reject($q$select menumini.pair_visit((select id from ids where name='visit-next'),repeat('N',64))$q$,'42501','old guest context cannot be reassigned to new seating');
select pg_temp.ok((select count(*)=1 from menumini.orders),'guest retains only own order history after seating ends');
select pg_temp.ok(menumini.submit_workflow_order((select id from ids where name='venue'),(select id from ids where name='visit'),pg_temp.id(401),jsonb_build_array(jsonb_build_object('itemId',pg_temp.id(701),'quantity',2,'choiceIds','[]'::jsonb)),'','GUEST',pg_temp.id(602))=(select id from ids where name='order1'),'original submission retry resolves after seating ended');
select pg_temp.reject($q$select menumini.submit_workflow_order((select id from ids where name='venue'),(select id from ids where name='visit'),pg_temp.id(401),jsonb_build_array(jsonb_build_object('itemId',pg_temp.id(701),'quantity',3,'choiceIds','[]'::jsonb)),'','GUEST',pg_temp.id(602))$q$,'40001','same order retry key cannot change quantity');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(1,22);
insert into ids values('refund',menumini.request_refund((select id from ids where name='receipt'),70,'Cancelled second round',pg_temp.id(621)));
select pg_temp.ok(menumini.read_receipt((select id from ids where name='receipt'))->>'refundedAmount'='0.00','refund request does not claim money returned');
select pg_temp.reject($q$select menumini.request_refund((select id from ids where name='receipt'),1,'duplicate obligation',pg_temp.id(622))$q$,'23514','pending refund reserves its funds');
select pg_temp.reject($q$select menumini.change_bill_state((select id from ids where name='bill'),(select version from menumini.bills where id=(select id from ids where name='bill')),'CLOSED',pg_temp.id(623))$q$,'23514','pending refund and unapplied money prevent financial closure');
select pg_temp.reject($q$select menumini.review_refund((select id from ids where name='refund'),1,'APPROVE','checked',pg_temp.id(624))$q$,'42501','cashier cannot self-approve refund execution');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(1,11);
select pg_temp.reject($q$select menumini.execute_refund((select id from ids where name='refund'),1,'FICTIONAL-REFUND',pg_temp.id(625))$q$,'40001','refund execution requires prior approval');
select menumini.review_refund((select id from ids where name='refund'),1,'APPROVE','Manager checked',pg_temp.id(626));
select menumini.execute_refund((select id from ids where name='refund'),2,'FICTIONAL-REFUND',pg_temp.id(627));
select pg_temp.ok(menumini.read_receipt((select id from ids where name='receipt'))->>'refundedAmount'='70.00','executed refund records actual returned amount');
select pg_temp.ok(menumini.read_receipt((select id from ids where name='receipt'))->>'unappliedAmount'='0.00','receipt funds conserved after allocation reversal and refund');
select menumini.change_bill_state((select id from ids where name='bill'),(select version from menumini.bills where id=(select id from ids where name='bill')),'CLOSED',pg_temp.id(628));
select pg_temp.ok(menumini.read_bill((select id from ids where name='bill'))->>'status'='CLOSED','only resolved bill is financially closed');
commit;

-- Read boundaries also apply to the older foundation tables.
begin; set local role menu_runtime; select pg_temp.ctx(1,null,301);
select pg_temp.ok((select count(*)=0 from menumini.merchant_memberships),'guest cannot read staff memberships');
select pg_temp.ok((select count(*)=0 from menumini.dining_sessions),'guest cannot enumerate capability hashes');
select pg_temp.ok((select count(*)=0 from menumini.menu_items),'guest cannot read unpublished menu drafts');
select pg_temp.ok((select count(*)=0 from menumini.payment_accounts),'guest cannot enumerate receiving-account identities');
select pg_temp.ok((select count(*)=0 from menumini.audit_events),'guest cannot read business audit metadata');
select pg_temp.ok((select count(*)=0 from menumini.outbox_events),'interactive guest cannot read integration destinations or queue payloads');
commit;

-- Price a later round from the publication, independently of its edited draft.
update menumini.menu_items set base_price=999 where id=pg_temp.id(701);
begin; set local role menu_runtime; select pg_temp.ctx(1,24);
select menumini.set_availability((select id from ids where name='venue'),pg_temp.id(701),1,false,'Sold out');
select pg_temp.reject($q$select menumini.submit_workflow_order((select id from ids where name='venue'),(select id from ids where name='visit-next'),pg_temp.id(401),jsonb_build_array(jsonb_build_object('itemId',pg_temp.id(701),'quantity',1,'choiceIds','[]'::jsonb)),'','STAFF',pg_temp.id(631))$q$,'42501','menu editor cannot submit orders');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(1,21);
select pg_temp.reject($q$select menumini.submit_workflow_order((select id from ids where name='venue'),(select id from ids where name='visit-next'),pg_temp.id(401),jsonb_build_array(jsonb_build_object('itemId',pg_temp.id(701),'quantity',1,'choiceIds','[]'::jsonb)),'','STAFF',pg_temp.id(631))$q$,'40001','live sold-out overlay blocks an otherwise published item');
select pg_temp.reject($q$select menumini.submit_workflow_order((select id from ids where name='venue'),(select id from ids where name='visit-next'),pg_temp.id(401),jsonb_build_array(jsonb_build_object('itemId',pg_temp.id(702),'quantity',1,'choiceIds','[]'::jsonb)),'','STAFF',pg_temp.id(632))$q$,'23514','required modifier cannot be omitted');
select pg_temp.reject($q$select menumini.submit_workflow_order((select id from ids where name='venue'),(select id from ids where name='visit-next'),pg_temp.id(401),jsonb_build_array(jsonb_build_object('itemId',pg_temp.id(702),'quantity',1,'choiceIds',jsonb_build_array(pg_temp.id(902)))),'','STAFF',pg_temp.id(642))$q$,'40001','published unavailable item is blocked without a live override');
select pg_temp.reject($q$select menumini.submit_workflow_order((select id from ids where name='venue'),(select id from ids where name='visit-next'),pg_temp.id(401),jsonb_build_array(jsonb_build_object('itemId',pg_temp.id(701),'quantity',1,'choiceIds',jsonb_build_array(pg_temp.id(902)))),'','STAFF',pg_temp.id(633))$q$,'23514','modifier from another item is rejected');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(1,24);
select menumini.set_availability((select id from ids where name='venue'),pg_temp.id(701),2,true,'Restocked');
select pg_temp.ok((select base_price=999 from menumini.menu_items where id=pg_temp.id(701)),'availability edit leaves unpublished draft price intact');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(1,21);
insert into ids values('order3',menumini.submit_workflow_order((select id from ids where name='venue'),(select id from ids where name='visit-next'),pg_temp.id(401),jsonb_build_array(jsonb_build_object('itemId',pg_temp.id(701),'quantity',1,'choiceIds','[]'::jsonb)),'','STAFF',pg_temp.id(634)));
select pg_temp.ok((select total_amount=70 from menumini.orders where id=(select id from ids where name='order3')),'new order retains published 70 ETB rather than draft 999 ETB');
select menumini.transition_order((select id from ids where name='order3'),1,'ACCEPTED','',pg_temp.id(635));
insert into ids select 'bill2',id from menumini.bills where visit_id=(select id from ids where name='visit-next');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(1,22);
insert into ids values('cash',menumini.record_receipt((select id from ids where name='bill2'),'CASH',30,50,20,null,null,'Fictional cash counted and change returned',pg_temp.id(636)));
select menumini.allocate_receipt((select id from ids where name='cash'),(select id from ids where name='bill2'),(select version from menumini.bills where id=(select id from ids where name='bill2')),30,pg_temp.id(637));
select pg_temp.ok(menumini.read_bill((select id from ids where name='bill2'))->>'settlement'='PARTIALLY_PAID','partial cash leaves bill partially paid');
select pg_temp.ok(menumini.read_bill((select id from ids where name='bill2'))->>'outstandingAmount'='40.00','partial cash leaves exact remaining balance');
select pg_temp.ok(menumini.read_receipt((select id from ids where name='cash'))->>'receivedAmount'='30.00','cash tender and change do not inflate received money');
select pg_temp.reject($q$select menumini.record_receipt((select id from ids where name='bill2'),'CASH',40,50,0,null,null,'invalid cash math',pg_temp.id(638))$q$,'23514','inconsistent cash/change arithmetic is rejected');
insert into ids values('overpayment',menumini.record_receipt((select id from ids where name='bill2'),'BANK_TRANSFER',50,null,null,pg_temp.id(801),'FICTIONAL-TXN-TWO','Fictional actual transfer credited 50',pg_temp.id(639)));
select menumini.allocate_receipt((select id from ids where name='overpayment'),(select id from ids where name='bill2'),(select version from menumini.bills where id=(select id from ids where name='bill2')),40,pg_temp.id(640));
select pg_temp.ok(menumini.read_bill((select id from ids where name='bill2'))->>'settlement'='PAID','mixed cash and verified transfer settle the charge');
select pg_temp.ok(menumini.read_receipt((select id from ids where name='overpayment'))->>'unappliedAmount'='10.00','actual overpayment remains explicit and unallocated');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(1,11);
select menumini.credit_bill((select id from ids where name='bill2'),(select version from menumini.bills where id=(select id from ids where name='bill2')),(select id from ids where name='order3'),20,'Fictional authorized order correction',pg_temp.id(643));
select pg_temp.ok(menumini.read_bill((select id from ids where name='bill2'))->>'chargeAmount'='50.00','credit is linked to remaining charge of a specific accepted order');
select pg_temp.reject($q$select menumini.credit_bill((select id from ids where name='bill2'),(select version from menumini.bills where id=(select id from ids where name='bill2')),(select id from ids where name='order1'),1,'wrong order',pg_temp.id(644))$q$,'23514','credit cannot use an order from another bill');
select menumini.transition_order((select id from ids where name='order3'),2,'CANCELLED','Cancel corrected order',pg_temp.id(645));
select pg_temp.ok(menumini.read_bill((select id from ids where name='bill2'))->>'chargeAmount'='0.00','cancellation credits only remaining order charge after prior correction');
select pg_temp.ok((select sum(amount)=-70 from menumini.bill_charges where order_id=(select id from ids where name='order3') and kind='CREDIT'),'prior credit plus cancellation never double-credits an order');
commit;

-- A revoked role loses command access immediately; expired sessions lose reads.
update menumini.branch_staff set is_active=false where user_id=pg_temp.id(21);
begin; set local role menu_runtime; select pg_temp.ctx(1,21);
select pg_temp.reject($q$select menumini.end_visit((select id from ids where name='visit-next'),1,pg_temp.id(641))$q$,'42501','revoked floor assignment cannot operate the branch');
select pg_temp.ok((select count(*)=0 from menumini.orders),'revoked staff cannot retain old branch order reads');
commit;
update menumini.branch_staff set is_active=true where user_id=pg_temp.id(21);
update menumini.dining_sessions set revoked_at=now() where id=pg_temp.id(301);
begin; set local role menu_runtime; select pg_temp.ctx(1,null,301,(select id from ids where name='grant'));
select pg_temp.ok((select count(*)=0 from menumini.orders),'revoked guest session loses order history access');
select pg_temp.reject($q$select menumini.read_bill((select id from ids where name='bill'))$q$,'42501','revoked guest session loses payer grant access');
commit;

-- Fixtures for two-connection races: money allocation and finalization.
begin; set local role menu_runtime; select pg_temp.ctx(1,11);
insert into ids values('race-visit',menumini.open_visit((select id from ids where name='venue'),pg_temp.id(202),repeat('2',64),now()+interval '2 hours',pg_temp.id(650)));
insert into ids select 'race-bill',id from menumini.bills where visit_id=(select id from ids where name='race-visit');
insert into ids values('race-order',menumini.submit_workflow_order((select id from ids where name='venue'),(select id from ids where name='race-visit'),pg_temp.id(401),jsonb_build_array(jsonb_build_object('itemId',pg_temp.id(701),'quantity',1,'choiceIds','[]'::jsonb)),'','STAFF',pg_temp.id(651)));
select menumini.transition_order((select id from ids where name='race-order'),1,'ACCEPTED','',pg_temp.id(652));
insert into ids values('race-receipt',menumini.record_receipt((select id from ids where name='race-bill'),'CASH',70,70,0,null,null,'Fictional race fixture cash',pg_temp.id(653)));
insert into ids values('finalize-visit',menumini.open_visit((select id from ids where name='venue'),pg_temp.id(203),repeat('3',64),now()+interval '2 hours',pg_temp.id(654)));
insert into ids select 'finalize-bill',id from menumini.bills where visit_id=(select id from ids where name='finalize-visit');
commit;

-- Privileged imports must preserve financial facts and their committed evidence.
select pg_temp.reject($q$update menumini.recorded_receipts set received_amount=1 where id=(select id from ids where name='cash')$q$,'23514','privileged import cannot rewrite immutable receipts');
select pg_temp.reject($q$insert into menumini.recorded_receipts(merchant_id,venue_id,context_bill_id,method,received_amount,tendered_amount,change_amount,verification_note,recorded_by) values(pg_temp.id(1),(select id from ids where name='venue'),(select id from ids where name='bill2'),'CASH',1,1,0,'missing evidence',pg_temp.id(11))$q$,'23514','receipt without same-commit audit and outbox is rejected');

-- Separate businesses may enroll the same recipient, but never duplicate funds.
insert into menumini.merchant_memberships values(pg_temp.id(2),pg_temp.id(21),'OPERATOR',true,now());
begin; set local role menu_platform; select pg_temp.ctx(2,99);
select menumini.apply_plan(pg_temp.id(2),'PRO',2,true,now(),now()+interval '1 month','FICTIONAL-PRO-SUBSCRIPTION');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(2,12);
insert into ids values('venue-b1',menumini.create_branch('Fictional B One','fictional-b-one',pg_temp.id(660)));
insert into ids values('venue-b2',menumini.create_branch('Fictional B Two','fictional-b-two',pg_temp.id(661)));
select menumini.assign_staff((select id from ids where name='venue-b1'),pg_temp.id(21),'WAITER',true);
select pg_temp.reject($q$select menumini.create_branch('Excess B','excess-b',pg_temp.id(662))$q$,'23514','Pro cannot exceed its explicit contractual capacity');
commit;
update menumini.venues set ordering_enabled=true where merchant_id=pg_temp.id(2);
insert into menumini.dining_tables(id,merchant_id,venue_id,label,qr_token_hash)
values(pg_temp.id(205),pg_temp.id(2),(select id from ids where name='venue-b1'),'B Table',repeat('4',64));
insert into menumini.payment_accounts(id,merchant_id,provider,account_identifier,holder_name,ownership_verified_at)
values(pg_temp.id(802),pg_temp.id(2),'CBE','FICTIONAL-RECIPIENT','Fictional B',now());
insert into menumini.venue_payment_accounts values(pg_temp.id(2),(select id from ids where name='venue-b1'),pg_temp.id(802));
begin; set local role menu_runtime; select pg_temp.ctx(2,12);
insert into ids values('visit-b',menumini.open_visit((select id from ids where name='venue-b1'),pg_temp.id(205),repeat('4',64),now()+interval '1 hour',pg_temp.id(663)));
insert into ids select 'bill-b',id from menumini.bills where visit_id=(select id from ids where name='visit-b');
select pg_temp.reject($q$select menumini.record_receipt((select id from ids where name='bill-b'),'BANK_TRANSFER',210,null,null,pg_temp.id(802),'FICTIONAL-TXN-ONE','duplicated canonical recipient transfer',pg_temp.id(664))$q$,'23505','canonical transfer reference cannot be reused through a different business account');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(2,21);
select pg_temp.ok(menumini.has_permission((select id from ids where name='venue-b1'),'orders.submit'),'assigned Pro branch permits floor work');
select pg_temp.ok(not menumini.has_permission((select id from ids where name='venue-b2'),'orders.submit'),'business membership does not grant access to an unassigned Pro branch');
select pg_temp.ok((select count(*)=1 from menumini.venues),'scoped staff can read only assigned branch within Pro business');
select pg_temp.reject($q$select menumini.open_visit((select id from ids where name='venue-b2'),pg_temp.id(205),repeat('5',64),now()+interval '1 hour',pg_temp.id(665))$q$,'42501','cross-branch command blocked before accepting supplied table ID');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(1,11);
select pg_temp.reject($q$select menumini.read_bill((select id from ids where name='bill-b'))$q$,'42501','owner cannot read another business bill by UUID');
select pg_temp.ok((select count(*)=0 from menumini.bills where id=(select id from ids where name='bill-b')),'RLS hides another business bill');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(2,12);
select menumini.record_receipt((select id from ids where name='bill-b'),'CASH',9999999999.99,9999999999.99,0,null,null,'Fictional precision boundary fixture',pg_temp.id(669));
select pg_temp.reject($q$select menumini.record_receipt((select id from ids where name='bill-b'),'CASH',0.01,0.01,0,null,null,'precision overflow',pg_temp.id(670))$q$,'23514','aggregate bill balance cannot exceed public money precision');
commit;
begin; set local role menu_platform; select pg_temp.ctx(2,99);
select pg_temp.reject($q$select menumini.apply_plan(pg_temp.id(2),'MINI',1,true,now(),now()+interval '1 month','unsafe downgrade')$q$,'23514','downgrade cannot conceal excess active branches');
commit;

-- Model elapsed time with an already-expired fixture term, without sleeping.
insert into ids select 'active-term',effective_term_id from menumini.merchants where id=pg_temp.id(1);
insert into menumini.subscription_terms(id,merchant_id,plan,branch_limit,ordering_enabled,starts_at,ends_at,billing_evidence_reference,applied_by)
values(pg_temp.id(910),pg_temp.id(1),'MINI',1,true,now()-interval '2 months',now()-interval '1 month','FICTIONAL-EXPIRED-SUBSCRIPTION',pg_temp.id(99));
update menumini.merchants set effective_term_id=pg_temp.id(910) where id=pg_temp.id(1);
begin; set local role menu_runtime; select pg_temp.ctx(1,11);
select pg_temp.ok(not menumini.operating_allowed((select id from ids where name='venue')),'effective expiry disables new ordering');
select pg_temp.reject($q$select menumini.open_visit((select id from ids where name='venue'),pg_temp.id(204),repeat('6',64),now()+interval '1 hour',pg_temp.id(666))$q$,'42501','expired plan cannot start new seating');
select pg_temp.reject($q$select menumini.submit_workflow_order((select id from ids where name='venue'),(select id from ids where name='race-visit'),pg_temp.id(401),jsonb_build_array(jsonb_build_object('itemId',pg_temp.id(701),'quantity',1,'choiceIds','[]'::jsonb)),'','STAFF',pg_temp.id(667))$q$,'42501','expired plan cannot submit new orders to existing seating');
select pg_temp.ok(menumini.read_bill((select id from ids where name='bill'))->>'status'='CLOSED','expiry preserves access to prior bill history');
select menumini.record_receipt((select id from ids where name='bill2'),'CASH',1,1,0,null,null,'Fictional late funds for resolution after expiry',pg_temp.id(668));
select pg_temp.ok(menumini.read_bill((select id from ids where name='bill2'))->>'unappliedAmount'='81.00','existing financial obligations can still be recorded after expiry');
commit;
update menumini.merchants set effective_term_id=(select id from ids where name='active-term') where id=pg_temp.id(1);

-- Actual database projections are validated against the v2 response schemas.
begin; set local role menu_runtime; select pg_temp.ctx(1,11);
select 'EXAMPLE:'||jsonb_build_object('schema','Bill','value',menumini.read_bill((select id from ids where name='bill')))::text;
select 'EXAMPLE:'||jsonb_build_object('schema','Receipt','value',menumini.read_receipt((select id from ids where name='receipt')))::text;
select 'EXAMPLE:'||jsonb_build_object('schema','Bill','value',menumini.read_bill((select id from ids where name='bill2')))::text;
select 'EXAMPLE:'||jsonb_build_object('schema','Receipt','value',menumini.read_receipt((select id from ids where name='overpayment')))::text;
commit;
