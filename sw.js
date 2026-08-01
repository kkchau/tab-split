/* Tab Split — offline cache. Drop next to index.html. */
const CACHE = 'splittab-v4';
const SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => k !== CACHE).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('message', e => {
  if (e.data === 'flush') {
    caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k))));
  }
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // Photo shared in from another app. Stash it and bounce to the page;
  // this is handled entirely in the worker, there is nowhere for it to be sent.
  if (req.method === 'POST' && url.pathname.endsWith('/share')) {
    e.respondWith((async () => {
      try {
        const form = await req.formData();
        const file = form.get('photo') || form.get('image') || form.get('file');
        if (file) {
          const c = await caches.open('splittab-share');
          await c.put('shared-photo', new Response(file, {
            headers: {
              'Content-Type': file.type || 'image/jpeg',
              'X-Name': encodeURIComponent(file.name || 'shared.jpg')
            }
          }));
        }
      } catch (err) {}
      return Response.redirect('./?shared=1', 303);
    })());
    return;
  }

  if (req.method !== 'GET') return;
  const sameOrigin = url.origin === location.origin;

  // The app itself: network first, so a newer copy is picked up straight away.
  // Falling back to cache keeps it working with no connection.
  if (sameOrigin) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req).then(hit => {
        if (hit) return hit;
        // Only a page navigation should ever be answered with the page.
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'Offline' });
      }))
    );
    return;
  }

  // The recognition engine: cache first, it never changes.
  if (/jsdelivr|unpkg|cdnjs|tessdata/.test(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }))
    );
  }
});
