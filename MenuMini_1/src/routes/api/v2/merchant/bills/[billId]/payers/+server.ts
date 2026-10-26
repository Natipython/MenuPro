import type {RequestHandler} from './$types';
import {payerStaffResponse} from '$lib/server/payer-http';
import {verifiedMerchantIdentity} from '$lib/server/catalog-http';
export const GET:RequestHandler=async ({request,url,params})=>payerStaffResponse(request,url,params.billId!, 'CANDIDATES',await verifiedMerchantIdentity());
