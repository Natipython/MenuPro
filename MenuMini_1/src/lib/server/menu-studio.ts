import { catalogCommand, CatalogCommandError } from './merchant-catalog';
import type { MerchantPrincipal } from './merchant-catalog';
import type { Catalog, Profile } from '$lib/workspace/model';
import { UUID, validateCatalog, validateProfile } from '$lib/workspace/model';
import type { SavedStudioDraft } from '$lib/studio/catalog-client';

// Only a trusted verified session may supply this principal. HTTP pages never
// construct one from query parameters, branch IDs, cookies or request headers.
export async function loadStudioDrafts(branchId: string, principal: MerchantPrincipal) {
  if (!UUID.test(branchId)) throw new CatalogCommandError(400, 'INVALID_ID', 'A valid branch is required.');
  const [menu, profile] = await Promise.all([
    catalogCommand(principal, branchId, 'READ_MENU') as Promise<SavedStudioDraft<Catalog>>,
    catalogCommand(principal, branchId, 'READ_PROFILE') as Promise<SavedStudioDraft<Profile>>
  ]);
  const catErrors = validateCatalog(menu.content);
  const profErrors = validateProfile(profile.content);
  if (menu.venueId !== branchId || profile.venueId !== branchId
    || !Number.isSafeInteger(menu.version) || menu.version < 1 || !Number.isSafeInteger(profile.version) || profile.version < 1
    || catErrors.length || profErrors.length) {
    throw new CatalogCommandError(503, 'SERVICE_UNAVAILABLE', 'The saved menu could not be loaded safely.');
  }
  return { branchId, csrfToken: principal.csrfToken, menu, profile };
}
