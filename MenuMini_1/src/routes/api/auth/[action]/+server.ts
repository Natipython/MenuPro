import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { registerMerchant, loginMerchant, getSessionFromToken, revokeToken } from '$lib/server/auth';
import { PUBLIC_CATALOG_HEADERS } from '$lib/server/public-catalog';

export const POST: RequestHandler = async ({ params, request, cookies }) => {
  const action = params.action;

  try {
    if (action === 'register') {
      const body = await request.json();
      if (!body.email || !body.password || !body.businessName) {
        return json({ error: 'Email, password, and business name are required.' }, { status: 400 });
      }
      if (body.password.length < 6) {
        return json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
      }

      const { session, token } = await registerMerchant({
        email: body.email,
        password: body.password,
        displayName: body.displayName || body.businessName,
        businessName: body.businessName,
        businessTypeId: body.businessTypeId || 'cafe-and-restaurant',
        branchName: body.branchName || 'Main Branch',
        city: body.city || 'Addis Ababa',
        area: body.area || '',
        phone: body.phone || ''
      });

      cookies.set('menumini_session', token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        secure: process.env.NODE_ENV === 'production'
      });

      return json({ ok: true, session }, { headers: PUBLIC_CATALOG_HEADERS });
    }

    if (action === 'login') {
      const body = await request.json();
      if (!body.email || !body.password) {
        return json({ error: 'Email and password are required.' }, { status: 400 });
      }

      const { session, token } = await loginMerchant(body.email, body.password);

      cookies.set('menumini_session', token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        secure: process.env.NODE_ENV === 'production'
      });

      return json({ ok: true, session }, { headers: PUBLIC_CATALOG_HEADERS });
    }

    if (action === 'logout') {
      const token = cookies.get('menumini_session');
      if (token) {
        await revokeToken(token);
        cookies.delete('menumini_session', { path: '/' });
      }
      return json({ ok: true }, { headers: PUBLIC_CATALOG_HEADERS });
    }

    return json({ error: 'Unknown auth action' }, { status: 404 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Authentication operation failed.';
    return json({ error: message }, { status: 400, headers: PUBLIC_CATALOG_HEADERS });
  }
};

export const GET: RequestHandler = async ({ params, cookies }) => {
  if (params.action === 'me') {
    const token = cookies.get('menumini_session');
    if (!token) return json({ session: null }, { headers: PUBLIC_CATALOG_HEADERS });
    const session = await getSessionFromToken(token);
    return json({ session }, { headers: PUBLIC_CATALOG_HEADERS });
  }
  return json({ error: 'Not found' }, { status: 404 });
};
