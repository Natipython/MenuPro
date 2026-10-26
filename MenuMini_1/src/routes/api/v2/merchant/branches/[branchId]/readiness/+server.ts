import type { RequestHandler } from './$types';
import { merchantCatalogResponse, verifiedMerchantIdentity } from '$lib/server/catalog-http';
export const GET: RequestHandler = async ({ request, url, params }) => merchantCatalogResponse(request,url,params.branchId,'READ_READINESS',await verifiedMerchantIdentity());
