import { json } from '@sveltejs/kit';
import type { FieldIssue } from '$lib/onboarding/registration';

interface CheckOptions<T> {
  maxBytes: number; title: string; invalidCode: string;
  validate: (body: unknown) => { errors: FieldIssue[]; check?: T };
}
// Shared transport only. Never log bodies, echo drafts, set sessions or persist data.
export async function statelessCheck<T>(request: Request, url: URL, options: CheckOptions<T>) {
  const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
  const problem = (status: number, code: string, detail: string, errors?: FieldIssue[]) =>
    json({ type: 'urn:menumini:problem:' + code.toLowerCase(), title: options.title, status,
      detail, code, requestId: crypto.randomUUID(), ...(errors ? { errors } : {}) },
    { status, headers: { ...headers, 'Content-Type': 'application/problem+json' } });
  if (request.headers.get('origin') !== url.origin) return problem(403, 'ORIGIN_REJECTED', 'Use the business setup page on this site.');
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return problem(415, 'JSON_REQUIRED', 'Send an application/json body.');
  const tooLarge = () => problem(413, 'BODY_TOO_LARGE', `Keep this draft under ${options.maxBytes / 1024} KB.`);
  if (Number(request.headers.get('content-length')) > options.maxBytes) return tooLarge();
  const reader = request.body?.getReader();
  if (!reader) return problem(400, 'INVALID_JSON', 'A JSON object is required.');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      // Node's request-stream cancellation can destroy the socket before 413 is sent.
      if (size > options.maxBytes) return tooLarge();
      chunks.push(value);
    }
  } catch { return problem(400, 'BODY_INTERRUPTED', 'The request was interrupted. Try again.'); }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let body: unknown;
  try { body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { return problem(400, 'INVALID_JSON', 'A valid JSON object is required.'); }
  const result = options.validate(body);
  if (result.errors.length || !result.check) return problem(422, options.invalidCode, 'Check the marked fields.', result.errors);
  return json(result.check, { headers });
}
