import {GuestClientError} from '$lib/guest/client';
import {ServiceClientError} from '$lib/service/client';
import {payerRead} from './model';
import type {PayerOperation,PayerStaffOperation} from './model';
export interface PayerGateway{call<T>(operation:PayerOperation,body?:Record<string,unknown>,key?:string):Promise<T>}
export interface PayerStaffGateway{call<T>(operation:PayerStaffOperation,resource:string,body?:Record<string,unknown>,key?:string):Promise<T>}
async function request<T>(path:string,method:string,body:Record<string,unknown>,csrf:string,key:string|undefined,staff=false):Promise<T>{
 const url=new URL('/api/v2'+path,location.origin);
 if(method==='GET')for(const name of ['limit','cursor'])if(body[name]!=null)url.searchParams.set(name,String(body[name]));
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 const error=(status:number,message:string)=>staff?new ServiceClientError(status,message):new GuestClientError(status,message);
 try{
  const response=await fetch(url,{method,credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{Accept:'application/json',...(method!=='GET'?{'Content-Type':'application/json','X-CSRF-Token':csrf,'Idempotency-Key':key||''}:{})},...(method!=='GET'?{body:JSON.stringify(body)}:{})});
  let value;try{value=await response.json();}catch{throw error(503,'The result could not be confirmed. Retry the unchanged request.');}
  if(!response.ok)throw error(response.status,value.detail||'Bill access is unavailable. Ask the cashier for help.');return value as T;
 }catch(e){if(e instanceof GuestClientError||e instanceof ServiceClientError)throw e;throw error(0,'Connection interrupted. Keep this page open and retry the unchanged request. Do not send another transfer.');}finally{clearTimeout(timer);}
}
export function httpPayerGateway(csrf:()=>string):PayerGateway{return{call<T>(op:PayerOperation,body:Record<string,unknown>={},key?:string){
 const paths:Record<PayerOperation,string>={BIND:'/payer/access',DETAIL:'/payer/bill',CLAIM:'/payer/bill/payment-claims',CLAIMS:'/payer/bill/payment-claims',LEAVE:'/payer/access/revocation'};
 return request<T>(paths[op],payerRead(op)?'GET':'POST',body,csrf(),key);
}};}
export function httpPayerStaffGateway(csrf:string):PayerStaffGateway{return{call<T>(op:PayerStaffOperation,resource:string,body:Record<string,unknown>={},key?:string){
 const paths:Record<PayerStaffOperation,string>={CANDIDATES:'/merchant/bills/'+encodeURIComponent(resource)+'/payers',ISSUE:'/merchant/bills/'+encodeURIComponent(resource)+'/access-grants',REVOKE:'/merchant/bill-access-grants/'+encodeURIComponent(resource)+'/revocation'};
 return request<T>(paths[op],op==='CANDIDATES'?'GET':'POST',body,csrf,key,true);
}};}
