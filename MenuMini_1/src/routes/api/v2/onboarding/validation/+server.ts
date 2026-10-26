import type { RequestHandler } from './$types';
import { validateRegistration } from '$lib/onboarding/registration';
import { statelessCheck } from '$lib/server/stateless-check';

export const POST: RequestHandler = ({ request, url }) => statelessCheck(request, url, {
  maxBytes: 16384, title: 'Registration check failed', invalidCode: 'REGISTRATION_FIELDS_INVALID', validate: validateRegistration
});
