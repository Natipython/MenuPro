import { json } from '@sveltejs/kit';
import { PUBLIC_CATALOG_HEADERS } from './public-catalog';

// OTP/session middleware is intentionally deferred. This is a closed boundary,
// not a development identity switch. No headers, cookies or UUIDs grant access.
export function identityPending() {
  return json({ type: 'urn:menumini:problem:authentication_required', title: 'Sign-in required', status: 401,
    detail: 'Verified business access is required. Sign-in is not connected yet.', code: 'AUTHENTICATION_REQUIRED', requestId: crypto.randomUUID() },
  { status: 401, headers: { ...PUBLIC_CATALOG_HEADERS, 'Content-Type': 'application/problem+json' } });
}
