/**
 * Firebase yapılandırması — proje: kazananogren
 *
 * İsteğe bağlı: window.__FIREBASE_CONFIG__ ile runtime override
 * Bkz: FIREBASE_SETUP.md
 *
 * KVKK notu: Google Analytics (measurementId) bilerek kaldırıldı.
 * Analytics eklemek ek kişisel veri (cihaz/kullanım verisi) işlemek ve
 * çerez onayı almak anlamına gelir.
 *
 * ÖNEMLİ: Bu değerler sw.js içinde de tekrarlanır (service worker ES modül
 * import edemez). Değiştirirsen sw.js'yi de güncelle.
 */

/** @type {{ apiKey: string, authDomain: string, projectId: string, storageBucket: string, messagingSenderId: string, appId: string }} */
const defaultConfig = {
  apiKey: 'AIzaSyB9hECSbRt7Q2Hg4SV60WQyZJtlIsyXP3c',
  authDomain: 'kazananogren.firebaseapp.com',
  projectId: 'kazananogren',
  storageBucket: 'kazananogren.firebasestorage.app',
  messagingSenderId: '1056463692907',
  appId: '1:1056463692907:web:bc8ccb5cab210ac0367d2e',
};

/** @type {typeof defaultConfig} */
export const firebaseConfig = {
  ...defaultConfig,
  ...(typeof window !== 'undefined' && window.__FIREBASE_CONFIG__
    ? window.__FIREBASE_CONFIG__
    : {}),
};

/**
 * Web Push sertifikası (VAPID public key)
 * Firebase Console → Project settings → Cloud Messaging → Web Push certificates
 * → "Generate key pair" → çıkan "Key pair" değerini buraya yapıştır.
 */
export const VAPID_KEY = 'YOUR_VAPID_PUBLIC_KEY';

export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.apiKey !== 'YOUR_API_KEY' &&
      firebaseConfig.projectId &&
      firebaseConfig.projectId !== 'YOUR_PROJECT_ID'
  );
}

export function isPushConfigured() {
  return Boolean(VAPID_KEY && VAPID_KEY !== 'YOUR_VAPID_PUBLIC_KEY');
}
