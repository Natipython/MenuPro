import type { RequestHandler } from './$types';
import { verifiedMerchantIdentity } from '$lib/server/catalog-http';
import { serviceResponse } from '$lib/server/service-http';
export const POST: RequestHandler = async ({ request,url,params }) => serviceResponse(request,url,params.visitId,'END_VISIT',await verifiedMerchantIdentity());
