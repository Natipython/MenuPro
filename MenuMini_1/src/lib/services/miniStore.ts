import { writable } from 'svelte/store';
import { MINI_MENU_TEMPLATES, type MiniMenuTemplate } from '$lib/types/miniTemplates';

export interface MiniDish {
  id: string;
  name: string;
  nameAmharic?: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  isAvailable: boolean;
  isPopular?: boolean;
  imageUrl?: string;
  calories?: string;
  preparationTime?: string;
}

export interface MiniSection {
  id: string;
  name: string;
  icon: string;
}

export interface VenueConfig {
  name: string;
  slug: string;
  branch: string;
  branchSlug: string;
  phone: string;
  activeTemplateId: string;
  primaryColor: string;
  currency: string;
  welcomeMessage: string;
  paymentAccounts: {
    telebirr: { number: string; tillName: string };
    cbeBirr: { accountNumber: string; holderName: string };
    awashBirr: { accountNumber: string; holderName: string };
  };
}

const DEFAULT_VENUE: VenueConfig = {
  name: 'Bole Roastery & Kitchen',
  slug: 'demo-cafe',
  branch: 'Main Bole Branch',
  branchSlug: 'table-1',
  phone: '+251911234567',
  activeTemplateId: 'mini-warm-habesha',
  primaryColor: '#F59E0B',
  currency: 'ETB',
  welcomeMessage: 'እንኳን ደህና መጡ! Freshly roasted coffee & authentic dining.',
  paymentAccounts: {
    telebirr: { number: '0911234567', tillName: 'Bole Roastery' },
    cbeBirr: { accountNumber: '1000234567891', holderName: 'Bole Roastery PLC' },
    awashBirr: { accountNumber: '0142345678900', holderName: 'Bole Roastery PLC' }
  }
};

const DEFAULT_SECTIONS: MiniSection[] = [
  { id: 'sec-coffee', name: 'Espresso & Coffee', icon: '☕' },
  { id: 'sec-mains', name: 'Cultural Mains & Tibs', icon: '🥘' },
  { id: 'sec-juices', name: 'Fresh Juices & Smoothies', icon: '🥑' },
  { id: 'sec-pastry', name: 'Artisan Pastries & Bakery', icon: '🥐' }
];

const DEFAULT_DISHES: MiniDish[] = [
  {
    id: 'dish-1',
    name: 'Special Macchiato (Double Shot)',
    nameAmharic: 'ልዩ ማኪያቶ',
    description: 'Rich double-shot espresso layered over velvety steamed microfoam milk.\n\n🇪🇹 በጥንቃቄ የተዘጋጀ ድርብ ሾት ልዩ ማኪያቶ።',
    price: 70.00,
    currency: 'ETB',
    category: 'Espresso & Coffee',
    isAvailable: true,
    isPopular: true,
    preparationTime: '3-5 min'
  },
  {
    id: 'dish-2',
    name: 'Yirgacheffe Single-Origin Pour-Over',
    nameAmharic: 'ይርጋጨፌ ቡና',
    description: 'Floral, jasmine, and citrus notes extracted through V60 hand brew.\n\n🇪🇹 በወራጅ የተዘጋጀ የይርጋጨፌ የፍሬ መዓዛ ያለው ቡና።',
    price: 95.00,
    currency: 'ETB',
    category: 'Espresso & Coffee',
    isAvailable: true,
    isPopular: false,
    preparationTime: '5-7 min'
  },
  {
    id: 'dish-3',
    name: 'Traditional Jebena Buna Ceremony Cup',
    nameAmharic: 'የጀበና ቡና',
    description: 'Authentic clay pot brewed Ethiopian coffee served with traditional popcorn.\n\n🇪🇹 በጀበና የፈላ ጣፋጭ ባህላዊ ቡና ከፈንዲሻ ጋር።',
    price: 55.00,
    currency: 'ETB',
    category: 'Espresso & Coffee',
    isAvailable: true,
    isPopular: true,
    preparationTime: '4 min'
  },
  {
    id: 'dish-4',
    name: 'Signature Kitfo Sandwich',
    nameAmharic: 'ልዩ የክትፎ ሳንድዊች',
    description: 'Finely minced tender beef seasoned with herbal niter kibbeh & fiery mitmita in a toasted crusty baguette.\n\n🇪🇹 በቅቤና በሚጥሚጣ የተዘጋጀ ፈጣን ልዩ የክትፎ ሳንድዊች።',
    price: 220.00,
    currency: 'ETB',
    category: 'Cultural Mains & Tibs',
    isAvailable: true,
    isPopular: true,
    preparationTime: '10-12 min'
  },
  {
    id: 'dish-5',
    name: 'Special Sizzling Derek Tibs',
    nameAmharic: 'ልዩ ደረቅ ጥብስ',
    description: 'Prime beef cubes sautéed on high heat with rosemary, red onion, and jalapeños, served with hot awaze & fresh injera.\n\n🇪🇹 በሮዝመሪ እና በቃሪያ የተጠበሰ የፍሪዳ ደረቅ ጥብስ ከአዋዜ ጋር።',
    price: 290.00,
    currency: 'ETB',
    category: 'Cultural Mains & Tibs',
    isAvailable: true,
    isPopular: true,
    preparationTime: '12-15 min'
  },
  {
    id: 'dish-6',
    name: 'Clay Pot Shiro Tegabino',
    nameAmharic: 'ሽሮ ተጋቢኖ',
    description: 'Simmered spiced chickpea flour stew served bubbling hot in traditional clay cookware with fresh roll of teff injera.\n\n🇪🇹 በሸክላ ድስት የሚንተከተክ ተጋቢኖ ሽሮ ከጤፍ እንጀራ ጋር።',
    price: 160.00,
    currency: 'ETB',
    category: 'Cultural Mains & Tibs',
    isAvailable: true,
    isPopular: false,
    preparationTime: '8-10 min'
  },
  {
    id: 'dish-7',
    name: 'Layered Avocado-Mango Spris',
    nameAmharic: 'ስፕሪስ ጁስ (አቮካዶ እና ማንጎ)',
    description: 'Silky whipped ripe Hass avocado layered with sweet Harar mango nectar and a squeeze of fresh lime.\n\n🇪🇹 የተደራረበ የሀበሻ አቮካዶ እና የማንጎ ስፕሪስ ጭማቂ በሎሚ ጠብታ።',
    price: 110.00,
    currency: 'ETB',
    category: 'Fresh Juices & Smoothies',
    isAvailable: true,
    isPopular: true,
    preparationTime: '5 min'
  },
  {
    id: 'dish-8',
    name: 'Papaya Ginger Vitality Blend',
    nameAmharic: 'የፓፓያ እና ዝንጅብል ጁስ',
    description: 'Fresh tropical papaya blended with zesty Ethiopian ginger and a dash of mountain honey.\n\n🇪🇹 ማዕድን የበዛበት የፓፓያ እና የዝንጅብል ጭማቂ በማር።',
    price: 100.00,
    currency: 'ETB',
    category: 'Fresh Juices & Smoothies',
    isAvailable: true,
    isPopular: false,
    preparationTime: '4 min'
  },
  {
    id: 'dish-9',
    name: 'Honey Cinnamon Butter Croissant',
    nameAmharic: 'ማር ክሮይሳንት',
    description: 'Multi-layered flaky French butter pastry glazed with raw Ethiopian highland honey and roasted Ceylon cinnamon.\n\n🇪🇹 በሀገርኛ የተፈጥሮ ማር እና የቀረፋ ዱቄት የተጌጠ ቅቤ ክሮይሳንት።',
    price: 85.00,
    currency: 'ETB',
    category: 'Artisan Pastries & Bakery',
    isAvailable: true,
    isPopular: true,
    preparationTime: 'Ready'
  },
  {
    id: 'dish-10',
    name: 'Cardamom Chocolate Fudge Brownie',
    nameAmharic: 'የኮረሪማ ቸኮሌት ኬክ',
    description: 'Dark Belgian cocoa brownie infused with native Ethiopian wild korarima (black cardamom).\n\n🇪🇹 በኮረሪማ መዓዛ የተዘጋጀ ቸኮሌት ብራውኒ።',
    price: 90.00,
    currency: 'ETB',
    category: 'Artisan Pastries & Bakery',
    isAvailable: true,
    isPopular: false,
    preparationTime: 'Ready'
  }
];

function createMiniStore() {
  const isBrowser = typeof window !== 'undefined';
  
  // Initial venue state
  let initialVenue = DEFAULT_VENUE;
  if (isBrowser) {
    try {
      const saved = localStorage.getItem('menumini_venue_config');
      if (saved) initialVenue = { ...DEFAULT_VENUE, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Venue config load fallback');
    }
  }

  // Initial dishes state
  let initialDishes = DEFAULT_DISHES;
  if (isBrowser) {
    try {
      const saved = localStorage.getItem('menumini_dishes');
      if (saved) initialDishes = JSON.parse(saved);
    } catch (e) {
      console.warn('Dishes load fallback');
    }
  }

  const venue = writable<VenueConfig>(initialVenue);
  const sections = writable<MiniSection[]>(DEFAULT_SECTIONS);
  const dishes = writable<MiniDish[]>(initialDishes);

  if (isBrowser) {
    venue.subscribe(val => {
      localStorage.setItem('menumini_venue_config', JSON.stringify(val));
    });
    dishes.subscribe(val => {
      localStorage.setItem('menumini_dishes', JSON.stringify(val));
    });
  }

  return {
    venue,
    sections,
    dishes,
    getTemplate(templateId: string): MiniMenuTemplate {
      return MINI_MENU_TEMPLATES.find(t => t.id === templateId) || MINI_MENU_TEMPLATES[1];
    },
    updateVenue(patch: Partial<VenueConfig>) {
      venue.update(curr => ({ ...curr, ...patch }));
    },
    addDish(dish: Omit<MiniDish, 'id'>) {
      const newDish: MiniDish = { ...dish, id: `dish-${Date.now()}` };
      dishes.update(list => [newDish, ...list]);
      return newDish;
    },
    updateDish(id: string, patch: Partial<MiniDish>) {
      dishes.update(list => list.map(d => d.id === id ? { ...d, ...patch } : d));
    },
    deleteDish(id: string) {
      dishes.update(list => list.filter(d => d.id !== id));
    },
    toggleDishAvailability(id: string) {
      dishes.update(list => list.map(d => d.id === id ? { ...d, isAvailable: !d.isAvailable } : d));
    }
  };
}

export const miniStore = createMiniStore();
