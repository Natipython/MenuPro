import type { PageServerLoad } from './$types';
import { getSessionFromToken } from '$lib/server/auth';

export const load: PageServerLoad = async ({ setHeaders, cookies }) => {
  setHeaders({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
  const token = cookies.get('menumini_session');
  if (token) {
    const session = await getSessionFromToken(token);
    if (session) {
      return { authenticated: true, venueId: session.venueId };
    }
  }
  return { authenticated: false };
};
