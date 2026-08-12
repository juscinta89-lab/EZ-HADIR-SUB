/* EZ-HADIR — service worker untuk notifikasi latar belakang.
   Fail ini mesti berada di root yang sama dengan index.html.
   TUKAR tetapan di bawah kepada tetapan projek Firebase anda
   (sama seperti CONFIG.FIREBASE dalam index.html). */

importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyDUYbamgSKQo0TPDQnFq7r97mFVKL2tm4s",
  authDomain:        "ez-hadir-subscribe.firebaseapp.com",
  projectId:         "ez-hadir-subscribe",
  storageBucket:     "ez-hadir-subscribe.firebasestorage.app",
  messagingSenderId: "127845537280",
  appId:             "1:127845537280:web:96efbe9782dcd3cb0faae5"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(m => {
  const d = m.data || {};
  self.registration.showNotification(d.title || 'EZ-HADIR', {
    body: d.body || 'Peringatan kehadiran.',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: d.tag || 'ez-hadir',
    data: { url: d.url || './' }
  });
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
