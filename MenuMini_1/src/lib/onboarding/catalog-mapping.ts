import { MINI_MENU_TEMPLATES } from '$lib/types/miniTemplates';
import { validateSetupDraft } from './setup';
import type { SetupDraft } from './setup';

// Pure conversion for a future trusted setup command. Does not authenticate,
// create a branch, activate a preference or perform database writes.
export function mapPreparedCatalog(value: unknown) {
  if (validateSetupDraft(value).errors.length) throw new Error('Fix the setup draft fields before preparing saved menu data.');
  const draft = value as SetupDraft;
  const theme = MINI_MENU_TEMPLATES.find(theme => theme.id === draft.menu.themeId)!;
  return {
    profile: { businessTypeId: draft.businessTypeId, branch: structuredClone(draft.branch) },
    menu: { themeId: theme.id, primaryColor: theme.theme.primary,
      sections: draft.menu.sections.map(section => ({ id: section.id.toLowerCase(), nameEn: section.name.trim(),
        ...(section.nameAm?.trim() ? { nameAm: section.nameAm.trim() } : {}),
        items: section.items.map(item => ({ id: item.id.toLowerCase(), nameEn: item.name.trim(),
          ...(item.nameAm?.trim() ? { nameAm: item.nameAm.trim() } : {}),
          ...(item.description ? { descriptionEn: item.description } : {}),
          basePrice: item.price, availableNow: item.available, modifiers: [] })) })) }
  };
}
