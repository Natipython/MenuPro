import {rehearsalPayers} from '$lib/payer/rehearsal';
import type {FictionalGuestSession} from '$lib/payer/rehearsal';
import type {PayerGateway,PayerStaffGateway} from '$lib/payer/client';
import type {GuestGateway} from '$lib/guest/client';
import {GuestClientError} from '$lib/guest/client';
import {validateGuestCommand} from '$lib/guest/model';
import type {GuestContext,GuestOperation} from '$lib/guest/model';
import {rehearsalCashierGateway} from '$lib/cashier/rehearsal';
// In-memory fictional rehearsal only. No HTTP, database, browser storage or identity.
import type {ServiceGateway} from './client';
import {ServiceClientError} from './client';
import type {ServiceOffer,ServiceOrder,DiningTable,StaffVisit,OrderStatus,Selection,ServiceOperation} from './model';
import {estimateSelection,moneyCents,centsText} from './model';
const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
export const REHEARSAL_BRANCH=id(9000);
export function rehearsalGateway():ServiceGateway & {setPreparationOnly:(value:boolean)=>void;cashier:ReturnType<typeof rehearsalCashierGateway>;guestA:GuestGateway&{payer:PayerGateway};guestB:GuestGateway&{payer:PayerGateway};cashierPayers:PayerStaffGateway} {
  let preparationOnly=false;
  let sequence=9100;const tables:DiningTable[]=[{id:id(9001),branchId:REHEARSAL_BRANCH,label:'Table 1',active:true,version:1,visit:null},
    {id:id(9002),branchId:REHEARSAL_BRANCH,label:'Table 2',active:true,version:1,visit:null}];
  const orders:ServiceOrder[]=[];const visits:StaffVisit[]=[];const results=new Map<string,{payload:string;value:unknown}>();
  const offer:ServiceOffer={pricingFingerprint:'f'.repeat(64),pricing:{taxMode:'NONE',taxRateBps:0,serviceRateBps:0,taxOnService:false},menu:{
    publicationId:id(9003),revision:1,venueId:REHEARSAL_BRANCH,venueName:'Fictional Addis Cafe',currency:'ETB',availabilityRevision:1,
    branch:{publicName:'Fictional Addis Cafe',name:'Rehearsal branch',city:'Addis Ababa',landmark:'Fictional venue',serviceMode:'DINE_IN',currency:'ETB',timezone:'Africa/Addis_Ababa',hours:Array.from({length:7},(_,day)=>({day,status:'UNSPECIFIED'}))},
    content:{themeId:'mini-warm-habesha',primaryColor:'#F59E0B',sections:[{id:id(9004),nameEn:'Coffee & tea',items:[
      {id:id(9005),nameEn:'Fictional coffee',nameAm:'የሙከራ ቡና',basePrice:'60.50',availableNow:true,modifiers:[{id:id(9006),label:'Size',mode:'SINGLE_SELECT',minSelections:1,maxSelections:1,choices:[
        {id:id(9007),label:'Regular',priceDelta:'0.00',isAvailable:true},{id:id(9008),label:'Large',priceDelta:'10.00',isAvailable:true}]}]},
      {id:id(9009),nameEn:'Fictional tea',basePrice:'40.00',availableNow:true,modifiers:[]},
      {id:id(9010),nameEn:'Fictional pastry',basePrice:'80.00',availableNow:false,modifiers:[]}
    ]}]}}};
  function fail(status:number,message:string):never{throw new ServiceClientError(status,message);}
  const cashier=rehearsalCashierGateway(REHEARSAL_BRANCH,()=>visits,()=>orders,()=>tables);
  const transitions=(s:OrderStatus):OrderStatus[]=>s==='SUBMITTED'?['ACCEPTED','CANCELLED']:s==='ACCEPTED'?['PREPARING','COMPLETED','CANCELLED']:s==='PREPARING'?['READY','CANCELLED']:s==='READY'?['COMPLETED','CANCELLED']:[];
  const projected=(o:ServiceOrder)=>({...structuredClone(o),allowedTransitions:preparationOnly?(o.status==='ACCEPTED'?['PREPARING']:o.status==='PREPARING'?['READY']:[]):transitions(o.status)});
  function placeOrder(source:'STAFF'|'GUEST',body:Record<string,unknown>):ServiceOrder{
      const visit=visits.find(v=>v.id===body.visitId&&v.status==='OPEN');if(!visit)fail(409,'This seating has ended.');
      if(cashier.currentBill(visit.id).status!=='OPEN')fail(409,'This bill was finalized. Further order rounds are closed.');
      const selections=body.items as Selection[];if(!selections.length)fail(422,'Add an item first.');const amounts=estimateSelection(offer,selections);
      const order:ServiceOrder={id:id(sequence++),branchId:REHEARSAL_BRANCH,visitId:visit.id,source,status:'SUBMITTED',version:1,currency:'ETB',
        tableLabel:tables.find(t=>t.id===visit.tableId)!.label,customerNote:String(body.customerNote||''),createdAt:new Date().toISOString(),...amounts,allowedTransitions:transitions('SUBMITTED'),
        items:selections.map(s=>{const item=offer.menu.content.sections[0].items.find(i=>i.id===s.itemId)!;const selected=item.modifiers.flatMap(g=>g.choices.filter(c=>s.choiceIds.includes(c.id)));
          const unit=moneyCents(item.basePrice)+selected.reduce((n,c)=>n+moneyCents(c.priceDelta),0n);return{id:id(sequence++),nameEn:item.nameEn,...(item.nameAm?{nameAm:item.nameAm}:{}),quantity:s.quantity,
            unitPrice:centsText(unit),lineTotal:centsText(unit*BigInt(s.quantity)),selectedOptions:selected.map(c=>c.label),specialInstructions:s.specialInstructions||''};})};orders.push(order);return order;
  }
  const guestSessions:(()=>FictionalGuestSession)[]=[];
  const payers=rehearsalPayers(()=>visits,()=>guestSessions.map(s=>s()),cashier);
  const guestOwners=new Map<string,string>();
  const invitations=new Map<string,{token:string;expiresAt:string}>();
  const tableTokens=new Map(tables.map(t=>[t.id,'FICTIONAL_TABLE_'+t.id.slice(-12).padStart(27,'0')]));
  const fictionalToken=(purpose:string)=>('FICTIONAL_'+purpose+'_').padEnd(31,'X')+String(sequence++).padStart(12,'0');
  function guestGateway(number:number):GuestGateway&{payer:PayerGateway}{
   let session={id:id(number),tableId:tables[0].id,visitId:null as string|null,active:true,expiresAt:new Date(Date.now()+43200000).toISOString()};
   guestSessions.push(()=>session);
   const saved=new Map<string,{payload:string;value:unknown}>();
   const failGuest=(status:number,message:string):never=>{throw new GuestClientError(status,message);};
   function context():GuestContext{
    if(!session.active||Date.parse(session.expiresAt)<=Date.now())failGuest(401,'This fictional session has ended.');
    const visit=visits.find(v=>v.id===session.visitId);
    return {session:{id:session.id,venueId:REHEARSAL_BRANCH,tableId:session.tableId,tableLabel:tables.find(t=>t.id===session.tableId)!.label,expiresAt:session.expiresAt},
      association:visit?{visitId:visit.id,tableId:visit.tableId,visitStatus:visit.status,canSubmitOrders:visit.status==='OPEN'&&cashier.currentBill(visit.id).status==='OPEN'}:null,
      csrfToken:('FICTIONAL_CSRF_'+number).padEnd(43,'X')};
   }
   const ownOrder=(order:ServiceOrder)=>{const {allowedTransitions,...value}=structuredClone(order);return value;};
   return {payer:payers.guest(()=>session),async call<T>(op:GuestOperation,resource:string|null=null,body:Record<string,unknown>={},key?:string):Promise<T>{
    const payload=JSON.stringify({op,resource,body});const prior=key?saved.get(key):null;
    if(prior){if(op!=='REVOKE')context();if(prior.payload!==payload)failGuest(409,'This fictional retry key has different content.');return structuredClone(prior.value) as T;}
    let value:unknown;
    if(op==='START'){
     if(session.active)failGuest(409,'Leave this session before starting another.');
     const tableId=[...tableTokens].find(([,token])=>token===body.tableToken)?.[0];if(!tableId)failGuest(403,'Use the fictional table code issued by the owner.');
     session={id:id(sequence++),tableId:tableId!,visitId:null,active:true,expiresAt:new Date(Date.now()+43200000).toISOString()};value=context();
    }else{
     const ctx=context();
     if(op==='CONTEXT')value=ctx;
     else if(op==='OFFER')value=offer;
     else if(op==='ORDERS'){const own=orders.filter(o=>guestOwners.get(o.id)===session.id);const at=body.cursor?own.findIndex(o=>o.id===body.cursor)+1:0;const limit=Number(body.limit||50);value={items:own.slice(at,at+limit).map(ownOrder),nextCursor:own.length>at+limit?own[at+limit-1].id:null};}
     else if(op==='READ_ORDER'){const o=orders.find(o=>o.id===resource&&guestOwners.get(o.id)===session.id);if(!o)failGuest(404,'This order is unavailable to this session.');value=ownOrder(o!);}
     else if(op==='PAIR'){
      const invitation=invitations.get(resource||'');const visit=visits.find(v=>v.id===resource&&v.tableId===session.tableId&&v.status==='OPEN');
      if(!visit||!invitation||invitation.token!==body.pairingToken||Date.parse(invitation.expiresAt)<=Date.now()||cashier.currentBill(visit.id).status!=='OPEN')failGuest(403,'Ask staff for a current invitation for this table.');
      if(session.visitId&&session.visitId!==visit!.id)failGuest(403,'Start a new session for another seating.');session.visitId=visit!.id;value={visitId:visit!.id,tableId:session.tableId,canSubmitOrders:true};
     }else if(op==='SUBMIT'){
      if(!ctx.association?.canSubmitOrders||body.visitId!==session.visitId)failGuest(403,'Join the confirmed seating before sending a request.');
      if(validateGuestCommand(op,body).length)failGuest(422,'Check the required order fields.');
      if(body.pricingFingerprint!==offer.pricingFingerprint||body.menuPublicationId!==offer.menu.publicationId)failGuest(409,'Reload the current menu and review your draft.');
      try{const order=placeOrder('GUEST',body);guestOwners.set(order.id,session.id);value=ownOrder(order);}catch(e){failGuest(e instanceof ServiceClientError?e.status:422,e instanceof Error?e.message:'Check the selected items.');}
     }else if(op==='REVOKE'){session.active=false;value={revoked:true};}
     else failGuest(422,'Unknown fictional guest operation.');
    }
    if(key)saved.set(key,{payload,value:structuredClone(value)});return structuredClone(value) as T;
   }};
  }
  const guestA=guestGateway(9750),guestB=guestGateway(9751);
  return {cashier,guestA,guestB,cashierPayers:payers.staff,setPreparationOnly(value:boolean){preparationOnly=value;},async call<T>(op:ServiceOperation,resource:string,body:Record<string,unknown>={},key?:string):Promise<T>{
    if(preparationOnly&&!['QUEUE','TRANSITION_ORDER'].includes(op))fail(403,'Preparation view handles accepted work only.');
    const payload=JSON.stringify({op,resource,body});
    if(key&&results.has(key)){const prior=results.get(key)!;if(prior.payload!==payload)fail(409,'Rehearsal request key conflict.');return structuredClone(prior.value) as T;}
    let value:unknown;
    if(op==='TABLES')value={branchId:REHEARSAL_BRANCH,items:tables};
    else if(op==='OFFER')value=offer;
    else if(op==='QUEUE')value={branchId:REHEARSAL_BRANCH,items:orders.filter(o=>!['COMPLETED','CANCELLED'].includes(o.status)&&(!preparationOnly||o.status!=='SUBMITTED')).map(projected),nextCursor:null};
    else if(op==='CREATE_TABLE'){
      const label=String(body.label||'').trim();if(!label||tables.some(t=>t.label.toLowerCase()===label.toLowerCase()))fail(409,'Use a new table label.');
      const t={id:id(sequence++),branchId:REHEARSAL_BRANCH,label,active:true,version:1,visit:null};tables.push(t);value=t;
    }else if(op==='UPDATE_TABLE'){
      const table=tables.find(t=>t.id===resource);if(!table||table.version!==body.expectedVersion||table.visit)fail(409,'Only an unchanged idle table can be edited.');
      const label=String(body.label||'').trim();if(!label||tables.some(t=>t.id!==resource&&t.label.toLowerCase()===label.toLowerCase()))fail(409,'Use a distinct table label.');
      table.label=label;table.active=body.active===true;table.version++;value=table;
    }else if(op==='OPEN_STAFF_VISIT'){
      const table=tables.find(t=>t.id===body.tableId);if(!table?.active||table.visit)fail(409,'Choose an active free table.');
      const visit:StaffVisit={id:id(sequence++),branchId:REHEARSAL_BRANCH,tableId:table.id,version:1,status:'OPEN',billId:id(sequence++)};table.visit=visit;visits.push(visit);value=visit;
    }else if(op==='SUBMIT_STAFF_ORDER'){
      value=placeOrder('STAFF',body);
    }else if(op==='ISSUE_TABLE_LINK'){
      const table=tables.find(t=>t.id===resource);if(!table||table.version!==body.expectedVersion||!table.active)fail(409,'Refresh this table before issuing its link.');
      const token=fictionalToken('TABLE');tableTokens.set(table.id,token);table.version++;value={tableId:table.id,branchId:REHEARSAL_BRANCH,version:table.version,tableToken:token,active:true};
    }else if(op==='ISSUE_INVITATION'){
      const visit=visits.find(v=>v.id===resource);if(!visit||visit.version!==body.expectedVersion||visit.status!=='OPEN'||cashier.currentBill(visit.id).status!=='OPEN')fail(409,'This seating is no longer available for joining.');
      const invitation={token:fictionalToken('INVITATION'),expiresAt:new Date(Date.now()+300000).toISOString()};invitations.set(visit.id,invitation);visit.version++;
      value={visitId:visit.id,tableId:visit.tableId,branchId:REHEARSAL_BRANCH,version:visit.version,pairingToken:invitation.token,expiresAt:invitation.expiresAt,active:true};
    }else if(op==='TRANSITION_ORDER'){
      const order=orders.find(o=>o.id===resource);if(!order||order.version!==body.expectedVersion||!order.allowedTransitions.includes(body.status as OrderStatus))fail(409,'Refresh the current service state.');
      if(preparationOnly&&!projected(order).allowedTransitions.includes(body.status as never))fail(403,'Preparation staff can start work and mark it ready.');
      if(body.status==='CANCELLED'&&!String(body.reason||'').trim())fail(422,'Enter a reason.');cashier.currentBill(order.visitId);order.status=body.status as OrderStatus;order.version++;order.allowedTransitions=transitions(order.status);cashier.currentBill(order.visitId);value=order;
    }else if(op==='END_VISIT'){
      const visit=visits.find(v=>v.id===resource);if(!visit||visit.version!==body.expectedVersion||visit.status!=='OPEN')fail(409,'This seating has changed.');
      if(orders.some(o=>o.visitId===visit.id&&!['COMPLETED','CANCELLED'].includes(o.status)))fail(409,'Resolve all service work before ending the seating.');
      visit.status='ENDED';visit.version++;tables.find(t=>t.id===visit.tableId)!.visit=null;value=visit;
    }else if(op==='READ_BILL'){
      const visit=visits.find(v=>v.billId===resource);if(!visit)fail(404,'No rehearsal bill.');
      value=cashier.currentBill(visit.id);
    }else fail(422,'This action is not part of the rehearsal.');
    const copy=structuredClone(value);if(key)results.set(key,{payload,value:copy});return structuredClone(copy) as T;
  }};
}
