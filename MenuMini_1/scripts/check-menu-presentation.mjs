import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// No SvelteKit sync, network listener, environment files or database access.
const server = await createServer({ root, configFile: false, envDir: false,
  resolve: { alias: { $lib: resolve(root, 'src/lib') } }, server: { middlewareMode: true }, appType: 'custom' });
const cases = [];
const check = (value, label) => { assert.ok(value, label); cases.push(label); };
try {
  const { publishedCatalogView, filterMenuDishes } = await server.ssrLoadModule('/src/lib/menu/catalog-view.ts');
  const { MINI_MENU_TEMPLATES } = await server.ssrLoadModule('/src/lib/types/miniTemplates.ts');
  const item = { id: 'coffee', nameEn: 'Coffee', nameAm: 'ቡና', descriptionEn: 'Fresh roast', descriptionAm: 'ትኩስ',
    basePrice: '9999999999.99', availableNow: false,
    modifiers: [{ id: 'size', label: 'Size', mode: 'SINGLE_SELECT', minSelections: 1, maxSelections: 1,
      choices: [{ id: 'small', label: 'Small', priceDelta: '-0.01', isAvailable: true },
        { id: 'large', label: 'Large', priceDelta: '0.10', isAvailable: false }] }] };
  const menu = { publicationId: 'publication-1', revision: 2, availabilityRevision: 4, venueId: 'venue-1',
    venueName: 'Fictional Cafe', currency: 'ETB', branch: { name: 'Bole', publicName: 'fictional-bole',
      city: 'Addis Ababa', landmark: 'Fictional landmark', hours: [] },
    content: { themeId: MINI_MENU_TEMPLATES[1].id, primaryColor: '#F59E0B', sections: [
      { id: 'section-a', nameEn: 'Drinks', nameAm: 'መጠጦች', items: [item] },
      { id: 'section-b', nameEn: 'Drinks', items: [{ ...item, id: 'tea', nameEn: 'Tea', basePrice: '0.10', availableNow: true }] },
      { id: 'empty', nameEn: 'Empty', items: [] }
    ] } };
  const before = JSON.stringify(menu);
  const view = publishedCatalogView(menu);
  check(view.dishes[0].price === '9999999999.99' && view.dishes[1].price === '0.10', 'published prices remain exact decimal strings, including maximum and fractional values');
  check(view.dishes[0].available === false && view.dishes[1].available === true, 'sold-out and available dishes retain separate truthful states');
  check(view.dishes[0].modifiers[0].choices[0].priceDelta === '-0.01'
    && view.dishes[0].modifiers[0].choices[1].isAvailable === false, 'option identities, exact deltas and choice availability survive presentation mapping');
  check(filterMenuDishes(view.dishes, 'section-b', '').map(d => d.id).join() === 'tea', 'same-name categories filter by stable section ID');
  check(filterMenuDishes(view.dishes, null, '  coFFee  ').length === 1, 'search trims spaces and ignores English letter case');
  check(filterMenuDishes(view.dishes, 'section-a', 'ቡና').length === 1
    && filterMenuDishes(view.dishes, 'section-a', 'ትኩስ').length === 1, 'search includes Amharic names and descriptions');
  check(filterMenuDishes(view.dishes, 'section-b', 'Coffee').length === 0, 'category and query filters combine without leaking other sections');
  check(filterMenuDishes(view.dishes, null, 'not on the menu').length === 0, 'unmatched search returns an empty result');
  check(view.sections.length === 2 && view.sections[0].nameAm === 'መጠጦች', 'published bilingual category names survive and empty sections do not create dead filters');
  check(JSON.stringify(menu) === before, 'presentation and filtering do not mutate publication data');
  check(view.openStatus === undefined && view.badgeLabel === 'MENU' && view.badgeValue === 'ETB', 'public browsing does not invent a table association or open status');
  for (const theme of MINI_MENU_TEMPLATES) {
    check(publishedCatalogView({ ...menu, content: { ...menu.content, themeId: theme.id } }).theme.id === theme.id,
      `original visual theme retained: ${theme.id}`);
  }
  const empty = publishedCatalogView({ ...menu, content: { ...menu.content, themeId: 'unknown-theme', sections: [] } });
  check(empty.theme.id === MINI_MENU_TEMPLATES[0].id && empty.dishes.length === 0,
    'unknown theme uses an original theme while an empty publication never becomes a demo cafe');
  check(publishedCatalogView({ ...menu, publicationId: 'publication-2' }).key !== view.key,
    'a new publication has a separate browsing context');
  const report = { verified_at: new Date().toISOString(), passed: cases.length, failed: 0, cases,
    scope: 'pure published-menu view mapping and filtering on fictional inputs; no order, identity, database or device acceptance' };
  await writeFile(resolve(root, '../docs/menu-presentation-validation.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} finally { await server.close(); }
