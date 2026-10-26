import type { PageServerLoad } from './$types';
import { verifiedMerchantIdentity } from '$lib/server/catalog-http';
import { loadStudioDrafts } from '$lib/server/menu-studio';
import { CatalogCommandError } from '$lib/server/merchant-catalog';
import { PUBLIC_CATALOG_HEADERS } from '$lib/server/public-catalog';

export const load: PageServerLoad = async ({ params, setHeaders, cookies }) => {
  setHeaders(PUBLIC_CATALOG_HEADERS);
  const principal = await verifiedMerchantIdentity(cookies);
  if (!principal) return { access: 'IDENTITY_REQUIRED' as const, studio: null, loadError: null };
  try {
    return { access: 'VERIFIED' as const, studio: await loadStudioDrafts(params.branchId, principal), loadError: null };
  } catch (error) {
    console.error('loadStudioDrafts error:', error);
    return { access: 'UNAVAILABLE' as const, studio: null,
      loadError: error instanceof Error ? error.message : 'The menu workspace is temporarily unavailable.' };
  }
};
