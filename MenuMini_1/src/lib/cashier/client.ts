import { ServiceClientError } from '$lib/service/client';
import { cashierRead } from './model';
import type { CashierOperation } from './model';
export interface CashierGateway {call<T>(operation:CashierOperation,resource:string,body?:Record<string,unknown>,key?:string):Promise<T>}
export function httpCashierGateway(csrfToken:string,branchId:string):CashierGateway{
 return {async call<T>(op:CashierOperation,resource:string,body:Record<string,unknown>={},key?:string):Promise<T>{
  const bill='/api/v2/merchant/bills/'+encodeURIComponent(resource);
  const receipt='/api/v2/merchant/receipts/'+encodeURIComponent(resource);
  const refund='/api/v2/merchant/refund-requests/'+encodeURIComponent(resource);
  const routes:Record<CashierOperation,string>={BILLS:'/api/v2/merchant/branches/'+encodeURIComponent(branchId)+'/bills',DETAIL:bill+'/settlement',
   FINALIZE_BILL:bill+'/finalizations',CLOSE_BILL:bill+'/closures',CREDIT_BILL:bill+'/credits',RECORD_RECEIPT:bill+'/receipts',
   ALLOCATE_RECEIPT:receipt+'/allocations',REQUEST_REFUND:receipt+'/refund-requests',REVIEW_CLAIM:'/api/v2/merchant/payment-claims/'+encodeURIComponent(resource)+'/reviews',REVIEW_REFUND:refund+'/reviews',EXECUTE_REFUND:refund+'/executions'};
  const read=cashierRead(op);const url=new URL(routes[op],location.origin);
  if(op==='BILLS')for(const k of ['view','limit','cursor'])if(body[k])url.searchParams.set(k,String(body[k]));
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
  try{const response=await fetch(url,{method:read?'GET':'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,
   headers:{Accept:'application/json',...(!read?{'Content-Type':'application/json','X-CSRF-Token':csrfToken,'Idempotency-Key':key||''}:{})},...(!read?{body:JSON.stringify(body)}:{})});
   let result;try{result=await response.json();}catch{throw new ServiceClientError(503,'The saved result could not be read. Retry this same action.');}
   if(!response.ok)throw new ServiceClientError(response.status,result.detail||'Cashier request failed.');return result as T;
  }catch(e){if(e instanceof ServiceClientError)throw e;throw new ServiceClientError(0,'Connection interrupted. The action may have saved. Retry the unchanged action.');}finally{clearTimeout(timer);}
 }};
}
