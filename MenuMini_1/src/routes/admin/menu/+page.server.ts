import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { PUBLIC_CATALOG_HEADERS } from '$lib/server/public-catalog';
import { getSessionFromToken } from '$lib/server/auth';

export const load: PageServerLoad = async ({ setHeaders, cookies }) => {
  setHeaders(PUBLIC_CATALOG_HEADERS);
  const token = cookies.get('menumini_session');
  if (token) {
    const session = await getSessionFromToken(token);
    if (session) {
      throw redirect(302, `/admin/menu/${session.venueId}`);
    }
  }
  throw redirect(302, '/sign-in');
};
