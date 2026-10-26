import {json} from '@sveltejs/kit';
import {timingSafeEqual} from 'node:crypto';
import {UUID,isObject} from '$lib/workspace/model';
import {CAPABILITY} from '$lib/guest/model';
import {validRecoveryDescriptor} from '$lib/recovery/model';
import type {RecoveryDomain,RecoveryDescriptor} from '$lib/recovery/model';
import {guestCommandBody,guestProblem,GUEST_HEADERS} from './guest-http';
import {CatalogCommandError} from './merchant-catalog';
import type {MerchantPrincipal} from './merchant-catalog';
import {identityPending} from './catalog-access';
import {staffCommandRecovery,guestCommandRecovery} from './command-recovery';
const failure=(e:unknown)=>e instanceof CatalogCommandError?guestProblem(e.status,e.code,e.message):guestProblem(503,'RECOVERY_UNAVAILABLE','The original result could not be confirmed. Keep its request key and ask staff before entering a replacement.');
export async function staffRecoveryResponse(request:Request,url:URL,branchId:string,requestKey:string,domain:RecoveryDomain,cancel:boolean,principal:MerchantPrincipal|null){
 if(!principal)return identityPending();
 if(!['SERVICE','CASHIER'].includes(domain)||!UUID.test(branchId)||!UUID.test(requestKey))return guestProblem(400,'INVALID_RECOVERY','Use the original branch and request key.');
 let body:unknown;
 if(cancel){
  if(url.search)return guestProblem(400,'INVALID_QUERY','Cancellation does not accept query parameters.');
  const supplied=Buffer.from(request.headers.get('x-csrf-token')||''),expected=Buffer.from(principal.csrfToken);
  if(!expected.length||expected.length!==supplied.length||!timingSafeEqual(expected,supplied))return guestProblem(403,'CSRF_REJECTED','Reload verified access before resolving a request.');
  const input=await guestCommandBody(request,url,4096);if(input instanceof Response)return input;
  if(input.key.toLowerCase()!==requestKey.toLowerCase())return guestProblem(400,'RECOVERY_KEY_MISMATCH','Cancellation must use the original request key.');body=input.body;
 }else{
  if([...url.searchParams.keys()].some(k=>!['operation','resourceId'].includes(k))||['operation','resourceId'].some(k=>url.searchParams.getAll(k).length!==1))return guestProblem(400,'INVALID_QUERY','Specify only the original operation and target.');
  body={operation:url.searchParams.get('operation'),resourceId:url.searchParams.get('resourceId')};
 }
 if(!validRecoveryDescriptor(domain,body))return guestProblem(422,'INVALID_RECOVERY','Use a supported original command and target.');
 try{return json(await staffCommandRecovery(principal,branchId,{domain,operation:body.operation,resourceId:body.resourceId.toLowerCase(),requestKey:requestKey.toLowerCase()},cancel),{headers:GUEST_HEADERS});}catch(e){return failure(e);}
}
export async function guestRecoveryResponse(request:Request,url:URL,resourceId:string,requestKey:string,domain:RecoveryDomain,cancel:boolean,guestToken:string|null,grantToken:string|null){
 if(process.env.NODE_ENV==='production'&&url.protocol!=='https:')return guestProblem(503,'HTTPS_REQUIRED','Recovery requires HTTPS.');
 if(!guestToken||!CAPABILITY.test(guestToken))return guestProblem(401,'GUEST_SESSION_REQUIRED','Resume the original table session before resolving this request.');
 if(domain==='PAYER'&&(!grantToken||!CAPABILITY.test(grantToken)))return guestProblem(403,'PAYER_ACCESS_REQUIRED','Ask the cashier to restore bill access for this device.');
 if(!['GUEST','PAYER'].includes(domain)||!UUID.test(resourceId)||!UUID.test(requestKey))return guestProblem(400,'INVALID_RECOVERY','Use the original request and seating or bill.');
 if(url.search)return guestProblem(400,'INVALID_QUERY','Recovery does not accept query parameters.');
 let csrf:string|undefined;
 if(cancel){
  const input=await guestCommandBody(request,url,4096);if(input instanceof Response)return input;
  if(input.key.toLowerCase()!==requestKey.toLowerCase())return guestProblem(400,'RECOVERY_KEY_MISMATCH','Cancellation must use the original request key.');
  if(!isObject(input.body)||Object.keys(input.body).length)return guestProblem(422,'INVALID_RECOVERY','Cancellation accepts only an empty JSON object.');
  csrf=request.headers.get('x-csrf-token')||'';if(!CAPABILITY.test(csrf))return guestProblem(403,'CSRF_REJECTED','Reload the original table session.');
 }
 const descriptor:RecoveryDescriptor={domain,operation:domain==='GUEST'?'SUBMIT':'CLAIM',resourceId:resourceId.toLowerCase(),requestKey:requestKey.toLowerCase()};
 try{return json(await guestCommandRecovery(guestToken,grantToken,descriptor,cancel,csrf),{headers:GUEST_HEADERS});}catch(e){return failure(e);}
}
