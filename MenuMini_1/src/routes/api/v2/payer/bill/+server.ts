import type {RequestHandler} from './$types';
import {payerResponse,payerCookieName} from '$lib/server/payer-http';
import {guestCookieName} from '$lib/server/guest-http';
export const GET:RequestHandler=async ({request,url,cookies})=>payerResponse(request,url,'DETAIL',cookies.get(guestCookieName())||null,cookies.get(payerCookieName())||null);
