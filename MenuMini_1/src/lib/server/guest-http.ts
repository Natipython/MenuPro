import {json} from '@sveltejs/kit';
import {timingSafeEqual} from 'node:crypto';
import {PUBLIC_CATALOG_HEADERS} from './public-catalog';
import {CatalogCommandError} from './merchant-catalog';
import type {MerchantPrincipal} from './merchant-catalog';
import {guestCommand,startGuestSession,issueGuestCapability} from './guest-access';
import {identityPending} from './catalog-access';
import {guestRead,validateGuestCommand,CAPABILITY} from '$lib/guest/model';
import type {GuestOperation} from '$lib/guest/model';
import {UUID} from '$lib/workspace/model';
import {queueParameters,validateServiceCommand} from '$lib/service/model';
export const GUEST_HEADERS={...PUBLIC_CATALOG_HEADERS,'Referrer-Policy':'no-referrer'};
export const guestCookieName=()=>process.env.NODE_ENV==='production'?'__Host-menu_dining':'menu_dining';
const cookie=(token:string,maxAge=43200)=>guestCookieName()+'='+token+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+maxAge+(process.env.NODE_ENV==='production'?'; Secure':'');
export const guestProblem=(status:number,code:string,detail:string,errors?:unknown)=>json({type:'urn:menumini:problem:'+code.toLowerCase(),title:'Guest request',status,code,detail,requestId:crypto.randomUUID(),...(errors?{errors}:{})},
 {status,headers:{...GUEST_HEADERS,'Content-Type':'application/problem+json',...(status===429?{'Retry-After':'60'}:{})}});
export async function guestCommandBody(request:Request,url:URL,max:number):Promise<{body:unknown;key:string}|Response>{
 if(process.env.NODE_ENV==='production'&&url.protocol!=='https:')return guestProblem(503,'HTTPS_REQUIRED','Guest access requires HTTPS.');
 if(request.headers.get('origin')!==url.origin)return guestProblem(403,'ORIGIN_REJECTED','Use the guest screen on this site.');
 const key=request.headers.get('idempotency-key')||'';if(!UUID.test(key))return guestProblem(400,'IDEMPOTENCY_KEY_REQUIRED','Retry an interrupted request with the same key and content.');
 if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return guestProblem(415,'JSON_REQUIRED','Send an application/json body.');
 if(Number(request.headers.get('content-length'))>max)return guestProblem(413,'BODY_TOO_LARGE','This request exceeds the allowed size.');
 const reader=request.body?.getReader();if(!reader)return guestProblem(400,'INVALID_JSON','A JSON object is required.');
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();return guestProblem(413,'BODY_TOO_LARGE','This request exceeds the allowed size.');}chunks.push(value);}}
 catch{return guestProblem(400,'BODY_INTERRUPTED','Request interrupted. Retry the unchanged command.');}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 try{return {body:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),key};}catch{return guestProblem(400,'INVALID_JSON','A valid JSON object is required.');}
}
export async function guestResponse(request:Request,url:URL,operation:GuestOperation,resource:string|null,token:string|null):Promise<Response>{
 if(process.env.NODE_ENV==='production'&&url.protocol!=='https:')return guestProblem(503,'HTTPS_REQUIRED','Guest access requires HTTPS.');
 if(operation!=='START'&&(!token||!CAPABILITY.test(token))){const r=guestProblem(401,'GUEST_SESSION_REQUIRED','Start a table session first.');if(operation==='CONTEXT'&&token)r.headers.set('Set-Cookie',cookie('',0));return r;}
 if(resource&&!UUID.test(resource))return guestProblem(400,'INVALID_ID','A valid resource is required.');
 if(operation!=='ORDERS'&&url.search)return guestProblem(400,'INVALID_QUERY','This request does not accept query parameters.');
 let body:Record<string,unknown>={};let key:string|undefined;let csrf:string|undefined;
 if(operation==='ORDERS'){try{body=queueParameters(url);}catch{return guestProblem(400,'INVALID_QUERY','Use the previous order cursor and a limit up to 100.');}}
 if(!guestRead(operation)){
  const input=await guestCommandBody(request,url,operation==='SUBMIT'?131072:4096);if(input instanceof Response)return input;
  const errors=validateGuestCommand(operation,input.body);if(errors.length)return guestProblem(422,'GUEST_FIELDS_INVALID','Check the guest fields.',errors);
  body=input.body as Record<string,unknown>;key=input.key;
  if(operation!=='START'){
   csrf=request.headers.get('x-csrf-token')||'';
   if(!CAPABILITY.test(csrf))return guestProblem(403,'CSRF_REJECTED','Reload your guest screen.');
  }
 }
 try{
  if(operation==='START'){
   const {context,token:created}=await startGuestSession(body.tableToken as string,body.sessionNonce as string,key!,token);
   const remaining=Math.max(0,Math.floor((Date.parse(context.session.expiresAt)-Date.now())/1000));
   return json(context,{status:201,headers:{...GUEST_HEADERS,'Set-Cookie':cookie(created,remaining)}});
  }
  const result=await guestCommand(token!,operation,resource,body,key,csrf);
  return json(result,{status:operation==='SUBMIT'?201:200,headers:{...GUEST_HEADERS,...(operation==='REVOKE'?{'Set-Cookie':cookie('',0)}:{})}});
 }catch(e){if(e instanceof CatalogCommandError){if(operation==='REVOKE'&&e.status===401)return json({revoked:true},{headers:{...GUEST_HEADERS,'Set-Cookie':cookie('',0)}});if(operation==='CONTEXT'&&e.status===401){const r=guestProblem(e.status,e.code,e.message);r.headers.set('Set-Cookie',cookie('',0));return r;}return guestProblem(e.status,e.code,e.message);}return guestProblem(503,'GUEST_UNAVAILABLE','Guest access is temporarily unavailable. Ask staff for help.');}
}
export async function issueGuestResponse(request:Request,url:URL,resource:string,kind:'TABLE_LINK'|'VISIT_INVITATION',principal:MerchantPrincipal|null):Promise<Response>{
 if(!principal)return identityPending();
 if(!UUID.test(resource))return guestProblem(400,'INVALID_ID','A valid resource is required.');
 const supplied=Buffer.from(request.headers.get('x-csrf-token')||'');const expected=Buffer.from(principal.csrfToken);
 if(!expected.length||supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return guestProblem(403,'CSRF_REJECTED','Reload your verified staff screen.');
 const input=await guestCommandBody(request,url,4096);if(input instanceof Response)return input;
 const errors=validateServiceCommand('END_VISIT',input.body);if(errors.length)return guestProblem(422,'GUEST_FIELDS_INVALID','Use the current version.',errors);
 try{return json(await issueGuestCapability(principal,resource,kind,(input.body as {expectedVersion:number}).expectedVersion,input.key),{headers:GUEST_HEADERS});}
 catch(e){if(e instanceof CatalogCommandError)return guestProblem(e.status,e.code,e.message);return guestProblem(503,'GUEST_UNAVAILABLE','Guest invitation is unavailable.');}
}
