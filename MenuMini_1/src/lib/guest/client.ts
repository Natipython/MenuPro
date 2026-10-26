import type {GuestOperation} from './model';
import {guestRead} from './model';
export class GuestClientError extends Error{constructor(public status:number,message:string){super(message);}}
export interface GuestGateway{call<T>(operation:GuestOperation,resourceId?:string|null,body?:Record<string,unknown>,key?:string):Promise<T>}
export function httpGuestGateway(csrf:()=>string):GuestGateway{
 return {async call<T>(op:GuestOperation,resource:string|null=null,body:Record<string,unknown>={},key?:string):Promise<T>{
  const routes:Record<GuestOperation,[string,string]>={START:['POST','/dining-sessions'],CONTEXT:['GET','/guest/session'],PAIR:['POST','/guest/visits/'+encodeURIComponent(resource||'')+'/association'],OFFER:['GET','/guest/menu'],SUBMIT:['POST','/guest/orders'],ORDERS:['GET','/guest/orders'],READ_ORDER:['GET','/guest/orders/'+encodeURIComponent(resource||'')],REVOKE:['POST','/guest/session/revocation']};
  const [method,path]=routes[op];const url=new URL('/api/v2'+path,location.origin);
  if(op==='ORDERS'){if(body.cursor)url.searchParams.set('cursor',String(body.cursor));if(body.limit)url.searchParams.set('limit',String(body.limit));}
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
  try{
   const response=await fetch(url,{method,credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{Accept:'application/json',...(!guestRead(op)?{'Content-Type':'application/json','Idempotency-Key':key||'',...(op!=='START'?{'X-CSRF-Token':csrf()}:{})}:{})},...(!guestRead(op)?{body:JSON.stringify(body)}:{})});
   let value;try{value=await response.json();}catch{throw new GuestClientError(503,'The result could not be confirmed. Retry the unchanged request.');}
   if(!response.ok)throw new GuestClientError(response.status,value.detail||'Guest access is unavailable. Ask staff for help.');return value as T;
  }catch(e){if(e instanceof GuestClientError)throw e;throw new GuestClientError(0,'Connection interrupted. Your request may have saved. Retry the unchanged request.');}finally{clearTimeout(timer);}
 }};
}
