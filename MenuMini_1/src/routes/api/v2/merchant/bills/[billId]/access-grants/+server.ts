import type {RequestHandler} from './$types';
import {payerStaffResponse} from '$lib/server/payer-http';
import {verifiedMerchantIdentity} from '$lib/server/catalog-http';
export const POST:RequestHandler=async ({request,url,params})=>payerStaffResponse(request,url,params.billId!, 'ISSUE',await verifiedMerchantIdentity());
