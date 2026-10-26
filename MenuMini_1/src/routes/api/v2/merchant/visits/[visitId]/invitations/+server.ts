import type {RequestHandler} from './$types';
import {issueGuestResponse} from '$lib/server/guest-http';
import {verifiedMerchantIdentity} from '$lib/server/catalog-http';
export const POST:RequestHandler=async ({request,url,params})=>issueGuestResponse(request,url,params.visitId!, 'VISIT_INVITATION',await verifiedMerchantIdentity());
