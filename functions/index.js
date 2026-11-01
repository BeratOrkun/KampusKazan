/**
 * KazananÖğrenci — Bildirim topic senkronizasyonu (OPSİYONEL)
 *
 * Ne yapar?
 *   users/{uid} belgesi değiştiğinde öğrencinin FCM token'ını şu topic'lere
 *   abone eder / abonelikten çıkarır:
 *     all               → herkes
 *     city-<cityId>     → ör. city-ankara
 *     uni-<universityId>→ ör. uni-metu
 *
 *   Böylece Firebase Console → Messaging → "Topic" hedefiyle
 *   sadece Ankara'daki ya da sadece ODTÜ'deki öğrencilere bildirim atabilirsin.
 *
 * Gereksinim: Firebase Blaze (kullandıkça öde) planı. Ücretsiz kotalar bu iş
 * için fazlasıyla yeterli. Bu fonksiyonu deploy etmezsen de site çalışır;
 * Console'dan "tüm web kullanıcılarına" bildirim atabilirsin.
 *
 * Deploy:  cd functions && npm install && cd .. && firebase deploy --only functions
 */

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const { initializeApp } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

const OTHER_ID = 'diger';

/** js/catalog.js → topicsForProfile ile aynı mantık */
function topicsFor(data) {
  if (!data || !data.pushEnabled || !data.pushToken) return [];
  const topics = ['all'];
  if (data.cityId) topics.push(`city-${data.cityId}`);
  if (data.universityId && data.universityId !== OTHER_ID) topics.push(`uni-${data.universityId}`);
  return topics;
}

exports.syncPushTopics = onDocumentWritten('users/{uid}', async (event) => {
  const before = event.data?.before?.exists ? event.data.before.data() : null;
  const after = event.data?.after?.exists ? event.data.after.data() : null;

  const oldToken = before?.pushEnabled ? before.pushToken : null;
  const newToken = after?.pushEnabled ? after.pushToken : null;
  const oldTopics = topicsFor(before);
  const newTopics = topicsFor(after);

  const messaging = getMessaging();
  const jobs = [];

  // Token değiştiyse / bildirim kapandıysa / belge silindiyse eski token'ı tüm eski topic'lerden çıkar
  if (oldToken && oldToken !== newToken) {
    for (const t of oldTopics) jobs.push(messaging.unsubscribeFromTopic([oldToken], t));
  } else if (oldToken && newToken) {
    // Aynı token, değişen il/üniversite
    for (const t of oldTopics.filter((x) => !newTopics.includes(x))) {
      jobs.push(messaging.unsubscribeFromTopic([oldToken], t));
    }
  }

  if (newToken) {
    const toAdd = oldToken === newToken ? newTopics.filter((x) => !oldTopics.includes(x)) : newTopics;
    for (const t of toAdd) jobs.push(messaging.subscribeToTopic([newToken], t));
  }

  const results = await Promise.allSettled(jobs);
  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length) {
    logger.warn('Bazı topic işlemleri başarısız', { uid: event.params.uid, count: failed.length });
  }
});
