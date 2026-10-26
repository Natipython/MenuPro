import { json } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import { PUBLIC_CATALOG_HEADERS } from './public-catalog';
import { identityPending } from './catalog-access';
import { CatalogCommandError } from './merchant-catalog';
import type { MerchantPrincipal } from './merchant-catalog';
import { cashierCommand } from './cashier-settlement';
import { UUID, isObject } from '$lib/workspace/model';
import { validateCashierCommand,cashierRead,billParameters } from '$lib/cashier/model';
import type { CashierOperation } from '$lib/cashier/model';
const problem=(status:number,code:string,detail:string,errors?:unknown)=>json({type:'urn:menumini:problem:'+code.toLowerCase(),title:'Cashier request',
 status,code,detail,requestId:crypto.randomUUID(),...(errors?{errors}:{})},{status,headers:{...PUBLIC_CATALOG_HEADERS,'Content-Type':'application/problem+json'}});
export async function cashierResponse(request:Request,url:URL,resourceId:string,operation:CashierOperation,principal:MerchantPrincipal|null) {
  if (!principal) return identityPending();
  if (!UUID.test(resourceId)) return problem(400,'INVALID_ID','A valid settlement resource is required.');
  let body:Record<string,unknown>={}; let key:string|undefined;
  if (operation==='BILLS') {
    try { body=billParameters(url); } catch { return problem(400,'INVALID_BILL_QUERY','Use a valid page limit and the previous bill cursor.'); }
  }
  if (!cashierRead(operation)) {
    if (request.headers.get('origin')!==url.origin) return problem(403,'ORIGIN_REJECTED','Use the cashier screen on this site.');
    const supplied=Buffer.from(request.headers.get('x-csrf-token')||''); const expected=Buffer.from(principal.csrfToken);
    if (!expected.length || expected.length!==supplied.length || !timingSafeEqual(supplied,expected)) return problem(403,'CSRF_REJECTED','Reload your verified cashier screen.');
    key=request.headers.get('idempotency-key')||'';
    if (!UUID.test(key)) return problem(400,'IDEMPOTENCY_KEY_REQUIRED','A request key is required. Retry interrupted commands with the same key and content.');
    if (request.headers.get('content-type')?.split(';')[0].trim()!=='application/json') return problem(415,'JSON_REQUIRED','Send an application/json body.');
    const max=16384; if (Number(request.headers.get('content-length'))>max) return problem(413,'BODY_TOO_LARGE','Keep cashier requests under 16 KB.');
    const reader=request.body?.getReader(); if (!reader) return problem(400,'INVALID_JSON','A JSON object is required.');
    const chunks:Uint8Array[]=[];let size=0;
    try { while(true) { const {value,done}=await reader.read(); if(done)break;size+=value.byteLength;
      if(size>max)return problem(413,'BODY_TOO_LARGE','Keep cashier requests under 16 KB.');chunks.push(value); }
    } catch {return problem(400,'BODY_INTERRUPTED','Request interrupted. Retry the unchanged command.');} finally {reader.releaseLock();}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    let parsed:unknown; try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{return problem(400,'INVALID_JSON','A valid JSON object is required.');}
    const errors=validateCashierCommand(operation,parsed);if(errors.length)return problem(422,'COMMAND_INVALID','Check the service fields.',errors);
    if(!isObject(parsed))return problem(422,'COMMAND_INVALID','A JSON object is required.'); body=parsed;
  }
  try {
    const result=await cashierCommand(principal,resourceId,operation,body,key);
    return json(result,{status:['RECORD_RECEIPT','ALLOCATE_RECEIPT','REQUEST_REFUND'].includes(operation)?201:200,headers:PUBLIC_CATALOG_HEADERS});
  }catch(e){if(e instanceof CatalogCommandError)return problem(e.status,e.code,e.message);return problem(503,'SERVICE_UNAVAILABLE','Service is temporarily unavailable.');}
}
