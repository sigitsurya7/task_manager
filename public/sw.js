/* Simple PWA Service Worker (static cached, APIs network-only) */
const CACHE_NAME = 'tm-cache-v4';
const OFFLINE_URL = '/offline.html';
// Keep precache minimal to avoid heavy cache
const PRECACHE = [OFFLINE_URL, '/favicon.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'clear-cache') {
    event.waitUntil(caches.delete(CACHE_NAME));
  }
});

async function putWithLimit(cache, request, response, maxItems = 80) {
  try { await cache.put(request, response); } catch {}
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map((k) => cache.delete(k)));
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass non-GET
  if (request.method !== 'GET') return;

  // Never intercept SSE or API requests — use network-only
  const accept = request.headers.get('accept') || '';
  if (url.pathname.startsWith('/api/') || accept.includes('text/event-stream')) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  // Static Next.js build assets only: cache-first (avoid caching uploads/user files)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then(async (res) => {
        const resClone = res.clone();
        const cache = await caches.open(CACHE_NAME);
        await putWithLimit(cache, request, resClone, 120);
        return res;
      }))
    );
    return;
  }

  // HTML navigation: network only (no caching) for lighter storage, fallback to offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(async () => (await caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Default: network only
  event.respondWith(fetch(request));
});

