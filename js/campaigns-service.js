/**
 * Firestore kampanya servisi
 */

import {
  db,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from './firebase.js';

const COLLECTION = 'campaigns';

/**
 * Aktif kampanyaları getir (öğrenciler için)
 * @returns {Promise<Array>}
 */
export async function fetchActiveCampaigns() {
  const q = query(
    collection(db, COLLECTION),
    where('active', '==', true),
    orderBy('createdAt', 'desc')
  );

  try {
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    // Composite index yoksa veya orderBy sorun çıkarırsa fallback
    console.warn('Sıralı sorgu başarısız, fallback kullanılıyor:', err);
    const fallback = query(collection(db, COLLECTION), where('active', '==', true));
    const snap = await getDocs(fallback);
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return items.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });
  }
}

/**
 * Tüm kampanyaları getir (admin)
 * @returns {Promise<Array>}
 */
export async function fetchAllCampaigns() {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  try {
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Admin kampanya listesi fallback:', err);
    const snap = await getDocs(collection(db, COLLECTION));
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return items.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });
  }
}

/**
 * @param {object} data
 * @param {string} uid
 */
export async function createCampaign(data, uid) {
  const payload = {
    title: (data.title || '').trim(),
    description: (data.description || '').trim(),
    category: (data.category || '').trim(),
    type: (data.type || '').trim(),
    active: data.active !== false,
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (!payload.title) throw new Error('Kampanya başlığı gerekli.');
  if (!payload.category) throw new Error('Kategori gerekli.');

  const ref = await addDoc(collection(db, COLLECTION), payload);
  return ref.id;
}

/**
 * @param {string} id
 * @param {object} data
 */
export async function updateCampaign(id, data) {
  const payload = {
    title: (data.title || '').trim(),
    description: (data.description || '').trim(),
    category: (data.category || '').trim(),
    type: (data.type || '').trim(),
    active: Boolean(data.active),
    updatedAt: serverTimestamp(),
  };

  if (!payload.title) throw new Error('Kampanya başlığı gerekli.');
  await updateDoc(doc(db, COLLECTION, id), payload);
}

/**
 * @param {string} id
 */
export async function deleteCampaign(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}

/**
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getCampaign(id) {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Öğrenci istatistikleri (admin) — KVKK gereği yalnızca TOPLU sayılar döner,
 * tekil kayıt listelenmez.
 * @returns {Promise<{ total: number, pushEnabled: number, byCity: Map<string, number>, byUniversity: Map<string, number>, byFaculty: Map<string, number>, byDepartment: Map<string, number> }>}
 */
export async function fetchStudentStats() {
  const snap = await getDocs(collection(db, 'users'));
  const stats = {
    total: 0,
    pushEnabled: 0,
    byCity: new Map(),
    byUniversity: new Map(),
    byFaculty: new Map(),
    byDepartment: new Map(),
  };
  const inc = (map, key) => map.set(key, (map.get(key) || 0) + 1);

  snap.forEach((d) => {
    const u = d.data();
    stats.total += 1;
    if (u.pushEnabled) stats.pushEnabled += 1;
    if (u.cityId) inc(stats.byCity, u.cityId);
    if (u.universityId) inc(stats.byUniversity, u.universityId);
    if (u.facultyId) inc(stats.byFaculty, u.facultyId);
    if (u.facultyId && u.departmentId) inc(stats.byDepartment, `${u.facultyId}|${u.departmentId}`);
  });

  return stats;
}
