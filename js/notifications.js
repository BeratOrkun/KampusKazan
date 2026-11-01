/**
 * PWA + Web Push (Firebase Cloud Messaging)
 *
 * KVKK / 6563 notu:
 *  - Bildirim tamamen isteğe bağlıdır; öğrenci açıkça "Bildirimleri aç" demeden
 *    tarayıcı izni istenmez ve token alınmaz.
 *  - FCM token'ı bir "çevrim içi tanımlayıcı" sayılabilir; bu yüzden onay anı ve
 *    metin sürümü (pushConsentAt / pushConsentVersion) ispat için saklanır.
 *  - Öğrenci istediği an kapatabilir; kapatınca token silinir.
 */

import { app, db, doc, updateDoc, deleteField, serverTimestamp } from './firebase.js';
import { VAPID_KEY, isPushConfigured } from './firebase-config.js';

/** Bildirim açık rıza metni sürümü — kvkk.html'deki metni değiştirirsen artır. */
export const PUSH_CONSENT_VERSION = '2026-11';

const MESSAGING_URL = 'https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging.js';

/** @type {Promise<ServiceWorkerRegistration | null> | null} */
let swPromise = null;

export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Bildirim neden kullanılamıyor? (UI'da gösterilecek açıklama)
 * @returns {string | null} null = kullanılabilir
 */
export function pushUnavailableReason() {
  if (!isPushConfigured()) return 'Bildirimler henüz yapılandırılmadı.';
  if (isIOS() && !isStandalone()) {
    return 'iPhone/iPad’de bildirim için önce Safari’de Paylaş → “Ana Ekrana Ekle” ile uygulamayı yükle, sonra uygulamadan aç.';
  }
  if (!isPushSupported()) return 'Bu tarayıcı web bildirimlerini desteklemiyor.';
  if (Notification.permission === 'denied') {
    return 'Bildirim izni tarayıcı ayarlarından engellenmiş. Site ayarlarından izin verip tekrar dene.';
  }
  return null;
}

/** Service worker'ı kaydeder (PWA + push için tek SW). */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  if (location.protocol !== 'http:' && location.protocol !== 'https:') {
    return Promise.resolve(null);
  }
  if (!swPromise) {
    swPromise = navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .catch((err) => {
        console.warn('Service worker kaydedilemedi:', err);
        return null;
      });
  }
  return swPromise;
}

async function getMessagingApi() {
  const mod = await import(MESSAGING_URL);
  if (!(await mod.isSupported())) {
    throw new Error('Bu tarayıcı Firebase bildirimlerini desteklemiyor.');
  }
  return { mod, messaging: mod.getMessaging(app) };
}

/**
 * Tarayıcı iznini ister. Mutlaka bir kullanıcı tıklaması içinde,
 * başka bir await'ten ÖNCE çağrılmalı (Safari/iOS kuralı).
 * @returns {Promise<NotificationPermission>}
 */
export function requestPermission() {
  if (!('Notification' in window)) return Promise.resolve('denied');
  return Notification.requestPermission();
}

/**
 * İzin alındıktan sonra token alır ve profile kaydeder.
 * @param {string} uid
 * @param {NotificationPermission | Promise<NotificationPermission>} permission
 */
export async function enablePush(uid, permission) {
  const reason = pushUnavailableReason();
  if (reason) throw new Error(reason);

  const perm = await permission;
  if (perm !== 'granted') {
    throw new Error('Bildirim izni verilmedi.');
  }

  const registration = await registerServiceWorker();
  if (!registration) throw new Error('Service worker kaydedilemedi.');
  await navigator.serviceWorker.ready;

  const { mod, messaging } = await getMessagingApi();
  const token = await mod.getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token) throw new Error('Bildirim anahtarı alınamadı.');

  await updateDoc(doc(db, 'users', uid), {
    pushEnabled: true,
    pushToken: token,
    pushConsentVersion: PUSH_CONSENT_VERSION,
    pushConsentAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return token;
}

/**
 * Bildirimi kapatır: FCM token'ını iptal eder ve profilden siler.
 * @param {string | null} uid  null ise sadece cihazdaki token silinir
 */
export async function disablePush(uid) {
  try {
    if (isPushSupported() && Notification.permission === 'granted') {
      const registration = await registerServiceWorker();
      if (registration) {
        const { mod, messaging } = await getMessagingApi();
        await mod.deleteToken(messaging);
      }
    }
  } catch (err) {
    console.warn('Token silinemedi (devam ediliyor):', err);
  }

  if (uid) {
    await updateDoc(doc(db, 'users', uid), {
      pushEnabled: false,
      pushToken: deleteField(),
      pushConsentVersion: deleteField(),
      pushConsentAt: deleteField(),
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Uygulama açıkken gelen bildirimleri yakalar (arka planda SW gösterir).
 * @param {(n: { title: string, body: string, link?: string }) => void} cb
 */
export async function listenForegroundMessages(cb) {
  if (!isPushConfigured() || !isPushSupported() || Notification.permission !== 'granted') return;
  try {
    const { mod, messaging } = await getMessagingApi();
    mod.onMessage(messaging, (payload) => {
      const n = payload.notification || {};
      const d = payload.data || {};
      cb({
        title: n.title || d.title || 'KampüsKazan',
        body: n.body || d.body || '',
        link: payload.fcmOptions?.link || d.link,
      });
    });
  } catch (err) {
    console.warn('Ön plan bildirim dinleyicisi başlatılamadı:', err);
  }
}

/**
 * Token zaman zaman yenilenir; açılışta güncel token'ı profile yazar.
 * @param {{ uid: string, pushEnabled?: boolean, pushToken?: string }} profile
 */
export async function syncPushToken(profile) {
  if (!profile?.pushEnabled || pushUnavailableReason() || Notification.permission !== 'granted') return;
  try {
    const registration = await registerServiceWorker();
    if (!registration) return;
    const { mod, messaging } = await getMessagingApi();
    const token = await mod.getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (token && token !== profile.pushToken) {
      await updateDoc(doc(db, 'users', profile.uid), {
        pushToken: token,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn('Token senkronizasyonu başarısız:', err);
  }
}
