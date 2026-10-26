import {staffRecoveryResponse} from '$lib/server/recovery-http';
import {verifiedMerchantIdentity} from '$lib/server/catalog-http';
import type {RequestHandler} from './$types';
export const GET:RequestHandler=async({request,url,params})=>staffRecoveryResponse(request,url,params.branchId,params.requestKey,'SERVICE',false,await verifiedMerchantIdentity());
