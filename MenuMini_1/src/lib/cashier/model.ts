import { UUID, isObject } from '$lib/workspace/model';
import { queueParameters, moneyCents } from '$lib/service/model';
import type { ServiceOrder } from '$lib/service/model';
import type { FieldIssue } from '$lib/onboarding/registration';
export interface Bill {
  id:string;visitId:string;branchId:string;version:number;status:'OPEN'|'FINALIZED'|'CLOSED';currency:'ETB';
  chargeAmount:string;allocatedAmount:string;outstandingAmount:string;unappliedAmount:string;refundPendingAmount:string;
  settlement:'UNPAID'|'PARTIALLY_PAID'|'PAID'|'NO_PAYMENT_DUE';
}
export interface BillSummary {bill:Bill;tableLabel:string;visitStatus:'OPEN'|'ENDED';openedAt:string}
export interface BillList {branchId:string;items:BillSummary[];nextCursor:string|null}
export interface Receipt {id:string;billId:string;method:'CASH'|'BANK_TRANSFER';currency:'ETB';receivedAmount:string;allocatedAmount:string;refundedAmount:string;unappliedAmount:string}
export interface Refund {id:string;receiptId:string;version:number;amount:string;status:'REQUESTED'|'APPROVED'|'EXECUTED'|'REJECTED'}
export interface Claim {id:string;billId:string;version:number;status:'SUBMITTED'|'APPROVED'|'REJECTED';reportedAmount:string}
export interface CashierDetail {
  credits:{id:string;orderId:string;amount:string;reason:string;recordedAt:string}[];
  summary:BillSummary;orders:{id:string;status:ServiceOrder['status'];totalAmount:string;remainingChargeAmount:string;items:ServiceOrder['items']}[];
  receipts:{receipt:Receipt;recordedAt:string;verificationNote:string;providerReference:string|null;accountLabel:string|null;reservedAmount:string}[];
  claims:{claim:Claim;providerReference:string;accountLabel:string}[];refunds:{refund:Refund;reason:string;executionReference:string|null}[];
  accounts:{id:string;label:string}[];permissions:{manage:boolean;adjust:boolean;refund:boolean};
}
export type CashierOperation='BILLS'|'DETAIL'|'FINALIZE_BILL'|'CLOSE_BILL'|'CREDIT_BILL'|'RECORD_RECEIPT'|'ALLOCATE_RECEIPT'|'REVIEW_CLAIM'|'REQUEST_REFUND'|'REVIEW_REFUND'|'EXECUTE_REFUND';
export const cashierRead=(op:CashierOperation)=>op==='BILLS'||op==='DETAIL';
export function billParameters(url:URL){
  if(url.searchParams.getAll('view').length>1)throw new Error('Duplicate view');
  const view=url.searchParams.get('view')||'UNRESOLVED';if(!['UNRESOLVED','CLOSED'].includes(view))throw new Error('Invalid view');
  const page=new URL(url);page.searchParams.delete('view');return {...queueParameters(page),view};
}
export function validateCashierCommand(operation:CashierOperation,value:unknown):FieldIssue[]{
  const errors:FieldIssue[]=[];const issue=(field:string)=>errors.push({field,code:'INVALID_FIELD'});
  const fields:Partial<Record<CashierOperation,string[]>>={FINALIZE_BILL:['expectedVersion'],CLOSE_BILL:['expectedVersion'],CREDIT_BILL:['expectedVersion','orderId','amount','reason'],
    RECORD_RECEIPT:['method','receivedAmount','tenderedAmount','changeAmount','accountId','providerReference','verificationNote','fundsConfirmed'],
    ALLOCATE_RECEIPT:['billId','expectedBillVersion','amount'],REVIEW_CLAIM:['expectedVersion','decision','verifiedAmount','allocationAmount','verificationNote','fundsConfirmed'],
    REQUEST_REFUND:['amount','reason'],REVIEW_REFUND:['expectedVersion','decision','reason'],EXECUTE_REFUND:['expectedVersion','executionReference','executionConfirmed']};
  if(!isObject(value)||!fields[operation])return[{field:'$',code:'OBJECT_REQUIRED'}];
  const allowed=fields[operation]!;const required=operation==='RECORD_RECEIPT'?['method','receivedAmount','verificationNote','fundsConfirmed']:operation==='REVIEW_CLAIM'?['expectedVersion','decision','verificationNote']:allowed;
  if(Object.keys(value).some(k=>!allowed.includes(k)))issue('$');required.forEach(k=>{if(!(k in value))issue(k);});
  for(const k of ['expectedVersion','expectedBillVersion'])if(k in value&&(!Number.isInteger(value[k])||(value[k] as number)<1||(value[k] as number)>2147483646))issue(k);
  for(const k of ['billId','orderId','accountId'])if(k in value&&(typeof value[k]!=='string'||!UUID.test(value[k])))issue(k);
  for(const k of ['reason','verificationNote','providerReference','executionReference'])if(k in value&&(typeof value[k]!=='string'||!String(value[k]).trim()||[...String(value[k])].length>(k.endsWith('Reference')?120:160)||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(String(value[k]))))issue(k);
  for(const k of ['amount','receivedAmount','tenderedAmount','changeAmount','verifiedAmount','allocationAmount'])if(k in value){
    try{if(typeof value[k]!=='string'||!/^(0|[1-9]\d{0,9})\.\d{2}$/.test(value[k] as string)||(!['changeAmount','allocationAmount'].includes(k)&&moneyCents(value[k] as string)<=0n))issue(k);}catch{issue(k);}
  }
  if('decision' in value&&!['APPROVE','REJECT'].includes(value.decision as string))issue('decision');
  if(operation==='RECORD_RECEIPT'){
    if(value.fundsConfirmed!==true)issue('fundsConfirmed');
    if(value.method==='CASH'){
      ['tenderedAmount','changeAmount'].forEach(k=>{if(!(k in value))issue(k);});['accountId','providerReference'].forEach(k=>{if(k in value)issue(k);});
      try{if(moneyCents(String(value.tenderedAmount))-moneyCents(String(value.changeAmount))!==moneyCents(String(value.receivedAmount)))issue('receivedAmount');}catch{issue('receivedAmount');}
    }else if(value.method==='BANK_TRANSFER'){
      ['accountId','providerReference'].forEach(k=>{if(!(k in value))issue(k);});['tenderedAmount','changeAmount'].forEach(k=>{if(k in value)issue(k);});
    }else issue('method');
  }
  if(operation==='REVIEW_CLAIM'){
    if(value.decision==='APPROVE'){['verifiedAmount','allocationAmount'].forEach(k=>{if(!(k in value))issue(k);});if(value.fundsConfirmed!==true)issue('fundsConfirmed');}
    else ['verifiedAmount','allocationAmount','fundsConfirmed'].forEach(k=>{if(k in value)issue(k);});
  }
  if(operation==='EXECUTE_REFUND'&&value.executionConfirmed!==true)issue('executionConfirmed');
  return errors.slice(0,32);
}
