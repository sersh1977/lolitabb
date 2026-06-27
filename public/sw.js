const CACHE = 'cbk-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
];

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      return Promise.allSettled(ASSETS.map(a => c.add(a).catch(() => {})));
    })
  );
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
  const url = new URL(e.request.url);

  // Las llamadas a la API de datos NUNCA se cachean: siempre tienen que
  // ir directo a la red, para que ningún dispositivo vea datos viejos.
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  const isAppShell = e.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('/index.html');

  if (isAppShell) {
    // Network-first: siempre intenta traer la versión más nueva del servidor.
    // Si no hay conexión, recién ahí usa la copia guardada.
    e.respondWith(
      fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return resp;
      }).catch(() => caches.match(e.request).then(cached => cached || caches.match('/')))
    );
    return;
  }

  // Resto de archivos (fuentes, librerías, íconos): cache-first como antes.
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match('/')))
  );
});
