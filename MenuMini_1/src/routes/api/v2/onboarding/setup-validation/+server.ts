import type { RequestHandler } from './$types';
import { DRAFT_MAX_BYTES, validateSetupDraft } from '$lib/onboarding/setup';
import { statelessCheck } from '$lib/server/stateless-check';

export const POST: RequestHandler = ({ request, url }) => statelessCheck(request, url, {
  maxBytes: DRAFT_MAX_BYTES, title: 'Setup draft check failed', invalidCode: 'SETUP_FIELDS_INVALID', validate: validateSetupDraft
});
