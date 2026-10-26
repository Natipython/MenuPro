import QRCode from 'qrcode';
import type { PageServerLoad } from './$types';
import { readPublishedMenu, publicMenuLink, PUBLIC_CATALOG_HEADERS } from '$lib/server/public-catalog';

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
  setHeaders(PUBLIC_CATALOG_HEADERS);
  try {
    const menu = await readPublishedMenu(params.venueSlug);
    if (!menu) return { menu: null, serviceUnavailable: false, shareUrl: '', qr: '' };
    const shareUrl = publicMenuLink(params.venueSlug, url.origin);
    const qr = await QRCode.toDataURL(shareUrl, { errorCorrectionLevel: 'M', margin: 3, width: 240 });
    return { menu, serviceUnavailable: false, shareUrl, qr };
  } catch { return { menu: null, serviceUnavailable: true, shareUrl: '', qr: '' }; }
};
