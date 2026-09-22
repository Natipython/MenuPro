// import QRCode from 'qrcode';

export const qrCodeService = {
  /**
   * Generates a QR code image data URI for a given URL.
   */
  generateDataUri: async (url: string): Promise<string> => {
    // return await QRCode.toDataURL(url);
    return `data:image/png;base64,mocked-qr-code-for-${url}`;
  },

  /**
   * Generates the routing URL for a specific branch.
   */
  getBranchUrl: (businessSlug: string, branchSlug: string): string => {
    const baseUrl = process.env.BASE_URL || 'https://menu.app';
    return `${baseUrl}/${businessSlug}/${branchSlug}`;
  },

  /**
   * Generates the routing URL for a specific table at a branch.
   */
  getTableUrl: (businessSlug: string, branchSlug: string, tableId: string): string => {
    const baseUrl = process.env.BASE_URL || 'https://menu.app';
    return `${baseUrl}/${businessSlug}/${branchSlug}?t=${tableId}`;
  }
};
