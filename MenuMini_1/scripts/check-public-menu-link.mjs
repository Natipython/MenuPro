import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const originalMode = process.env.NODE_ENV;
const server = await createServer({ root, configFile: false, envDir: false, plugins: [sveltekit()] });
try {
  const { publicMenuLink } = await server.ssrLoadModule('/src/lib/server/public-catalog.ts');
  const { env } = await server.ssrLoadModule('$env/dynamic/private');
  const originalOrigin = env.MENU_PUBLIC_ORIGIN;
  try {
    delete env.MENU_PUBLIC_ORIGIN; process.env.NODE_ENV = 'development';
    assert.equal(publicMenuLink('fictional-cafe', 'http://127.0.0.1:5196'), 'http://127.0.0.1:5196/menu/fictional-cafe');
    process.env.NODE_ENV = 'production';
    assert.throws(() => publicMenuLink('fictional-cafe', 'http://localhost:5196'));
    env.MENU_PUBLIC_ORIGIN = 'https://menus.example.test';
    assert.equal(publicMenuLink('fictional-cafe', 'https://untrusted-host.example.test'), 'https://menus.example.test/menu/fictional-cafe');
    env.MENU_PUBLIC_ORIGIN = 'http://localhost:5196'; assert.throws(() => publicMenuLink('fictional-cafe', 'http://localhost:5196'));
    env.MENU_PUBLIC_ORIGIN = 'https://fictional:fictional@menus.example.test'; assert.throws(() => publicMenuLink('fictional-cafe', 'https://menus.example.test'));
    env.MENU_PUBLIC_ORIGIN = 'https://menus.example.test/wrong-base'; assert.throws(() => publicMenuLink('fictional-cafe', 'https://menus.example.test'));
    const result = { verified_at: new Date().toISOString(), passed: 6, failed: 0,
      scope: 'actual server menu-link builder; production requires explicit HTTPS origin, ignores caller Host and rejects loopback HTTP, credentials and path prefixes; no network or deployment test' };
    await writeFile(resolve(root, '../docs/catalog-link-validation.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  } finally { if (originalOrigin === undefined) delete env.MENU_PUBLIC_ORIGIN; else env.MENU_PUBLIC_ORIGIN = originalOrigin; }
} finally {
  if (originalMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalMode;
  await server.close();
}
