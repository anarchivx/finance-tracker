import adapterAuto from '@sveltejs/adapter-auto';

let adapter = adapterAuto;
try {
	const netlify = await import('@sveltejs/adapter-netlify');
	if (netlify?.default) adapter = netlify.default;
} catch {
	adapter = adapterAuto;
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter()
	}
};

export default config;
