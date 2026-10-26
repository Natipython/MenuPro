import type { RequestHandler } from './$types';
import { verifiedMerchantIdentity } from '$lib/server/catalog-http';
import { cashierResponse } from '$lib/server/cashier-http';
export const POST: RequestHandler = async ({request,url,params}) => cashierResponse(request,url,params.receiptId,'ALLOCATE_RECEIPT',await verifiedMerchantIdentity());
