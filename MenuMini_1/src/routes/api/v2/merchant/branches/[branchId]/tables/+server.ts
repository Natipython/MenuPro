import type { RequestHandler } from './$types';
import { verifiedMerchantIdentity } from '$lib/server/catalog-http';
import { serviceResponse } from '$lib/server/service-http';
export const GET: RequestHandler = async ({ request,url,params }) => serviceResponse(request,url,params.branchId,'TABLES',await verifiedMerchantIdentity());
export const POST: RequestHandler = async ({ request,url,params }) => serviceResponse(request,url,params.branchId,'CREATE_TABLE',await verifiedMerchantIdentity());
