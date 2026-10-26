import {json} from '@sveltejs/kit';
import {timingSafeEqual} from 'node:crypto';
import {GUEST_HEADERS,guestCommandBody,guestProblem} from './guest-http';
import {CAPABILITY} from '$lib/guest/model';
import {payerRead,validatePayerCommand} from '$lib/payer/model';
import type {PayerOperation,PayerStaffOperation} from '$lib/payer/model';
import {queueParameters} from '$lib/service/model';
import {UUID} from '$lib/workspace/model';
import {identityPending} from './catalog-access';
import {CatalogCommandError} from './merchant-catalog';
import type {MerchantPrincipal} from './merchant-catalog';
import {payerCommand,payerStaffCommand} from './payer-access';
export const payerCookieName=()=>process.env.NODE_ENV==='production'?'__Host-menu_bill_access':'menu_bill_access';
const cookie=(token:string,maxAge:number)=>payerCookieName()+'='+token+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+maxAge+(process.env.NODE_ENV==='production'?'; Secure':'');
export async function payerResponse(request:Request,url:URL,operation:PayerOperation,guestToken:string|null,grantToken:string|null):Promise<Response>{
 if(process.env.NODE_ENV==='production'&&url.protocol!=='https:')return guestProblem(503,'HTTPS_REQUIRED','Bill access requires HTTPS.');
 if(!guestToken||!CAPABILITY.test(guestToken))return guestProblem(401,'GUEST_SESSION_REQUIRED','Resume your table session first.');
 if(operation!=='BIND'&&(!grantToken||!CAPABILITY.test(grantToken)))return guestProblem(403,'PAYER_ACCESS_REQUIRED','Ask the cashier for a private bill access code.');
 let body:Record<string,unknown>={};let key:string|undefined;let csrf:string|undefined;
 if(operation==='CLAIMS'){try{body=queueParameters(url);}catch{return guestProblem(400,'INVALID_QUERY','Use the previous report cursor and a limit up to 100.');}}
 else if(url.search)return guestProblem(400,'INVALID_QUERY','This request does not accept query parameters.');
 if(!payerRead(operation)){
  const input=await guestCommandBody(request,url,8192);if(input instanceof Response)return input;
  const errors=validatePayerCommand(operation,input.body);if(errors.length)return guestProblem(422,'PAYER_FIELDS_INVALID','Review the reported amount, destination and already-sent acknowledgement.',errors);
  body=input.body as Record<string,unknown>;key=input.key;csrf=request.headers.get('x-csrf-token')||'';
  if(!CAPABILITY.test(csrf))return guestProblem(403,'CSRF_REJECTED','Reload your table session before reporting.');
  if(operation==='BIND')grantToken=body.accessToken as string;
 }
 try{
  const result=await payerCommand(guestToken,grantToken!,operation,operation==='BIND'?{}:body,key,csrf);
  const headers:Record<string,string>={...GUEST_HEADERS};
  if(operation==='BIND')headers['Set-Cookie']=cookie(grantToken!,Math.max(0,Math.floor((Date.parse((result as {expiresAt:string}).expiresAt)-Date.now())/1000)));
  if(operation==='LEAVE')headers['Set-Cookie']=cookie('',0);
  return json(result,{status:operation==='CLAIM'?201:200,headers});
 }catch(e){
  if(e instanceof CatalogCommandError){
   if(operation==='LEAVE'&&[401,403].includes(e.status))return json({revoked:true},{headers:{...GUEST_HEADERS,'Set-Cookie':cookie('',0)}});
   const r=guestProblem(e.status,e.code,e.message);if(operation!=='BIND'&&[401,403].includes(e.status))r.headers.set('Set-Cookie',cookie('',0));return r;
  }
  return guestProblem(503,'PAYER_UNAVAILABLE','Bill access is temporarily unavailable. Ask the cashier; do not repeat a bank transfer.');
 }
}
export async function payerStaffResponse(request:Request,url:URL,resource:string,operation:PayerStaffOperation,principal:MerchantPrincipal|null):Promise<Response>{
 if(!principal)return identityPending();
 if(!UUID.test(resource))return guestProblem(400,'INVALID_ID','A valid bill or grant is required.');
 if(url.search)return guestProblem(400,'INVALID_QUERY','This request does not accept query parameters.');
 let body:Record<string,unknown>={};let key:string|undefined;
 if(operation!=='CANDIDATES'){
  const supplied=Buffer.from(request.headers.get('x-csrf-token')||''),expected=Buffer.from(principal.csrfToken);
  if(!expected.length||supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return guestProblem(403,'CSRF_REJECTED','Reload your verified cashier screen.');
  const input=await guestCommandBody(request,url,4096);if(input instanceof Response)return input;
  const errors=validatePayerCommand(operation,input.body);if(errors.length)return guestProblem(422,'PAYER_FIELDS_INVALID','Choose a current server-listed payer and version.',errors);
  body=input.body as Record<string,unknown>;key=input.key;
 }
 try{return json(await payerStaffCommand(principal,resource,operation,body,key),{headers:GUEST_HEADERS});}
 catch(e){if(e instanceof CatalogCommandError)return guestProblem(e.status,e.code,e.message);return guestProblem(503,'PAYER_UNAVAILABLE','Payer authorization is temporarily unavailable.');}
}
