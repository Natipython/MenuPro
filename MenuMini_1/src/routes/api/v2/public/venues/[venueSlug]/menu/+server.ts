import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readPublishedMenu, PUBLIC_CATALOG_HEADERS } from '$lib/server/public-catalog';

export const GET: RequestHandler = async ({ params }) => {
  const problem = (status: number, code: string, detail: string) => json({ type: 'urn:menumini:problem:' + code.toLowerCase(),
    title: status === 404 ? 'Menu unavailable' : 'Menu service unavailable', status, detail, code, requestId: crypto.randomUUID() },
  { status, headers: { ...PUBLIC_CATALOG_HEADERS, 'Content-Type': 'application/problem+json' } });
  try {
    const menu = await readPublishedMenu(params.venueSlug);
    return menu ? json(menu, { headers: PUBLIC_CATALOG_HEADERS }) : problem(404, 'MENU_NOT_FOUND', 'This menu is unavailable. Ask the business for its current menu.');
  } catch { return problem(503, 'MENU_SERVICE_UNAVAILABLE', 'The menu could not be loaded. Try again shortly.'); }
};
