/* Rail Rascals! service worker — offline cache.
   HTML is network-first (so updates land), everything else cache-first. */
const CACHE = 'railrascals-v3';
const ASSETS = [
  './', 'index.html', 'style.css', 'game.js', 'three.min.js', 'renderer3d.js',
  'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png', 'fonts/baloo2-latin.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const isHTML = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // network-first: always try for the freshest page, fall back to cache offline
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
    );
    return;
  }

  // static assets: cache-first for instant loads
  e.respondWith(caches.match(req).then((r) => r || fetch(req)));
});
