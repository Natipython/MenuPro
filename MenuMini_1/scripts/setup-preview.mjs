// Local setup review without loading the workspace's provider credentials.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, createServer } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
  root: resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  configFile: false,
  envDir: false,
  plugins: [sveltekit()]
};
if (process.argv[2] === 'build') {
  await build(config);
} else {
  const port = Number(process.env.MENUMINI_PREVIEW_PORT || 5186);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Choose a valid local preview port.');
  const server = await createServer({ ...config, server: { host: '127.0.0.1', port, strictPort: true } });
  await server.listen();
  server.printUrls();
}
