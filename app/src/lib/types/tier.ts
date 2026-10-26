export type SubscriptionTier = 'MINI' | 'PRO';

export interface TierFeatures {
  // Kitchen & Hardware
  kdsEnabled: boolean;
  stationRouting: boolean;
  prepTimeThresholds: boolean;

  // Multi-Location & Staff
  multiBranch: boolean;
  staffMatrix: boolean;
  terminalSecurityPins: boolean;

  // Menu Capabilities
  complexModifiers: boolean;      // Nested options, half-and-half, weights
  liveInventory86ing: boolean;    // Live stock toggles
  timeBasedMenus: boolean;        // Automated breakfast/dinner switches

  // Template & Design System
  preMadeTemplatesOnly: boolean;  // Mini: strictly pre-made templates with light tweaks
  aiScratchTemplates: boolean;    // Pro: freeform AI prompt-to-template generator
  customCssOverrides: boolean;    // Pro: raw CSS and custom layouts

  // Order Routing & Fulfillment
  whatsAppNotifications: boolean; // Direct WhatsApp order dispatch
  dailyEmailSummary: boolean;     // Automated daily sales summary
  simpleExcelExport: boolean;     // 1-click clean Excel/CSV

  // Services
  printShopAccess: boolean;       // Order acrylic/wood/laminated physical QRs
  doneForYouSetup: boolean;       // White-glove menu setup
}

export const TIER_CONFIG: Record<SubscriptionTier, TierFeatures> = {
  MINI: {
    kdsEnabled: false,
    stationRouting: false,
    prepTimeThresholds: false,

    multiBranch: false,
    staffMatrix: false,
    terminalSecurityPins: false,

    complexModifiers: false,
    liveInventory86ing: false,
    timeBasedMenus: false,

    preMadeTemplatesOnly: true,
    aiScratchTemplates: false,
    customCssOverrides: false,

    whatsAppNotifications: true,
    dailyEmailSummary: true,
    simpleExcelExport: true,

    printShopAccess: true,
    doneForYouSetup: true
  },
  PRO: {
    kdsEnabled: true,
    stationRouting: true,
    prepTimeThresholds: true,

    multiBranch: true,
    staffMatrix: true,
    terminalSecurityPins: true,

    complexModifiers: true,
    liveInventory86ing: true,
    timeBasedMenus: true,

    preMadeTemplatesOnly: false,
    aiScratchTemplates: true,
    customCssOverrides: true,

    whatsAppNotifications: true,
    dailyEmailSummary: true,
    simpleExcelExport: true,

    printShopAccess: true,
    doneForYouSetup: true
  }
};
