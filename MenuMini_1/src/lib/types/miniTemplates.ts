export interface MiniMenuTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  badge?: string;
  category: 'cafe' | 'bistro' | 'fast-casual' | 'cultural' | 'lounge' | 'minimal';
  theme: {
    bg: string;
    surface: string;
    text: string;
    primary: string;
    accent: string;
    fontFamily: string;
    borderRadius: string;
  };
}

export interface MiniTableQrTemplate {
  id: string;
  name: string;
  format: 'A6_TENT' | 'STICKER_SQUARE' | 'ACRYLIC_STAND' | 'WOOD_BLOCK';
  dimensions: string;
  previewUrl: string;
  recommendedMaterial: string;
  svgTemplate: string;
}

export interface MiniPaymentQrTemplate {
  id: string;
  provider: 'telebirr' | 'cbe_birr' | 'awash_birr' | 'multi_bank';
  name: string;
  brandColor: string;
  textColor: string;
  accentColor: string;
  badgeIcon: string;
  bannerText: string;
}

export const MINI_MENU_TEMPLATES: MiniMenuTemplate[] = [
  {
    id: 'mini-minimal-slate',
    name: 'Minimal Clean',
    description: 'Crisp high-contrast layout ideal for modern specialty cafes and bakeries.',
    thumbnail: '☕',
    badge: 'Popular',
    category: 'cafe',
    theme: {
      bg: '#0F1117',
      surface: '#1A1D27',
      text: '#F8FAFC',
      primary: '#38BDF8',
      accent: '#0284C7',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      borderRadius: '12px'
    }
  },
  {
    id: 'mini-warm-habesha',
    name: 'Habesha Terracotta',
    description: 'Warm earth tones inspired by Ethiopian clay coffee pots and spices.',
    thumbnail: '🏺',
    badge: 'Cultural',
    category: 'cultural',
    theme: {
      bg: '#140E0A',
      surface: '#231812',
      text: '#FEF3C7',
      primary: '#F59E0B',
      accent: '#B45309',
      fontFamily: "'Plus Jakarta Sans', serif",
      borderRadius: '16px'
    }
  },
  {
    id: 'mini-bole-bistro',
    name: 'Bole Nightfall',
    description: 'Sleek luxury dark aesthetic for evenings, bistros, and cocktail bars.',
    thumbnail: '🍸',
    badge: 'Premium',
    category: 'lounge',
    theme: {
      bg: '#090A0F',
      surface: '#12141F',
      text: '#E2E8F0',
      primary: '#E11D48',
      accent: '#9F1239',
      fontFamily: "'Playfair Display', serif",
      borderRadius: '14px'
    }
  },
  {
    id: 'mini-fresh-organic',
    name: 'Fresh Avocado Green',
    description: 'Vibrant, energizing layout tailored for juice bars, vegan spots, and salads.',
    thumbnail: '🥑',
    category: 'fast-casual',
    theme: {
      bg: '#081711',
      surface: '#102A1F',
      text: '#ECFDF5',
      primary: '#10B981',
      accent: '#059669',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      borderRadius: '16px'
    }
  },
  {
    id: 'mini-street-burger',
    name: 'Fast Street Flare',
    description: 'High-energy bold cards with large prices, built for burger & shawarma spots.',
    thumbnail: '🍔',
    category: 'fast-casual',
    theme: {
      bg: '#18120C',
      surface: '#2A1E14',
      text: '#FFFBEB',
      primary: '#F97316',
      accent: '#EA580C',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      borderRadius: '8px'
    }
  },
  {
    id: 'mini-artisan-roastery',
    name: 'Artisan Espresso',
    description: 'Deep roast browns and creamy milk whites celebrating coffee craft.',
    thumbnail: '☕',
    category: 'cafe',
    theme: {
      bg: '#1A1412',
      surface: '#2B211D',
      text: '#F5EBE6',
      primary: '#D97706',
      accent: '#78350F',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      borderRadius: '14px'
    }
  }
];

export const MINI_TABLE_QR_TEMPLATES: MiniTableQrTemplate[] = [
  {
    id: 'qr-a6-tent',
    name: 'Classic A6 Table Tent',
    format: 'A6_TENT',
    dimensions: '105mm x 148mm (Double-Sided Folded)',
    previewUrl: '/prints/a6-tent-preview.png',
    recommendedMaterial: '350gsm Heavy Matte Cardstock + Lamination',
    svgTemplate: 'tent-classic'
  },
  {
    id: 'qr-square-sticker',
    name: '10x10cm Table Surface Sticker',
    format: 'STICKER_SQUARE',
    dimensions: '100mm x 100mm',
    previewUrl: '/prints/square-sticker-preview.png',
    recommendedMaterial: 'Waterproof Vinyl + Anti-Scratch Lamination',
    svgTemplate: 'sticker-square'
  },
  {
    id: 'qr-acrylic-portrait',
    name: 'Clear Acrylic Pedestal Card',
    format: 'ACRYLIC_STAND',
    dimensions: '100mm x 150mm Insert',
    previewUrl: '/prints/acrylic-stand-preview.png',
    recommendedMaterial: '3mm Crystal Clear Acrylic + High-Gloss Paper Insert',
    svgTemplate: 'acrylic-portrait'
  },
  {
    id: 'qr-wood-block',
    name: 'Engraved Wood Block Insert',
    format: 'WOOD_BLOCK',
    dimensions: '80mm x 120mm Card',
    previewUrl: '/prints/wood-block-preview.png',
    recommendedMaterial: 'Solid Beech Wood Base + Kraft Paper QR Card',
    svgTemplate: 'wood-minimal'
  }
];

export const MINI_PAYMENT_QR_TEMPLATES: MiniPaymentQrTemplate[] = [
  {
    id: 'pay-telebirr-official',
    provider: 'telebirr',
    name: 'telebirr Signature Stand',
    brandColor: '#005CB9',
    textColor: '#FFFFFF',
    accentColor: '#FFD100',
    badgeIcon: '📱',
    bannerText: 'Scan to Pay with telebirr'
  },
  {
    id: 'pay-cbe-official',
    provider: 'cbe_birr',
    name: 'CBE Birr Trust Card',
    brandColor: '#581845',
    textColor: '#FFFFFF',
    accentColor: '#FFC300',
    badgeIcon: '🏦',
    bannerText: 'CBE Birr / CBE Mobile Banking'
  },
  {
    id: 'pay-awash-official',
    provider: 'awash_birr',
    name: 'Awash Birr Sunset Stand',
    brandColor: '#0054A6',
    textColor: '#FFFFFF',
    accentColor: '#F7931E',
    badgeIcon: '🦅',
    bannerText: 'Awash Birr / Awash Bank QR'
  },
  {
    id: 'pay-multi-bank-hub',
    provider: 'multi_bank',
    name: 'Unified Ethiopian Bank Placard',
    brandColor: '#0F172A',
    textColor: '#F8FAFC',
    accentColor: '#10B981',
    badgeIcon: '💳',
    bannerText: 'We Accept telebirr & All Ethiopian Banks'
  }
];
