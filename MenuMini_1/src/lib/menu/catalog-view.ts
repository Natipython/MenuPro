import type { MiniDish, MiniSection, VenueConfig } from '$lib/services/miniStore';
import type { CatalogModifier, PublishedMenu } from '$lib/server/public-catalog';
import { MINI_MENU_TEMPLATES, type MiniMenuTemplate } from '$lib/types/miniTemplates';
import type { Catalog, Profile } from '$lib/workspace/model';

// Presentation only. Published money stays an exact decimal string; this view
// never reads the prototype stores, calculates order totals or grants access.
export interface MenuDishView {
  id: string;
  sectionId: string;
  name: string;
  nameAm?: string;
  description?: string;
  descriptionAm?: string;
  price: string;
  currency: string;
  available: boolean;
  popular?: boolean;
  preparationTime?: string;
  modifiers: CatalogModifier[];
}

export interface MenuCatalogView {
  key: string;
  venueName: string;
  branchName: string;
  welcomeMessage: string;
  theme: MiniMenuTemplate;
  primaryColor: string;
  badgeLabel: string;
  badgeValue: string;
  openStatus?: boolean;
  sections: { id: string; name: string; nameAm?: string; icon?: string }[];
  dishes: MenuDishView[];
}

export function publishedCatalogView(menu: PublishedMenu): MenuCatalogView {
  const theme = MINI_MENU_TEMPLATES.find(value => value.id === menu.content.themeId) || MINI_MENU_TEMPLATES[0];
  const sections = menu.content.sections.filter(section => section.items.length);
  return {
    key: `${menu.venueId}:${menu.branch.publicName}:${menu.publicationId}`,
    venueName: menu.venueName,
    branchName: menu.branch.name,
    welcomeMessage: 'Browse the menu · Prices in ETB. Please ask staff to place an order.',
    theme,
    primaryColor: menu.content.primaryColor || theme.theme.primary,
    badgeLabel: 'MENU',
    badgeValue: 'ETB',
    sections: sections.map(section => ({ id: section.id, name: section.nameEn, nameAm: section.nameAm })),
    dishes: sections.flatMap(section => section.items.map(item => ({
      id: item.id, sectionId: section.id, name: item.nameEn, nameAm: item.nameAm,
      description: item.descriptionEn, descriptionAm: item.descriptionAm,
      price: item.basePrice, currency: menu.currency, available: item.availableNow,
      modifiers: item.modifiers
    })))
  };
}

export function draftCatalogView(profile: Profile, content: Catalog): MenuCatalogView {
  const theme = MINI_MENU_TEMPLATES.find(value => value.id === content.themeId) || MINI_MENU_TEMPLATES[0];
  return {
    key: 'menu-draft-preview', venueName: profile.branch.publicName || 'Your menu', branchName: profile.branch.name,
    welcomeMessage: 'Draft preview · These changes are not published.', theme,
    primaryColor: content.primaryColor || theme.theme.primary, badgeLabel: 'PREVIEW', badgeValue: 'ETB',
    sections: content.sections.filter(section => section.items.length).map(section => ({ id: section.id, name: section.nameEn, nameAm: section.nameAm })),
    dishes: content.sections.flatMap(section => section.items.map(item => ({ id: item.id, sectionId: section.id,
      name: item.nameEn, nameAm: item.nameAm, description: item.descriptionEn, descriptionAm: item.descriptionAm,
      price: item.basePrice, currency: 'ETB', available: item.availableNow, modifiers: item.modifiers })))
  };
}

// The old local prototype uses numeric prices and category names. Adapt those
// at its boundary, without importing its demo data into the published journey.
export function prototypeCatalogView(venue: VenueConfig, sections: MiniSection[], dishes: MiniDish[], theme: MiniMenuTemplate, tableNumber: string): MenuCatalogView {
  return {
    key: `${venue.slug}:${venue.branchSlug}`, venueName: venue.name, branchName: venue.branch,
    welcomeMessage: venue.welcomeMessage, theme, primaryColor: theme.theme.primary,
    badgeLabel: 'TABLE', badgeValue: tableNumber, openStatus: true,
    sections: sections.map(section => ({ ...section })),
    dishes: dishes.map(dish => ({
      id: dish.id, sectionId: sections.find(section => section.name === dish.category)?.id || '',
      name: dish.name, nameAm: dish.nameAmharic, description: dish.description,
      price: dish.price.toFixed(2), currency: dish.currency, available: dish.isAvailable,
      popular: dish.isPopular, preparationTime: dish.preparationTime, modifiers: []
    }))
  };
}

export function filterMenuDishes(dishes: MenuDishView[], sectionId: string | null, query: string): MenuDishView[] {
  const search = query.trim().toLowerCase();
  return dishes.filter(dish => (sectionId === null || dish.sectionId === sectionId)
    && (!search || [dish.name, dish.nameAm, dish.description, dish.descriptionAm]
      .some(value => value?.toLowerCase().includes(search))));
}
