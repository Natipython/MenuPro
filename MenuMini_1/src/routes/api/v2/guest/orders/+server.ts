import type {RequestHandler} from './$types';
import {guestResponse,guestCookieName} from '$lib/server/guest-http';
export const POST:RequestHandler=async ({request,url,cookies,params})=>guestResponse(request,url,'SUBMIT',null,cookies.get(guestCookieName())||null);
export const GET:RequestHandler=async ({request,url,cookies,params})=>guestResponse(request,url,'ORDERS',null,cookies.get(guestCookieName())||null);
