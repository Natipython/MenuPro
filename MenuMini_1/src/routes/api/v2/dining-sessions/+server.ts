import type {RequestHandler} from './$types';
import {guestResponse,guestCookieName} from '$lib/server/guest-http';
export const POST:RequestHandler=async ({request,url,cookies,params})=>guestResponse(request,url,'START',null,cookies.get(guestCookieName())||null);
