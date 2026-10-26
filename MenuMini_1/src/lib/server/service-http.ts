import { json } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import { PUBLIC_CATALOG_HEADERS } from './public-catalog';
import { identityPending } from './catalog-access';
import { CatalogCommandError } from './merchant-catalog';
import type { MerchantPrincipal } from './merchant-catalog';
import { serviceCommand } from './staff-service';
import { UUID, isObject } from '$lib/workspace/model';
import { validateServiceCommand,readOperation,queueParameters } from '$lib/service/model';
import type { ServiceOperation } from '$lib/service/model';
const problem=(status:number,code:string,detail:string,errors?:unknown)=>json({type:'urn:menumini:problem:'+code.toLowerCase(),title:'Service request',
 status,code,detail,requestId:crypto.randomUUID(),...(errors?{errors}:{})},{status,headers:{...PUBLIC_CATALOG_HEADERS,'Content-Type':'application/problem+json'}});
export async function serviceResponse(request:Request,url:URL,resourceId:string,operation:ServiceOperation,principal:MerchantPrincipal|null,branchScope?:string) {
  if (!principal) return identityPending();
  if (!UUID.test(resourceId)) return problem(400,'INVALID_ID','A valid service resource is required.');
  let body:Record<string,unknown>={}; let key:string|undefined;
  if (operation==='QUEUE') {
    try { body=queueParameters(url); } catch { return problem(400,'INVALID_QUEUE_QUERY','Use a valid page limit and the previous queue cursor.'); }
  }
  if (!readOperation(operation)) {
    if (request.headers.get('origin')!==url.origin) return problem(403,'ORIGIN_REJECTED','Use the service screen on this site.');
    const supplied=Buffer.from(request.headers.get('x-csrf-token')||''); const expected=Buffer.from(principal.csrfToken);
    if (!expected.length || expected.length!==supplied.length || !timingSafeEqual(supplied,expected)) return problem(403,'CSRF_REJECTED','Reload your verified service screen.');
    key=request.headers.get('idempotency-key')||'';
    if (!UUID.test(key)) return problem(400,'IDEMPOTENCY_KEY_REQUIRED','A request key is required. Retry interrupted commands with the same key and content.');
    if (request.headers.get('content-type')?.split(';')[0].trim()!=='application/json') return problem(415,'JSON_REQUIRED','Send an application/json body.');
    const max=131072; if (Number(request.headers.get('content-length'))>max) return problem(413,'BODY_TOO_LARGE','Keep service requests under 128 KB.');
    const reader=request.body?.getReader(); if (!reader) return problem(400,'INVALID_JSON','A JSON object is required.');
    const chunks:Uint8Array[]=[];let size=0;
    try { while(true) { const {value,done}=await reader.read(); if(done)break;size+=value.byteLength;
      if(size>max)return problem(413,'BODY_TOO_LARGE','Keep service requests under 128 KB.');chunks.push(value); }
    } catch {return problem(400,'BODY_INTERRUPTED','Request interrupted. Retry the unchanged command.');} finally {reader.releaseLock();}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    let parsed:unknown; try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{return problem(400,'INVALID_JSON','A valid JSON object is required.');}
    const errors=validateServiceCommand(operation,parsed);if(errors.length)return problem(422,'COMMAND_INVALID','Check the service fields.',errors);
    if(!isObject(parsed))return problem(422,'COMMAND_INVALID','A JSON object is required.'); body=parsed;
  }
  try {
    const result=await serviceCommand(principal,resourceId,operation,body,key,branchScope);
    return json(result,{status:['CREATE_TABLE','OPEN_STAFF_VISIT','SUBMIT_STAFF_ORDER'].includes(operation)?201:200,headers:PUBLIC_CATALOG_HEADERS});
  }catch(e){if(e instanceof CatalogCommandError)return problem(e.status,e.code,e.message);return problem(503,'SERVICE_UNAVAILABLE','Service is temporarily unavailable.');}
}
