const CACHE_NAME = "image-tools-v1";
const ASSETS_TO_CACHE = ["/", "/index.html"];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(ASSETS_TO_CACHE);
		}),
	);
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames
					.filter((name) => name !== CACHE_NAME)
					.map((name) => caches.delete(name)),
			);
		}),
	);
	self.clients.claim();
});

self.addEventListener("fetch", (event) => {
	const { request } = event;

	// Skip non-GET requests
	if (request.method !== "GET") return;

	// Skip cross-origin requests
	if (!request.url.startsWith(self.location.origin)) return;

	event.respondWith(
		caches.match(request).then((cachedResponse) => {
			// Return cached response if available
			if (cachedResponse) {
				// Fetch in background to update cache
				const backgroundFetch = fetch(request)
					.then((response) => {
						if (response.ok) {
							return caches.open(CACHE_NAME).then((cache) => {
								return cache.put(request, response);
							});
						}
					})
					.catch(() => {
						// Silently fail - we already have a cached response to return
					});
				event.waitUntil(backgroundFetch);
				return cachedResponse;
			}

			// Fetch from network
			return fetch(request)
				.then((response) => {
					// Cache successful responses
					if (response.ok) {
						const responseClone = response.clone();
						caches.open(CACHE_NAME).then((cache) => {
							cache.put(request, responseClone);
						}).catch(() => {
						    // Silently fail - response is already being returned
						});
					}
					return response;
				})
				.catch(async () => {
					// Return offline fallback for navigation requests
					if (request.mode === "navigate") {
						const cachedIndex = await caches.match("/index.html");
						if (cachedIndex) {
							return cachedIndex;
						}
						// Return offline HTML if index.html not cached
						return new Response(
							"<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>Offline</h1><p>Unable to load application. Please check your connection.</p></body></html>",
							{
								status: 503,
								headers: { "Content-Type": "text/html" },
							},
						);
					}
					return new Response("Offline", { status: 503 });
				});
		}),
	);
});
