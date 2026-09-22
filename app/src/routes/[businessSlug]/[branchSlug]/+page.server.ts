import { error } from '@sveltejs/kit';
import { TemplateEngine } from '$lib/templates/TemplateEngine';

export const load = async ({ params, url }) => {
    const { businessSlug, branchSlug } = params;
    const tableId = url.searchParams.get('t');

    console.log(`Loading menu for ${businessSlug}/${branchSlug} (Table: ${tableId})`);

    try {
        // Normally we'd query the DB for the business's active template and actual menu items.
        // For Phase 2 UI development, we will load the raw JSON template by slug 
        // to render the section skeleton.
        
        // Mock: If businessSlug matches a template, load it
        const index = TemplateEngine.getIndex();
        const templateMeta = index.templates.find(t => t.slug === businessSlug);
        
        if (!templateMeta) {
            // Fallback to cafe-and-restaurant for testing
            const fallback = TemplateEngine.getTemplateBySlug('cafe-and-restaurant');
            return {
                business: { name: 'Demo Cafe', slug: businessSlug },
                branch: { name: 'Main Branch', slug: branchSlug },
                tableId,
                template: fallback
            };
        }

        const template = TemplateEngine.getTemplateBySlug(businessSlug);

        return {
            business: { name: template.name, slug: businessSlug },
            branch: { name: 'Main Branch', slug: branchSlug },
            tableId,
            template
        };

    } catch (e) {
        throw error(404, 'Menu not found');
    }
};
