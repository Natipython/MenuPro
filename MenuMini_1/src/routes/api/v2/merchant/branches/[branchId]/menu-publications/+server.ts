import type { RequestHandler } from './$types';
import { merchantCatalogResponse, verifiedMerchantIdentity } from '$lib/server/catalog-http';
export const POST: RequestHandler = async ({ request, url, params }) => merchantCatalogResponse(request,url,params.branchId,'PUBLISH',await verifiedMerchantIdentity());
