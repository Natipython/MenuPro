import type { RequestHandler } from './$types';
import { verifiedMerchantIdentity } from '$lib/server/catalog-http';
import { serviceResponse } from '$lib/server/service-http';
export const PUT: RequestHandler = async ({ request,url,params }) => serviceResponse(request,url,params.tableId,'UPDATE_TABLE',await verifiedMerchantIdentity(),params.branchId);
