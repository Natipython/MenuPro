import type {RequestHandler} from './$types';
import {guestResponse,guestCookieName} from '$lib/server/guest-http';
export const GET:RequestHandler=async ({request,url,cookies,params})=>guestResponse(request,url,'OFFER',null,cookies.get(guestCookieName())||null);
