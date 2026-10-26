import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	envDir: '../',
	plugins: [
		sveltekit({
			adapter: adapter()
		})
	],
	server: {
		host: '0.0.0.0',
		port: 5174
	}
});
