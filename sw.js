/* =========================================================
   ساحة | Sahat — service worker
   Precaches the app shell and serves it offline. Cross-origin
   requests (Supabase, fonts, CDN scripts) are left to the network
   untouched so auth/data calls behave normally.
   ========================================================= */

const CACHE_NAME = 'saaha-v5';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/supabase-client.js',
  '/js/vendor/supabase.js',
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

  // Cache writes always happen in their own promise, handed to
  // event.waitUntil() so the browser can't suspend/kill this worker before
  // the write finishes — but that promise is NEVER what the response
  // itself waits on, so a page load is never delayed by how long the
  // cache write takes.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {}));
        return res;
      }).catch(() => caches.match(req).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // JS/CSS: network-first. The page itself is network-first (above), so
  // its scripts/styles must come from the same deploy — serving them
  // stale from the cache pairs new HTML with old JS/CSS and breaks the
  // page for one full load after every deploy. Netlify answers with a
  // 304 when the file is unchanged, so the cost is a light round trip;
  // the cached copy is only the offline fallback.
  if (req.destination === 'script' || req.destination === 'style') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {}));
        return res;
      }).catch(() => caches.match(req).then((cached) => cached || Response.error()))
    );
    return;
  }

  // Everything else (images, fonts, manifest) — stale-while-revalidate:
  // serve the cached copy immediately for speed, but always refetch in the
  // background so the next load has the latest file — a plain cache-first
  // here would keep serving a file from the very first install forever,
  // even after later deploys change it.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        const copy = res.clone();
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {}));
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
