import type { LayoutServerLoad } from './$types';
import { getSessionFromToken } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ cookies }) => {
  const token = cookies.get('menumini_session');
  const session = token ? await getSessionFromToken(token) : null;
  return {
    session
  };
};
