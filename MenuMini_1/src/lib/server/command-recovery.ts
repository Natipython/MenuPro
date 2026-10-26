import {merchantTransaction} from './merchant-catalog';
import type {MerchantPrincipal} from './merchant-catalog';
import {guestTransaction,hashCapability} from './guest-access';
import type {RecoveryDescriptor} from '$lib/recovery/model';
export async function staffCommandRecovery(principal:MerchantPrincipal,branchId:string,descriptor:RecoveryDescriptor,cancel=false){
 return merchantTransaction(principal,false,async c=>(await c.query('select menumini.staff_command_recovery($1,$2,$3,$4,$5,$6) as result',[branchId,descriptor.domain,descriptor.operation,descriptor.resourceId,descriptor.requestKey,cancel])).rows[0].result);
}
export async function guestCommandRecovery(guestToken:string,grantToken:string|null,descriptor:RecoveryDescriptor,cancel=false,csrf?:string){
 return guestTransaction(false,async c=>(await c.query('select menumini.guest_command_recovery($1,$2,$3,$4,$5,$6,$7) as result',[hashCapability(guestToken),grantToken?hashCapability(grantToken):null,descriptor.domain,descriptor.resourceId,descriptor.requestKey,cancel,csrf?hashCapability(csrf):null])).rows[0].result);
}
