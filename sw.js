/* Lapor Kehadiran — service worker
   Naikkan nombor VERSI setiap kali fail index.html dikemas kini,
   supaya telefon guru memuat turun versi baharu.                     */
const VERSI = 'ezhadir-v14';

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSI)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(k => Promise.all(k.filter(n => n !== VERSI).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'GUNA_VERSI_BARU') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // hantaran Telegram terus ke rangkaian

  const url = new URL(req.url);
  if (url.hostname === 'api.telegram.org') return;

  // Fail app sendiri: rangkaian dahulu, cache sebagai sandaran.
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const salinan = res.clone();
          caches.open(VERSI).then(c => c.put(req, salinan));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Fon dan pustaka luar: cache dahulu supaya app pantas dan boleh guna luar talian.
  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(res => {
      const salinan = res.clone();
      caches.open(VERSI).then(c => c.put(req, salinan));
      return res;
    }).catch(() => r))
  );
});
