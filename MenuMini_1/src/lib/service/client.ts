import type { ServiceOperation } from './model';
export class ServiceClientError extends Error { constructor(public status:number,message:string){super(message);} }
export interface ServiceGateway { call<T>(operation:ServiceOperation,resourceId:string,body?:Record<string,unknown>,key?:string):Promise<T> }
export function httpServiceGateway(csrfToken:string,branchId:string):ServiceGateway {
  return {async call<T>(op:ServiceOperation,resourceId:string,body:Record<string,unknown>={},key?:string):Promise<T>{
    const branch='/api/v2/merchant/branches/'+encodeURIComponent(branchId);
    const routes:Record<ServiceOperation,[string,string]>={
      TABLES:['GET',branch+'/tables'],CREATE_TABLE:['POST',branch+'/tables'],UPDATE_TABLE:['PUT',branch+'/tables/'+encodeURIComponent(resourceId)],
      OPEN_STAFF_VISIT:['POST',branch+'/staff-visits'],READ_VISIT:['GET','/api/v2/merchant/visits/'+encodeURIComponent(resourceId)],
      END_VISIT:['POST','/api/v2/merchant/visits/'+encodeURIComponent(resourceId)+'/ending'],OFFER:['GET',branch+'/service-menu'],
      SUBMIT_STAFF_ORDER:['POST',branch+'/orders'],QUEUE:['GET',branch+'/orders'],READ_ORDER:['GET','/api/v2/merchant/orders/'+encodeURIComponent(resourceId)],
      ISSUE_TABLE_LINK:['POST','/api/v2/merchant/tables/'+encodeURIComponent(resourceId)+'/guest-link'],ISSUE_INVITATION:['POST','/api/v2/merchant/visits/'+encodeURIComponent(resourceId)+'/invitations'],
      TRANSITION_ORDER:['POST','/api/v2/merchant/orders/'+encodeURIComponent(resourceId)+'/transitions'],READ_BILL:['GET','/api/v2/merchant/bills/'+encodeURIComponent(resourceId)]
    };
    const [method,path]=routes[op];const url=new URL(path,location.origin);
    if(op==='QUEUE') {if(body.cursor)url.searchParams.set('cursor',String(body.cursor));if(body.limit)url.searchParams.set('limit',String(body.limit));}
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
    try{
      const response=await fetch(url,{method,credentials:'same-origin',cache:'no-store',signal:controller.signal,
        headers:{Accept:'application/json',...(method!=='GET'?{'Content-Type':'application/json','X-CSRF-Token':csrfToken,'Idempotency-Key':key||''}:{})},
        ...(method!=='GET'?{body:JSON.stringify(body)}:{})});
      let value;try{value=await response.json();}catch{throw new ServiceClientError(503,'The saved result could not be read. Retry the unchanged command.');}
      if(!response.ok)throw new ServiceClientError(response.status,value.detail||'The service request failed.');return value as T;
    }catch(e){if(e instanceof ServiceClientError)throw e;throw new ServiceClientError(0,'Connection interrupted. The action may have saved; retry the same command.');}finally{clearTimeout(timer);}
  }};
}
