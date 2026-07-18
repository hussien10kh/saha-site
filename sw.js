/* =========================================================
   ساحة | Sahat — service worker
   Precaches the app shell and serves it offline. Cross-origin
   requests (Supabase, fonts, CDN scripts) are left to the network
   untouched so auth/data calls behave normally.
   ========================================================= */

const CACHE_NAME = 'saaha-v2';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/supabase-client.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) {
    return;
  }

  if (req.mode === 'navigate') {
    const networked = fetch(req).then((res) => {
      const copy = res.clone();
      return caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {}).then(() => res);
    });
    event.waitUntil(networked.catch(() => {}));
    event.respondWith(
      networked.catch(() => caches.match(req).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // Stale-while-revalidate: serve the cached copy immediately for speed,
  // but always refetch in the background so the next load has the latest
  // file — a plain cache-first here would keep serving a file from the
  // very first install forever, even after later deploys change it. The
  // cache write is chained INTO the network promise (not left dangling)
  // and that whole chain is passed to event.waitUntil() — otherwise the
  // browser can suspend/kill this worker right after responding, before
  // the write finishes, and the cache would silently never catch up to a
  // new deploy on some devices.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        const copy = res.clone();
        return caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {}).then(() => res);
      }).catch(() => cached);
      event.waitUntil(network.catch(() => {}));
      return cached || network;
    })
  );
});
