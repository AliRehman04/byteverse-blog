const CACHE_NAME = "byteverse-v2";
const STATIC_ASSETS = ["/", "/blog", "/tools", "/favicon.ico", "/android-chrome-192x192.png", "/android-chrome-512x512.png"];
const studioPath = (path) => path === "/tools/image-compressor" || path.startsWith("/tools/image-compressor/")
	|| path === "/image-studio" || path.startsWith("/image-studio/") || path === "/image-studio-sw.js";

self.addEventListener("install", (event) => {
	event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
	// Own only the old GLOBAL cache. Never delete another tool's versioned packs.
	event.waitUntil(caches.delete("byteverse-v1").then(() => self.clients.claim()));
});

async function fromStudio(event) {
	const client = event.clientId ? await self.clients.get(event.clientId) : null;
	for (const value of [client?.url, event.request.referrer]) {
		if (!value) continue;
		try { const url = new URL(value); if (url.origin === self.location.origin && studioPath(url.pathname)) return true; }
		catch { /* No usable same-origin referrer. */ }
	}
	return false;
}

self.addEventListener("fetch", (event) => {
	const request = event.request;
	const url = new URL(request.url);
	// The root worker must neither cache studio resources nor substitute HOME
	// for a studio navigation, including before the private worker takes control.
	if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")
		|| studioPath(url.pathname) || url.pathname === "/sw.js" || url.pathname.endsWith(".webmanifest")) return;
	const asset = /\.(js|css|png|jpg|jpeg|webp|svg|ico|woff2?)$/.test(url.pathname) || url.pathname.startsWith("/_next/static/");
	const html = request.headers.get("accept")?.includes("text/html");
	if (!asset && !html) return;
	event.respondWith((async () => {
		if (await fromStudio(event)) return fetch(request);
		// Never use global caches.match(): that could read another tool's cache.
		const cache = await caches.open(CACHE_NAME);
		if (asset) {
			const cached = await cache.match(request);
			if (cached) return cached;
		}
		try {
			const response = await fetch(request);
			if (response.ok) await cache.put(request, response.clone()).catch(() => {});
			return response;
		} catch {
			return await cache.match(request) || (html ? await cache.match("/") : null) || Response.error();
		}
	})());
});
