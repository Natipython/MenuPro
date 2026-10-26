import { env } from '$env/dynamic/private';
import pg from 'pg';
import type { PoolClient, PoolConfig } from 'pg';
import { UUID } from '$lib/workspace/model';

// This object must originate in trusted session middleware. It is not parsed
// from headers/cookies/body and is never constructed by an HTTP caller.
export interface MerchantPrincipal { userId: string; businessId: string; csrfToken: string }
export type CatalogOperation = 'READ_MENU' | 'SAVE_MENU' | 'READ_PROFILE' | 'SAVE_PROFILE' | 'PUBLISH' | 'READ_SERVICE' | 'SAVE_SERVICE' | 'READ_READINESS';
export class CatalogCommandError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
let pool: pg.Pool | undefined;
function configuration(): PoolConfig {
  const limits: PoolConfig = { max: 4, idleTimeoutMillis: 10000, connectionTimeoutMillis: 3000,
    statement_timeout: 3000, query_timeout: 4000, application_name: 'menumini_merchant_commands', password: '' };
  if (env.MENU_MERCHANT_FIXTURE_CONFIG) {
    if (process.env.NODE_ENV !== 'development') throw new Error('Fixture unavailable');
    const v = JSON.parse(env.MENU_MERCHANT_FIXTURE_CONFIG);
    if (typeof v.host !== 'string' || !v.host.startsWith('/tmp/menumini-workspace-') || v.database !== 'postgres'
      || v.user !== 'menu_workspace_runtime' || !Number.isInteger(v.port)) throw new Error('Fixture unavailable');
    return { ...limits, host: v.host, port: v.port, user: v.user, database: v.database, ssl: false };
  }
  if (!env.MENU_MERCHANT_DATABASE_URL) throw new Error('Service not configured');
  const url = new URL(env.MENU_MERCHANT_DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.pathname.slice(1)) throw new Error('Service not configured');
  if (process.env.NODE_ENV === 'production' && ['sslmode','sslcert','sslkey','sslrootcert'].some(k => url.searchParams.has(k))) throw new Error('Service not configured');
  return { ...limits, connectionString: env.MENU_MERCHANT_DATABASE_URL,
    ...(process.env.NODE_ENV === 'production' ? { ssl: { rejectUnauthorized: true } } : {}) };
}
async function client(): Promise<PoolClient> {
  if (!pool) { pool = new pg.Pool(configuration()); pool.on('error', () => {}); }
  const c = await pool.connect();
  try {
    const result = await c.query(`select not r.rolsuper and not r.rolbypassrls and pg_has_role(current_user,'menu_runtime','MEMBER')
      and not pg_has_role(current_user,'menu_workflow_owner','MEMBER') and not pg_has_role(current_user,'menu_platform','MEMBER')
      and not pg_has_role(current_user,'menu_identity','MEMBER') as safe from pg_roles r where rolname=current_user`);
    if (!result.rows[0]?.safe) throw new Error('Unsafe connection');
    return c;
  } catch (e) { c.release(true); throw e; }
}
function safeError(e: unknown): CatalogCommandError {
  if (e instanceof CatalogCommandError) return e;
  const code = e && typeof e === 'object' && 'code' in e ? e.code : '';
  if (code === '42501') return new CatalogCommandError(403,'PERMISSION_DENIED','This action is not permitted for this business and branch.');
  if (code === '40001' && e && typeof e === 'object' && 'message' in e && e.message === 'idempotency payload conflict')
    return new CatalogCommandError(409,'IDEMPOTENCY_CONFLICT','This request key was already used with different content.');
  if (code === '23514' && e && typeof e === 'object' && 'message' in e && e.message === 'resolve outstanding service before ending seating')
    return new CatalogCommandError(409,'SERVICE_PENDING','Resolve all submitted and unfinished orders before ending this seating.');
  if (code === '54000') return new CatalogCommandError(422,'HISTORY_LIMIT','This bill needs paginated reconciliation before it can be displayed safely.');
  if (code === '40001') return new CatalogCommandError(409,'VERSION_CONFLICT','The saved state, menu or availability has changed. Refresh and review before retrying.');
  if (code === '23505') return new CatalogCommandError(409,'RESOURCE_CONFLICT','This resource or bank reference is already recorded. Review the existing record before retrying.');
  if (['23514','22023','22P02','22003','23502','22007','22008'].includes(String(code))) return new CatalogCommandError(422,'COMMAND_INVALID','Check the fields, item choices and versions.');
  return new CatalogCommandError(503,'SERVICE_UNAVAILABLE','The workspace service is temporarily unavailable. Your preparation is still on this page.');
}
export async function merchantTransaction<T>(principal: MerchantPrincipal, readOnly: boolean, action: (c: PoolClient) => Promise<T>): Promise<T> {
  if (!UUID.test(principal.userId) || !UUID.test(principal.businessId)) throw new CatalogCommandError(400,'INVALID_ID','A valid business principal is required.');
  let c: PoolClient | undefined; let discard = false;
  try {
    c = await client(); await c.query(readOnly ? 'begin read only' : 'begin'); await c.query('set local role menu_runtime');
    await c.query("select set_config('menu.merchant_id',$1,true),set_config('menu.user_id',$2,true),set_config('menu.guest_session_id','',true),set_config('menu.bill_access_id','',true)", [principal.businessId,principal.userId]);
    const result = await action(c); await c.query('commit'); return result;
  } catch (e) {
    console.error('merchantTransaction raw error:', e);
    if (c) await c.query('rollback').catch(() => { discard = true; });
    throw safeError(e);
  } finally { c?.release(discard); }
}
export async function catalogCommand(principal: MerchantPrincipal, branchId: string, operation: CatalogOperation,
  body: Record<string, unknown> = {}, key?: string): Promise<unknown> {
  if (!UUID.test(branchId)) throw new CatalogCommandError(400,'INVALID_ID','A valid branch is required.');
  const calls: Record<CatalogOperation, { sql: string; args: unknown[] }> = {
    READ_MENU: { sql: 'select menumini.read_menu_draft($1) as result', args: [branchId] },
    SAVE_MENU: { sql: 'select menumini.save_menu_draft($1,$2,$3::jsonb,$4) as result', args: [branchId,body.expectedVersion,JSON.stringify(body.content),key] },
    READ_PROFILE: { sql: 'select menumini.read_branch_profile($1) as result', args: [branchId] },
    SAVE_PROFILE: { sql: 'select menumini.save_branch_profile($1,$2,$3::jsonb,$4) as result', args: [branchId,body.expectedVersion,JSON.stringify(body.content),key] },
    PUBLISH: { sql: 'select menumini.publish_menu($1,$2,$3,$4) as result', args: [branchId,body.draftVersion,body.profileVersion,key] },
    READ_SERVICE: { sql: 'select menumini.read_service_draft($1) as result', args: [branchId] },
    SAVE_SERVICE: { sql: 'select menumini.save_service_draft($1,$2,$3::jsonb,$4) as result', args: [branchId,body.expectedVersion,JSON.stringify(body.content),key] },
    READ_READINESS: { sql: 'select menumini.read_branch_readiness($1) as result', args: [branchId] }
  };
  return merchantTransaction(principal,operation.startsWith('READ_'),async c => {
    const call = calls[operation]; const result = await c.query(call.sql,call.args);
    if (result.rows[0]?.result == null) throw new CatalogCommandError(404,'DRAFT_NOT_FOUND','No saved draft exists for this branch.');
    return result.rows[0].result;
  });
}
export async function closeMerchantCatalogPool() { await pool?.end(); pool = undefined; }
