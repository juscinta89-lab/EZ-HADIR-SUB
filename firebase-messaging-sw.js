/* EZ-HADIR — service worker untuk notifikasi latar belakang.
   Fail ini mesti berada di root yang sama dengan index.html.
   TUKAR tetapan di bawah jika projek Firebase ditukar. */

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

const messaging = firebase.messaging();

/* Aktifkan segera tanpa menunggu tab lama ditutup */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

/* Mesej data sahaja: paparkan sendiri */
messaging.onBackgroundMessage(m => {
  if (m.notification) return;          // pelayar sudah memaparkannya
  const d = m.data || {};
  self.registration.showNotification(d.title || 'EZ-HADIR', {
    body: d.body || 'Peringatan kehadiran.',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: d.tag || 'ez-hadir',
    data: { url: d.url || './' }
  });
});

/* Sandaran terakhir: jika onBackgroundMessage tidak menangkapnya,
   paparkan terus daripada peristiwa push mentah. */
self.addEventListener('push', e => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (err) { p = {}; }
  if (p.notification) return;          // dikendalikan oleh pelayar
  const d = p.data || {};
  if (!d.title && !d.body) return;
  e.waitUntil(
    self.registration.showNotification(d.title || 'EZ-HADIR', {
      body: d.body || 'Peringatan kehadiran.',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: d.tag || 'ez-hadir',
      data: { url: d.url || './' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || './';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(senarai => {
      for (const c of senarai) {
        if ('focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});
