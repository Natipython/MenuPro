import type {RequestHandler} from './$types';
import {guestResponse,guestCookieName} from '$lib/server/guest-http';
export const GET:RequestHandler=async ({request,url,cookies,params})=>guestResponse(request,url,'READ_ORDER',params.orderId!,cookies.get(guestCookieName())||null);
