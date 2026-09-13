import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			workbox: {
				skipWaiting: true,
				clientsClaim: true,
				cleanupOutdatedCaches: true
			},
			manifest: {
				name: 'Finora',
				short_name: 'Finora',
				description: 'Long-Term Personal Finance & Auto Breakdown',
				theme_color: '#6366f1',
				background_color: '#0f172a',
				icons: [
					{
						src: 'https://cdn-icons-png.flaticon.com/512/2489/2489756.png',
						sizes: '512x512',
						type: 'image/png'
					}
				]
			}
		})
	]
});
