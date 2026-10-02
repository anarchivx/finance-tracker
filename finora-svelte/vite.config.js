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
				name: 'Finora AI Pro - Intelligent Wealth Hub',
				short_name: 'Finora',
				description: 'Personal Finance, Multi-Wallet & AI Realtime Wealth Hub',
				start_url: '/',
				scope: '/',
				display: 'standalone',
				orientation: 'portrait-primary',
				theme_color: '#6366f1',
				background_color: '#090d16',
				icons: [
					{
						src: '/pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
					}
				]
			}
		})
	]
});
