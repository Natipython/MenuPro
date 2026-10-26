import businessTypes from './business-types.json';

// IDs and names come from templates/index.json, not the six visual themes.
export const BUSINESS_TYPES = businessTypes;
export interface ContactInput { name: string; phone: string; email?: string }
export interface RegistrationInput {
  businessName: string;
  businessTypeId: string;
  owner: ContactInput;
  ownerIsManager: boolean;
  manager?: ContactInput;
  registrantRole: 'OWNER' | 'MANAGER';
  authorityConfirmed: boolean;
}
export interface FieldIssue { field: string; code: string }
export interface RegistrationCheck {
  valid: true;
  nextStep: 'VERIFY_REGISTRANT_PHONE';
  businessTypeId: string;
  registrationPath: 'OWNER' | 'MANAGER';
  ownerIsManager: boolean;
  requiredVerifications: string[];
}
export const EMPTY_CONTACT: ContactInput = { name: '', phone: '', email: '' };

export function normalizePhone(input: string): string | null {
  const phone = input.trim().replace(/[ ()-]/g, '');
  const international = phone.startsWith('00') ? '+' + phone.slice(2)
    : /^0\d{9}$/.test(phone) ? '+251' + phone.slice(1)
    : /^\d{9}$/.test(phone) ? '+251' + phone : phone;
  // Format check only. A code delivered to this number must prove possession.
  return /^\+[1-9]\d{7,14}$/.test(international) ? international : null;
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function text(value: unknown, maximum: number): boolean {
  return typeof value === 'string' && value.trim().length >= 1 && value.length <= maximum
    && !/[\u0000-\u001f\u007f]/.test(value);
}
export function validateRegistration(value: unknown): { errors: FieldIssue[]; check?: RegistrationCheck } {
  const errors: FieldIssue[] = [];
  const issue = (field: string, code: string) => errors.push({ field, code });
  if (!record(value)) return { errors: [{ field: '$', code: 'OBJECT_REQUIRED' }] };
  const allowed = ['businessName', 'businessTypeId', 'owner', 'ownerIsManager', 'manager', 'registrantRole', 'authorityConfirmed'];
  if (Object.keys(value).some(key => !allowed.includes(key))) issue('$', 'UNKNOWN_FIELD');
  if (!text(value.businessName, 160)) issue('businessName', 'NAME_REQUIRED');
  if (!BUSINESS_TYPES.some(type => type.id === value.businessTypeId)) issue('businessTypeId', 'SELECT_BUSINESS_TYPE');
  if (typeof value.ownerIsManager !== 'boolean') issue('ownerIsManager', 'BOOLEAN_REQUIRED');
  if (value.registrantRole !== 'OWNER' && value.registrantRole !== 'MANAGER') issue('registrantRole', 'SELECT_YOUR_ROLE');
  if (value.authorityConfirmed !== true) issue('authorityConfirmed', 'AUTHORITY_REQUIRED');
  function contact(input: unknown, field: string) {
    if (!record(input)) { issue(field, 'CONTACT_REQUIRED'); return; }
    if (Object.keys(input).some(key => !['name', 'phone', 'email'].includes(key))) issue(field, 'UNKNOWN_FIELD');
    if (!text(input.name, 120)) issue(field + '.name', 'NAME_REQUIRED');
    if (typeof input.phone !== 'string' || input.phone.length > 32 || !normalizePhone(input.phone)) issue(field + '.phone', 'PHONE_FORMAT');
    if (input.email !== undefined && (typeof input.email !== 'string' || input.email.length > 254
      || (input.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())))) issue(field + '.email', 'EMAIL_FORMAT');
  }
  contact(value.owner, 'owner');
  if (value.ownerIsManager === true) {
    if (value.manager !== undefined) issue('manager', 'OMIT_DUPLICATE_MANAGER');
    if (value.registrantRole === 'MANAGER') issue('registrantRole', 'SAME_PERSON_IS_OWNER');
  } else if (value.ownerIsManager === false) {
    contact(value.manager, 'manager');
    if (record(value.owner) && record(value.manager) && typeof value.owner.phone === 'string' && typeof value.manager.phone === 'string') {
      const ownerPhone = normalizePhone(value.owner.phone);
      if (ownerPhone && ownerPhone === normalizePhone(value.manager.phone)) issue('manager.phone', 'DISTINCT_PEOPLE_NEED_DISTINCT_PHONES');
    }
  }
  if (errors.length) return { errors };
  const role = value.registrantRole as 'OWNER' | 'MANAGER';
  return { errors, check: {
    valid: true, nextStep: 'VERIFY_REGISTRANT_PHONE', businessTypeId: value.businessTypeId as string,
    registrationPath: role, ownerIsManager: value.ownerIsManager as boolean,
    requiredVerifications: role === 'MANAGER'
      ? ['REGISTRANT_PHONE', 'OWNER_PHONE', 'OWNER_APPROVAL']
      : value.ownerIsManager ? ['REGISTRANT_PHONE'] : ['REGISTRANT_PHONE', 'MANAGER_INVITATION_ACCEPTANCE']
  } };
}

export const ISSUE_MESSAGES: Record<string, string> = {
  NAME_REQUIRED: 'Enter the full name.', SELECT_BUSINESS_TYPE: 'Choose one of the 24 business types.',
  SELECT_YOUR_ROLE: 'Choose who is completing setup.', AUTHORITY_REQUIRED: 'Confirm that you are authorized to set up this business.',
  PHONE_FORMAT: 'Enter an Ethiopian number, such as 09XXXXXXXX, or a full international number with +.',
  EMAIL_FORMAT: 'Enter a valid email address or leave this optional field blank.',
  DISTINCT_PEOPLE_NEED_DISTINCT_PHONES: 'Use separate numbers for separate people, or select “Owner is also the manager”.',
  SAME_PERSON_IS_OWNER: 'Select Owner when you are both the owner and manager.'
};
