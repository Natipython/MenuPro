import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve paths so it works in both dev and prod
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In dev, data is symlinked. In production, we'll ensure they are copied.
const TEMPLATES_DIR = path.resolve(__dirname, 'data');
const INDEX_FILE = path.join(TEMPLATES_DIR, 'index.json');

export interface TemplateIndexItem {
    id: string;
    name: string;
    slug: string;
    icon: string;
    category: string;
    tags: string[];
    file: string;
    sectionCount: number;
    description: string;
}

export interface TemplateIndex {
    name: string;
    version: string;
    totalTemplates: number;
    templates: TemplateIndexItem[];
    categories: any[];
}

export class TemplateEngine {
    
    /**
     * Get the master index of all templates.
     */
    static getIndex(): TemplateIndex {
        const data = fs.readFileSync(INDEX_FILE, 'utf-8');
        return JSON.parse(data) as TemplateIndex;
    }

    /**
     * Get all active template listings.
     */
    static getAllTemplates(): TemplateIndexItem[] {
        return this.getIndex().templates;
    }

    /**
     * Load a specific template by its slug (e.g., 'bakery-and-pastry').
     */
    static getTemplateBySlug(slug: string): any {
        const index = this.getIndex();
        const templateMeta = index.templates.find(t => t.slug === slug);
        if (!templateMeta) {
            throw new Error(`Template not found for slug: ${slug}`);
        }

        // templateMeta.file is like './business-types/01-bakery-and-pastry.json'
        // We need to resolve relative to TEMPLATES_DIR
        const templatePath = path.resolve(TEMPLATES_DIR, templateMeta.file);
        const data = fs.readFileSync(templatePath, 'utf-8');
        return JSON.parse(data);
    }
}
