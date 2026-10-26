import { env } from '$env/dynamic/private';
import pg from 'pg';
import type { PoolClient, PoolConfig } from 'pg';

export interface CatalogChoice { id: string; label: string; priceDelta: string; isAvailable: boolean }
export interface CatalogModifier { id: string; label: string; mode: 'SINGLE_SELECT' | 'MULTI_SELECT'; minSelections: number; maxSelections: number; choices: CatalogChoice[] }
export interface CatalogItem { id: string; nameEn: string; nameAm?: string; descriptionEn?: string; descriptionAm?: string; basePrice: string; availableNow: boolean; modifiers: CatalogModifier[] }
export interface CatalogSection { id: string; nameEn: string; nameAm?: string; items: CatalogItem[] }
export interface PublishedMenu {
  publicationId: string; revision: number; venueId: string; venueName: string; currency: 'ETB'; availabilityRevision: number;
  branch: import('$lib/onboarding/setup').SetupBranch;
  content: { themeId: string; primaryColor: string; sections: CatalogSection[] };
}
export class PublicCatalogUnavailable extends Error {
  constructor() { super('The menu service is temporarily unavailable.'); }
}
export const PUBLIC_CATALOG_HEADERS = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
let pool: pg.Pool | undefined;
function configuration(): PoolConfig {
  const limits: PoolConfig = { max: 4, idleTimeoutMillis: 10000, connectionTimeoutMillis: 3000,
    statement_timeout: 3000, query_timeout: 4000, application_name: 'menumini_public_reader', password: '' };
  // An explicit local socket fixture is permitted only in development. Never
  // inherit PGHOST/PGUSER/DATABASE_URL or load provider credentials implicitly.
  if (env.MENU_PUBLIC_FIXTURE_CONFIG) {
    if (process.env.NODE_ENV !== 'development') throw new PublicCatalogUnavailable();
    const value = JSON.parse(env.MENU_PUBLIC_FIXTURE_CONFIG);
    if (typeof value.host !== 'string' || !value.host.startsWith('/tmp/menumini-public-')
      || value.database !== 'postgres' || value.user !== 'menu_customer' || !Number.isInteger(value.port)) throw new PublicCatalogUnavailable();
    return { ...limits, host: value.host, port: value.port, user: value.user, database: value.database, ssl: false };
  }
  if (!env.MENU_PUBLIC_DATABASE_URL) throw new PublicCatalogUnavailable();
  const url = new URL(env.MENU_PUBLIC_DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.pathname.slice(1)) throw new PublicCatalogUnavailable();
  if (process.env.NODE_ENV === 'production' && ['sslmode','sslcert','sslkey','sslrootcert'].some(key => url.searchParams.has(key))) throw new PublicCatalogUnavailable();
  return { ...limits, connectionString: env.MENU_PUBLIC_DATABASE_URL,
    ...(process.env.NODE_ENV === 'production' ? { ssl: { rejectUnauthorized: true } } : {}) };
}
export function publicMenuLink(slug: string, developmentOrigin: string): string {
  const origin = env.MENU_PUBLIC_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : developmentOrigin);
  if (!origin) throw new PublicCatalogUnavailable();
  const parsed = new URL(origin);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash
    || parsed.pathname !== '/' || (process.env.NODE_ENV === 'production' && (parsed.protocol !== 'https:' || ['localhost','127.0.0.1','[::1]'].includes(parsed.hostname)))) throw new PublicCatalogUnavailable();
  return new URL('/menu/' + encodeURIComponent(slug), parsed.origin).href;
}
async function checkedClient(): Promise<PoolClient> {
  if (!pool) {
    pool = new pg.Pool(configuration());
    // No database error text is logged: connection errors may include credentials.
    pool.on('error', () => {});
  }
  const client = await pool.connect();
  try {
    const result = await client.query<{ safe: boolean }>(`select not r.rolsuper and not r.rolbypassrls
      and pg_has_role(current_user,'menu_public','MEMBER')
      and not pg_has_role(current_user,'menu_workflow_owner','MEMBER')
      and not pg_has_role(current_user,'menu_runtime','MEMBER')
      and not pg_has_role(current_user,'menu_identity','MEMBER')
      and not pg_has_role(current_user,'menu_platform','MEMBER') as safe
      from pg_roles r where r.rolname=current_user`);
    if (!result.rows[0]?.safe) throw new PublicCatalogUnavailable();
    return client;
  } catch { client.release(true); throw new PublicCatalogUnavailable(); }
}
export async function readPublishedMenu(slug: string): Promise<PublishedMenu | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 160) return null;
  let client: PoolClient | undefined;
  try {
    client = await checkedClient();
    await client.query('begin read only');
    await client.query('set local role menu_public');
    const result = await client.query<{ menu: PublishedMenu | null }>('select menumini.read_public_menu($1) as menu', [slug]);
    await client.query('commit');
    return result.rows[0]?.menu || null;
  } catch {
    if (client) await client.query('rollback').catch(() => {});
    throw new PublicCatalogUnavailable();
  } finally { client?.release(); }
}
