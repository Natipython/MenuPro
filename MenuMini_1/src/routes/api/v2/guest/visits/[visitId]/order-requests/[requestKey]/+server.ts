import {guestRecoveryResponse} from '$lib/server/recovery-http';
import {guestCookieName} from '$lib/server/guest-http';
import {payerCookieName} from '$lib/server/payer-http';
import type {RequestHandler} from './$types';
export const GET:RequestHandler=({request,url,params,cookies})=>guestRecoveryResponse(request,url,params.visitId,params.requestKey,'GUEST',false,cookies.get(guestCookieName())||null,cookies.get(payerCookieName())||null);
