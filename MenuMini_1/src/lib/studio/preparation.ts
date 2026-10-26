import { BUSINESS_TYPES } from '$lib/onboarding/registration';
import { validateSetupDraft } from '$lib/onboarding/setup';
import type { SetupDraft } from '$lib/onboarding/setup';
import { MINI_MENU_TEMPLATES } from '$lib/types/miniTemplates';
import { UUID, validateCatalog, validateProfile, validateService, workspaceFromSetup, WORKSPACE_MAX_BYTES } from '$lib/workspace/model';
import type { WorkspacePreparation } from '$lib/workspace/model';

// Structural validation deliberately permits incomplete names/prices. A local
// draft must survive editing, but it must never import identity/private fields.
type Rule = (value: unknown) => boolean;
const string = (max: number): Rule => v => typeof v === 'string' && [...v].length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v);
const boolean: Rule = v => typeof v === 'boolean';
const integer = (min: number, max: number): Rule => v => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const oneOf = (...values: unknown[]): Rule => v => values.includes(v);
const list = (rule: Rule, max: number): Rule => v => Array.isArray(v) && v.length <= max && v.every(rule);
const object = (required: Record<string, Rule>, optional: Record<string, Rule> = {}): Rule => v => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const record = v as Record<string, unknown>, fields = { ...required, ...optional };
  return Object.keys(required).every(key => Object.hasOwn(record, key))
    && Object.keys(record).every(key => Object.hasOwn(fields, key) && fields[key](record[key]));
};

export function editablePreparation(value: unknown): value is WorkspacePreparation {
  try {
    if (new TextEncoder().encode(JSON.stringify(value)).length > WORKSPACE_MAX_BYTES) return false;
    const ids = new Set<string>(); let itemCount = 0;
    const id: Rule = v => {
      if (typeof v !== 'string' || !UUID.test(v) || ids.has(v.toLowerCase())) return false;
      ids.add(v.toLowerCase()); return true;
    };
    const choice = object({ id, label: string(120), priceDelta: string(32), isAvailable: boolean });
    const group = object({ id, label: string(120), mode: oneOf('SINGLE_SELECT', 'MULTI_SELECT'),
      minSelections: integer(0, 30), maxSelections: integer(0, 30), choices: list(choice, 30) });
    const item = object({ id, nameEn: string(160), basePrice: string(32), availableNow: boolean, modifiers: list(group, 10) },
      { nameAm: string(160), descriptionEn: string(2000), descriptionAm: string(2000) });
    const section = object({ id, nameEn: string(120), items: v => Array.isArray(v) && (itemCount += v.length) <= 1000 && list(item, 200)(v) }, { nameAm: string(120) });
    const hours = object({ day: integer(0, 6), status: oneOf('UNSPECIFIED', 'CLOSED', 'OPEN') },
      { opens: string(5), closes: string(5), overnight: boolean });
    const branch = object({ publicName: string(160), name: string(160), city: string(160), landmark: string(300),
      serviceMode: oneOf('MENU_ONLY', 'DINE_IN', 'COUNTER'), currency: oneOf('ETB'), timezone: oneOf('Africa/Addis_Ababa'), hours: list(hours, 7) },
      { area: string(160), publicPhone: string(32) });
    return object({ format: oneOf('menumini-workspace-draft'), version: oneOf(1), planPreference: oneOf('FREE', 'MINI', 'PRO'),
      profile: object({ businessTypeId: v => BUSINESS_TYPES.some(type => type.id === v), branch }),
      menu: object({ themeId: v => MINI_MENU_TEMPLATES.some(theme => theme.id === v), primaryColor: v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v), sections: list(section, 40) }),
      service: v => validateService(v).length === 0 })(value);
  } catch { return false; }
}

export function importMenuPreparation(value: unknown): WorkspacePreparation {
  if (value && typeof value === 'object' && 'format' in value && value.format === 'menumini-setup-draft') {
    if (validateSetupDraft(value).errors.length) throw new Error('This setup file contains invalid or unsupported fields.');
    return workspaceFromSetup(value as SetupDraft);
  }
  if (!editablePreparation(value)) throw new Error('Choose a supported menu/workspace draft without account, contact or access fields.');
  return structuredClone(value);
}

export function menuReview(draft: WorkspacePreparation) {
  const errors = [...validateProfile(draft.profile).map(e => ({ ...e, field: 'profile.' + e.field })),
    ...validateCatalog(draft.menu).map(e => ({ ...e, field: 'menu.' + e.field }))];
  const items = draft.menu.sections.flatMap(section => section.items);
  if (!items.length) errors.push({ field: 'menu.sections', code: 'MENU_ITEMS' });
  return { errors, itemCount: items.length, sectionCount: draft.menu.sections.length,
    // No ordering-plan, table, kitchen, or bank-account blockers for a menu.
    availableCount: items.filter(item => item.availableNow).length };
}
