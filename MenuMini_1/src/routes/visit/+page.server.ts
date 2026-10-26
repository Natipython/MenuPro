import type {PageServerLoad} from './$types';
import {GUEST_HEADERS} from '$lib/server/guest-http';
export const load:PageServerLoad=async({setHeaders})=>{setHeaders(GUEST_HEADERS);return {};};
