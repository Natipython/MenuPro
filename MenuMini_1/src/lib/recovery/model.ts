import {UUID,isObject} from '$lib/workspace/model';
import {validateServiceCommand} from '$lib/service/model';
import {validateCashierCommand} from '$lib/cashier/model';
import {validateGuestCommand} from '$lib/guest/model';
import {validatePayerCommand} from '$lib/payer/model';
export type RecoveryDomain='GUEST'|'PAYER'|'SERVICE'|'CASHIER';
export interface RecoveryDescriptor{domain:RecoveryDomain;operation:string;resourceId:string;requestKey:string}
export interface RecoveryReceipt extends RecoveryDescriptor{state:'COMMITTED'|'NOT_RECORDED'|'CANCELLED';resultId:string|null;recordedAt:string|null}
export interface RecoveryIdentity{scope:string;secret:string}
export interface RecoveryCommand{operation:string;resourceId:string;body:Record<string,unknown>;requestKey:string}
export const serviceRecoveryOperations=['CREATE_TABLE','UPDATE_TABLE','OPEN_STAFF_VISIT','END_VISIT','SUBMIT_STAFF_ORDER','TRANSITION_ORDER'] as const;
export const cashierRecoveryOperations=['FINALIZE_BILL','CLOSE_BILL','CREDIT_BILL','RECORD_RECEIPT','ALLOCATE_RECEIPT','REVIEW_CLAIM','REQUEST_REFUND','REVIEW_REFUND','EXECUTE_REFUND'] as const;
export function supportedRecovery(domain:RecoveryDomain,op:string){return domain==='GUEST'?op==='SUBMIT':domain==='PAYER'?op==='CLAIM':domain==='SERVICE'?(serviceRecoveryOperations as readonly string[]).includes(op):(cashierRecoveryOperations as readonly string[]).includes(op);}
export function validRecoveryDescriptor(domain:RecoveryDomain,value:unknown):value is {operation:string;resourceId:string}{return isObject(value)&&Object.keys(value).length===2&&typeof value.operation==='string'&&supportedRecovery(domain,value.operation)&&typeof value.resourceId==='string'&&UUID.test(value.resourceId);}
export function validateRecoveryBody(domain:RecoveryDomain,command:RecoveryCommand):boolean{
 if(!UUID.test(command.requestKey)||!UUID.test(command.resourceId)||!supportedRecovery(domain,command.operation)||!isObject(command.body))return false;
 if(domain==='GUEST')return command.body.visitId===command.resourceId&&validateGuestCommand('SUBMIT',command.body).length===0;
 if(domain==='PAYER')return validatePayerCommand('CLAIM',command.body).length===0;
 if(domain==='SERVICE')return validateServiceCommand(command.operation as typeof serviceRecoveryOperations[number],command.body).length===0;
 return validateCashierCommand(command.operation as typeof cashierRecoveryOperations[number],command.body).length===0;
}
export const recoveryLabel=(operation:string)=>({SUBMIT:'Order request',CLAIM:'Transfer report',CREATE_TABLE:'Create table',UPDATE_TABLE:'Edit table',OPEN_STAFF_VISIT:'Open seating',END_VISIT:'End seating',SUBMIT_STAFF_ORDER:'Staff order',TRANSITION_ORDER:'Service status change',FINALIZE_BILL:'Finalize bill',CLOSE_BILL:'Close bill',CREDIT_BILL:'Order credit',RECORD_RECEIPT:'Received funds record',ALLOCATE_RECEIPT:'Receipt allocation',REVIEW_CLAIM:'Transfer verification',REQUEST_REFUND:'Refund request',REVIEW_REFUND:'Refund review',EXECUTE_REFUND:'Returned funds record'} as Record<string,string>)[operation]||'Saved request';
