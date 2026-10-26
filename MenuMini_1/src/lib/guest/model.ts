import {shape,UUID} from '$lib/workspace/model';
import {validateServiceCommand} from '$lib/service/model';
import type {ServiceOrder,ServiceOffer} from '$lib/service/model';
import type {FieldIssue} from '$lib/onboarding/registration';
export const CAPABILITY=/^[A-Za-z0-9_-]{43}$/;
export type GuestOperation='START'|'CONTEXT'|'PAIR'|'OFFER'|'SUBMIT'|'ORDERS'|'READ_ORDER'|'REVOKE';
export const guestRead=(op:GuestOperation)=>['CONTEXT','OFFER','ORDERS','READ_ORDER'].includes(op);
export interface GuestContext {
 session:{id:string;venueId:string;tableId:string;tableLabel:string;expiresAt:string};
 association:{visitId:string;tableId:string;visitStatus:'OPEN'|'ENDED';canSubmitOrders:boolean}|null;csrfToken:string;
}
export type GuestOrder=Omit<ServiceOrder,'allowedTransitions'>;
export interface GuestOrderList{items:GuestOrder[];nextCursor:string|null}
export type GuestOffer=ServiceOffer;
export function validateGuestCommand(op:GuestOperation,value:unknown):FieldIssue[]{
 if(op==='SUBMIT')return validateServiceCommand('SUBMIT_STAFF_ORDER',value);
 const errors:FieldIssue[]=[];const issue=(field:string,code:string)=>errors.push({field,code});
 const fields=op==='START'?['tableToken','sessionNonce']:op==='PAIR'?['pairingToken']:[];
 if(!shape(value,fields,fields,'$',issue))return errors;
 for(const field of fields)if(typeof value[field]!=='string'||!CAPABILITY.test(value[field] as string))issue(field,'CAPABILITY_REQUIRED');
 return errors;
}
export function parseInvitation(text:string):{visitId:string;pairingToken:string}|null{
 const [visitId,pairingToken,...rest]=text.trim().split('.');
 return !rest.length&&UUID.test(visitId||'')&&CAPABILITY.test(pairingToken||'')?{visitId,pairingToken}:null;
}
