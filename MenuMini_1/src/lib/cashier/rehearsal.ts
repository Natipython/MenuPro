// Fictional memory only. Actual immutable records and permissions are tested in PG.
import type {CashierGateway} from './client';
import type {CashierDetail,Bill,BillSummary,Receipt,Refund,CashierOperation} from './model';
import {validateCashierCommand,cashierRead} from './model';
import type {PayerDetail,PayerClaim,PayerAccount} from '$lib/payer/model';
import {validatePayerCommand} from '$lib/payer/model';
import type {ServiceOrder,StaffVisit,DiningTable} from '$lib/service/model';
import {moneyCents,centsText} from '$lib/service/model';
import {ServiceClientError} from '$lib/service/client';
const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
export function rehearsalCashierGateway(branchId:string,visits:()=>StaffVisit[],orders:()=>ServiceOrder[],tables:()=>DiningTable[]):CashierGateway&{setManager:(value:boolean)=>void;currentBill:(visitId:string)=>Bill;payerDetail:(billId:string,payerId:string,expiresAt:string)=>PayerDetail;submitPayerReport:(billId:string,payerId:string,body:Record<string,unknown>)=>PayerClaim;payerClaims:(billId:string,payerId:string)=>PayerClaim[]}{
 let manager=false;let sequence=9700;
 const states=new Map<string,{status:Bill['status'];version:number;charge:bigint;openedAt:string}>();
 const receipts:CashierDetail['receipts']=[],refunds:CashierDetail['refunds']=[],credits:CashierDetail['credits']=[];
 const acceptedOrders=new Set<string>();
 const claims:{payerId:string;value:PayerClaim}[]=[];
 const payerAccount:PayerAccount={id:id(9601),provider:'CBE',holderName:'Fictional Cafe',accountIdentifier:'FICTIONAL-DO-NOT-PAY-9601',destinationFingerprint:'c'.repeat(64)};
 const accountLabel='CBE · Fictional Cafe · …9601';
 const results=new Map<string,{payload:string;result:unknown}>();
 const fail=(status:number,message:string):never=>{throw new ServiceClientError(status,message);};
 function visitForBill(billId:string){const v=visits().find(v=>v.billId===billId);if(!v)throw new ServiceClientError(404,'No fictional bill.');return v;}
 function state(billId:string){const v=visitForBill(billId);let s=states.get(billId);if(!s){s={status:'OPEN',version:1,charge:0n,openedAt:new Date().toISOString()};states.set(billId,s);}
  orders().filter(o=>o.visitId===v.id&&!['SUBMITTED','CANCELLED'].includes(o.status)).forEach(o=>acceptedOrders.add(o.id));
  const current=orders().filter(o=>o.visitId===v.id&&!['SUBMITTED','CANCELLED'].includes(o.status)).reduce((n,o)=>n+moneyCents(o.totalAmount),0n)-credits.filter(c=>orders().some(o=>o.id===c.orderId&&o.visitId===v.id&&!['SUBMITTED','CANCELLED'].includes(o.status))).reduce((n,c)=>n+moneyCents(c.amount),0n);
  if(current!==s.charge){
    s.charge=current;s.version++;
    let excess=receipts.filter(r=>r.receipt.billId===billId).reduce((n,r)=>n+moneyCents(r.receipt.allocatedAmount),0n)-current;
    for(const r of [...receipts].reverse().filter(r=>r.receipt.billId===billId)){
      if(excess<=0n)break;const allocated=moneyCents(r.receipt.allocatedAmount);const reverse=allocated<excess?allocated:excess;
      r.receipt.allocatedAmount=centsText(allocated-reverse);r.receipt.unappliedAmount=centsText(moneyCents(r.receipt.unappliedAmount)+reverse);excess-=reverse;
    }
    if(s.status==='CLOSED')s.status='FINALIZED';
  }return s;
 }
 function bill(billId:string):Bill{const v=visitForBill(billId),s=state(billId),rs=receipts.filter(r=>r.receipt.billId===billId);const allocated=rs.reduce((n,r)=>n+moneyCents(r.receipt.allocatedAmount),0n);const unapplied=rs.reduce((n,r)=>n+moneyCents(r.receipt.unappliedAmount),0n);
  const reserved=rs.reduce((n,r)=>n+moneyCents(r.reservedAmount),0n);const outstanding=s.charge-allocated;
  return{id:billId,visitId:v.id,branchId,version:s.version,status:s.status,currency:'ETB',chargeAmount:centsText(s.charge),allocatedAmount:centsText(allocated),outstandingAmount:centsText(outstanding),unappliedAmount:centsText(unapplied),refundPendingAmount:centsText(reserved),settlement:s.charge===0n?'NO_PAYMENT_DUE':outstanding===0n?'PAID':allocated>0n?'PARTIALLY_PAID':'UNPAID'};
 }
 function summary(billId:string):BillSummary{const v=visitForBill(billId);return{bill:bill(billId),tableLabel:orders().find(o=>o.visitId===v.id)?.tableLabel||tables().find(t=>t.id===v.tableId)!.label,visitStatus:v.status,openedAt:state(billId).openedAt};}
 function detail(billId:string):CashierDetail{const v=visitForBill(billId);return{summary:summary(billId),orders:orders().filter(o=>o.visitId===v.id).map(o=>({id:o.id,status:o.status,totalAmount:o.totalAmount,items:structuredClone(o.items),remainingChargeAmount:centsText(!['SUBMITTED','CANCELLED'].includes(o.status)?moneyCents(o.totalAmount)-credits.filter(c=>c.orderId===o.id).reduce((n,c)=>n+moneyCents(c.amount),0n):0n)})),
  credits:credits.filter(c=>orders().some(o=>o.id===c.orderId&&o.visitId===v.id)),receipts:receipts.filter(r=>r.receipt.billId===billId),claims:claims.filter(c=>c.value.claim.billId===billId).map(c=>({claim:structuredClone(c.value.claim),providerReference:c.value.providerReference,accountLabel:c.value.accountLabel})),refunds:refunds.filter(q=>receipts.some(r=>r.receipt.id===q.refund.receiptId&&r.receipt.billId===billId)),accounts:[{id:id(9601),label:'CBE · Fictional Cafe · …9601'}],permissions:{manage:true,adjust:manager,refund:manager}};}
 function receipt(id:string){const r=receipts.find(r=>r.receipt.id===id);if(!r)throw new ServiceClientError(404,'No fictional receipt.');return r;}
 function refund(id:string){const r=refunds.find(r=>r.refund.id===id);if(!r)throw new ServiceClientError(404,'No fictional refund.');return r;}
 function payerClaims(billId:string,payerId:string){return structuredClone(claims.filter(c=>c.payerId===payerId&&c.value.claim.billId===billId).map(c=>c.value));}
 function payerDetail(billId:string,payerId:string,expiresAt:string):PayerDetail{const d=detail(billId);return{bill:d.summary.bill,tableLabel:d.summary.tableLabel,visitStatus:d.summary.visitStatus,openedAt:d.summary.openedAt,expiresAt,
  orders:d.orders.filter(o=>acceptedOrders.has(o.id)).map(o=>({id:o.id,status:o.status,totalAmount:o.totalAmount,netChargeAmount:o.remainingChargeAmount,creditedAmount:centsText(moneyCents(o.totalAmount)-moneyCents(o.remainingChargeAmount)),items:o.items.map(({specialInstructions,...line})=>line)})),accounts:[structuredClone(payerAccount)],claims:{items:payerClaims(billId,payerId),nextCursor:null}};}
 function submitPayerReport(billId:string,payerId:string,body:Record<string,unknown>):PayerClaim{
  visitForBill(billId);if(validatePayerCommand('CLAIM',body).length)fail(422,'Check exact amount, reference, destination and already-sent confirmation.');
  if(body.accountId!==payerAccount.id||body.destinationFingerprint!==payerAccount.destinationFingerprint)fail(409,'The receiving destination changed. Review with staff; do not send another transfer.');
  const reference=String(body.providerReference).trim().normalize('NFC');
  if(claims.some(c=>c.value.claim.status!=='REJECTED'&&c.value.providerReference.toUpperCase()===reference.toUpperCase())||receipts.some(r=>r.providerReference?.trim().toUpperCase()===reference.toUpperCase()))fail(409,'This receiving account/reference is already reported or recorded.');
  if(claims.some(c=>c.payerId===payerId&&c.value.claim.billId===billId&&c.value.claim.status==='SUBMITTED'))fail(422,'Ask staff to resolve your pending report first.');
  if(claims.filter(c=>c.payerId===payerId&&Date.parse(c.value.submittedAt)>Date.now()-3600000).length>=5)fail(429,'Too many reports. Ask the cashier for help.');
  const value:PayerClaim={claim:{id:id(sequence++),billId,version:1,status:'SUBMITTED',reportedAmount:String(body.reportedAmount)},providerReference:reference,accountLabel,submittedAt:new Date().toISOString(),reviewedAt:null,verifiedReceivedAmount:null};claims.push({payerId,value});return structuredClone(value);
 }
 return{payerDetail,submitPayerReport,payerClaims,setManager(value:boolean){manager=value;},currentBill(visitId:string){const v=visits().find(v=>v.id===visitId);if(!v)throw new ServiceClientError(404,'No seating.');return structuredClone(bill(v.billId));},async call<T>(op:CashierOperation,resource:string,body:Record<string,unknown>={},key?:string):Promise<T>{
  if(!cashierRead(op)&&validateCashierCommand(op,body).length)fail(422,'Check exact amounts, reasons and actual-funds confirmation.');
  if(['CREDIT_BILL','REVIEW_REFUND','EXECUTE_REFUND'].includes(op)&&!manager)fail(403,'This action needs the fictional manager view.');
  const payload=JSON.stringify({op,resource,body});if(key&&results.has(key)){const prior=results.get(key)!;if(prior.payload!==payload)fail(409,'This action key already has different content.');return structuredClone(prior.result) as T;}
  let result:unknown;
  if(op==='BILLS')result={branchId,items:visits().map(v=>summary(v.billId)).filter(s=>body.view==='CLOSED'?s.bill.status==='CLOSED':s.bill.status!=='CLOSED'),nextCursor:null};
  else if(op==='DETAIL')result=detail(resource);
  else{
   const billId=op==='REVIEW_CLAIM'?(claims.find(c=>c.value.claim.id===resource)?.value.claim.billId||fail(404,'No fictional report.')):['ALLOCATE_RECEIPT','REQUEST_REFUND'].includes(op)?receipt(resource).receipt.billId:['REVIEW_REFUND','EXECUTE_REFUND'].includes(op)?receipt(refund(resource).refund.receiptId).receipt.billId:resource;
   const b=bill(billId),s=state(billId),d=detail(billId);
   if('expectedVersion' in body&&!['REVIEW_CLAIM','REVIEW_REFUND','EXECUTE_REFUND'].includes(op)&&body.expectedVersion!==b.version)fail(409,'This bill changed. Refresh and review.');
   if(op==='FINALIZE_BILL'){
    if(s.status!=='OPEN'||d.orders.some(o=>o.status==='SUBMITTED'))fail(409,'Resolve pending requests before finalizing.');s.status='FINALIZED';s.version++;result=bill(billId);
   }else if(op==='CLOSE_BILL'){
    if(s.status!=='FINALIZED'||b.outstandingAmount!=='0.00'||b.unappliedAmount!=='0.00'||b.refundPendingAmount!=='0.00'||d.orders.some(o=>!['COMPLETED','CANCELLED'].includes(o.status)))fail(409,'Service or financial obligations remain unresolved.');s.status='CLOSED';s.version++;result=bill(billId);
   }else if(op==='RECORD_RECEIPT'){
    if(body.method==='BANK_TRANSFER'&&receipts.some(r=>r.providerReference===body.providerReference))fail(409,'This fictional bank reference is already recorded.');
    const r:Receipt={id:id(sequence++),billId,method:body.method as Receipt['method'],currency:'ETB',receivedAmount:String(body.receivedAmount),allocatedAmount:'0.00',refundedAmount:'0.00',unappliedAmount:String(body.receivedAmount)};
    receipts.push({receipt:r,recordedAt:new Date().toISOString(),verificationNote:String(body.verificationNote),providerReference:body.method==='BANK_TRANSFER'?String(body.providerReference):null,accountLabel:body.method==='BANK_TRANSFER'?'CBE · Fictional Cafe · …9601':null,reservedAmount:'0.00'});
    if(s.status==='CLOSED')s.status='FINALIZED';s.version++;result=r;
   }else if(op==='REVIEW_CLAIM'){
    const c=claims.find(c=>c.value.claim.id===resource)!.value;if(c.claim.version!==body.expectedVersion||c.claim.status!=='SUBMITTED')fail(409,'Report already reviewed or changed.');
    if(body.decision==='APPROVE'){
     const verified=moneyCents(String(body.verifiedAmount)),allocated=moneyCents(String(body.allocationAmount));
     if(allocated>verified||allocated>moneyCents(b.outstandingAmount))fail(422,'Allocation exceeds received funds or the outstanding bill.');
     if(receipts.some(r=>r.providerReference?.trim().toUpperCase()===c.providerReference.toUpperCase()))fail(409,'This reference already has received funds recorded.');
     const r:Receipt={id:id(sequence++),billId,method:'BANK_TRANSFER',currency:'ETB',receivedAmount:centsText(verified),allocatedAmount:centsText(allocated),refundedAmount:'0.00',unappliedAmount:centsText(verified-allocated)};
     receipts.push({receipt:r,recordedAt:new Date().toISOString(),verificationNote:String(body.verificationNote),providerReference:c.providerReference,accountLabel,reservedAmount:'0.00'});c.verifiedReceivedAmount=r.receivedAmount;c.claim.status='APPROVED';if(s.status==='CLOSED')s.status='FINALIZED';s.version++;
    }else c.claim.status='REJECTED';
    c.claim.version++;c.reviewedAt=new Date().toISOString();result=c.claim;
   }else if(op==='ALLOCATE_RECEIPT'){
    const r=receipt(resource);const amount=moneyCents(String(body.amount));
    if(body.billId!==billId||body.expectedBillVersion!==b.version||b.status==='CLOSED')fail(409,'Review this receipt and bill version.');
    if(amount>moneyCents(r.receipt.unappliedAmount)-moneyCents(r.reservedAmount)||amount>moneyCents(b.outstandingAmount))fail(422,'Allocation exceeds available funds or outstanding balance.');
    r.receipt.allocatedAmount=centsText(moneyCents(r.receipt.allocatedAmount)+amount);r.receipt.unappliedAmount=centsText(moneyCents(r.receipt.unappliedAmount)-amount);s.version++;result={id:id(sequence++),receiptId:resource,billId,amount:String(body.amount)};
   }else if(op==='CREDIT_BILL'){
    const order=d.orders.find(o=>o.id===body.orderId);const amount=moneyCents(String(body.amount));if(!order||amount>moneyCents(order.remainingChargeAmount))fail(422,'Credit exceeds this order’s remaining charge.');
    credits.push({id:id(sequence++),orderId:String(body.orderId),amount:String(body.amount),reason:String(body.reason),recordedAt:new Date().toISOString()});
    let excess=moneyCents(b.allocatedAmount)-(moneyCents(b.chargeAmount)-amount);
    for(const r of [...receipts].reverse().filter(r=>r.receipt.billId===billId)){if(excess<=0n)break;const allocated=moneyCents(r.receipt.allocatedAmount);const reverse=allocated<excess?allocated:excess;r.receipt.allocatedAmount=centsText(allocated-reverse);r.receipt.unappliedAmount=centsText(moneyCents(r.receipt.unappliedAmount)+reverse);excess-=reverse;}
    if(s.status==='CLOSED')s.status='FINALIZED';result=bill(billId);
   }else if(op==='REQUEST_REFUND'){
    const r=receipt(resource),amount=moneyCents(String(body.amount));if(amount>moneyCents(r.receipt.unappliedAmount)-moneyCents(r.reservedAmount))fail(422,'Refund exceeds unreserved funds.');
    const q:Refund={id:id(sequence++),receiptId:resource,version:1,amount:String(body.amount),status:'REQUESTED'};refunds.push({refund:q,reason:String(body.reason),executionReference:null});r.reservedAmount=centsText(moneyCents(r.reservedAmount)+amount);result=q;
   }else if(op==='REVIEW_REFUND'||op==='EXECUTE_REFUND'){
    const q=refund(resource),r=receipt(q.refund.receiptId);if(body.expectedVersion!==q.refund.version)fail(409,'Refund changed. Review it again.');
    if(op==='REVIEW_REFUND'){
     if(q.refund.status!=='REQUESTED')fail(409,'Refund has already been reviewed.');q.refund.status=body.decision==='APPROVE'?'APPROVED':'REJECTED';q.refund.version++;
     if(q.refund.status==='REJECTED')r.reservedAmount=centsText(moneyCents(r.reservedAmount)-moneyCents(q.refund.amount));
    }else{
     if(q.refund.status!=='APPROVED')fail(409,'Approval is required before recording actual execution.');
     q.refund.status='EXECUTED';q.refund.version++;q.executionReference=String(body.executionReference);r.receipt.refundedAmount=centsText(moneyCents(r.receipt.refundedAmount)+moneyCents(q.refund.amount));r.receipt.unappliedAmount=centsText(moneyCents(r.receipt.unappliedAmount)-moneyCents(q.refund.amount));r.reservedAmount=centsText(moneyCents(r.reservedAmount)-moneyCents(q.refund.amount));
    }result=q.refund;
   }else fail(422,'Unknown fictional cashier operation.');
  }
  const copy=structuredClone(result);if(key)results.set(key,{payload,result:copy});return structuredClone(copy) as T;
 }};
}
