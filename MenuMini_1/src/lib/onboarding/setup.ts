import startingSections from './starting-sections.json';
import { BUSINESS_TYPES, normalizePhone } from './registration';
import type { FieldIssue } from './registration';
import { MINI_MENU_TEMPLATES } from '$lib/types/miniTemplates';

export type PlanPreference = 'FREE' | 'MINI' | 'PRO';
export type ServiceMode = 'MENU_ONLY' | 'DINE_IN' | 'COUNTER';
export interface SetupHours {
  day: number; status: 'UNSPECIFIED' | 'CLOSED' | 'OPEN';
  opens?: string; closes?: string; overnight?: boolean;
}
export interface SetupBranch {
  publicName: string; name: string; city: string; area?: string; landmark: string;
  publicPhone?: string; serviceMode: ServiceMode; currency: 'ETB'; timezone: 'Africa/Addis_Ababa'; hours: SetupHours[];
}
export interface SetupItem { id: string; name: string; nameAm?: string; description?: string; price: string; available: boolean }
export interface SetupSection { id: string; name: string; nameAm?: string; items: SetupItem[] }
export interface SetupDraft {
  format: 'menumini-setup-draft'; version: 1; businessTypeId: string;
  branch: SetupBranch; planPreference: PlanPreference; menu: { themeId: string; sections: SetupSection[] };
}
export type SetupBlocker = 'PHONE_VERIFICATION' | 'BUSINESS_AUTHORIZATION' | 'MENU_PUBLICATION'
  | 'SUBSCRIPTION_ACTIVATION' | 'ORDERING_SETUP' | 'MENU_ITEMS' | 'AVAILABLE_ITEMS';
export interface SetupCheck {
  valid: true; mode: 'DRAFT_ONLY'; nextStep: 'VERIFY_BEFORE_LAUNCH';
  summary: { sectionCount: number; itemCount: number; availableItemCount: number }; blockers: SetupBlocker[];
}
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DRAFT_MAX_BYTES = 262144;

export function newSections(businessTypeId: string): SetupSection[] {
  const names = (startingSections as Record<string, string[]>)[businessTypeId] || ['Menu'];
  return names.map(name => ({ id: crypto.randomUUID(), name, items: [] }));
}
export function newSetupDraft(publicName: string, businessTypeId: string): SetupDraft {
  return { format: 'menumini-setup-draft', version: 1, businessTypeId,
    branch: { publicName: publicName.trim(), name: 'Main branch', city: 'Addis Ababa', area: '', landmark: '',
      publicPhone: '', serviceMode: 'MENU_ONLY', currency: 'ETB', timezone: 'Africa/Addis_Ababa',
      hours: DAYS.map((_, day) => ({ day, status: 'UNSPECIFIED' })) },
    planPreference: 'FREE', menu: { themeId: MINI_MENU_TEMPLATES[0].id, sections: newSections(businessTypeId) } };
}

// User-friendly input normalization; no floating-point conversion or rounding.
export function normalizePrice(input: string): string | null {
  const match = /^(0|[1-9]\d{0,7})(?:\.(\d{1,2}))?$/.exec(input.trim());
  return match ? match[1] + '.' + (match[2] || '').padEnd(2, '0') : null;
}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const time = (value: unknown): value is string => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const uuid = (value: unknown): value is string => typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
type Issue = (field: string, code: string) => void;
function keys(value: Record<string, unknown>, allowed: string[], field: string, issue: Issue) {
  if (Object.keys(value).some(key => !allowed.includes(key))) issue(field, 'UNKNOWN_FIELD');
}
function text(value: unknown, maximum: number, field: string, issue: Issue, optional = false, multiline = false) {
  if (optional && value === undefined) return;
  if (typeof value !== 'string' || value.length > maximum || (!optional && !value.trim())
    || (multiline ? /[\u0000-\u0008\u000b-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/).test(value)) issue(field, 'TEXT_INVALID');
}
function branchFields(value: unknown, issue: Issue) {
  if (!record(value)) { issue('branch', 'OBJECT_REQUIRED'); return; }
  keys(value, ['publicName', 'name', 'city', 'area', 'landmark', 'publicPhone', 'serviceMode', 'currency', 'timezone', 'hours'], 'branch', issue);
  for (const key of ['publicName', 'name', 'city']) text(value[key], 160, 'branch.' + key, issue);
  text(value.area, 160, 'branch.area', issue, true); text(value.landmark, 300, 'branch.landmark', issue, true);
  if (value.publicPhone !== undefined && (typeof value.publicPhone !== 'string' || value.publicPhone.length > 32
    || (!!value.publicPhone.trim() && !normalizePhone(value.publicPhone)))) issue('branch.publicPhone', 'PHONE_FORMAT');
  if (!['MENU_ONLY', 'DINE_IN', 'COUNTER'].includes(value.serviceMode as string)) issue('branch.serviceMode', 'SERVICE_MODE');
  if (value.currency !== 'ETB') issue('branch.currency', 'CURRENCY');
  if (value.timezone !== 'Africa/Addis_Ababa') issue('branch.timezone', 'TIMEZONE');
  if (!Array.isArray(value.hours) || value.hours.length !== 7) { issue('branch.hours', 'SEVEN_DAYS'); return; }
  const days = new Set<number>();
  value.hours.forEach((hours, index) => {
    const field = `branch.hours.${index}`;
    if (!record(hours)) { issue(field, 'OBJECT_REQUIRED'); return; }
    keys(hours, ['day', 'status', 'opens', 'closes', 'overnight'], field, issue);
    if (!Number.isInteger(hours.day) || (hours.day as number) < 0 || (hours.day as number) > 6 || days.has(hours.day as number)) issue(field, 'SEVEN_DAYS');
    days.add(hours.day as number);
    if (hours.status === 'OPEN') {
      if (!time(hours.opens) || !time(hours.closes) || typeof hours.overnight !== 'boolean') issue(field, 'HOURS_REQUIRED');
      else if (hours.opens === hours.closes || (hours.closes < hours.opens) !== hours.overnight) issue(field, 'HOURS_OVERNIGHT');
    } else {
      if (!['UNSPECIFIED', 'CLOSED'].includes(hours.status as string)) issue(field, 'HOURS_STATUS');
      if (['opens', 'closes', 'overnight'].some(key => hours[key] !== undefined)) issue(field, 'HOURS_NOT_OPEN');
    }
  });
}
export function validateBranch(value: unknown): FieldIssue[] {
  const errors: FieldIssue[] = []; branchFields(value, (field, code) => errors.push({ field, code })); return errors;
}

export function validateSetupDraft(value: unknown): { errors: FieldIssue[]; check?: SetupCheck } {
  const errors: FieldIssue[] = [];
  const issue: Issue = (field, code) => { if (errors.length < 64) errors.push({ field, code }); };
  if (!record(value)) return { errors: [{ field: '$', code: 'OBJECT_REQUIRED' }] };
  keys(value, ['format', 'version', 'businessTypeId', 'branch', 'planPreference', 'menu'], '$', issue);
  if (value.format !== 'menumini-setup-draft' || value.version !== 1) issue('$', 'DRAFT_FORMAT');
  if (!BUSINESS_TYPES.some(type => type.id === value.businessTypeId)) issue('businessTypeId', 'SELECT_BUSINESS_TYPE');
  if (!['FREE', 'MINI', 'PRO'].includes(value.planPreference as string)) issue('planPreference', 'PLAN');
  branchFields(value.branch, issue);
  let sectionCount = 0, itemCount = 0, availableItemCount = 0;
  const ids = new Set<string>();
  const checkId = (id: unknown, field: string) => {
    if (!uuid(id) || ids.has(id.toLowerCase())) issue(field, 'UNIQUE_ID');
    if (uuid(id)) ids.add(id.toLowerCase());
  };
  if (!record(value.menu)) issue('menu', 'OBJECT_REQUIRED');
  else {
    const menu = value.menu;
    keys(menu, ['themeId', 'sections'], 'menu', issue);
    if (!MINI_MENU_TEMPLATES.some(theme => theme.id === menu.themeId)) issue('menu.themeId', 'THEME');
    if (!Array.isArray(menu.sections) || menu.sections.length < 1 || menu.sections.length > 30) issue('menu.sections', 'SECTION_LIMIT');
    else {
      sectionCount = menu.sections.length;
      menu.sections.forEach((section, sectionIndex) => {
        const field = `menu.sections.${sectionIndex}`;
        if (!record(section)) { issue(field, 'OBJECT_REQUIRED'); return; }
        keys(section, ['id', 'name', 'nameAm', 'items'], field, issue);
        checkId(section.id, field + '.id'); text(section.name, 120, field + '.name', issue);
        text(section.nameAm, 120, field + '.nameAm', issue, true);
        if (!Array.isArray(section.items) || section.items.length > 50) { issue(field + '.items', 'ITEM_LIMIT'); return; }
        itemCount += section.items.length;
        section.items.forEach((item, itemIndex) => {
          const itemField = `${field}.items.${itemIndex}`;
          if (!record(item)) { issue(itemField, 'OBJECT_REQUIRED'); return; }
          keys(item, ['id', 'name', 'nameAm', 'description', 'price', 'available'], itemField, issue);
          checkId(item.id, itemField + '.id'); text(item.name, 160, itemField + '.name', issue);
          text(item.nameAm, 160, itemField + '.nameAm', issue, true); text(item.description, 500, itemField + '.description', issue, true, true);
          if (typeof item.price !== 'string' || !/^(0|[1-9]\d{0,7})\.\d{2}$/.test(item.price)) issue(itemField + '.price', 'PRICE');
          if (typeof item.available !== 'boolean') issue(itemField + '.available', 'BOOLEAN_REQUIRED');
          if (item.available === true) availableItemCount++;
        });
      });
      if (itemCount > 200) issue('menu.sections', 'TOTAL_ITEM_LIMIT');
    }
  }
  if (errors.length) return { errors };
  const blockers: SetupBlocker[] = ['PHONE_VERIFICATION', 'BUSINESS_AUTHORIZATION', 'MENU_PUBLICATION'];
  if (value.planPreference !== 'FREE') blockers.push('SUBSCRIPTION_ACTIVATION');
  if ((value.branch as Record<string, unknown>).serviceMode !== 'MENU_ONLY') blockers.push('ORDERING_SETUP');
  if (!itemCount) blockers.push('MENU_ITEMS'); else if (!availableItemCount) blockers.push('AVAILABLE_ITEMS');
  return { errors, check: { valid: true, mode: 'DRAFT_ONLY', nextStep: 'VERIFY_BEFORE_LAUNCH',
    summary: { sectionCount, itemCount, availableItemCount }, blockers } };
}

export const SETUP_ISSUE_MESSAGES: Record<string, string> = {
  TEXT_INVALID: 'Enter a name or address within the field limit. Optional fields can stay blank.',
  PHONE_FORMAT: 'Enter a valid local or international phone number, or leave it blank.',
  PRICE: 'Enter a price such as 60 or 60.50, with at most two decimal places. Use a dot for decimals.',
  SEVEN_DAYS: 'Include each day of the week once.', HOURS_REQUIRED: 'Enter opening and closing times.',
  HOURS_OVERNIGHT: 'For a closing time before opening, select “Closes next day”. Times must be different.',
  HOURS_NOT_OPEN: 'A closed or unspecified day cannot include opening times.',
  SECTION_LIMIT: 'Keep 1–30 menu sections.', ITEM_LIMIT: 'Keep at most 50 items in each section.',
  TOTAL_ITEM_LIMIT: 'Keep at most 200 items in this setup draft.', UNIQUE_ID: 'The draft contains an invalid or repeated item/section ID.',
  DRAFT_FORMAT: 'Choose a MenuMini setup draft exported by this version.',
  UNKNOWN_FIELD: 'This draft contains unsupported fields. Registration contacts and access fields cannot be imported.',
  THEME: 'Choose one of the six menu themes.', PLAN: 'Choose Free, MenuMini or MenuPro interest.'
};
