---
title: "Sticky Notes Goes Offline: PWA Edition"
date: "2026-05-03"
description: "Sticky Notes is now installable as a Progressive Web App — add it to your home screen or desktop, use it offline, and get a native-app feel without an app store."
tags: ["Web", "Tools", "PWA", "Vanilla JS", "Meta"]
draft: false
---

*Pinned to the shelf —*\
*no network, no problem now.*\
*The notes are still there.*

---

## What shipped

Sticky Notes is now a Progressive Web App. Visit [`/sticky-notes/`](/sticky-notes/) in Chrome or Edge and you'll see an install prompt in the address bar — or hit the new **Install App** button in the toolbar. On Android, it lands on your home screen. On desktop, it opens in its own window without browser chrome, exactly like a native app.

After the first visit, the app is fully cached. No connection required.

## What a PWA needs

Three pieces: a manifest, a service worker, and a couple of lines linking them to the page.

### The manifest

`manifest.json` tells the browser what the app is:

```json
{
  "name": "Sticky Notes",
  "short_name": "Sticky Notes",
  "start_url": "/sticky-notes/",
  "display": "standalone",
  "background_color": "#221A10",
  "theme_color": "#221A10",
  "icons": [
    { "src": "icon.svg",          "sizes": "any", "purpose": "any" },
    { "src": "icon-maskable.svg", "sizes": "any", "purpose": "maskable" }
  ]
}
```

`display: "standalone"` is the key line — it strips the browser UI so the app feels self-contained. `theme_color` tints the OS window frame to match the toolbar's dark brown.

Two SVG icons are included. The regular icon has a rounded rectangle background; the maskable variant fills the full 512×512 canvas so Android's adaptive icon system can apply any shape (circle, squircle, whatever the launcher prefers) without clipping into the content. The safe zone for maskable icons is the inner 80% of the canvas — everything meaningful stays inside that box.

### The service worker

The service worker handles two caching strategies:

**Cache-first for same-origin assets.** The app shell — the HTML, the manifest, the icons — is pre-cached on install. Any subsequent request hits the cache before the network:

```js
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('fetch', e => {
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(request).then(cached =>
        cached || fetch(request).then(res => {
          caches.open(CACHE).then(c => c.put(request, res.clone()));
          return res;
        })
      )
    );
  }
});
```

**Stale-while-revalidate for Google Fonts.** Fonts are external, so they can't be pre-cached. Instead: serve whatever's in cache immediately (fast), and kick off a fresh fetch in parallel to update the cache for next time. After the first online visit, fonts load instantly offline.

```js
cache.match(request).then(cached => {
  const fresh = fetch(request)
    .then(res => { cache.put(request, res.clone()); return res; })
    .catch(() => null);
  return cached || fresh;
});
```

Cache versioning is handled by a `CACHE` constant. When the app updates, bump the version name and the `activate` handler sweeps out stale caches automatically.

### The install button

Browsers fire `beforeinstallprompt` when the PWA install criteria are met. The event carries a `.prompt()` method — deferring it lets you choose when to show the native dialog:

```js
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  btnInstall.style.display = '';        // reveal the toolbar button
});

btnInstall.addEventListener('click', () => {
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(() => {
    deferredInstallPrompt = null;
    btnInstall.style.display = 'none';  // hide after interaction
  });
});
```

The button starts hidden. It only appears when the browser determines the app is actually installable. Once you've gone through the install flow (or dismissed it), it hides again — no stale UI.

## What didn't change

Everything else. Notes still live in `localStorage`, autosave on every change, and survive closes. Export and import still work the same way. The offline capability is purely additive — it doesn't touch the data layer.

---

[Open Sticky Notes](/sticky-notes/) and look for the install button in your browser's address bar.
