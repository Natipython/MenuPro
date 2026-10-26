import type { PageServerLoad } from './$types';
import { getSessionFromToken } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies }) => {
  const token = cookies.get('menumini_session');
  const session = token ? await getSessionFromToken(token) : null;
  return {
    isLoggedIn: !!session,
    venueId: session?.venueId || null
  };
};
