/* ══════════════════════════════════════════════════════════════
   EZ-HADIR — SATU service worker untuk semuanya:
   cache PWA + notifikasi tolak (FCM).

   Sebelum ini ada dua service worker (sw.js dan
   firebase-messaging-sw.js) yang berebut skop yang sama.
   Dalam pelayar, pendaftaran kedua menggantikan yang pertama,
   jadi salah satu daripadanya mati. Itu punca notifikasi
   sampai tetapi tidak dipaparkan. Sekarang hanya ada satu.

   Naikkan VERSI setiap kali fail app dikemas kini.
   ══════════════════════════════════════════════════════════════ */
const VERSI = 'ezhadir-v25';

/* ── bahagian notifikasi ────────────────────────────────────── */
/* Dibungkus dalam try/catch: jika rangkaian menyekat gstatic.com,
   service worker mesti tetap hidup supaya cache PWA terus berfungsi. */
try {
  importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

  firebase.initializeApp({
    apiKey:            "AIzaSyDUYbamgSKQo0TPDQnFq7r97mFVKL2tm4s",
    authDomain:        "ez-hadir-subscribe.firebaseapp.com",
    projectId:         "ez-hadir-subscribe",
    storageBucket:     "ez-hadir-subscribe.firebasestorage.app",
    messagingSenderId: "127845537280",
    appId:             "1:127845537280:web:96efbe9782dcd3cb0faae5"
  });
  firebase.messaging();
  self.__fcmSiap = true;
} catch (e) {
  self.__fcmSiap = false;
  console.warn('EZ-HADIR: FCM tidak dapat dimuatkan dalam service worker.', e);
}
/* Nota penting: kami TIDAK memanggil onBackgroundMessage di sini.
   Mesej dari pelayan mengandungi blok "notification", jadi pelayar
   memaparkannya sendiri. Menambah pengendali di sini akan
   menyebabkan notifikasi berganda. */

/* Sandaran untuk mesej data sahaja (tiada blok notification).
   Chrome mewajibkan setiap push memaparkan sesuatu; jika tidak,
   ia akan papar mesej generik "site updated in the background". */
self.addEventListener('push', e => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (err) { p = {}; }
  if (p.notification) return;                 // pelayar sudah uruskan
  const d = p.data || {};
  if (!d.title && !d.body) return;
  e.waitUntil(
    self.registration.showNotification(d.title || 'EZ-HADIR', {
      body: d.body || 'Peringatan kehadiran.',
      icon: d.icon || 'icon-192.png',
      badge: d.icon || 'icon-192.png',
      tag: d.tag || ('ez-' + Date.now()),
      renotify: true,
      data: { url: d.url || './' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(senarai => {
      for (const c of senarai) if ('focus' in c) return c.focus();
      return self.clients.openWindow(url);
    })
  );
});

/* ── bahagian cache PWA ─────────────────────────────────────── */
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
  if (url.hostname.endsWith('googleapis.com')) return;
  if (url.hostname === 'www.gstatic.com') return;

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
