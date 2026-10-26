import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(await readFile(resolve(root, 'database/tests/preparation-draft.json'), 'utf8'));
const server = await createServer({ root, configFile: false, envDir: false, plugins: [sveltekit()] });
try {
  const { mapPreparedCatalog } = await server.ssrLoadModule('/src/lib/onboarding/catalog-mapping.ts');
  const before = JSON.stringify(source); const mapped = mapPreparedCatalog(source);
  assert.deepEqual(Object.keys(mapped), ['profile', 'menu']);
  assert.equal(mapped.menu.sections[0].items[0].basePrice, '60.50');
  assert.equal(mapped.menu.sections[0].items[0].nameAm, 'ሙከራ ቡና');
  assert.deepEqual(mapped.menu.sections[0].items[0].modifiers, []);
  assert.equal(mapped.menu.primaryColor, '#F59E0B');
  assert.equal(mapped.profile.branch.publicPhone, undefined);
  assert.equal(JSON.stringify(source), before);
  assert.throws(() => mapPreparedCatalog({ ...source, owner: { phone: '0900000011' } }));
  assert.throws(() => mapPreparedCatalog({ ...source, plan: 'PRO' }));
  await writeFile('/tmp/menumini-mapped-catalog.json', JSON.stringify(mapped, null, 2) + '\n');
  const report = { verified_at: new Date().toISOString(), passed: 9, failed: 0,
    scope: 'actual shared preparation mapper; exact prices and translation preserved; private contacts, entitlement and unsupported options excluded; input unchanged' };
  await writeFile(resolve(root, '../docs/catalog-mapping-validation.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await server.close(); }
