import { TemplateEngine } from '$lib/templates/TemplateEngine';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    const index = TemplateEngine.getIndex();
    return {
        templates: index.templates
    };
};
