import type { RequestHandler } from './$types';
import { statelessCheck } from '$lib/server/stateless-check';
import { validateWorkspace, WORKSPACE_MAX_BYTES } from '$lib/workspace/model';
export const POST: RequestHandler = ({ request, url }) => statelessCheck(request, url, {
  maxBytes: WORKSPACE_MAX_BYTES, title: 'Check workspace preparation', invalidCode: 'WORKSPACE_INVALID', validate: validateWorkspace
});
