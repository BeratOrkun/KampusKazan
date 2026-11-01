/**
 * Öğrenci profili (Cihaz Kimliği + Yerel Depolama + Firebase Anonim Oturum & Firestore)
 *
 * KVKK — veri minimizasyonu:
 *  - Öğrenciden e-posta, ad-soyad, telefon, öğrenci no, şifre ALINMAZ.
 *  - Cihaza özel kalıcı kimlik (deviceId) ve Firebase Anonymous Auth (uid) kullanılır.
 *  - Seçilen il, üniversite, fakülte ve bölüm bilgileri hem kullanıcının cihazına
 *    (localStorage + Çerez + IndexedDB) hem de Firestore users/{uid} belgesine kaydedilir.
 *  - Böylece kullanıcı siteye/PWA'ya yalnızca hayatında ilk kez girdiğinde seçim yapar;
 *    sonraki girişlerde doğrudan kampanya ekranı açılır.
 */

import {
  auth,
  db,
  isFirebaseConfigured,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  deleteUser,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from './firebase.js';
import { isValidSelection } from './catalog.js';

/** Aydınlatma metni sürümü — kvkk.html'i değiştirdiğinde artır. */
export const NOTICE_VERSION = '2026-11';

const DEVICE_ID_KEY = 'ko_device_id';
const LOCAL_PROFILE_KEY = 'ko_student_profile_v1';
const IDB_NAME = 'ko_device_store';
const IDB_STORE = 'kv';

/**
 * @typedef {{
 *   uid: string,
 *   deviceId?: string,
 *   cityId: string,
 *   universityId: string,
 *   facultyId: string,
 *   departmentId: string,
 *   noticeVersion?: string,
 *   pushEnabled?: boolean,
 *   pushToken?: string,
 * }} StudentProfile
 */

// =========================================================
// CİHAZ KİMLİĞİ & ÇOK KATMANLI YEREL DEPOLAMA (Local + Cookie + IndexedDB)
// =========================================================

function getCookie(name) {
  try {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&') + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function setCookie(name, value, days = 400) {
  try {
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    // ignore cookie errors
  }
}

function removeCookie(name) {
  try {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  } catch {
    // ignore
  }
}

function openIdb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('No IndexedDB'));
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const dbRef = req.result;
      if (!dbRef.objectStoreNames.contains(IDB_STORE)) {
        dbRef.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  try {
    const dbRef = await openIdb();
    return await new Promise((resolve) => {
      const tx = dbRef.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbSet(key, val) {
  try {
    const dbRef = await openIdb();
    await new Promise((resolve) => {
      const tx = dbRef.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(val, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    // ignore
  }
}

async function idbDelete(key) {
  try {
    const dbRef = await openIdb();
    await new Promise((resolve) => {
      const tx = dbRef.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    // ignore
  }
}

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return 'dev-' + crypto.randomUUID();
  }
  return (
    'dev-' +
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    })
  );
}

/**
 * Kullanıcının cihazına özel kalıcı kimliği döndürür (yoksa oluşturur ve kaydeder).
 */
export function getDeviceId() {
  let id = null;
  try {
    id = localStorage.getItem(DEVICE_ID_KEY);
  } catch {
    // ignore
  }
  if (!id) {
    id = getCookie(DEVICE_ID_KEY);
  }
  if (!id || typeof id !== 'string' || id.length < 8) {
    id = generateUUID();
  }
  try {
    localStorage.setItem(DEVICE_ID_KEY, id);
  } catch {
    // ignore
  }
  setCookie(DEVICE_ID_KEY, id, 400);
  idbSet(DEVICE_ID_KEY, id);
  return id;
}

/**
 * Cihazda kayıtlı yerel profili senkron olarak okur (0ms gecikme).
 * @returns {StudentProfile | null}
 */
export function getLocalProfile() {
  let raw = null;
  try {
    raw = localStorage.getItem(LOCAL_PROFILE_KEY);
  } catch {
    // ignore
  }
  if (!raw) {
    raw = getCookie(LOCAL_PROFILE_KEY);
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && isValidSelection(parsed)) {
      return {
        uid: parsed.uid || getDeviceId(),
        deviceId: parsed.deviceId || getDeviceId(),
        cityId: parsed.cityId,
        universityId: parsed.universityId,
        facultyId: parsed.facultyId,
        departmentId: parsed.departmentId,
        noticeVersion: parsed.noticeVersion || NOTICE_VERSION,
        pushEnabled: Boolean(parsed.pushEnabled),
        ...(parsed.pushToken ? { pushToken: parsed.pushToken } : {}),
      };
    }
  } catch {
    // ignore corrupted JSON
  }
  return null;
}

/**
 * Öğrenci profilini cihazın tüm yerel katmanlarına (localStorage + Cookie + IndexedDB) kaydeder.
 * @param {Partial<StudentProfile>} profile
 * @returns {StudentProfile}
 */
export function saveLocalProfile(profile) {
  const deviceId = profile.deviceId || getDeviceId();
  const normalized = {
    uid: profile.uid || deviceId,
    deviceId,
    cityId: profile.cityId,
    universityId: profile.universityId,
    facultyId: profile.facultyId,
    departmentId: profile.departmentId,
    noticeVersion: profile.noticeVersion || NOTICE_VERSION,
    pushEnabled: Boolean(profile.pushEnabled),
    ...(profile.pushToken ? { pushToken: profile.pushToken } : {}),
    savedAt: Date.now(),
  };
  const json = JSON.stringify(normalized);
  try {
    localStorage.setItem(LOCAL_PROFILE_KEY, json);
  } catch {
    // ignore
  }
  setCookie(LOCAL_PROFILE_KEY, json, 400);
  idbSet(LOCAL_PROFILE_KEY, normalized);
  return normalized;
}

export function clearLocalProfile() {
  try {
    localStorage.removeItem(LOCAL_PROFILE_KEY);
  } catch {
    // ignore
  }
  removeCookie(LOCAL_PROFILE_KEY);
  idbDelete(LOCAL_PROFILE_KEY);
}

// =========================================================
// FIREBASE AUTH & FIRESTORE SENKRONİZASYONU
// =========================================================

/** @type {import('firebase/auth').User | null} */
let currentUser = null;
/** @type {StudentProfile | null} */
let currentProfile = getLocalProfile();
let currentIsAdmin = false;
let refreshSeq = 0;

/** @type {Array<(user: any, profile: StudentProfile | null, admin: boolean) => void>} */
const listeners = [];

export function onAuthChange(cb) {
  listeners.push(cb);
  cb(currentUser, currentProfile, currentIsAdmin);
  return () => {
    const i = listeners.indexOf(cb);
    if (i >= 0) listeners.splice(i, 1);
  };
}

function notify() {
  listeners.forEach((cb) => cb(currentUser, currentProfile, currentIsAdmin));
}

/** @param {string} uid */
export async function fetchProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return /** @type {StudentProfile} */ ({ uid, ...snap.data() });
}

/** @param {string} uid */
async function checkAdmin(uid) {
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch {
    return false;
  }
}

/**
 * Firestore'a profil belgesini yazar.
 * Eğer sunucudaki eski firestore.rules henüz deviceId alanını tanımıyorsa otomatik olarak deviceId'siz yazar.
 */
async function writeProfileToFirestore(uid, payload) {
  const ref = doc(db, 'users', uid);
  try {
    await setDoc(ref, payload, { merge: true });
  } catch (err) {
    if (err?.code === 'permission-denied' && 'deviceId' in payload) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.deviceId;
      await setDoc(ref, fallbackPayload, { merge: true });
    } else {
      throw err;
    }
  }
}

/**
 * Kullanıcı durumunu yerel depo ve Firestore ile senkronize eder.
 * @param {any} user
 */
async function refresh(user) {
  const seq = ++refreshSeq;
  let localProf = getLocalProfile();
  if (!localProf) {
    const idbProf = await idbGet(LOCAL_PROFILE_KEY);
    if (idbProf && isValidSelection(idbProf)) {
      localProf = saveLocalProfile(idbProf);
    }
  }

  let remoteProfile = null;
  let admin = false;

  if (user && isFirebaseConfigured()) {
    try {
      [remoteProfile, admin] = await Promise.all([
        fetchProfile(user.uid),
        user.isAnonymous ? Promise.resolve(false) : checkAdmin(user.uid),
      ]);
    } catch (err) {
      console.warn('Firestore profil okuma uyarısı (yerel profil kullanılacak):', err);
    }

    // Cihazda yerel profil var ama Firestore'da henüz yoksa arka planda Firestore'a yaz
    if (!remoteProfile && localProf && isValidSelection(localProf)) {
      try {
        const deviceId = getDeviceId();
        await writeProfileToFirestore(user.uid, {
          cityId: localProf.cityId,
          universityId: localProf.universityId,
          facultyId: localProf.facultyId,
          departmentId: localProf.departmentId,
          deviceId,
          noticeVersion: NOTICE_VERSION,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        remoteProfile = {
          ...localProf,
          uid: user.uid,
          deviceId,
        };
      } catch (syncErr) {
        console.warn('Yerel profil Firestore’a senkronize edilemedi:', syncErr);
      }
    }
  }

  if (seq !== refreshSeq) return;
  currentUser = user;
  currentIsAdmin = admin;

  if (remoteProfile && isValidSelection(remoteProfile)) {
    currentProfile = saveLocalProfile({
      ...localProf,
      ...remoteProfile,
      uid: user?.uid || remoteProfile.uid || getDeviceId(),
      deviceId: getDeviceId(),
    });
  } else if (localProf && isValidSelection(localProf)) {
    currentProfile = saveLocalProfile({
      ...localProf,
      uid: user?.uid || localProf.uid || getDeviceId(),
      deviceId: getDeviceId(),
    });
  } else {
    currentProfile = null;
  }

  notify();
}

/**
 * Öğrenci profilini hem kullanıcının cihazına (anında) hem de Firebase'e kaydeder.
 * Oturum yoksa önce anonim oturum açılır.
 * @param {{ cityId: string, universityId: string, facultyId: string, departmentId: string }} selection
 */
export async function saveProfile(selection) {
  if (!isValidSelection(selection)) {
    throw new Error('Lütfen il, üniversite, fakülte ve bölüm seçimlerini tamamla.');
  }

  const deviceId = getDeviceId();

  // 1. Önce kullanıcının cihazına anında kaydet (Böylece bir daha asla sormaz)
  currentProfile = saveLocalProfile({
    ...(currentProfile || {}),
    uid: auth?.currentUser?.uid || currentProfile?.uid || deviceId,
    deviceId,
    cityId: selection.cityId,
    universityId: selection.universityId,
    facultyId: selection.facultyId,
    departmentId: selection.departmentId,
    noticeVersion: NOTICE_VERSION,
  });
  notify();

  // 2. Firebase yapılandırılmışsa anonim kimlik oluştur ve Firestore'a kaydet
  if (isFirebaseConfigured()) {
    try {
      let user = auth.currentUser;
      if (!user) {
        const cred = await signInAnonymously(auth);
        user = cred.user;
      }

      const isNew = !currentProfile || currentProfile.uid !== user.uid;
      /** @type {Record<string, any>} */
      const data = {
        cityId: selection.cityId,
        universityId: selection.universityId,
        facultyId: selection.facultyId,
        departmentId: selection.departmentId,
        deviceId,
        noticeVersion: NOTICE_VERSION,
        updatedAt: serverTimestamp(),
      };
      if (isNew) data.createdAt = serverTimestamp();

      await writeProfileToFirestore(user.uid, data);
      currentProfile = saveLocalProfile({
        ...currentProfile,
        uid: user.uid,
        deviceId,
      });
      await refresh(user);
    } catch (err) {
      console.warn('Firebase kaydı sırasında uyarı (cihaz kaydı tamamlandı):', err);
    }
  }

  return currentProfile;
}

/**
 * KVKK m.11 — silme hakkı: hem cihazdaki yerel kaydı hem de Firestore belgesini ve anonim hesabı siler.
 */
export async function deleteMyData() {
  clearLocalProfile();
  currentProfile = null;

  if (isFirebaseConfigured() && auth) {
    const user = auth.currentUser;
    if (user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid));
      } catch (err) {
        console.warn('Firestore profil silme uyarısı:', err);
      }

      if (user.isAnonymous) {
        try {
          await deleteUser(user);
        } catch (err) {
          console.warn('Anonim hesap silinemedi, oturum kapatılıyor:', err);
          await signOut(auth);
        }
      } else {
        await signOut(auth);
      }
    }
  }

  await refresh(null);
}

/** Yalnızca admin girişi için (e-posta + şifre). */
export async function loginAdmin({ email, password }) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase henüz yapılandırılmamış.');
  }
  const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  await refresh(cred.user);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

export function getCurrentUser() {
  return currentUser;
}

export function getCurrentProfile() {
  return currentProfile || getLocalProfile();
}

export function isAdmin() {
  return currentIsAdmin;
}

/**
 * Auth durum dinleyicisini başlatır.
 * Cihazda yerel profil varsa ama Firebase anonim oturumu henüz açılmamışsa otomatik oturum açıp senkronize eder.
 */
export function initAuth() {
  getDeviceId();
  if (!isFirebaseConfigured() || !auth) {
    return Promise.resolve({ user: null, profile: getCurrentProfile() });
  }

  return new Promise((resolve) => {
    let first = true;
    onAuthStateChanged(auth, async (user) => {
      if (!user && getLocalProfile()) {
        try {
          const cred = await signInAnonymously(auth);
          user = cred.user;
        } catch (err) {
          console.warn('Anonim oturum başlatılamadı:', err);
        }
      }
      await refresh(user);
      if (first) {
        first = false;
        resolve({ user: currentUser, profile: currentProfile });
      }
    });
  });
}

/** Tek kullanıcı profilini güncel tutmak için dışarıdan tetiklenebilir. */
export async function reloadProfile() {
  if (isFirebaseConfigured() && auth) {
    await refresh(auth.currentUser);
  }
  return getCurrentProfile();
}

export function mapAuthError(error) {
  const code = error?.code || '';
  const map = {
    'auth/invalid-email': 'Geçersiz e-posta adresi.',
    'auth/user-not-found': 'E-posta veya şifre hatalı.',
    'auth/wrong-password': 'E-posta veya şifre hatalı.',
    'auth/invalid-credential': 'E-posta veya şifre hatalı.',
    'auth/too-many-requests': 'Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.',
    'auth/network-request-failed': 'Ağ hatası. İnternet bağlantınızı kontrol edin.',
    'auth/operation-not-allowed':
      'Bu giriş yöntemi Firebase Console’da kapalı. Authentication → Sign-in method bölümünden Anonymous ve Email/Password’ü etkinleştirin.',
    'auth/admin-restricted-operation':
      'Anonim giriş kapalı. Firebase Console → Authentication → Sign-in method → Anonymous’u etkinleştirin.',
    'permission-denied': 'Bu işlem için yetkin yok.',
  };
  return map[code] || error?.message || 'Bir hata oluştu.';
}
