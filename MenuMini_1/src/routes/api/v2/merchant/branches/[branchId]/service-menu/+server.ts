import type { RequestHandler } from './$types';
import { verifiedMerchantIdentity } from '$lib/server/catalog-http';
import { serviceResponse } from '$lib/server/service-http';
export const GET: RequestHandler = async ({ request,url,params }) => serviceResponse(request,url,params.branchId,'OFFER',await verifiedMerchantIdentity());
