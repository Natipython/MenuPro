import type {RequestHandler} from './$types';
import {payerResponse,payerCookieName} from '$lib/server/payer-http';
import {guestCookieName} from '$lib/server/guest-http';
export const POST:RequestHandler=async ({request,url,cookies})=>payerResponse(request,url,'LEAVE',cookies.get(guestCookieName())||null,cookies.get(payerCookieName())||null);
