import {env} from '$env/dynamic/private';
import {createHash,createHmac} from 'node:crypto';
import pg from 'pg';
import type {PoolConfig,PoolClient} from 'pg';
import {CAPABILITY,guestRead} from '$lib/guest/model';
import type {GuestOperation,GuestContext} from '$lib/guest/model';
import {CatalogCommandError,merchantTransaction} from './merchant-catalog';
import type {MerchantPrincipal} from './merchant-catalog';
export const hashCapability=(value:string)=>createHash('sha256').update(value,'utf8').digest('hex');
export function deriveGuestCapability(purpose:string,...parts:string[]):string{
 const raw=env.MENU_GUEST_CAPABILITY_KEY||'';
 if(!CAPABILITY.test(raw))throw new CatalogCommandError(503,'GUEST_UNAVAILABLE','Guest access is not configured.');
 const key=Buffer.from(raw,'base64url');if(key.length!==32||key.toString('base64url')!==raw)throw new CatalogCommandError(503,'GUEST_UNAVAILABLE','Guest access is not configured.');
 return createHmac('sha256',key).update(JSON.stringify(['menumini-guest-v1',purpose,...parts]),'utf8').digest('base64url');
}
export const guestCsrf=(token:string)=>deriveGuestCapability('csrf',token);
export async function issueGuestCapability(principal:MerchantPrincipal,resource:string,kind:'TABLE_LINK'|'VISIT_INVITATION',expected:number,key:string){
 const token=deriveGuestCapability(kind,principal.businessId.toLowerCase(),principal.userId.toLowerCase(),resource.toLowerCase(),key.toLowerCase());
 const result=await merchantTransaction(principal,false,async c=>{
  const response=await c.query('select menumini.issue_guest_capability($1,$2,$3,$4,$5) as result',[resource,kind,expected,hashCapability(token),key]);
  return response.rows[0].result;
 });
 return {...result,[kind==='TABLE_LINK'?'tableToken':'pairingToken']:token};
}
let pool:pg.Pool|undefined;
function configuration():PoolConfig{
 const limits:PoolConfig={max:4,idleTimeoutMillis:10000,connectionTimeoutMillis:3000,statement_timeout:3000,query_timeout:4000,application_name:'menumini_guest',password:''};
 if(env.MENU_GUEST_FIXTURE_CONFIG){
  if(process.env.NODE_ENV!=='development')throw new Error('Fixture unavailable');
  const v=JSON.parse(env.MENU_GUEST_FIXTURE_CONFIG);
  if(typeof v.host!=='string'||!v.host.startsWith('/tmp/menumini-workspace-')||v.database!=='postgres'||v.user!=='menu_guest_runtime'||!Number.isInteger(v.port))throw new Error('Fixture unavailable');
  return {...limits,host:v.host,port:v.port,user:v.user,database:v.database,ssl:false};
 }
 if(!env.MENU_GUEST_DATABASE_URL)throw new Error('Guest unavailable');
 const u=new URL(env.MENU_GUEST_DATABASE_URL);
 if(!['postgres:','postgresql:'].includes(u.protocol)||!u.hostname||!u.username||!u.pathname.slice(1))throw new Error('Guest unavailable');
 if(process.env.NODE_ENV==='production'&&['sslmode','sslcert','sslkey','sslrootcert'].some(k=>u.searchParams.has(k)))throw new Error('Guest unavailable');
 return {...limits,connectionString:env.MENU_GUEST_DATABASE_URL,...(process.env.NODE_ENV==='production'?{ssl:{rejectUnauthorized:true}}:{})};
}
function safeError(e:unknown):CatalogCommandError{
 if(e instanceof CatalogCommandError)return e;
 const error=e as {code?:string;message?:string};
 if(error?.code==='P0401')return new CatalogCommandError(401,'GUEST_SESSION_REQUIRED','Start a table session or ask staff for help.');
 if(error?.code==='P0403')return new CatalogCommandError(403,'PAYER_ACCESS_REQUIRED','Ask the cashier to authorize bill access for this device.');
 if(error?.code==='23505')return new CatalogCommandError(409,'TRANSFER_ALREADY_REPORTED','This receiving-account reference is already reported or recorded. Ask the cashier before reporting again.');
 if(error?.code==='54000')return new CatalogCommandError(422,'HISTORY_LIMIT','Ask the cashier for a complete reconciliation of this bill.');
 if(error?.code==='P0404')return new CatalogCommandError(404,'ORDER_UNAVAILABLE','This order is unavailable to this session.');
 if(error?.code==='P0429')return new CatalogCommandError(429,'GUEST_LIMIT','Please wait before trying again, or ask staff for help.');
 if(error?.code==='42501')return new CatalogCommandError(403,'GUEST_ACCESS_DENIED','This table session or invitation cannot be used for this request.');
 if(error?.code==='40001')return new CatalogCommandError(409,error.message==='idempotency payload conflict'?'IDEMPOTENCY_CONFLICT':'STATE_CHANGED','The saved state, menu or request changed. Refresh and review before sending again.');
 if(['23514','22P02','22003','23502','22007','22008'].includes(String(error?.code)))return new CatalogCommandError(422,'GUEST_FIELDS_INVALID','Check the items, required choices and invitation.');
 return new CatalogCommandError(503,'GUEST_UNAVAILABLE','Guest access is temporarily unavailable. Ask staff to take your order.');
}
export async function guestTransaction<T>(readOnly:boolean,action:(c:PoolClient)=>Promise<T>):Promise<T>{
 let c:PoolClient|undefined;let discard=false;
 try{
  if(!pool){pool=new pg.Pool(configuration());pool.on('error',()=>{});}
  c=await pool.connect();
  const safety=await c.query(`select not r.rolsuper and not r.rolbypassrls and not r.rolcreaterole and not r.rolcreatedb and not r.rolreplication
   and pg_has_role(current_user,'menu_guest_api','MEMBER') and not pg_has_role(current_user,'menu_runtime','MEMBER')
   and not pg_has_role(current_user,'menu_workflow_owner','MEMBER') and not pg_has_role(current_user,'menu_identity','MEMBER')
   and not pg_has_role(current_user,'menu_platform','MEMBER') as safe from pg_roles r where rolname=current_user`);
  if(!safety.rows[0]?.safe){discard=true;throw new Error('Unsafe guest connection');}
  await c.query(readOnly?'begin read only':'begin');await c.query('set local role menu_guest_api');
  const result=await action(c);await c.query('commit');return result;
 }catch(e){if(c)await c.query('rollback').catch(()=>{discard=true;});throw safeError(e);}finally{c?.release(discard);}
}
export async function guestCommand(token:string,operation:Exclude<GuestOperation,'START'>,resource:string|null=null,body:Record<string,unknown>={},key?:string,csrf?:string):Promise<unknown>{
 if(!CAPABILITY.test(token))throw new CatalogCommandError(401,'GUEST_SESSION_REQUIRED','Start a table session first.');
 return guestTransaction(guestRead(operation),async c=>{
  const r=await c.query('select menumini.guest_entry($1,$2,$3,$4::jsonb,$5,$6) as result',[hashCapability(token),operation,resource,JSON.stringify(body),key||null,csrf?hashCapability(csrf):null]);
  return operation==='CONTEXT'?{...r.rows[0].result,csrfToken:guestCsrf(token)}:r.rows[0].result;
 });
}
export async function startGuestSession(tableToken:string,nonce:string,key:string,existingToken:string|null):Promise<{context:GuestContext;token:string}>{
 const token=deriveGuestCapability('session',hashCapability(tableToken),nonce,key.toLowerCase());
 if(existingToken&&existingToken!==token)throw new CatalogCommandError(409,'SESSION_ALREADY_PRESENT','Resume your existing session, or explicitly leave it before starting another.');
 const csrfToken=guestCsrf(token);
 const context=await guestTransaction(false,async c=>{
  const r=await c.query('select menumini.start_guest_session($1,$2,$3,$4) as result',[hashCapability(tableToken),hashCapability(token),hashCapability(csrfToken),key]);
  return {...r.rows[0].result,csrfToken} as GuestContext;
 });
 return {context,token};
}
export async function closeGuestPool(){if(pool){await pool.end();pool=undefined;}}
