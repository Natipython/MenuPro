-- Disposable catalog fixtures; no phone verification or real accounts.
insert into menumini.app_users(id,email,display_name) values
 (pg_temp.id(411),'catalog-owner-a@example.test','Private Owner A'),(pg_temp.id(412),'catalog-owner-b@example.test','Private Owner B'),
 (pg_temp.id(413),'catalog-editor@example.test','Editor'),(pg_temp.id(414),'catalog-waiter@example.test','Waiter');
insert into menumini.merchants(id,name,slug) values
 (pg_temp.id(41),'Private Legal Business A','catalog-legal-a'),(pg_temp.id(42),'Private Legal Business B','catalog-legal-b');
insert into menumini.merchant_memberships(merchant_id,user_id,role) values
 (pg_temp.id(41),pg_temp.id(411),'OWNER'),(pg_temp.id(42),pg_temp.id(412),'OWNER'),
 (pg_temp.id(41),pg_temp.id(413),'OPERATOR'),(pg_temp.id(41),pg_temp.id(414),'OPERATOR');
create temporary table catalog_fixture(name text primary key,value jsonb);
grant select,insert,update on catalog_fixture to menu_runtime,menu_public;
insert into catalog_fixture values('profile',jsonb_build_object('businessTypeId','cafe-and-restaurant','branch',jsonb_build_object(
 'publicName','Fictional Addis Cafe','name','Main branch','city','Addis Ababa','area','Bole','landmark','Fictional landmark',
 'serviceMode','MENU_ONLY','currency','ETB','timezone','Africa/Addis_Ababa',
 'hours',(select jsonb_agg(jsonb_build_object('day',n,'status','UNSPECIFIED')) from generate_series(0,6) n))));
insert into catalog_fixture values('menu',jsonb_build_object('themeId','mini-warm-habesha','primaryColor','#F59E0B','sections',
 jsonb_build_array(jsonb_build_object('id',pg_temp.id(4101),'nameEn','Coffee','nameAm','ቡና','items',jsonb_build_array(
 jsonb_build_object('id',pg_temp.id(4102),'nameEn','Fictional coffee','nameAm','የሙከራ ቡና','basePrice','60.50','availableNow',true,'modifiers','[]'::jsonb),
 jsonb_build_object('id',pg_temp.id(4103),'nameEn','Fictional tea','basePrice','80.00','availableNow',true,'modifiers',jsonb_build_array(
  jsonb_build_object('id',pg_temp.id(4104),'label','Size','mode','SINGLE_SELECT','minSelections',1,'maxSelections',1,'choices',jsonb_build_array(
   jsonb_build_object('id',pg_temp.id(4105),'label','Regular','priceDelta','0.00','isAvailable',true),
   jsonb_build_object('id',pg_temp.id(4106),'label','Large','priceDelta','10.00','isAvailable',true))))))))));
create function pg_temp.catalog(name text) returns jsonb language sql as $$ select value from catalog_fixture where name=$1 $$;
begin; set local role menu_runtime; select pg_temp.ctx(41,411);
insert into catalog_fixture values('venue',to_jsonb(menumini.create_branch('Internal branch A','fictional-published-cafe',pg_temp.id(4201))));
select menumini.assign_staff((pg_temp.catalog('venue')#>>'{}')::uuid,pg_temp.id(413),'EDITOR',true);
select menumini.assign_staff((pg_temp.catalog('venue')#>>'{}')::uuid,pg_temp.id(414),'WAITER',true);
select pg_temp.ok(menumini.read_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid) is null,'no invented persistent menu before its first save');
insert into catalog_fixture values('profile-result',menumini.save_branch_profile((pg_temp.catalog('venue')#>>'{}')::uuid,0,pg_temp.catalog('profile'),pg_temp.id(4202)));
insert into catalog_fixture values('menu-result',menumini.save_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid,0,pg_temp.catalog('menu'),pg_temp.id(4203)));
select pg_temp.ok(pg_temp.catalog('menu-result')->>'version'='1','initial menu save uses expected version zero and produces version one');
select pg_temp.ok(menumini.save_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid,0,pg_temp.catalog('menu'),pg_temp.id(4203))=pg_temp.catalog('menu-result'),'same draft request returns its original committed result');
select pg_temp.reject($q$select menumini.save_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid,0,pg_temp.catalog('menu'),pg_temp.id(4290))$q$,'40001','fresh stale save cannot overwrite a newer draft');
select pg_temp.reject($q$select menumini.save_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid,1,pg_temp.catalog('menu'),pg_temp.id(4203))$q$,'40001','same idempotency key cannot take a different expected version');
select pg_temp.reject($q$select menumini.save_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid,null,pg_temp.catalog('menu'),pg_temp.id(4291))$q$,'40001','null expected version cannot bypass draft concurrency');
select pg_temp.reject($q$select menumini.save_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid,1,pg_temp.catalog('menu'),null)$q$,'23514','persistent draft commands require a request key');
commit;
begin; set local role menu_public;
select pg_temp.ok(menumini.read_public_menu('fictional-published-cafe') is null,'saving branch/menu drafts does not publish anything');
select pg_temp.ok(menumini.read_public_menu('fictional-cafe') is null,'unvalidated legacy snapshot cannot be promoted to public HTTP data');
select pg_temp.reject('select * from menumini.app_users','42501','public role cannot read private contacts');
select pg_temp.reject('select * from menumini.menu_drafts','42501','public role cannot read menu drafts');
select pg_temp.reject('select * from menumini.recorded_receipts','42501','public role cannot read restaurant receipts');
select pg_temp.reject($q$select menumini.save_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid,1,pg_temp.catalog('menu'),pg_temp.id(4292))$q$,'42501','public role cannot call a catalog write command');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(41,414);
select pg_temp.ok((select count(*)=0 from menumini.menu_drafts),'waiter RLS hides editing drafts');
select pg_temp.reject($q$select menumini.read_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid)$q$,'42501','waiter cannot read the private menu draft through a function');
select pg_temp.reject($q$select menumini.publish_menu((pg_temp.catalog('venue')#>>'{}')::uuid,1,1,pg_temp.id(4293))$q$,'42501','waiter cannot publish');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(41,413);
select pg_temp.ok(menumini.read_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid)->>'version'='1','assigned editor can read this branch draft');
select pg_temp.reject($q$select menumini.save_branch_profile((pg_temp.catalog('venue')#>>'{}')::uuid,1,pg_temp.catalog('profile'),pg_temp.id(4294))$q$,'42501','editor cannot change the branch customer contact');
insert into catalog_fixture values('publication-one',menumini.publish_menu((pg_temp.catalog('venue')#>>'{}')::uuid,1,1,pg_temp.id(4204)));
select pg_temp.ok(pg_temp.catalog('publication-one')->>'revision'='1','assigned editor publishes one committed menu version');
select pg_temp.ok(menumini.publish_menu((pg_temp.catalog('venue')#>>'{}')::uuid,1,1,pg_temp.id(4204))=pg_temp.catalog('publication-one'),'publication retry returns the same publication and response');
commit;
select pg_temp.ok((select count(*)=1 from menumini.menu_publications where venue_id=(pg_temp.catalog('venue')#>>'{}')::uuid),'retry cannot duplicate a publication');
select pg_temp.ok((select count(*)=3 from menumini.audit_events where merchant_id=pg_temp.id(41) and action like 'catalog.%'),'saves and publication each create one audit event');
select pg_temp.ok((select count(*)=3 from menumini.outbox_events where merchant_id=pg_temp.id(41) and event_type like 'catalog.%'),'saves and publication each create one durable outbox event');
begin; set local role menu_public;
select pg_temp.ok(menumini.read_public_menu('fictional-published-cafe')#>>'{content,sections,0,items,0,basePrice}'='60.50','customer sees the committed exact price');
select pg_temp.ok(menumini.read_public_menu('fictional-published-cafe')->>'venueName'='Fictional Addis Cafe','public name comes from the explicit branch profile');
select pg_temp.ok(menumini.read_public_menu('fictional-published-cafe')::text not like '%Private Owner%' and menumini.read_public_menu('fictional-published-cafe')::text not like '%example.test%','public projection contains neither owner names nor optional email');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(41,411);
select menumini.save_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid,1,jsonb_set(pg_temp.catalog('menu'),'{sections,0,items,0,basePrice}','"70.00"'),pg_temp.id(4205));
select menumini.save_branch_profile((pg_temp.catalog('venue')#>>'{}')::uuid,1,jsonb_set(pg_temp.catalog('profile'),'{branch,publicName}','"Fictional New Name"'),pg_temp.id(4206));
select pg_temp.ok(menumini.save_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid,0,pg_temp.catalog('menu'),pg_temp.id(4203))=pg_temp.catalog('menu-result'),'old save retry returns the original response after later edits');
select pg_temp.reject($q$select menumini.publish_menu((pg_temp.catalog('venue')#>>'{}')::uuid,2,1,pg_temp.id(4295))$q$,'40001','publication checks the branch-profile version as well as the menu version');
select pg_temp.reject($q$select menumini.publish_menu((pg_temp.catalog('venue')#>>'{}')::uuid,1,2,pg_temp.id(4296))$q$,'40001','publication rejects stale menu content');
select menumini.set_availability((pg_temp.catalog('venue')#>>'{}')::uuid,pg_temp.id(4102),1,false,'Fictional sold out');
commit;
begin; set local role menu_public;
select pg_temp.ok(menumini.read_public_menu('fictional-published-cafe')#>>'{content,sections,0,items,0,basePrice}'='60.50','editing a price does not alter the customer menu');
select pg_temp.ok(menumini.read_public_menu('fictional-published-cafe')->>'venueName'='Fictional Addis Cafe','editing branch details does not alter the published public name');
select pg_temp.ok(menumini.read_public_menu('fictional-published-cafe')#>>'{content,sections,0,items,0,availableNow}'='false','live availability can change without publishing draft prices');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(41,411);
insert into catalog_fixture values('publication-two',menumini.publish_menu((pg_temp.catalog('venue')#>>'{}')::uuid,2,2,pg_temp.id(4207)));
select pg_temp.ok(pg_temp.catalog('publication-two')->>'revision'='2','next publication has the next branch revision');
select pg_temp.ok(pg_temp.catalog('publication-two')#>>'{content,sections,0,items,0,availableNow}'='false','publication preserves the explicit sold-out override');
select pg_temp.reject($q$update menumini.menu_drafts set version=99$q$,'42501','runtime cannot bypass the draft command with a table write');
commit;
select pg_temp.ok((select snapshot#>>'{sections,0,items,0,basePrice}'='60.50' from menumini.menu_publications where id=(pg_temp.catalog('publication-one')->>'publicationId')::uuid),'older publication prices remain immutable after new publication');
select pg_temp.reject($q$update menumini.menu_publications set snapshot='{}' where id=(pg_temp.catalog('publication-one')->>'publicationId')::uuid$q$,'23514','even table-owner mutation cannot rewrite a published snapshot');
begin; set local role menu_runtime; select pg_temp.ctx(42,412);
insert into catalog_fixture values('venue-b',to_jsonb(menumini.create_branch('Internal branch B','fictional-unpublished-cafe',pg_temp.id(4210))));
select pg_temp.ok((select count(*)=0 from menumini.menu_drafts),'business B cannot see business A draft rows');
select pg_temp.reject($q$select menumini.read_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid)$q$,'42501','business B cannot call a draft reader for A');
select pg_temp.reject($q$select menumini.save_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid,2,pg_temp.catalog('menu'),pg_temp.id(4297))$q$,'42501','business B cannot mutate A by choosing its branch ID');
select pg_temp.reject($q$select menumini.save_menu_draft((pg_temp.catalog('venue-b')#>>'{}')::uuid,0,pg_temp.catalog('menu'),pg_temp.id(4298))$q$,'23514','another business cannot reuse A catalog identities inside its own draft');
commit;
begin; set local role menu_runtime; select pg_temp.ctx(41,411);
select pg_temp.reject($q$select menumini.save_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid,2,jsonb_set(pg_temp.catalog('menu'),'{sections,0,items,0,basePrice}','60.50'),pg_temp.id(4300))$q$,'23514','numeric JSON price rejected instead of silently rounded');
select pg_temp.reject($q$select menumini.save_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid,2,jsonb_set(pg_temp.catalog('menu'),'{sections,0,items,0,basePrice}','"60.005"'),pg_temp.id(4301))$q$,'23514','three-decimal price rejected');
select pg_temp.reject($q$select menumini.save_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid,2,pg_temp.catalog('menu')||'{"ownerPhone":"0900000011"}',pg_temp.id(4302))$q$,'23514','private contact fields cannot enter menu content');
select pg_temp.reject($q$select menumini.save_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid,2,jsonb_set(pg_temp.catalog('menu'),'{sections,0,items,0,id}',to_jsonb(pg_temp.id(4101)::text)),pg_temp.id(4303))$q$,'23514','entity IDs must be unique across sections and items');
select pg_temp.reject($q$select menumini.save_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid,2,jsonb_set(pg_temp.catalog('menu'),'{sections,0,items,1,modifiers,0,minSelections}','2'),pg_temp.id(4304))$q$,'23514','invalid single-select bounds rejected');
select pg_temp.reject($q$select menumini.save_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid,2,jsonb_set(jsonb_set(pg_temp.catalog('menu'),'{sections,0,items,1,modifiers,0,choices,0,isAvailable}','false'),'{sections,0,items,1,modifiers,0,choices,1,isAvailable}','false'),pg_temp.id(4305))$q$,'23514','required modifier cannot have no available choices');
select pg_temp.reject($q$select menumini.save_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid,2,jsonb_set(pg_temp.catalog('menu'),'{sections,0,items,1,modifiers,0,choices,0,priceDelta}','"-90.00"'),pg_temp.id(4306))$q$,'23514','modifier combinations cannot produce negative prices');
select pg_temp.ok(menumini.read_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid)->>'version'='2','invalid commands leave the last valid draft untouched');
select pg_temp.reject($q$select menumini.save_branch_profile((pg_temp.catalog('venue')#>>'{}')::uuid,2,jsonb_set(pg_temp.catalog('profile'),'{branch,hours,1,day}','0'),pg_temp.id(4307))$q$,'23514','duplicate hours day rejected at the database boundary');
select pg_temp.reject($q$select menumini.save_branch_profile((pg_temp.catalog('venue')#>>'{}')::uuid,2,pg_temp.catalog('profile')||'{"plan":"PRO"}',pg_temp.id(4308))$q$,'23514','branch profile cannot assert plan activation');
commit;
-- Public reader derives routing solely from a committed route, never a caller tenant setting.
begin; set local role menu_public;
select set_config('menu.merchant_id',pg_temp.id(42)::text,true);
select pg_temp.ok(menumini.read_public_menu('fictional-published-cafe')#>>'{content,sections,0,items,0,basePrice}'='70.00','public lookup returns the latest committed version independently of tenant settings');
select pg_temp.ok(menumini.read_public_menu('fictional-unpublished-cafe') is null,'unpublished branch has no public menu');
select pg_temp.ok(menumini.read_public_menu('not-a-menu') is null,'unknown public menu is absent');
commit;
update menumini.venue_routes set is_active=false where slug='fictional-published-cafe';
begin; set local role menu_public; select pg_temp.ok(menumini.read_public_menu('fictional-published-cafe') is null,'disabled route is unavailable'); commit;
update menumini.venue_routes set is_active=true where slug='fictional-published-cafe';
update menumini.venues set archived_at=now() where id=(pg_temp.catalog('venue')#>>'{}')::uuid;
begin; set local role menu_public; select pg_temp.ok(menumini.read_public_menu('fictional-published-cafe') is null,'archived branch is unavailable'); commit;
begin; set local role menu_runtime; select pg_temp.ctx(41,411);
select pg_temp.reject($q$select menumini.save_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid,2,pg_temp.catalog('menu'),pg_temp.id(4309))$q$,'42501','archived branch cannot accept new catalog edits'); commit;
update menumini.venues set archived_at=null where id=(pg_temp.catalog('venue')#>>'{}')::uuid;
begin; set local role menu_runtime; select pg_temp.ctx(41,411);
select 'CATALOG_EXAMPLE:'||jsonb_build_object('schema','MenuDraft','value',menumini.read_menu_draft((pg_temp.catalog('venue')#>>'{}')::uuid))::text;
select 'CATALOG_EXAMPLE:'||jsonb_build_object('schema','BranchProfile','value',menumini.read_branch_profile((pg_temp.catalog('venue')#>>'{}')::uuid))::text;
commit;
begin; set local role menu_public;
select 'CATALOG_EXAMPLE:'||jsonb_build_object('schema','PublicMenu','value',menumini.read_public_menu('fictional-published-cafe'))::text;
commit;
