const CACHE = 'sticky-notes-v1';

const STATIC = [
  '/sticky-notes/',
  '/sticky-notes/index.html',
  '/sticky-notes/manifest.json',
  '/sticky-notes/icon.svg',
  '/sticky-notes/icon-maskable.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Google Fonts: stale-while-revalidate so offline still works after first visit
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(request).then(cached => {
          const fresh = fetch(request).then(res => { cache.put(request, res.clone()); return res; }).catch(() => null);
          return cached || fresh;
        })
      )
    );
    return;
  }

  // Same-origin: cache-first, fall back to network and cache the result
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(request).then(cached =>
        cached || fetch(request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(request, clone));
          }
          return res;
        })
      )
    );
  }
});
