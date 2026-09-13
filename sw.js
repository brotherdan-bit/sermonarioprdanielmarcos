/* Sermonário — Service Worker
   Estratégia: stale-while-revalidate.
   O app abre instantaneamente do cache (funciona sem internet) e,
   quando há rede, baixa a versão nova em segundo plano para a
   próxima abertura. */

const CACHE = 'sermonario-v25';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png',
  './apple-touch-icon.png',
  './jspdf.umd.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS).catch(() => c.add('./index.html')))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Navegação (abrir o app): cache primeiro, rede como reserva
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then(hit => {
        const rede = fetch(req).then(res => {
          if (res && res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then(c => c.put('./index.html', copia));
          }
          return res;
        }).catch(() => hit);
        return hit || rede;
      })
    );
    return;
  }

  // Demais recursos do próprio domínio
  e.respondWith(
    caches.match(req).then(hit => {
      const rede = fetch(req).then(res => {
        if (res && res.ok && res.type === 'basic') {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return res;
      }).catch(() => hit);
      return hit || rede;
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
