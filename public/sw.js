/* Simple PWA Service Worker (network-first for pages, cache-first for static) */
const CACHE_NAME = 'tm-cache-v1';
const OFFLINE_URL = '/offline.html';
const PRECACHE = [
  '/',
  OFFLINE_URL,
  '/favicon.ico',
  '/next.svg',
  '/vercel.svg'
];

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

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass non-GET
  if (request.method !== 'GET') return;

  // Static assets: cache first
  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/static/') || /\.(?:js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
        return res;
      }))
    );
    return;
  }

  // HTML navigation: network first, fallback to cache then offline
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
        return res;
      }).catch(async () => (await caches.match(request)) || (await caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Default: try cache, then network
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

