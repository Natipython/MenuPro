import {shape,UUID} from '$lib/workspace/model';
import {CAPABILITY} from '$lib/guest/model';
import type {FieldIssue} from '$lib/onboarding/registration';
import type {Bill,Claim} from '$lib/cashier/model';
import type {ServiceOrder} from '$lib/service/model';
export interface PayerGrantState{id:string;version:number;expiresAt:string;active:boolean}
export interface BillGrant extends PayerGrantState{billId:string;guestSessionId:string;accessToken:string}
export interface PayerCandidates{billId:string;items:{guestSessionId:string;deviceCode:string;expiresAt:string;grant:PayerGrantState|null}[]}
export interface PayerAccount{id:string;provider:string;holderName:string;accountIdentifier:string;destinationFingerprint:string}
export interface PayerClaim{claim:Claim;providerReference:string;accountLabel:string;submittedAt:string;reviewedAt:string|null;verifiedReceivedAmount:string|null}
export interface PayerClaimList{items:PayerClaim[];nextCursor:string|null}
export interface PayerDetail{bill:Bill;tableLabel:string;visitStatus:'OPEN'|'ENDED';openedAt:string;expiresAt:string;
 orders:{id:string;status:ServiceOrder['status'];totalAmount:string;creditedAmount:string;netChargeAmount:string;items:Omit<ServiceOrder['items'][number],'specialInstructions'>[]}[];accounts:PayerAccount[];claims:PayerClaimList}
export type PayerOperation='BIND'|'DETAIL'|'CLAIM'|'CLAIMS'|'LEAVE';
export type PayerStaffOperation='CANDIDATES'|'ISSUE'|'REVOKE';
export const payerRead=(op:PayerOperation)=>op==='DETAIL'||op==='CLAIMS';
export const deviceCode=(id:string)=>id.replaceAll('-','').slice(-8).toUpperCase();
export function validatePayerCommand(operation:PayerOperation|PayerStaffOperation,value:unknown):FieldIssue[]{
 const errors:FieldIssue[]=[];const issue=(field:string,code:string)=>errors.push({field,code});
 const fields=operation==='BIND'?['accessToken']:operation==='CLAIM'?['accountId','providerReference','reportedAmount','destinationFingerprint','transferSent']:operation==='ISSUE'?['guestSessionId','expectedBillVersion']:operation==='REVOKE'?['expectedVersion']:[];
 if(!shape(value,fields,fields,'$',issue))return errors;
 for(const k of ['expectedVersion','expectedBillVersion'])if(k in value&&(!Number.isInteger(value[k])||(value[k] as number)<1||(value[k] as number)>2147483646))issue(k,'VERSION_REQUIRED');
 for(const k of ['accountId','guestSessionId'])if(k in value&&(typeof value[k]!=='string'||!UUID.test(value[k] as string)))issue(k,'INVALID_ID');
 if(operation==='BIND'&&(typeof value.accessToken!=='string'||!CAPABILITY.test(value.accessToken)))issue('accessToken','BILL_CODE_REQUIRED');
 if(operation==='CLAIM'){
  if(typeof value.reportedAmount!=='string'||!/^(0|[1-9]\d{0,9})\.\d{2}$/.test(value.reportedAmount)||value.reportedAmount==='0.00')issue('reportedAmount','EXACT_POSITIVE_AMOUNT');
  if(typeof value.providerReference!=='string'||!value.providerReference.trim()||[...value.providerReference].length>120||/[\u0000-\u001f\u007f]/.test(value.providerReference))issue('providerReference','REFERENCE_REQUIRED');
  if(typeof value.destinationFingerprint!=='string'||!/^[0-9a-f]{64}$/.test(value.destinationFingerprint))issue('destinationFingerprint','DESTINATION_REVIEW_REQUIRED');
  if(value.transferSent!==true)issue('transferSent','ALREADY_SENT_CONFIRMATION');
 }
 return errors;
}
