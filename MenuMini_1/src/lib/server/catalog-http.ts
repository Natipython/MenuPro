import { json } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import { PUBLIC_CATALOG_HEADERS } from './public-catalog';
import { identityPending } from './catalog-access';
import { catalogCommand, CatalogCommandError } from './merchant-catalog';
import type { MerchantPrincipal, CatalogOperation } from './merchant-catalog';
import { shape, UUID, validateCatalog, validateProfile, validateService } from '$lib/workspace/model';
import type { FieldIssue } from '$lib/onboarding/registration';

import { getSessionFromToken } from './auth';

export async function verifiedMerchantIdentity(source?: Request | { get: (name: string) => string | undefined } | string | null): Promise<MerchantPrincipal | null> {
  let token: string | undefined;
  if (typeof source === 'string') {
    token = source;
  } else if (source && 'get' in source && typeof source.get === 'function') {
    token = source.get('menumini_session');
  } else if (source && 'headers' in source && source.headers) {
    const cookieHeader = source.headers.get('cookie') || '';
    const match = /menumini_session=([0-9a-f]{64})/i.exec(cookieHeader);
    token = match ? match[1] : undefined;
    if (!token) {
      const auth = source.headers.get('authorization') || '';
      if (auth.startsWith('Bearer ')) token = auth.slice(7).trim();
    }
  }

  if (!token) return null;
  const session = await getSessionFromToken(token);
  if (!session) return null;

  return {
    userId: session.userId,
    businessId: session.businessId,
    csrfToken: session.csrfToken
  };
}

const problem = (status: number, code: string, detail: string, errors?: FieldIssue[]) => json({
  type: 'urn:menumini:problem:' + code.toLowerCase(), title: 'Workspace request', status, detail, code,
  requestId: crypto.randomUUID(), ...(errors ? { errors } : {})
}, { status, headers: { ...PUBLIC_CATALOG_HEADERS, 'Content-Type': 'application/problem+json' } });

export async function merchantCatalogResponse(request: Request, url: URL, branchId: string,
  operation: CatalogOperation, principal: MerchantPrincipal | null): Promise<Response> {
  if (!principal) principal = await verifiedMerchantIdentity(request);
  if (!principal) return identityPending();
  if (!UUID.test(branchId)) return problem(400,'INVALID_ID','A valid branch is required.');
  let body: Record<string, unknown> = {}; let key: string | undefined;
  if (!operation.startsWith('READ_')) {
    if (request.headers.get('origin') !== url.origin) return problem(403,'ORIGIN_REJECTED','Use the workspace on this site.');
    const supplied = Buffer.from(request.headers.get('x-csrf-token') || ''); const expected = Buffer.from(principal.csrfToken);
    if (!expected.length || supplied.length !== expected.length || !timingSafeEqual(supplied,expected)) return problem(403,'CSRF_REJECTED','Reload your verified workspace before retrying.');
    key = request.headers.get('idempotency-key') || '';
    if (!UUID.test(key)) return problem(400,'IDEMPOTENCY_KEY_REQUIRED','A request key is required for safe saving.');
    if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return problem(415,'JSON_REQUIRED','Send an application/json body.');
    const maximum = operation === 'SAVE_MENU' ? 1050624 : 18432;
    if (Number(request.headers.get('content-length')) > maximum) return problem(413,'BODY_TOO_LARGE','The draft exceeds the request limit.');
    const reader = request.body?.getReader(); if (!reader) return problem(400,'INVALID_JSON','A JSON object is required.');
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) { const { value, done } = await reader.read(); if (done) break;
        size += value.byteLength; if (size > maximum) return problem(413,'BODY_TOO_LARGE','The draft exceeds the request limit.'); chunks.push(value); }
    } catch { return problem(400,'BODY_INTERRUPTED','The request was interrupted. Retry with the same key and content.'); }
    finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.byteLength; }
    let parsed: unknown; try { parsed = JSON.parse(new TextDecoder('utf-8',{ fatal: true }).decode(bytes)); }
    catch { return problem(400,'INVALID_JSON','A valid JSON object is required.'); }
    const errors: FieldIssue[] = []; const issue = (field: string,code: string) => errors.push({ field,code });
    const fields = operation === 'PUBLISH' ? ['draftVersion','profileVersion'] : ['expectedVersion','content'];
    if (!shape(parsed,fields,fields,'$',issue)) return problem(422,'COMMAND_INVALID','Check the fields.',errors);
    body = parsed;
    for (const field of fields.filter(f => f !== 'content')) {
      const minimum = operation === 'PUBLISH' ? 1 : 0;
      if (!Number.isInteger(body[field]) || (body[field] as number) < minimum || (body[field] as number) > 2147483646) issue(field,'VERSION_REQUIRED');
    }
    if (operation !== 'PUBLISH') {
      const validate = operation === 'SAVE_MENU' ? validateCatalog : operation === 'SAVE_PROFILE' ? validateProfile : validateService;
      errors.push(...validate(body.content).map(e => ({ ...e, field: 'content.' + e.field })));
    }
    if (errors.length) return problem(422,'COMMAND_INVALID','Check the marked fields.',errors.slice(0,64));
  }
  try {
    const result = await catalogCommand(principal,branchId,operation,body,key);
    return json(result, { status: operation === 'PUBLISH' ? 201 : 200, headers: PUBLIC_CATALOG_HEADERS });
  } catch (e) {
    if (e instanceof CatalogCommandError) return problem(e.status,e.code,e.message);
    return problem(503,'SERVICE_UNAVAILABLE','The workspace service is temporarily unavailable.');
  }
}
