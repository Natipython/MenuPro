import type { PageServerLoad } from './$types';
import { getSessionFromToken } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies, url }) => {
  const token = cookies.get('menumini_session');
  const session = token ? await getSessionFromToken(token) : null;
  if (!session) {
    throw redirect(303, '/sign-in');
  }

  return {
    venueSlug: session.venueSlug,
    venueName: session.displayName,
    origin: url.origin
  };
};
