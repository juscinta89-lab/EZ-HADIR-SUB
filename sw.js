/* Lapor Kehadiran — service worker
   Naikkan nombor VERSI setiap kali fail index.html dikemas kini,
   supaya telefon guru memuat turun versi baharu.                     */
importScripts('./firebase-messaging-sw.js'); // Mengimport Firebase Cloud Messaging

const VERSI = 'ezhadir-v22';

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
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.hostname === 'api.telegram.org') return;
  // jangan cache fail service worker FCM; ia mesti sentiasa segar
  if (url.pathname.endsWith('firebase-messaging-sw.js')) return;

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

  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(res => {
      const salinan = res.clone();
      caches.open(VERSI).then(c => c.put(req, salinan));
      return res;
    }).catch(() => r))
  );
});
