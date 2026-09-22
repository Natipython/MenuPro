import { TemplateEngine } from '$lib/templates/TemplateEngine';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    const template = TemplateEngine.getTemplateBySlug('cafe-and-restaurant');
    return {
        template
    };
};
