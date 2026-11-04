/* eslint-disable no-restricted-globals */
/**
 * KampüsKazan — Service Worker
 *  1) PWA: uygulama kabuğunu önbelleğe alır (network-first)
 *  2) FCM: uygulama kapalıyken gelen bildirimleri gösterir
 *
 * Firebase yapılandırması js/firebase-config.js ile AYNI olmalı.
 * Bu dosya değiştiğinde CACHE_VERSION'ı artır.
 */

const CACHE_VERSION = 'kk-v21';
const APP_SHELL = [
  './',
  './index.html',
  './kvkk.html',
  './style.css',
  './campaigns.json',
  './app.bundle.js',
  './app.js',
  './logo.png',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './images/kuveytturk-logo.svg',
  './images/kuveytturk-kampus.svg',
  './images/kuveytturk-restoran.svg',
  './images/kuveytturk-market.svg',
  './images/gemini-logo.svg',
  './images/gemini-student.svg',
  './images/akbank-logo.svg',
  './images/akbank-dijital.svg',
  './images/akbank-axess.svg',
  './images/garanti-logo.svg',
  './images/garantibbva-harcama.svg',
  './images/garantibbva-davet.svg',
  './images/yapikredi-logo.svg',
  './images/yapikredi-play.svg',
  './images/yapikredi-play-indirim.svg',
  './images/isbankasi-logo.svg',
  './images/isbankasi-gaming.svg',
  './images/isbankasi-restoran.svg',
  './images/isbankasi-ulasim.svg',
  './images/isbankasi-davet.svg',
  './images/teb-logo.svg',
  './images/teb-dijital.svg',
  './images/halkbank-logo.svg',
  './images/halkbank-prime.svg',
  './images/halkbank-dijital.svg',
  './images/halkbank-internet.svg',
  './images/ing-logo.svg',
  './images/ing-harcama.svg',
  './images/ing-kafe.svg',
  './images/ing-kultur.svg',
  './images/enpara-logo.svg',
  './images/enpara-ai.svg',
  './images/enpara-dijital.svg',
  './images/enpara-davet.svg',
  './images/odeabank-logo.svg',
  './images/odeabank-harcama.svg',
  './images/odeabank-ekkart.svg',
  './images/odeabank-davet.svg',
  './images/uption-logo.svg',
  './images/uption-harcama.svg',
  './images/papara-logo.svg',
  './images/papara-claude.svg',
  './images/papara-steam.svg',
  './images/papara-epicgames.svg',
  './images/papara-youtube.svg',
  './images/papara-starbucks.svg',
  './images/papara-burgerking.svg',
  './images/papara-mcdonalds.svg',
  './images/papara-yemeksepeti.svg',
  './images/papara-gratis.svg',
  './images/papara-carrefoursa.svg',
  './images/papara-eczane.svg',
  './images/papara-appstore.svg',
  './images/papara-playstore.svg',
  './images/papara-googleone.svg',
  './images/papara-fatura.svg',
  './images/tami-logo.svg',
  './images/tami-enuygun.svg',
  './images/tami-spotify.svg',
  './images/tami-netflix.svg',
  './images/paycell-logo.svg',
  './images/paycell-ai.svg',
  './images/paycell-fatura.svg',
  './images/paycell-gaming.svg',
  './images/paycell-youtube.svg',
  './images/paycell-dijital.svg',
  './images/paycell-store.svg',
  './images/paycell-watsons.svg',
  './images/paycell-giyim.svg',
  './images/vodafonepay-logo.svg',
  './images/vodafonepay-enuygun.svg',
  './images/vodafonepay-bakiye.svg',
  './images/vodafonepay-market.svg',
  './images/spotify-logo.svg',
  './images/spotify-student.svg',
  './js/firebase-config.js',
  './js/firebase.js',
  './js/auth.js',
  './js/catalog.js',
  './js/campaigns-service.js',
  './js/notifications.js',
  './js/data/yok-catalog.js',
];

// ---------------------------------------------------------------------------
// Bildirime tıklama — FCM SDK'dan ÖNCE kaydedilir ki bağlantıyı biz yönetelim.
// ---------------------------------------------------------------------------
self.addEventListener('notificationclick', (event) => {
  event.stopImmediatePropagation();
  event.notification.close();

  const data = event.notification.data || {};
  const fcm = data.FCM_MSG || {};
  const rawLink =
    fcm.fcmOptions?.link ||
    fcm.notification?.click_action ||
    fcm.data?.link ||
    data.link ||
    './';

  let url;
  try {
    url = new URL(rawLink, self.registration.scope);
    if (!/^https?:$/.test(url.protocol)) url = new URL('./', self.registration.scope);
  } catch {
    url = new URL('./', self.registration.scope);
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url === url.href && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(url.href);
    })
  );
});

// ---------------------------------------------------------------------------
// Firebase Cloud Messaging
// ---------------------------------------------------------------------------
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyB9hECSbRt7Q2Hg4SV60WQyZJtlIsyXP3c',
  authDomain: 'kazananogren.firebaseapp.com',
  projectId: 'kazananogren',
  storageBucket: 'kazananogren.firebasestorage.app',
  messagingSenderId: '1056463692907',
  appId: '1:1056463692907:web:bc8ccb5cab210ac0367d2e',
});

const messaging = firebase.messaging();

// "notification" alanı olan mesajları (Firebase Console'dan gönderilenler)
// FCM SDK zaten otomatik gösterir. Sadece data-only mesajları biz gösteriyoruz.
messaging.onBackgroundMessage((payload) => {
  if (payload.notification) return;
  const d = payload.data || {};
  if (!d.title) return;
  self.registration.showNotification(d.title, {
    body: d.body || '',
    icon: './icons/icon-192.png',
    data: { link: d.link || './' },
  });
});

// ---------------------------------------------------------------------------
// PWA önbellek
// ---------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Firebase / Google istekleri ve admin paneli önbelleğe alınmaz.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/admin.html') || url.pathname.endsWith('/admin.js')) return;

  // Network-first: her zaman güncel içerik, çevrimdışıysa önbellek.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === 'navigate') {
          const shell = await caches.match('./index.html');
          if (shell) return shell;
        }
        return Response.error();
      })
  );
});
