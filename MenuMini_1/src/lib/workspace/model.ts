import type { FieldIssue } from '$lib/onboarding/registration';
import { BUSINESS_TYPES } from '$lib/onboarding/registration';
import { mapPreparedCatalog } from '$lib/onboarding/catalog-mapping';
import { validateBranch, newSetupDraft } from '$lib/onboarding/setup';
import type { SetupBranch, SetupDraft } from '$lib/onboarding/setup';
import { MINI_MENU_TEMPLATES } from '$lib/types/miniTemplates';

export interface Choice { id: string; label: string; priceDelta: string; isAvailable: boolean }
export interface Modifier { id: string; label: string; mode: 'SINGLE_SELECT' | 'MULTI_SELECT'; minSelections: number; maxSelections: number; choices: Choice[] }
export interface Item { id: string; nameEn: string; nameAm?: string; descriptionEn?: string; descriptionAm?: string; basePrice: string; availableNow: boolean; modifiers: Modifier[] }
export interface Section { id: string; nameEn: string; nameAm?: string; items: Item[] }
export interface Catalog { themeId: string; primaryColor: string; sections: Section[] }
export interface Profile { businessTypeId: string; branch: SetupBranch }
export type Responsibility = 'UNASSIGNED' | 'OWNER' | 'STAFF';
export interface ServicePreparation {
  tableLabels: string[];
  staffing: { orders: Responsibility; preparation: Responsibility; payments: Responsibility };
  paymentMethods: ('CASH' | 'BANK_TRANSFER')[];
  pricing: 'UNCONFIRMED' | 'NO_ADDED_CHARGES' | 'REVIEW_REQUIRED';
}
export interface WorkspacePreparation {
  format: 'menumini-workspace-draft'; version: 1; planPreference: 'FREE' | 'MINI' | 'PRO';
  profile: Profile; menu: Catalog; service: ServicePreparation;
}
export interface WorkspaceCheck {
  valid: true; mode: 'PREPARATION_ONLY';
  summary: { sectionCount: number; itemCount: number; availableItemCount: number; optionGroupCount: number; plannedTableCount: number };
  blockers: string[];
}
export const WORKSPACE_MAX_BYTES = 1179648;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export const exactAmount = (v: unknown, signed = false): v is string => typeof v === 'string'
  && (signed ? /^-?(0|[1-9]\d{0,9})\.\d{2}$/ : /^(0|[1-9]\d{0,9})\.\d{2}$/).test(v);
export function normalizeAmount(v: string, signed = false) {
  const match = (signed ? /^(-?)(0|[1-9]\d{0,9})(?:\.(\d{1,2}))?$/ : /^()(0|[1-9]\d{0,9})(?:\.(\d{1,2}))?$/).exec(v.trim());
  return match ? match[1] + match[2] + '.' + (match[3] || '').padEnd(2, '0') : v;
}
export function newServicePreparation(): ServicePreparation {
  return { tableLabels: [], staffing: { orders: 'UNASSIGNED', preparation: 'UNASSIGNED', payments: 'UNASSIGNED' }, paymentMethods: [], pricing: 'UNCONFIRMED' };
}
export function workspaceFromSetup(draft: SetupDraft): WorkspacePreparation {
  return { format: 'menumini-workspace-draft', version: 1, planPreference: draft.planPreference,
    ...mapPreparedCatalog(draft), service: newServicePreparation() };
}
export function newWorkspacePreparation(publicName: string, businessTypeId: string): WorkspacePreparation {
  const setup = newSetupDraft(publicName,businessTypeId);
  return { format:'menumini-workspace-draft',version:1,planPreference:'FREE',
    profile:{ businessTypeId,branch:setup.branch }, service:newServicePreparation(),
    menu:{ themeId:setup.menu.themeId,primaryColor:MINI_MENU_TEMPLATES[0].theme.primary,
      sections:setup.menu.sections.map(s => ({ id:s.id,nameEn:s.name,items:[] })) } };
}
type Issue = (field: string, code: string) => void;
function withinBytes(v: unknown, maximum: number) {
  try { return new TextEncoder().encode(JSON.stringify(v)).length <= maximum; } catch { return false; }
}
export function shape(v: unknown, allowed: string[], required: string[], field: string, issue: Issue): v is Record<string, unknown> {
  if (!isObject(v)) { issue(field, 'OBJECT_REQUIRED'); return false; }
  if (Object.keys(v).some(k => !allowed.includes(k))) issue(field, 'UNKNOWN_FIELD');
  for (const k of required) if (!(k in v)) issue(field + '.' + k, 'REQUIRED');
  return true;
}
function text(v: unknown, max: number, field: string, issue: Issue, optional = false, multiline = false) {
  if (optional && v === undefined) return;
  if (typeof v !== 'string' || [...v].length > max || (!optional && !v.trim())
    || (multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/).test(v)) issue(field, 'TEXT_INVALID');
}
export function validateProfile(v: unknown): FieldIssue[] {
  const errors: FieldIssue[] = []; const issue: Issue = (field, code) => errors.push({ field, code });
  if (!shape(v, ['businessTypeId','branch'], ['businessTypeId','branch'], '$', issue)) return errors;
  if (!BUSINESS_TYPES.some(t => t.id === v.businessTypeId)) issue('businessTypeId', 'SELECT_BUSINESS_TYPE');
  errors.push(...validateBranch(v.branch));
  if (!withinBytes(v,16384)) issue('$', 'BODY_TOO_LARGE');
  return errors;
}
export function validateService(v: unknown): FieldIssue[] {
  const errors: FieldIssue[] = []; const issue: Issue = (field, code) => errors.push({ field, code });
  if (!shape(v, ['tableLabels','staffing','paymentMethods','pricing'], ['tableLabels','staffing','paymentMethods','pricing'], '$', issue)) return errors;
  if (!Array.isArray(v.tableLabels) || v.tableLabels.length > 100) issue('tableLabels', 'TABLE_LIMIT');
  else {
    const labels = new Set<string>();
    v.tableLabels.forEach((label, index) => {
      text(label, 40, 'tableLabels.' + index, issue);
      if (typeof label === 'string') {
        const key = label.trim().normalize('NFC').toLowerCase();
        if (labels.has(key)) issue('tableLabels.' + index, 'DUPLICATE_TABLE'); labels.add(key);
      }
    });
  }
  if (shape(v.staffing, ['orders','preparation','payments'], ['orders','preparation','payments'], 'staffing', issue))
    for (const key of ['orders','preparation','payments']) if (!['UNASSIGNED','OWNER','STAFF'].includes(v.staffing[key] as string)) issue('staffing.' + key, 'RESPONSIBILITY');
  if (!Array.isArray(v.paymentMethods) || v.paymentMethods.length > 2 || new Set(v.paymentMethods).size !== v.paymentMethods.length
    || v.paymentMethods.some(m => !['CASH','BANK_TRANSFER'].includes(m))) issue('paymentMethods', 'PAYMENT_METHOD');
  if (!['UNCONFIRMED','NO_ADDED_CHARGES','REVIEW_REQUIRED'].includes(v.pricing as string)) issue('pricing', 'PRICING_POLICY');
  if (!withinBytes(v,16384)) issue('$', 'BODY_TOO_LARGE');
  return errors;
}
export function validateCatalog(v: unknown): FieldIssue[] {
  const errors: FieldIssue[] = []; const issue: Issue = (field, code) => { if (errors.length < 64) errors.push({ field, code }); };
  if (!shape(v, ['themeId','primaryColor','sections'], ['themeId','primaryColor','sections'], '$', issue)) return errors;
  if (!MINI_MENU_TEMPLATES.some(t => t.id === v.themeId)) issue('themeId', 'THEME');
  if (typeof v.primaryColor !== 'string' || !/^#[0-9a-f]{6}$/i.test(v.primaryColor)) issue('primaryColor', 'COLOR');
  const ids = new Set<string>(); let items = 0;
  const id = (value: unknown, field: string) => {
    if (typeof value !== 'string' || !UUID.test(value) || ids.has(value.toLowerCase())) issue(field, 'UNIQUE_ID');
    if (typeof value === 'string') ids.add(value.toLowerCase());
  };
  const integer = (value: unknown, min: number, max: number, field: string) => {
    if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) issue(field, 'SELECTION_BOUNDS');
  };
  const cents = (value: string) => BigInt(value.replace('.', ''));
  if (!Array.isArray(v.sections) || v.sections.length < 1 || v.sections.length > 40) issue('sections', 'SECTION_LIMIT');
  else v.sections.forEach((s, si) => {
    const sf = 'sections.' + si;
    if (!shape(s, ['id','nameEn','nameAm','items'], ['id','nameEn','items'], sf, issue)) return;
    id(s.id, sf + '.id'); text(s.nameEn, 120, sf + '.nameEn', issue); text(s.nameAm, 120, sf + '.nameAm', issue, true);
    if (!Array.isArray(s.items) || s.items.length > 200) { issue(sf + '.items', 'ITEM_LIMIT'); return; }
    items += s.items.length;
    s.items.forEach((i, ii) => {
      const f = sf + '.items.' + ii;
      if (!shape(i, ['id','nameEn','nameAm','descriptionEn','descriptionAm','basePrice','availableNow','modifiers'], ['id','nameEn','basePrice','availableNow','modifiers'], f, issue)) return;
      id(i.id, f + '.id'); text(i.nameEn, 160, f + '.nameEn', issue); text(i.nameAm, 160, f + '.nameAm', issue, true);
      for (const key of ['descriptionEn','descriptionAm']) text(i[key], 2000, f + '.' + key, issue, true, true);
      if (!exactAmount(i.basePrice)) issue(f + '.basePrice', 'PRICE');
      if (typeof i.availableNow !== 'boolean') issue(f + '.availableNow', 'BOOLEAN_REQUIRED');
      let low = exactAmount(i.basePrice) ? cents(i.basePrice) : 0n, high = low;
      if (!Array.isArray(i.modifiers) || i.modifiers.length > 10) { issue(f + '.modifiers', 'MODIFIER_LIMIT'); return; }
      i.modifiers.forEach((g, gi) => {
        const gf = f + '.modifiers.' + gi;
        if (!shape(g, ['id','label','mode','minSelections','maxSelections','choices'], ['id','label','mode','minSelections','maxSelections','choices'], gf, issue)) return;
        id(g.id, gf + '.id'); text(g.label, 120, gf + '.label', issue);
        integer(g.minSelections, 0, 30, gf + '.minSelections'); integer(g.maxSelections, 1, 30, gf + '.maxSelections');
        if (!['SINGLE_SELECT','MULTI_SELECT'].includes(g.mode as string) || (g.minSelections as number) > (g.maxSelections as number)
          || (g.mode === 'SINGLE_SELECT' && g.maxSelections !== 1)) issue(gf, 'SELECTION_BOUNDS');
        if (!Array.isArray(g.choices) || g.choices.length < 1 || g.choices.length > 30 || (g.maxSelections as number) > g.choices.length) { issue(gf + '.choices', 'CHOICE_LIMIT'); return; }
        const deltas: bigint[] = [];
        g.choices.forEach((c, ci) => {
          const cf = gf + '.choices.' + ci;
          if (!shape(c, ['id','label','priceDelta','isAvailable'], ['id','label','priceDelta','isAvailable'], cf, issue)) return;
          id(c.id, cf + '.id'); text(c.label, 120, cf + '.label', issue);
          if (!exactAmount(c.priceDelta, true)) issue(cf + '.priceDelta', 'PRICE');
          if (typeof c.isAvailable !== 'boolean') issue(cf + '.isAvailable', 'BOOLEAN_REQUIRED');
          if (c.isAvailable === true && exactAmount(c.priceDelta, true)) deltas.push(cents(c.priceDelta));
        });
        if (deltas.length < (g.minSelections as number)) issue(gf, 'REQUIRED_CHOICES');
        const min = g.minSelections as number, max = g.maxSelections as number;
        deltas.sort((a,b) => a < b ? -1 : a > b ? 1 : 0);
        low += deltas.reduce((sum,d,n) => sum + (n < min || (n < max && d < 0n) ? d : 0n), 0n);
        high += [...deltas].reverse().reduce((sum,d,n) => sum + (n < min || (n < max && d > 0n) ? d : 0n), 0n);
      });
      if (low < 0n || high > 999999999999n) issue(f + '.modifiers', 'PRICE_RANGE');
    });
  });
  if (items > 1000) issue('sections', 'TOTAL_ITEM_LIMIT');
  if (!withinBytes(v,1048576)) issue('$', 'BODY_TOO_LARGE');
  return errors;
}
export function validateWorkspace(v: unknown): { errors: FieldIssue[]; check?: WorkspaceCheck } {
  const errors: FieldIssue[] = []; const issue: Issue = (field, code) => errors.push({ field, code });
  if (!shape(v, ['format','version','planPreference','profile','menu','service'], ['format','version','planPreference','profile','menu','service'], '$', issue)) return { errors };
  if (v.format !== 'menumini-workspace-draft' || v.version !== 1) issue('$', 'DRAFT_FORMAT');
  if (!['FREE','MINI','PRO'].includes(v.planPreference as string)) issue('planPreference', 'PLAN');
  for (const [key, validate] of [['profile',validateProfile],['menu',validateCatalog],['service',validateService]] as const)
    errors.push(...validate(v[key]).map(e => ({ ...e, field: key + (e.field === '$' ? '' : '.' + e.field) })));
  if (errors.length) return { errors: errors.slice(0,64) };
  const draft = v as unknown as WorkspacePreparation;
  const items = draft.menu.sections.flatMap(s => s.items);
  const blockers = ['PHONE_VERIFICATION','BUSINESS_AUTHORIZATION','MENU_PUBLICATION'];
  if (!items.length) blockers.push('MENU_ITEMS'); else if (!items.some(i => i.availableNow)) blockers.push('AVAILABLE_ITEMS');
  if (draft.profile.branch.serviceMode !== 'MENU_ONLY') {
    if (draft.planPreference === 'FREE') blockers.push('PAID_PLAN_REQUIRED'); else blockers.push('SUBSCRIPTION_ACTIVATION');
    if (draft.profile.branch.serviceMode === 'DINE_IN' && !draft.service.tableLabels.length) blockers.push('TABLE_PREPARATION');
    if (Object.values(draft.service.staffing).includes('UNASSIGNED')) blockers.push('STAFF_RESPONSIBILITIES');
    blockers.push('VERIFIED_STAFF_ACCESS');
    if (!draft.service.paymentMethods.length) blockers.push('PAYMENT_METHODS');
    if (draft.service.paymentMethods.includes('BANK_TRANSFER')) blockers.push('VERIFIED_RECEIVING_ACCOUNT');
    if (draft.service.pricing !== 'NO_ADDED_CHARGES') blockers.push('PRICE_POLICY_REVIEW');
    blockers.push('ORDERING_WORKFLOW','PAYMENT_WORKFLOW','FIELD_ACCEPTANCE');
    if (draft.profile.branch.serviceMode === 'COUNTER') blockers.push('COUNTER_WORKFLOW');
  }
  return { errors: [], check: { valid: true, mode: 'PREPARATION_ONLY', summary: { sectionCount: draft.menu.sections.length,
    itemCount: items.length, availableItemCount: items.filter(i => i.availableNow).length,
    optionGroupCount: items.reduce((n,i) => n + i.modifiers.length,0), plannedTableCount: draft.service.tableLabels.length }, blockers } };
}
