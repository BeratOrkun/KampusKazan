/**
 * Firebase app, Auth ve Firestore başlatma
 * Öğrenciler: Anonim Auth (e-posta / isim / şifre yok)
 * Admin: E-posta + şifre
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  deleteUser,
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

if (!isFirebaseConfigured()) {
  console.warn(
    '[KampüsKazan] Firebase yapılandırılmamış. js/firebase-config.js dosyasını doldurun. Bkz: FIREBASE_SETUP.md'
  );
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = 'tr';
const db = getFirestore(app);

export {
  app,
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
  updateDoc,
  collection,
  addDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
};
