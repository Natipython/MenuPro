import {CatalogCommandError,merchantTransaction} from './merchant-catalog';
import type {MerchantPrincipal} from './merchant-catalog';
import {guestTransaction,hashCapability,deriveGuestCapability} from './guest-access';
import type {PayerOperation,PayerStaffOperation} from '$lib/payer/model';
import {payerRead} from '$lib/payer/model';
export async function payerStaffCommand(principal:MerchantPrincipal,resource:string,operation:PayerStaffOperation,body:Record<string,unknown>={},key?:string){
 const token=operation==='ISSUE'?deriveGuestCapability('PAYER_GRANT',principal.businessId.toLowerCase(),principal.userId.toLowerCase(),resource.toLowerCase(),String(body.guestSessionId).toLowerCase(),key!.toLowerCase()):null;
 const result=await merchantTransaction(principal,operation==='CANDIDATES',async c=>{
  const r=operation==='CANDIDATES'?await c.query('select menumini.list_payer_candidates($1) as result',[resource]):await c.query('select menumini.payer_staff_command($1,$2,$3::jsonb,$4,$5) as result',[resource,operation,JSON.stringify(body),key,token?hashCapability(token):null]);
  return r.rows[0].result;
 });
 return token?{...result,accessToken:token}:result;
}
export async function payerCommand(guestToken:string,grantToken:string,operation:PayerOperation,body:Record<string,unknown>={},key?:string,csrf?:string):Promise<unknown>{
 try{return await guestTransaction(payerRead(operation),async c=>{
  const r=await c.query('select menumini.payer_entry($1,$2,$3,$4::jsonb,$5,$6) as result',[hashCapability(guestToken),hashCapability(grantToken),operation,JSON.stringify(body),key||null,csrf?hashCapability(csrf):null]);return r.rows[0].result;
 });}catch(e){
  if(e instanceof CatalogCommandError&&e.status===403)throw new CatalogCommandError(403,'PAYER_ACCESS_REQUIRED','This bill code belongs to another device or is no longer active. Ask the cashier for help.');
  if(e instanceof CatalogCommandError&&e.status===409&&e.code==='STATE_CHANGED')throw new CatalogCommandError(409,'PAYER_STATE_CHANGED','The bill, receiving destination or access changed. Review with the cashier; do not send another transfer.');
  throw e;
 }
}
