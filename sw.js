/* Service worker de la porte Jarvis — ecrit par server/lien-unique.js */
const CACHE = 'jarvis-porte-v1';
const GARDES = ['./', 'index.html', 'manifest.json', 'icon.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(GARDES.map(async u => {
      try { const r = await fetch(u, { cache: 'reload' }); if (r && r.ok) await c.put(u, r.clone()); } catch (err) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const noms = await caches.keys();
    await Promise.all(noms.filter(n => n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* L'adresse du jour : reseau, toujours, sans exception. */
  if (url.pathname.endsWith('adresse.json')) {
    e.respondWith(fetch(req).catch(() => new Response('{}',
      { headers: { 'content-type': 'application/json' } })));
    return;
  }

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const r = await fetch(req);
      if (r && r.ok) cache.put(req, r.clone()).catch(() => {});
      return r;
    } catch (err) {
      const g = await cache.match(req, { ignoreSearch: true });
      if (g) return g;
      if (req.mode === 'navigate') {
        const p = await cache.match('index.html') || await cache.match('./');
        if (p) return p;
      }
      return new Response('Jarvis est injoignable et rien n'est en cache.',
        { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }
  })());
});
