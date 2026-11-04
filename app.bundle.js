/**
 * KazananÖğrenci — Tek Dosya Uygulama Paketi (app.bundle.js)
 * Hem doğrudan dosya olarak (file://) hem de web sunucusu / PWA (http://, https://) üzerinde CORS hatası olmadan çalışır.
 */
(function () {
  'use strict';

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
const firebaseConfig = Object.freeze({ ...defaultConfig });

/**
 * Web Push sertifikası (VAPID public key)
 * Firebase Console → Project settings → Cloud Messaging → Web Push certificates
 * → "Generate key pair" → çıkan "Key pair" değerini buraya yapıştır.
 */
const VAPID_KEY = 'YOUR_VAPID_PUBLIC_KEY';
function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.apiKey !== 'YOUR_API_KEY' &&
      firebaseConfig.projectId &&
      firebaseConfig.projectId !== 'YOUR_PROJECT_ID'
  );
}
function isPushConfigured() {
  return Boolean(VAPID_KEY && VAPID_KEY !== 'YOUR_VAPID_PUBLIC_KEY');
}


// =========================================================
// FIREBASE SDK LAZY LOADER (Works on both http/https and file://)
// =========================================================
let app = null;
let auth = null;
let db = null;
let onAuthStateChanged = null;
let signInAnonymously = null;
let signInWithEmailAndPassword = null;
let signOut = null;
let deleteUser = null;
let doc = null;
let getDoc = null;
let setDoc = null;
let updateDoc = null;
let collection = null;
let addDoc = null;
let deleteDoc = null;
let deleteField = null;
let query = null;
let where = null;
let orderBy = null;
let getDocs = null;
let serverTimestamp = null;

let _fbReadyPromise = null;

function ensureFirebaseSdk() {
  if (_fbReadyPromise) return _fbReadyPromise;
  if (!isFirebaseConfigured()) return Promise.resolve(false);
  _fbReadyPromise = Promise.all([
    import('https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js'),
  ])
    .then(([appMod, authMod, fsMod]) => {
      app = appMod.initializeApp(firebaseConfig);
      auth = authMod.getAuth(app);
      auth.languageCode = 'tr';
      db = fsMod.getFirestore(app);

      onAuthStateChanged = authMod.onAuthStateChanged;
      signInAnonymously = authMod.signInAnonymously;
      signInWithEmailAndPassword = authMod.signInWithEmailAndPassword;
      signOut = authMod.signOut;
      deleteUser = authMod.deleteUser;

      doc = fsMod.doc;
      getDoc = fsMod.getDoc;
      setDoc = fsMod.setDoc;
      updateDoc = fsMod.updateDoc;
      collection = fsMod.collection;
      addDoc = fsMod.addDoc;
      deleteDoc = fsMod.deleteDoc;
      deleteField = fsMod.deleteField;
      query = fsMod.query;
      where = fsMod.where;
      orderBy = fsMod.orderBy;
      getDocs = fsMod.getDocs;
      serverTimestamp = fsMod.serverTimestamp;
      return true;
    })
    .catch((err) => {
      console.warn('[KazananÖğrenci] Firebase SDK yüklenemedi (yerel mod aktif):', err);
      return false;
    });
  return _fbReadyPromise;
}


/**
 * YÖK Üniversite – Fakülte – Bölüm Kataloğu (universite_bolum_fakulte.json kaynağından üretilmiştir)
 * 83 bölge/il, 228 üniversite, 1039 fakülte/MYO, 635 bölüm
 */
const CITIES = [{"id":"adana","name":"Adana"},{"id":"adiyaman","name":"Adıyaman"},{"id":"afyonkarahisar","name":"Afyonkarahisar"},{"id":"agri","name":"Ağrı"},{"id":"aksaray","name":"Aksaray"},{"id":"amasya","name":"Amasya"},{"id":"ankara","name":"Ankara"},{"id":"antalya","name":"Antalya"},{"id":"ardahan","name":"Ardahan"},{"id":"artvin","name":"Artvin"},{"id":"aydin","name":"Aydın"},{"id":"balikesir","name":"Balıkesir"},{"id":"bartin","name":"Bartın"},{"id":"batman","name":"Batman"},{"id":"bayburt","name":"Bayburt"},{"id":"bilecik","name":"Bilecik"},{"id":"bingol","name":"Bingöl"},{"id":"bitlis","name":"Bitlis"},{"id":"bolu","name":"Bolu"},{"id":"burdur","name":"Burdur"},{"id":"bursa","name":"Bursa"},{"id":"canakkale","name":"Çanakkale"},{"id":"cankiri","name":"Çankırı"},{"id":"corum","name":"Çorum"},{"id":"denizli","name":"Denizli"},{"id":"diyarbakir","name":"Diyarbakır"},{"id":"duzce","name":"Düzce"},{"id":"edirne","name":"Edirne"},{"id":"elazig","name":"Elazığ"},{"id":"erzincan","name":"Erzincan"},{"id":"erzurum","name":"Erzurum"},{"id":"eskisehir","name":"Eskişehir"},{"id":"gaziantep","name":"Gaziantep"},{"id":"giresun","name":"Giresun"},{"id":"gumushane","name":"Gümüşhane"},{"id":"hakkari","name":"Hakkari"},{"id":"hatay","name":"Hatay"},{"id":"igdir","name":"Iğdır"},{"id":"isparta","name":"Isparta"},{"id":"istanbul","name":"İstanbul"},{"id":"izmir","name":"İzmir"},{"id":"kahramanmaras","name":"Kahramanmaraş"},{"id":"karabuk","name":"Karabük"},{"id":"karaman","name":"Karaman"},{"id":"kars","name":"Kars"},{"id":"kastamonu","name":"Kastamonu"},{"id":"kayseri","name":"Kayseri"},{"id":"kirikkale","name":"Kırıkkale"},{"id":"kirklareli","name":"Kırklareli"},{"id":"kirsehir","name":"Kırşehir"},{"id":"kilis","name":"Kilis"},{"id":"kocaeli","name":"Kocaeli"},{"id":"konya","name":"Konya"},{"id":"kutahya","name":"Kütahya"},{"id":"malatya","name":"Malatya"},{"id":"manisa","name":"Manisa"},{"id":"mardin","name":"Mardin"},{"id":"mersin","name":"Mersin"},{"id":"mugla","name":"Muğla"},{"id":"mus","name":"Muş"},{"id":"nevsehir","name":"Nevşehir"},{"id":"nigde","name":"Niğde"},{"id":"ordu","name":"Ordu"},{"id":"osmaniye","name":"Osmaniye"},{"id":"rize","name":"Rize"},{"id":"sakarya","name":"Sakarya"},{"id":"samsun","name":"Samsun"},{"id":"siirt","name":"Siirt"},{"id":"sinop","name":"Sinop"},{"id":"sivas","name":"Sivas"},{"id":"sanliurfa","name":"Şanlıurfa"},{"id":"sirnak","name":"Şırnak"},{"id":"tekirdag","name":"Tekirdağ"},{"id":"tokat","name":"Tokat"},{"id":"trabzon","name":"Trabzon"},{"id":"tunceli","name":"Tunceli"},{"id":"usak","name":"Uşak"},{"id":"van","name":"Van"},{"id":"yalova","name":"Yalova"},{"id":"yozgat","name":"Yozgat"},{"id":"zonguldak","name":"Zonguldak"},{"id":"kktc","name":"KKTC (Kuzey Kıbrıs)"},{"id":"yurt-disi","name":"Yurt Dışı"}];
const FACULTIES = [["abana-sabahat-mesut-yilmaz-meslek-yuksekokulu","Abana Sabahat Mesut Yılmaz Meslek Yüksekokulu"],["abdi-sutcu-saglik-hizmetleri-meslek-yuksekokulu","Abdi Sütcü Sağlık Hizmetleri Meslek Yüksekokulu"],["acigol-teknik-bilimler-meslek-yuksekokulu","Acıgöl Teknik Bilimler Meslek Yüksekokulu"],["acipayam-meslek-yuksekokulu","Acıpayam Meslek Yüksekokulu"],["acik-ve-uzaktan-egitim-fakultesi","Açık ve Uzaktan Eğitim Fakültesi"],["acik-ve-uzaktan-ogretim-fakultesi","Açık ve Uzaktan Öğretim Fakültesi"],["acikogretim-fakultesi","Açıköğretim Fakültesi"],["adana-meslek-yuksekokulu","Adana Meslek Yüksekokulu"],["adana-organize-sanayi-bolgesi-teknik-bilimler-meslek-yuksekokulu","Adana Organize Sanayi Bölgesi Teknik Bilimler Meslek Yüksekokulu"],["adana-saglik-hizmetleri-meslek-yuksekokulu","Adana Sağlık Hizmetleri Meslek Yüksekokulu"],["adana-tip-fakultesi","Adana Tıp Fakültesi"],["adapazari-meslek-yuksekokulu","Adapazarı Meslek Yüksekokulu"],["adilcevaz-meslek-yuksekokulu","Adilcevaz Meslek Yüksekokulu"],["afsin-meslek-yuksekokulu","Afşin Meslek Yüksekokulu"],["afsin-saglik-yuksekokulu","Afşin Sağlık Yüksekokulu"],["afyon-meslek-yuksekokulu","Afyon Meslek Yüksekokulu"],["aglasun-meslek-yuksekokulu","Ağlasun Meslek Yüksekokulu"],["ahlat-meslek-yuksekokulu","Ahlat Meslek Yüksekokulu"],["ahmet-erdogan-saglik-hizmetleri-meslek-yuksekokulu","Ahmet Erdoğan Sağlık Hizmetleri Meslek Yüksekokulu"],["ahmet-kelesoglu-dis-hekimligi-fakultesi","Ahmet Keleşoğlu Diş Hekimliği Fakültesi"],["ahmet-kelesoglu-egitim-fakultesi","Ahmet Keleşoğlu Eğitim Fakültesi"],["ahmet-kelesoglu-ilahiyat-fakultesi","Ahmet Keleşoğlu İlahiyat Fakültesi"],["ahmetli-meslek-yuksekokulu","Ahmetli Meslek Yüksekokulu"],["airbus-tusas-havacilik-meslek-yuksekokulu","Airbus-TUSAŞ Havacılık Meslek Yüksekokulu"],["akcadag-meslek-yuksekokulu","Akçadağ Meslek Yüksekokulu"],["akcakale-meslek-yuksekokulu","Akçakale Meslek Yüksekokulu"],["akcakoca-bey-siyasal-bilgiler-fakultesi","Akçakoca Bey Siyasal Bilgiler Fakültesi"],["akcakoca-meslek-yuksekokulu","Akçakoca Meslek Yüksekokulu"],["akdagmadeni-meslek-yuksekokulu","Akdağmadeni Meslek Yüksekokulu"],["akdagmadeni-saglik-yuksekokulu","Akdağmadeni Sağlık Yüksekokulu"],["akhisar-meslek-yuksekokulu","Akhisar Meslek Yüksekokulu"],["akkus-meslek-yuksekokulu","Akkuş Meslek Yüksekokulu"],["akoren-ali-riza-ercan-meslek-yuksekokulu","Akören Ali Rıza Ercan Meslek Yüksekokulu"],["aksaray-sosyal-bilimler-meslek-yuksekokulu","Aksaray Sosyal Bilimler Meslek Yüksekokulu"],["aksaray-teknik-bilimler-meslek-yuksekokulu","Aksaray Teknik Bilimler Meslek Yüksekokulu"],["akseki-meslek-yuksekokulu","Akseki Meslek Yüksekokulu"],["aksu-mehmet-sureyya-demiraslan-meslek-yuksekokulu","Aksu Mehmet Süreyya Demiraslan Meslek Yüksekokulu"],["aksehir-iktisadi-ve-idari-bilimler-fakultesi","Akşehir İktisadi ve İdari Bilimler Fakültesi"],["aksehir-kadir-yallagoz-saglik-yuksekokulu","Akşehir Kadir Yallagöz Sağlık Yüksekokulu"],["aksehir-meslek-yuksekokulu","Akşehir Meslek Yüksekokulu"],["aksehir-muhendislik-ve-mimarlik-fakultesi","Akşehir Mühendislik ve Mimarlık Fakültesi"],["akyazi-saglik-hizmetleri-meslek-yuksekokulu","Akyazı Sağlık Hizmetleri Meslek Yüksekokulu"],["akyurt-meslek-yuksekokulu","Akyurt Meslek Yüksekokulu"],["alaca-avni-celik-meslek-yuksekokulu","Alaca Avni Çelik Meslek Yüksekokulu"],["alacam-meslek-yuksekokulu","Alaçam Meslek Yüksekokulu"],["aladag-meslek-yuksekokulu","Aladağ Meslek Yüksekokulu"],["alanya-ticaret-ve-sanayi-odasi-meslek-yuksekokulu","Alanya Ticaret ve Sanayi Odası Meslek Yüksekokulu"],["alanya-ticaret-ve-sanayi-odasi-turizm-meslek-yuksekokulu","Alanya Ticaret ve Sanayi Odası Turizm Meslek Yüksekokulu"],["alapli-meslek-yuksekokulu","Alaplı Meslek Yüksekokulu"],["alasehir-meslek-yuksekokulu","Alaşehir Meslek Yüksekokulu"],["ali-cavit-celebioglu-sivil-havacilik-yuksekokulu","Ali Cavit Çelebioğlu Sivil Havacılık Yüksekokulu"],["ali-fuad-basgil-hukuk-fakultesi-carsamba","Ali Fuad Başgil Hukuk Fakültesi (Çarşamba)"],["ali-riza-veziroglu-meslek-yuksekokulu","Ali Rıza Veziroğlu Meslek Yüksekokulu"],["aliaga-meslek-yuksekokulu","Aliağa Meslek Yüksekokulu"],["almus-meslek-yuksekokulu","Almus Meslek Yüksekokulu"],["altinoluk-meslek-yuksekokulu","Altınoluk Meslek Yüksekokulu"],["altinova-meslek-yuksekokulu","Altınova Meslek Yüksekokulu"],["altinozu-tarim-bilimleri-meslek-yuksekokulu","Altınözü Tarım Bilimleri Meslek Yüksekokulu"],["altintas-meslek-yuksekokulu","Altıntaş Meslek Yüksekokulu"],["altinyayla-mehmet-tugrul-guvenlik-hizmetleri-meslek-yuksekokulu","Altınyayla Mehmet Tuğrul Güvenlik Hizmetleri Meslek Yüksekokulu"],["alucra-turan-bulutcu-meslek-yuksekokulu","Alucra Turan Bulutçu Meslek Yüksekokulu"],["amasya-sosyal-bilimler-meslek-yuksekokulu","Amasya Sosyal Bilimler Meslek Yüksekokulu"],["amasya-teknik-bilimler-meslek-yuksekokulu","Amasya Teknik Bilimler Meslek Yüksekokulu"],["anadolu-bil-meslek-yuksekokulu","Anadolu Bil Meslek Yüksekokulu"],["anadolu-osb-meslek-yuksekokulu","Anadolu Osb Meslek Yüksekokulu"],["anamur-meslek-yuksekokulu","Anamur Meslek Yüksekokulu"],["anamur-uygulamali-teknoloji-ve-isletmecilik-yuksekokulu","Anamur Uygulamalı Teknoloji ve İşletmecilik Yüksekokulu"],["andirin-meslek-yuksekokulu","Andırın Meslek Yüksekokulu"],["ankara-havacilik-meslek-yuksekokulu","Ankara Havacılık Meslek Yüksekokulu"],["antakya-meslek-yuksekokulu","Antakya Meslek Yüksekokulu"],["araban-meslek-yuksekokulu","Araban Meslek Yüksekokulu"],["arac-rafet-vergili-meslek-yuksekokulu","Araç Rafet Vergili Meslek Yüksekokulu"],["arakli-ali-cevat-ozyurt-meslek-yuksekokulu","Araklı Ali Cevat Özyurt Meslek Yüksekokulu"],["arapgir-meslek-yuksekokulu","Arapgir Meslek Yüksekokulu"],["arda-meslek-yuksekokulu","Arda Meslek Yüksekokulu"],["ardesen-meslek-yuksekokulu","Ardeşen Meslek Yüksekokulu"],["ardesen-turizm-fakultesi","Ardeşen Turizm Fakültesi"],["arhavi-meslek-yuksekokulu","Arhavi Meslek Yüksekokulu"],["arifiye-meslek-yuksekokulu","Arifiye Meslek Yüksekokulu"],["armutlu-meslek-yuksekokulu","Armutlu Meslek Yüksekokulu"],["arnavutkoy-darulaceze-saglik-hizmetleri-meslek-yuksekokulu","Arnavutköy Darülaceze Sağlık Hizmetleri Meslek Yüksekokulu"],["arsin-meslek-yuksekokulu","Arsin Meslek Yüksekokulu"],["artova-meslek-yuksekokulu","Artova Meslek Yüksekokulu"],["artvin-meslek-yuksekokulu","Artvin Meslek Yüksekokulu"],["asbu-kuzey-kibris-yerleskesi-kktc-lefkosa","ASBÜ-Kuzey Kıbrıs Yerleşkesi (KKTC-Lefkoşa)"],["askale-meslek-yuksekokulu","Aşkale Meslek Yüksekokulu"],["atabey-meslek-yuksekokulu","Atabey Meslek Yüksekokulu"],["atasehir-adiguzel-meslek-yuksekokulu","Ataşehir Adıgüzel Meslek Yüksekokulu"],["ataturk-egitim-fakultesi","Atatürk Eğitim Fakültesi"],["ataturk-saglik-bilimleri-fakultesi","Atatürk Sağlık Bilimleri Fakültesi"],["ataturk-saglik-hizmetleri-meslek-yuksekokulu","Atatürk Sağlık Hizmetleri Meslek Yüksekokulu"],["atayalvac-saglik-hizmetleri-meslek-yuksekokulu","Atayalvaç Sağlık Hizmetleri Meslek Yüksekokulu"],["atca-meslek-yuksekokulu","Atça Meslek Yüksekokulu"],["atilim-meslek-yuksekokulu","Atılım Meslek Yüksekokulu"],["avanos-guzel-sanatlar-meslek-yuksekokulu","Avanos Güzel Sanatlar Meslek Yüksekokulu"],["avrupa-meslek-yuksekokulu","Avrupa Meslek Yüksekokulu"],["ayancik-meslek-yuksekokulu","Ayancık Meslek Yüksekokulu"],["ayas-meslek-yuksekokulu","Ayaş Meslek Yüksekokulu"],["aybasti-meslek-yuksekokulu","Aybastı Meslek Yüksekokulu"],["aydin-meslek-yuksekokulu","Aydın Meslek Yüksekokulu"],["aydin-saglik-hizmetleri-meslek-yuksekokulu","Aydın Sağlık Hizmetleri Meslek Yüksekokulu"],["aydincik-meslek-yuksekokulu-anamur","Aydıncık Meslek Yüksekokulu (Anamur)"],["aydintepe-meslek-yuksekokulu","Aydıntepe Meslek Yüksekokulu"],["ayvacik-meslek-yuksekokulu","Ayvacık Meslek Yüksekokulu"],["ayvalik-meslek-yuksekokulu","Ayvalık Meslek Yüksekokulu"],["1-organize-sanayi-bolgesi-meslek-yuksekokulu","1. Organize Sanayi Bölgesi Meslek Yüksekokulu"],["babaeski-meslek-yuksekokulu","Babaeski Meslek Yüksekokulu"],["bafra-meslek-yuksekokulu","Bafra Meslek Yüksekokulu"],["bafra-turizm-meslek-yuksekokulu","Bafra Turizm Meslek Yüksekokulu"],["bahce-meslek-yuksekokulu","Bahçe Meslek Yüksekokulu"],["bala-meslek-yuksekokulu","Bala Meslek Yüksekokulu"],["balikesir-meslek-yuksekokulu","Balıkesir Meslek Yüksekokulu"],["banaz-meslek-yuksekokulu","Banaz Meslek Yüksekokulu"],["bandirma-meslek-yuksekokulu","Bandırma Meslek Yüksekokulu"],["barbaros-denizcilik-meslek-yuksekokulu","Barbaros Denizcilik Meslek Yüksekokulu"],["barbaros-hayrettin-gemi-insaati-ve-denizcilik-fakultesi","Barbaros Hayrettin Gemi İnşaatı ve Denizcilik Fakültesi"],["bartin-meslek-yuksekokulu","Bartın Meslek Yüksekokulu"],["bartin-organize-sanayi-bolgesi-meslek-yuksekokulu","Bartın Organize Sanayi Bölgesi Meslek Yüksekokulu"],["bartin-orman-fakultesi","Bartın Orman Fakültesi"],["bartin-saglik-hizmetleri-meslek-yuksekokulu","Bartın Sağlık Hizmetleri Meslek Yüksekokulu"],["baskil-meslek-yuksekokulu","Baskil Meslek Yüksekokulu"],["baskale-meslek-yuksekokulu","Başkale Meslek Yüksekokulu"],["baskent-organize-sanayi-bolgesi-teknik-bilimler-meslek-yuksekokulu","Başkent Organize Sanayi Bölgesi Teknik Bilimler Meslek Yüksekokulu"],["basmakci-meslek-yuksekokulu","Başmakçı Meslek Yüksekokulu"],["battalgazi-meslek-yuksekokulu","Battalgazi Meslek Yüksekokulu"],["bayat-meslek-yuksekokulu","Bayat Meslek Yüksekokulu"],["bayindir-meslek-yuksekokulu","Bayındır Meslek Yüksekokulu"],["bayramic-meslek-yuksekokulu","Bayramiç Meslek Yüksekokulu"],["bekilli-meslek-yuksekokulu","Bekilli Meslek Yüksekokulu"],["bergama-meslek-yuksekokulu","Bergama Meslek Yüksekokulu"],["besni-ali-erdemoglu-meslek-yuksekokulu","Besni Ali Erdemoğlu Meslek Yüksekokulu"],["beseri-bilimler-fakultesi","Beşeri Bilimler Fakültesi"],["besikduzu-meslek-yuksekokulu","Beşikdüzü Meslek Yüksekokulu"],["besiri-organize-sanayi-bolgesi-meslek-yuksekokulu","Beşiri Organize Sanayi Bölgesi Meslek Yüksekokulu"],["beykoz-lojistik-meslek-yuksekokulu","Beykoz Lojistik Meslek Yüksekokulu"],["beypazari-meslek-yuksekokulu","Beypazarı Meslek Yüksekokulu"],["beysehir-ali-akkanat-isletme-fakultesi","Beyşehir Ali Akkanat İşletme Fakültesi"],["beysehir-ali-akkanat-meslek-yuksekokulu","Beyşehir Ali Akkanat Meslek Yüksekokulu"],["beysehir-ali-akkanat-turizm-fakultesi","Beyşehir Ali Akkanat Turizm Fakültesi"],["beysehir-ali-akkanat-uygulamali-bilimler-yuksekokulu","Beyşehir Ali Akkanat Uygulamalı Bilimler Yüksekokulu"],["biga-iktisadi-ve-idari-bilimler-fakultesi","Biga İktisadi ve İdari Bilimler Fakültesi"],["biga-meslek-yuksekokulu","Biga Meslek Yüksekokulu"],["biga-uygulamali-bilimler-fakultesi","Biga Uygulamalı Bilimler Fakültesi"],["bigadic-meslek-yuksekokulu","Bigadiç Meslek Yüksekokulu"],["bilgisayar-ve-bilisim-bilimleri-fakultesi","Bilgisayar ve Bilişim Bilimleri Fakültesi"],["bilgisayar-ve-bilisim-fakultesi","Bilgisayar ve Bilişim Fakültesi"],["bilgisayar-ve-bilisim-teknolojileri-fakultesi","Bilgisayar ve Bilişim Teknolojileri Fakültesi"],["bilgisayar-ve-teknoloji-yuksekokulu","Bilgisayar ve Teknoloji Yüksekokulu"],["bilisim-teknolojileri-meslek-yuksekokulu","Bilişim Teknolojileri Meslek Yüksekokulu"],["bilisim-teknolojileri-meslek-yuksekokulu-karasu","Bilişim Teknolojileri Meslek Yüksekokulu (Karasu)"],["bilisim-teknolojisi-yuksekokulu","Bilişim Teknolojisi Yüksekokulu"],["bingol-sosyal-bilimler-meslek-yuksekokulu","Bingöl Sosyal Bilimler Meslek Yüksekokulu"],["bingol-teknik-bilimler-meslek-yuksekokulu","Bingöl Teknik Bilimler Meslek Yüksekokulu"],["birecik-meslek-yuksekokulu","Birecik Meslek Yüksekokulu"],["birgivi-ilahiyat-fakultesi","Birgivi İlahiyat Fakültesi"],["bismil-meslek-yuksekokulu","Bismil Meslek Yüksekokulu"],["bodrum-denizcilik-meslek-yuksekokulu","Bodrum Denizcilik Meslek Yüksekokulu"],["bodrum-guzel-sanatlar-fakultesi","Bodrum Güzel Sanatlar Fakültesi"],["bogazliyan-meslek-yuksekokulu","Boğazlıyan Meslek Yüksekokulu"],["bolu-meslek-yuksekokulu","Bolu Meslek Yüksekokulu"],["bolu-teknik-bilimler-meslek-yuksekokulu","Bolu Teknik Bilimler Meslek Yüksekokulu"],["bolvadin-meslek-yuksekokulu","Bolvadin Meslek Yüksekokulu"],["bolvadin-saglik-hizmetleri-meslek-yuksekokulu","Bolvadin Sağlık Hizmetleri Meslek Yüksekokulu"],["bolvadin-uygulamali-bilimler-fakultesi","Bolvadin Uygulamalı Bilimler Fakültesi"],["bor-halil-zohre-ataman-meslek-yuksekokulu","Bor Halil-Zöhre Ataman Meslek Yüksekokulu"],["bor-meslek-yuksekokulu","Bor Meslek Yüksekokulu"],["bor-saglik-bilimleri-fakultesi","Bor Sağlık Bilimleri Fakültesi"],["borcka-acarlar-meslek-yuksekokulu","Borçka Acarlar Meslek Yüksekokulu"],["boyabat-iktisadi-ve-idari-bilimler-fakultesi","Boyabat İktisadi ve İdari Bilimler Fakültesi"],["boyabat-meslek-yuksekokulu","Boyabat Meslek Yüksekokulu"],["bozdogan-meslek-yuksekokulu","Bozdoğan Meslek Yüksekokulu"],["bozkir-meslek-yuksekokulu","Bozkır Meslek Yüksekokulu"],["bozkurt-meslek-yuksekokulu","Bozkurt Meslek Yüksekokulu"],["bozova-meslek-yuksekokulu","Bozova Meslek Yüksekokulu"],["bozuyuk-meslek-yuksekokulu","Bozüyük Meslek Yüksekokulu"],["buca-egitim-fakultesi","Buca Eğitim Fakültesi"],["bucak-bilgisayar-ve-bilisim-fakultesi","Bucak Bilgisayar ve Bilişim Fakültesi"],["bucak-emin-gulmez-teknik-bilimler-meslek-yuksekokulu","Bucak Emin Gülmez Teknik Bilimler Meslek Yüksekokulu"],["bucak-hikmet-tolunay-ulastirma-ve-lojistik-meslek-yuksekokulu","Bucak Hikmet Tolunay Ulaştırma ve Lojistik Meslek Yüksekokulu"],["bucak-isletme-fakultesi","Bucak İşletme Fakültesi"],["bucak-saglik-yuksekokulu","Bucak Sağlık Yüksekokulu"],["bucak-zeliha-tolunay-uygulamali-teknoloji-ve-isletmecilik-yuksekokulu","Bucak Zeliha Tolunay Uygulamalı Teknoloji ve İşletmecilik Yüksekokulu"],["buharkent-meslek-yuksekokulu","Buharkent Meslek Yüksekokulu"],["bulancak-kadir-karabas-uygulamali-bilimler-yuksekokulu","Bulancak Kadir Karabaş Uygulamalı Bilimler Yüksekokulu"],["bulancak-meslek-yuksekokulu","Bulancak Meslek Yüksekokulu"],["bulanik-meslek-yuksekokulu","Bulanık Meslek Yüksekokulu"],["buldan-meslek-yuksekokulu","Buldan Meslek Yüksekokulu"],["burdur-gida-tarim-ve-hayvancilik-meslek-yuksekokulu","Burdur Gıda Tarım ve Hayvancılık Meslek Yüksekokulu"],["burdur-saglik-hizmetleri-meslek-yuksekokulu","Burdur Sağlık Hizmetleri Meslek Yüksekokulu"],["burhaniye-meslek-yuksekokulu","Burhaniye Meslek Yüksekokulu"],["burhaniye-uygulamali-bilimler-fakultesi","Burhaniye Uygulamalı Bilimler Fakültesi"],["bursa-tip-fakultesi","Bursa Tıp Fakültesi"],["bunyan-meslek-yuksekokulu","Bünyan Meslek Yüksekokulu"],["buyukkutlu-uygulamali-bilimler-fakultesi-yalvac","Büyükkutlu Uygulamalı Bilimler Fakültesi (Yalvaç)"],["buyukorhan-meslek-yuksekokulu","Büyükorhan Meslek Yüksekokulu"],["celal-oruc-hayvansal-uretim-yuksekokulu-eleskirt","Celal Oruç Hayvansal Üretim Yüksekokulu (Eleşkirt)"],["cerrahpasa-tip-fakultesi","Cerrahpaşa Tıp Fakültesi"],["ceyhan-meslek-yuksekokulu","Ceyhan Meslek Yüksekokulu"],["ceyhan-muhendislik-fakultesi","Ceyhan Mühendislik Fakültesi"],["ceyhan-veteriner-fakultesi","Ceyhan Veteriner Fakültesi"],["ceylanpinar-tarim-meslek-yuksekokulu","Ceylanpınar Tarım Meslek Yüksekokulu"],["cide-rifat-ilgaz-meslek-yuksekokulu","Cide Rıfat Ilgaz Meslek Yüksekokulu"],["cihanbeyli-meslek-yuksekokulu","Cihanbeyli Meslek Yüksekokulu"],["cizre-meslek-yuksekokulu","Cizre Meslek Yüksekokulu"],["cumhuriyet-sosyal-bilimler-meslek-yuksekokulu","Cumhuriyet Sosyal Bilimler Meslek Yüksekokulu"],["cal-meslek-yuksekokulu","Çal Meslek Yüksekokulu"],["cameli-meslek-yuksekokulu","Çameli Meslek Yüksekokulu"],["can-meslek-yuksekokulu","Çan Meslek Yüksekokulu"],["can-uygulamali-bilimler-fakultesi","Çan Uygulamalı Bilimler Fakültesi"],["canakkale-saglik-hizmetleri-meslek-yuksekokulu","Çanakkale Sağlık Hizmetleri Meslek Yüksekokulu"],["canakkale-sosyal-bilimler-meslek-yuksekokulu","Çanakkale Sosyal Bilimler Meslek Yüksekokulu"],["canakkale-teknik-bilimler-meslek-yuksekokulu","Çanakkale Teknik Bilimler Meslek Yüksekokulu"],["canakkale-uygulamali-bilimler-fakultesi","Çanakkale Uygulamalı Bilimler Fakültesi"],["cankaya-meslek-yuksekokulu","Çankaya Meslek Yüksekokulu"],["cardak-organize-sanayi-bolgesi-meslek-yuksekokulu","Çardak Organize Sanayi Bölgesi Meslek Yüksekokulu"],["carsamba-insan-ve-toplum-bilimleri-fakultesi","Çarşamba İnsan ve Toplum Bilimleri Fakültesi"],["carsamba-ticaret-borsasi-meslek-yuksekokulu","Çarşamba Ticaret Borsası Meslek Yüksekokulu"],["carsibasi-meslek-yuksekokulu","Çarşıbaşı Meslek Yüksekokulu"],["catalzeytin-meslek-yuksekokulu","Çatalzeytin Meslek Yüksekokulu"],["cavdarhisar-meslek-yuksekokulu","Çavdarhisar Meslek Yüksekokulu"],["cavdir-meslek-yuksekokulu","Çavdır Meslek Yüksekokulu"],["cay-meslek-yuksekokulu","Çay Meslek Yüksekokulu"],["caycuma-gida-ve-tarim-meslek-yuksekokulu","Çaycuma Gıda ve Tarım Meslek Yüksekokulu"],["caycuma-meslek-yuksekokulu","Çaycuma Meslek Yüksekokulu"],["cayirli-meslek-yuksekokulu","Çayırlı Meslek Yüksekokulu"],["cekerek-fuat-oktay-saglik-hizmetleri-meslek-yuksekokulu","Çekerek Fuat Oktay Sağlık Hizmetleri Meslek Yüksekokulu"],["cemisgezek-meslek-yuksekokulu","Çemişgezek Meslek Yüksekokulu"],["cerkes-meslek-yuksekokulu","Çerkeş Meslek Yüksekokulu"],["cerkezkoy-meslek-yuksekokulu","Çerkezköy Meslek Yüksekokulu"],["cermik-meslek-yuksekokulu","Çermik Meslek Yüksekokulu"],["cesme-turizm-fakultesi","Çeşme Turizm Fakültesi"],["cildir-meslek-yuksekokulu","Çıldır Meslek Yüksekokulu"],["cinarcik-meslek-yuksekokulu","Çınarcık Meslek Yüksekokulu"],["cicekdagi-meslek-yuksekokulu","Çiçekdağı Meslek Yüksekokulu"],["cilimli-meslek-yuksekokulu","Çilimli Meslek Yüksekokulu"],["cine-meslek-yuksekokulu","Çine Meslek Yüksekokulu"],["civril-atasay-kamer-meslek-yuksekokulu","Çivril Atasay Kamer Meslek Yüksekokulu"],["corlu-meslek-yuksekokulu","Çorlu Meslek Yüksekokulu"],["corlu-muhendislik-fakultesi","Çorlu Mühendislik Fakültesi"],["colemerik-meslek-yuksekokulu","Çölemerik Meslek Yüksekokulu"],["cumra-meslek-yuksekokulu","Çumra Meslek Yüksekokulu"],["cumra-uygulamali-bilimler-yuksekokulu","Çumra Uygulamalı Bilimler Yüksekokulu"],["daday-nafi-ve-umit-ceri-meslek-yuksekokulu","Daday Nafi ve Ümit Çeri Meslek Yüksekokulu"],["dalaman-meslek-yuksekokulu","Dalaman Meslek Yüksekokulu"],["dalaman-sivil-havacilik-yuksekokulu","Dalaman Sivil Havacılık Yüksekokulu"],["darende-bekir-ilicak-meslek-yuksekokulu","Darende Bekir Ilıcak Meslek Yüksekokulu"],["datca-kazim-yilmaz-meslek-yuksekokulu","Datça Kazım Yılmaz Meslek Yüksekokulu"],["dazkiri-meslek-yuksekokulu","Dazkırı Meslek Yüksekokulu"],["dede-korkut-egitim-fakultesi","Dede Korkut Eğitim Fakültesi"],["degirmendere-ali-ozbay-meslek-yuksekokulu","Değirmendere Ali Özbay Meslek Yüksekokulu"],["delice-meslek-yuksekokulu","Delice Meslek Yüksekokulu"],["demirci-meslek-yuksekokulu","Demirci Meslek Yüksekokulu"],["demirozu-meslek-yuksekokulu","Demirözü Meslek Yüksekokulu"],["demre-dr-hasan-unal-meslek-yuksekokulu","Demre Dr. Hasan Ünal Meslek Yüksekokulu"],["deniz-bilimleri-ve-teknolojisi-fakultesi","Deniz Bilimleri ve Teknolojisi Fakültesi"],["denizcilik-fakultesi","Denizcilik Fakültesi"],["denizcilik-meslek-yuksekokulu","Denizcilik Meslek Yüksekokulu"],["denizcilik-meslek-yuksekokulu-kocaali","Denizcilik Meslek Yüksekokulu (Kocaali)"],["denizcilik-teknolojileri-meslek-yuksekokulu","Denizcilik Teknolojileri Meslek Yüksekokulu"],["denizcilik-ve-ulastirma-yuksekokulu","Denizcilik ve Ulaştırma Yüksekokulu"],["denizcilik-mavi-ekonomi-ve-deniz-bilimleri-fakultesi","Denizcilik, Mavi Ekonomi ve Deniz Bilimleri Fakültesi"],["denizli-saglik-hizmetleri-meslek-yuksekokulu","Denizli Sağlık Hizmetleri Meslek Yüksekokulu"],["denizli-sosyal-bilimler-meslek-yuksekokulu","Denizli Sosyal Bilimler Meslek Yüksekokulu"],["denizli-teknik-bilimler-meslek-yuksekokulu","Denizli Teknik Bilimler Meslek Yüksekokulu"],["dereli-meslek-yuksekokulu-kesap","Dereli Meslek Yüksekokulu (Keşap)"],["derinkuyu-emineana-ve-yasar-ertas-tarim-ve-hayvancilik-meslek-yuksekokulu","Derinkuyu Emineana ve Yaşar Ertaş Tarım ve Hayvancılık Meslek Yüksekokulu"],["develi-huseyin-sahin-meslek-yuksekokulu","Develi Hüseyin Şahin Meslek Yüksekokulu"],["develi-ilahiyat-fakultesi","Develi İlahiyat Fakültesi"],["develi-sosyal-ve-beseri-bilimler-fakultesi","Develi Sosyal ve Beşeri Bilimler Fakültesi"],["devrek-meslek-yuksekokulu","Devrek Meslek Yüksekokulu"],["devrekani-turkiye-odalar-ve-borsalar-birligi-meslek-yuksekokulu","Devrekani Türkiye Odalar ve Borsalar Birliği Meslek Yüksekokulu"],["didim-meslek-yuksekokulu","Didim Meslek Yüksekokulu"],["dil-ve-tarih-cografya-fakultesi","Dil ve Tarih Coğrafya Fakültesi"],["dinar-meslek-yuksekokulu","Dinar Meslek Yüksekokulu"],["dinar-uygulamali-bilimler-yuksekokulu","Dinar Uygulamalı Bilimler Yüksekokulu"],["dis-hekimligi-fakultesi","Diş Hekimliği Fakültesi"],["divrigi-nuri-demirag-meslek-yuksekokulu","Divriği Nuri Demirağ Meslek Yüksekokulu"],["diyarbakir-sosyal-bilimler-meslek-yuksekokulu","Diyarbakır Sosyal Bilimler Meslek Yüksekokulu"],["diyarbakir-tarim-meslek-yuksekokulu","Diyarbakır Tarım Meslek Yüksekokulu"],["diyarbakir-teknik-bilimler-meslek-yuksekokulu","Diyarbakır Teknik Bilimler Meslek Yüksekokulu"],["doganhisar-meslek-yuksekokulu","Doğanhisar Meslek Yüksekokulu"],["dogansehir-vahap-kucuk-meslek-yuksekokulu","Doğanşehir Vahap Küçük Meslek Yüksekokulu"],["dogubayazit-ahmed-i-hani-meslek-yuksekokulu","Doğubayazıt Ahmed-i Hani Meslek Yüksekokulu"],["domanic-hayme-ana-meslek-yuksekokulu","Domaniç Hayme Ana Meslek Yüksekokulu"],["dortyol-meslek-yuksekokulu","Dörtyol Meslek Yüksekokulu"],["dortyol-saglik-hizmetleri-meslek-yuksekokulu","Dörtyol Sağlık Hizmetleri Meslek Yüksekokulu"],["dr-engin-pak-cumayeri-meslek-yuksekokulu","Dr. Engin Pak Cumayeri Meslek Yüksekokulu"],["dr-fazil-kucuk-egitim-fakultesi","Dr. Fazıl Küçük Eğitim Fakültesi"],["dumlupinar-meslek-yuksekokulu","Dumlupınar Meslek Yüksekokulu"],["duragan-meslek-yuksekokulu","Durağan Meslek Yüksekokulu"],["dursunbey-meslek-yuksekokulu","Dursunbey Meslek Yüksekokulu"],["duzici-meslek-yuksekokulu","Düziçi Meslek Yüksekokulu"],["duzkoy-meslek-yuksekokulu","Düzköy Meslek Yüksekokulu"],["eczacilik-fakultesi","Eczacılık Fakültesi"],["eczacilik-fakultesi-bafra","Eczacılık Fakültesi (Bafra)"],["edebiyat-fakultesi","Edebiyat Fakültesi"],["edirne-sosyal-bilimler-meslek-yuksekokulu","Edirne Sosyal Bilimler Meslek Yüksekokulu"],["edirne-teknik-bilimler-meslek-yuksekokulu","Edirne Teknik Bilimler Meslek Yüksekokulu"],["edremit-meslek-yuksekokulu","Edremit Meslek Yüksekokulu"],["edremit-sivil-havacilik-yuksekokulu","Edremit Sivil Havacılık Yüksekokulu"],["efes-meslek-yuksekokulu-selcuk","Efes Meslek Yüksekokulu (Selçuk)"],["eflani-meslek-yuksekokulu","Eflani Meslek Yüksekokulu"],["ege-meslek-yuksekokulu","Ege Meslek Yüksekokulu"],["egirdir-meslek-yuksekokulu","Eğirdir Meslek Yüksekokulu"],["egirdir-saglik-hizmetleri-meslek-yuksekokulu","Eğirdir Sağlık Hizmetleri Meslek Yüksekokulu"],["egirdir-su-urunleri-fakultesi","Eğirdir Su Ürünleri Fakültesi"],["egitim-bilimleri-fakultesi","Eğitim Bilimleri Fakültesi"],["egitim-fakultesi","Eğitim Fakültesi"],["egitim-fakultesi-cayeli","Eğitim Fakültesi (Çayeli)"],["egitim-fakultesi-demirci","Eğitim Fakültesi (Demirci)"],["egitim-ve-beseri-bilimler-fakultesi","Eğitim ve Beşeri Bilimler Fakültesi"],["ekonomi-ve-yonetim-bilimleri-fakultesi","Ekonomi ve Yönetim Bilimleri Fakültesi"],["elazig-organize-sanayi-bolgesi-meslek-yuksekokulu","Elazığ Organize Sanayi Bölgesi Meslek Yüksekokulu"],["elbistan-meslek-yuksekokulu","Elbistan Meslek Yüksekokulu"],["elbistan-saglik-hizmetleri-meslek-yuksekokulu","Elbistan Sağlık Hizmetleri Meslek Yüksekokulu"],["eldivan-saglik-hizmetleri-meslek-yuksekokulu","Eldivan Sağlık Hizmetleri Meslek Yüksekokulu"],["elektrik-elektronik-fakultesi","Elektrik-Elektronik Fakültesi"],["eleskirt-meslek-yuksekokulu","Eleşkirt Meslek Yüksekokulu"],["elmadag-meslek-yuksekokulu","Elmadağ Meslek Yüksekokulu"],["elmali-meslek-yuksekokulu","Elmalı Meslek Yüksekokulu"],["emel-akin-meslek-yuksekokulu","Emel Akın Meslek Yüksekokulu"],["emet-meslek-yuksekokulu","Emet Meslek Yüksekokulu"],["emirdag-meslek-yuksekokulu","Emirdağ Meslek Yüksekokulu"],["engelliler-entegre-yuksekokulu","Engelliler Entegre Yüksekokulu"],["erbaa-meslek-yuksekokulu","Erbaa Meslek Yüksekokulu"],["erbaa-saglik-bilimleri-fakultesi","Erbaa Sağlık Bilimleri Fakültesi"],["erbaa-saglik-hizmetleri-meslek-yuksekokulu","Erbaa Sağlık Hizmetleri Meslek Yüksekokulu"],["erbaa-sosyal-ve-beseri-bilimler-fakultesi","Erbaa Sosyal ve Beşeri Bilimler Fakültesi"],["ercis-isletme-fakultesi","Erciş İşletme Fakültesi"],["ercis-meslek-yuksekokulu","Erciş Meslek Yüksekokulu"],["erdek-meslek-yuksekokulu","Erdek Meslek Yüksekokulu"],["erdemli-meslek-yuksekokulu","Erdemli Meslek Yüksekokulu"],["erdemli-uygulamali-teknoloji-ve-isletmecilik-yuksekokulu","Erdemli Uygulamalı Teknoloji ve İşletmecilik Yüksekokulu"],["eregli-egitim-fakultesi","Ereğli Eğitim Fakültesi"],["eregli-saglik-hizmetleri-meslek-yuksekokulu","Ereğli Sağlık Hizmetleri Meslek Yüksekokulu"],["eregli-ziraat-fakultesi","Ereğli Ziraat Fakültesi"],["ergani-meslek-yuksekokulu","Ergani Meslek Yüksekokulu"],["ermenek-meslek-yuksekokulu","Ermenek Meslek Yüksekokulu"],["ermenek-uysal-ve-hasan-kalan-saglik-hizmetleri-meslek-yuksekokulu","Ermenek Uysal ve Hasan Kalan Sağlık Hizmetleri Meslek Yüksekokulu"],["eruh-meslek-yuksekokulu","Eruh Meslek Yüksekokulu"],["erzin-organize-sanayi-bolgesi-meslek-yuksekokulu","Erzin Organize Sanayi Bölgesi Meslek Yüksekokulu"],["erzurum-tip-fakultesi","Erzurum Tıp Fakültesi"],["eskil-meslek-yuksekokulu","Eskil Meslek Yüksekokulu"],["eskipazar-meslek-yuksekokulu","Eskipazar Meslek Yüksekokulu"],["eskisehir-meslek-yuksekokulu","Eskişehir Meslek Yüksekokulu"],["espiye-meslek-yuksekokulu","Espiye Meslek Yüksekokulu"],["esme-meslek-yuksekokulu","Eşme Meslek Yüksekokulu"],["eynesil-kamil-nalbant-meslek-yuksekokulu","Eynesil Kamil Nalbant Meslek Yüksekokulu"],["ezine-gida-ihtisas-organize-sanayi-bolgesi-meslek-yuksekokulu","Ezine Gıda İhtisas Organize Sanayi Bölgesi Meslek Yüksekokulu"],["fatih-egitim-fakultesi","Fatih Eğitim Fakültesi"],["fatma-senses-sosyal-bilimler-meslek-yuksekokulu","Fatma Şenses Sosyal Bilimler Meslek Yüksekokulu"],["fatsa-deniz-bilimleri-fakultesi","Fatsa Deniz Bilimleri Fakültesi"],["fatsa-meslek-yuksekokulu","Fatsa Meslek Yüksekokulu"],["fen-edebiyat-fakultesi","Fen Edebiyat Fakültesi"],["fen-fakultesi","Fen Fakültesi"],["fen-ve-edebiyat-fakultesi","Fen ve Edebiyat Fakültesi"],["fen-edebiyat-fakultesi-2","Fen-Edebiyat Fakültesi"],["ferizli-meslek-yuksekokulu","Ferizli Meslek Yüksekokulu"],["fethiye-ali-sitki-mefharet-kocman-meslek-yuksekokulu","Fethiye Ali Sıtkı-Mefharet Koçman Meslek Yüksekokulu"],["fethiye-isletme-fakultesi","Fethiye İşletme Fakültesi"],["fethiye-saglik-bilimleri-fakultesi","Fethiye Sağlık Bilimleri Fakültesi"],["fethiye-saglik-hizmetleri-meslek-yuksekokulu","Fethiye Sağlık Hizmetleri Meslek Yüksekokulu"],["fethiye-ziraat-fakultesi","Fethiye Ziraat Fakültesi"],["findikli-uygulamali-bilimler-yuksekokulu","Fındıklı Uygulamalı Bilimler Yüksekokulu"],["finansal-bilimler-fakultesi","Finansal Bilimler Fakültesi"],["finike-meslek-yuksekokulu","Finike Meslek Yüksekokulu"],["fizik-tedavi-ve-rehabilitasyon-fakultesi","Fizik Tedavi ve Rehabilitasyon Fakültesi"],["fizik-tedavi-ve-rehabilitasyon-yuksekokulu","Fizik Tedavi ve Rehabilitasyon Yüksekokulu"],["fizyoterapi-ve-rehabilitasyon-fakultesi","Fizyoterapi ve Rehabilitasyon Fakültesi"],["florence-nightingale-hastanesi-hemsirelik-yuksekokulu","Florence Nightingale Hastanesi Hemşirelik Yüksekokulu"],["florence-nightingale-hemsirelik-fakultesi","Florence Nightingale Hemşirelik Fakültesi"],["ford-otosan-ihsaniye-otomotiv-meslek-yuksekokulu","Ford Otosan İhsaniye Otomotiv Meslek Yüksekokulu"],["gazanfer-bilge-meslek-yuksekokulu","Gazanfer Bilge Meslek Yüksekokulu"],["gazi-egitim-fakultesi","Gazi Eğitim Fakültesi"],["gaziantep-egitim-fakultesi","Gaziantep Eğitim Fakültesi"],["gazipasa-havacilik-ve-uzay-bilimleri-fakultesi","Gazipaşa Havacılık ve Uzay Bilimleri Fakültesi"],["gazipasa-mustafa-rahmi-buyukballi-meslek-yuksekokulu","Gazipaşa Mustafa Rahmi Büyükballı Meslek Yüksekokulu"],["gebze-organize-sanayi-bolgesi-meslek-yuksekokulu","Gebze Organize Sanayi Bölgesi Meslek Yüksekokulu"],["gedik-meslek-yuksekokulu","Gedik Meslek Yüksekokulu"],["gediz-meslek-yuksekokulu","Gediz Meslek Yüksekokulu"],["gediz-saglik-hizmetleri-meslek-yuksekokulu","Gediz Sağlık Hizmetleri Meslek Yüksekokulu"],["gelendost-meslek-yuksekokulu","Gelendost Meslek Yüksekokulu"],["gelibolu-piri-reis-meslek-yuksekokulu","Gelibolu Piri Reis Meslek Yüksekokulu"],["gemerek-meslek-yuksekokulu","Gemerek Meslek Yüksekokulu"],["gemi-insaati-ve-deniz-bilimleri-fakultesi","Gemi İnşaatı ve Deniz Bilimleri Fakültesi"],["gemi-insaati-ve-denizcilik-fakultesi","Gemi İnşaatı ve Denizcilik Fakültesi"],["gemlik-asim-kocabiyik-meslek-yuksekokulu","Gemlik Asım Kocabıyık Meslek Yüksekokulu"],["genc-meslek-yuksekokulu","Genç Meslek Yüksekokulu"],["gerede-meslek-yuksekokulu","Gerede Meslek Yüksekokulu"],["gerede-uygulamali-bilimler-fakultesi","Gerede Uygulamalı Bilimler Fakültesi"],["germencik-yamanturk-meslek-yuksekokulu","Germencik Yamantürk Meslek Yüksekokulu"],["gerze-meslek-yuksekokulu","Gerze Meslek Yüksekokulu"],["gevas-meslek-yuksekokulu","Gevaş Meslek Yüksekokulu"],["geyve-meslek-yuksekokulu","Geyve Meslek Yüksekokulu"],["gida-ve-tarim-meslek-yuksekokulu","Gıda ve Tarım Meslek Yüksekokulu"],["gida-tarim-ve-hayvancilik-meslek-yuksekokulu","Gıda, Tarım ve Hayvancılık Meslek Yüksekokulu"],["giresun-meslek-yuksekokulu","Giresun Meslek Yüksekokulu"],["gokceada-meslek-yuksekokulu","Gökçeada Meslek Yüksekokulu"],["gokceada-uygulamali-bilimler-yuksekokulu","Gökçeada Uygulamalı Bilimler Yüksekokulu"],["gokcebey-mithat-mehmet-canakci-meslek-yuksekokulu","Gökçebey Mithat-Mehmet Çanakçı Meslek Yüksekokulu"],["goksun-meslek-yuksekokulu","Göksun Meslek Yüksekokulu"],["goksun-uygulamali-bilimler-yuksekokulu","Göksun Uygulamalı Bilimler Yüksekokulu"],["golbasi-meslek-yuksekokulu","Gölbaşı Meslek Yüksekokulu"],["golcuk-meslek-yuksekokulu","Gölcük Meslek Yüksekokulu"],["golhisar-meslek-yuksekokulu","Gölhisar Meslek Yüksekokulu"],["golhisar-saglik-hizmetleri-meslek-yuksekokulu","Gölhisar Sağlık Hizmetleri Meslek Yüksekokulu"],["golhisar-uygulamali-bilimler-yuksekokulu","Gölhisar Uygulamalı Bilimler Yüksekokulu"],["golkoy-meslek-yuksekokulu","Gölköy Meslek Yüksekokulu"],["golpazari-meslek-yuksekokulu","Gölpazarı Meslek Yüksekokulu"],["golyaka-meslek-yuksekokulu","Gölyaka Meslek Yüksekokulu"],["gonen-meslek-yuksekokulu","Gönen Meslek Yüksekokulu"],["gordes-meslek-yuksekokulu","Gördes Meslek Yüksekokulu"],["gorele-guzel-sanatlar-fakultesi","Görele Güzel Sanatlar Fakültesi"],["gorele-uygulamali-bilimler-yuksekokulu","Görele Uygulamalı Bilimler Yüksekokulu"],["goynuk-mutfak-sanatlari-meslek-yuksekokulu","Göynük Mutfak Sanatları Meslek Yüksekokulu"],["gulhane-dis-hekimligi-fakultesi-ankara","Gülhane Diş Hekimliği Fakültesi (Ankara)"],["gulhane-eczacilik-fakultesi","Gülhane Eczacılık Fakültesi"],["gulhane-fizyoterapi-ve-rehabilitasyon-fakultesi","Gülhane Fizyoterapi ve Rehabilitasyon Fakültesi"],["gulhane-hemsirelik-fakultesi","Gülhane Hemşirelik Fakültesi"],["gulhane-saglik-bilimleri-fakultesi","Gülhane Sağlık Bilimleri Fakültesi"],["gulhane-saglik-meslek-yuksekokulu-ankara","Gülhane Sağlık Meslek Yüksekokulu (Ankara)"],["gulhane-tip-fakultesi","Gülhane Tıp Fakültesi"],["gulsehir-sosyal-bilimler-meslek-yuksekokulu","Gülşehir Sosyal Bilimler Meslek Yüksekokulu"],["gumushacikoy-hasan-duman-meslek-yuksekokulu","Gümüşhacıköy Hasan Duman Meslek Yüksekokulu"],["gumushane-iktisadi-ve-idari-bilimler-fakultesi","Gümüşhane İktisadi ve İdari Bilimler Fakültesi"],["gumushane-meslek-yuksekokulu","Gümüşhane Meslek Yüksekokulu"],["gumushane-saglik-hizmetleri-meslek-yuksekokulu","Gümüşhane Sağlık Hizmetleri Meslek Yüksekokulu"],["gumusova-meslek-yuksekokulu","Gümüşova Meslek Yüksekokulu"],["guneysinir-meslek-yuksekokulu","Güneysınır Meslek Yüksekokulu"],["guneysu-fizik-tedavi-ve-rehabilitasyon-yuksekokulu","Güneysu Fizik Tedavi ve Rehabilitasyon Yüksekokulu"],["guroymak-meslek-yuksekokulu","Güroymak Meslek Yüksekokulu"],["gurun-meslek-yuksekokulu","Gürün Meslek Yüksekokulu"],["guzel-sanatlar-fakultesi","Güzel Sanatlar Fakültesi"],["guzel-sanatlar-fakultesi-hacibektas","Güzel Sanatlar Fakültesi (Hacıbektaş)"],["guzel-sanatlar-meslek-yuksekokulu","Güzel Sanatlar Meslek Yüksekokulu"],["guzel-sanatlar-tasarim-ve-mimarlik-fakultesi","Güzel Sanatlar Tasarım ve Mimarlık Fakültesi"],["guzel-sanatlar-ve-mimarlik-fakultesi","Güzel Sanatlar ve Mimarlık Fakültesi"],["guzel-sanatlar-ve-tasarim-fakultesi","Güzel Sanatlar ve Tasarım Fakültesi"],["guzel-sanatlar-tasarim-ve-mimarlik-fakultesi-2","Güzel Sanatlar, Tasarım ve Mimarlık Fakültesi"],["guzelyurt-meslek-yuksekokulu","Güzelyurt Meslek Yüksekokulu"],["hacettepe-ankara-sanayi-odasi-1-osb-meslek-yuksekokulu","Hacettepe Ankara Sanayi Odası 1. Osb Meslek Yüksekokulu"],["hacibektas-teknik-bilimler-meslek-yuksekokulu","Hacıbektaş Teknik Bilimler Meslek Yüksekokulu"],["hacilar-huseyin-aytemiz-meslek-yuksekokulu","Hacılar Hüseyin Aytemiz Meslek Yüksekokulu"],["hadim-meslek-yuksekokulu","Hadim Meslek Yüksekokulu"],["hafik-kamer-ornek-meslek-yuksekokulu","Hafik Kamer Örnek Meslek Yüksekokulu"],["halfeti-meslek-yuksekokulu","Halfeti Meslek Yüksekokulu"],["halil-bayraktar-saglik-hizmetleri-meslek-yuksekokulu","Halil Bayraktar Sağlık Hizmetleri Meslek Yüksekokulu"],["hamidiye-dis-hekimligi-fakultesi","Hamidiye Diş Hekimliği Fakültesi"],["hamidiye-eczacilik-fakultesi","Hamidiye Eczacılık Fakültesi"],["hamidiye-hemsirelik-fakultesi","Hamidiye Hemşirelik Fakültesi"],["hamidiye-saglik-bilimleri-fakultesi","Hamidiye Sağlık Bilimleri Fakültesi"],["hamidiye-saglik-hizmetleri-meslek-yuksekokulu-istanbul","Hamidiye Sağlık Hizmetleri Meslek Yüksekokulu (İstanbul)"],["hamidiye-tip-fakultesi","Hamidiye Tıp Fakültesi"],["hamidiye-uluslararasi-tip-fakultesi","Hamidiye Uluslararası Tıp Fakültesi"],["hamidiye-yasam-bilimleri-fakultesi","Hamidiye Yaşam Bilimleri Fakültesi"],["harmancik-meslek-yuksekokulu","Harmancık Meslek Yüksekokulu"],["hasan-ali-yucel-egitim-fakultesi","Hasan Ali Yücel Eğitim Fakültesi"],["hasan-ferdi-turgutlu-teknoloji-fakultesi","Hasan Ferdi Turgutlu Teknoloji Fakültesi"],["hasankeyf-meslek-yuksekokulu","Hasankeyf Meslek Yüksekokulu"],["hassa-meslek-yuksekokulu","Hassa Meslek Yüksekokulu"],["hatay-saglik-hizmetleri-meslek-yuksekokulu","Hatay Sağlık Hizmetleri Meslek Yüksekokulu"],["hattat-hamdullah-guzel-sanatlar-fakultesi","Hattat Hamdullah Güzel Sanatlar Fakültesi"],["hava-ulastirma-fakultesi","Hava Ulaştırma Fakültesi"],["havacilik-meslek-yuksekokulu","Havacılık Meslek Yüksekokulu"],["havacilik-ve-uzay-bilimleri-fakultesi","Havacılık ve Uzay Bilimleri Fakültesi"],["havacilik-yuksekokulu","Havacılık Yüksekokulu"],["havelsan-siber-guvenlik-meslek-yuksekokulu","Havelsan Siber Güvenlik Meslek Yüksekokulu"],["havran-meslek-yuksekokulu","Havran Meslek Yüksekokulu"],["havsa-meslek-yuksekokulu","Havsa Meslek Yüksekokulu"],["havza-meslek-yuksekokulu","Havza Meslek Yüksekokulu"],["haymana-meslek-yuksekokulu","Haymana Meslek Yüksekokulu"],["hayrabolu-meslek-yuksekokulu","Hayrabolu Meslek Yüksekokulu"],["hekimhan-mehmet-emin-sungur-meslek-yuksekokulu","Hekimhan Mehmet Emin Sungur Meslek Yüksekokulu"],["hemsirelik-fakultesi","Hemşirelik Fakültesi"],["hemsirelik-yuksekokulu","Hemşirelik Yüksekokulu"],["hendek-meslek-yuksekokulu","Hendek Meslek Yüksekokulu"],["hereke-asim-kocabiyik-meslek-yuksekokulu","Hereke Asım Kocabıyık Meslek Yüksekokulu"],["hereke-omer-ismet-uzunyol-meslek-yuksekokulu","Hereke Ömer İsmet Uzunyol Meslek Yüksekokulu"],["hinis-meslek-yuksekokulu","Hınıs Meslek Yüksekokulu"],["hilvan-meslek-yuksekokulu","Hilvan Meslek Yüksekokulu"],["hisarcik-meslek-yuksekokulu","Hisarcık Meslek Yüksekokulu"],["hizan-meslek-yuksekokulu","Hizan Meslek Yüksekokulu"],["honaz-meslek-yuksekokulu","Honaz Meslek Yüksekokulu"],["hopa-iktisadi-ve-idari-bilimler-fakultesi","Hopa İktisadi ve İdari Bilimler Fakültesi"],["hopa-meslek-yuksekokulu","Hopa Meslek Yüksekokulu"],["horasan-meslek-yuksekokulu","Horasan Meslek Yüksekokulu"],["huglu-meslek-yuksekokulu","Huğlu Meslek Yüksekokulu"],["hukuk-fakultesi","Hukuk Fakültesi"],["hukuk-fakultesi-gemlik","Hukuk Fakültesi (Gemlik)"],["hukuk-ve-sosyal-bilimler-fakultesi","Hukuk ve Sosyal Bilimler Fakültesi"],["igdir-meslek-yuksekokulu","Iğdır Meslek Yüksekokulu"],["igdir-teknik-bilimler-meslek-yuksekokulu","Iğdır Teknik Bilimler Meslek Yüksekokulu"],["ilgin-meslek-yuksekokulu","Ilgın Meslek Yüksekokulu"],["isparta-bilisim-teknolojileri-meslek-yuksekokulu","Isparta Bilişim Teknolojileri Meslek Yüksekokulu"],["isparta-meslek-yuksekokulu","Isparta Meslek Yüksekokulu"],["isparta-osb-meslek-yuksekokulu","Isparta Osb Meslek Yüksekokulu"],["isparta-saglik-hizmetleri-meslek-yuksekokulu","Isparta Sağlık Hizmetleri Meslek Yüksekokulu"],["idil-meslek-yuksekokulu","İdil Meslek Yüksekokulu"],["ihsangazi-meslek-yuksekokulu","İhsangazi Meslek Yüksekokulu"],["ikizce-meslek-yuksekokulu","İkizce Meslek Yüksekokulu"],["iktisadi-ve-idari-bilimler-fakultesi","İktisadi ve İdari Bilimler Fakültesi"],["iktisadi-idari-ve-sosyal-bilimler-fakultesi","İktisadi, İdari ve Sosyal Bilimler Fakültesi"],["iktisat-fakultesi","İktisat Fakültesi"],["ilahiyat-fakultesi","İlahiyat Fakültesi"],["ilahiyat-fakultesi-hopa","İlahiyat Fakültesi (Hopa)"],["iletisim-bilimleri-fakultesi","İletişim Bilimleri Fakültesi"],["iletisim-fakultesi","İletişim Fakültesi"],["iletisim-fakultesi-carsamba","İletişim Fakültesi (Çarşamba)"],["ilic-dursun-yildirim-meslek-yuksekokulu","İliç Dursun Yıldırım Meslek Yüksekokulu"],["imamoglu-meslek-yuksekokulu","İmamoğlu Meslek Yüksekokulu"],["imranli-meslek-yuksekokulu","İmranlı Meslek Yüksekokulu"],["incesu-ayse-ve-saffet-arslan-saglik-hizmetleri-meslek-yuksekokulu","İncesu Ayşe ve Saffet Arslan Sağlık Hizmetleri Meslek Yüksekokulu"],["inebolu-meslek-yuksekokulu","İnebolu Meslek Yüksekokulu"],["inegol-isletme-fakultesi","İnegöl İşletme Fakültesi"],["inegol-meslek-yuksekokulu","İnegöl Meslek Yüksekokulu"],["insan-ve-toplum-bilimleri-fakultesi","İnsan ve Toplum Bilimleri Fakültesi"],["insani-bilimler-fakultesi","İnsani Bilimler Fakültesi"],["insani-bilimler-ve-edebiyat-fakultesi","İnsani Bilimler ve Edebiyat Fakültesi"],["insaat-fakultesi","İnşaat Fakültesi"],["insaat-ve-cevre-muhendisligi-fakultesi","İnşaat ve Çevre Mühendisliği Fakültesi"],["ipsala-meslek-yuksekokulu","İpsala Meslek Yüksekokulu"],["irfan-can-kose-meslek-yuksekokulu","İrfan Can Köse Meslek Yüksekokulu"],["iscehisar-meslek-yuksekokulu","İscehisar Meslek Yüksekokulu"],["iskenderun-meslek-yuksekokulu","İskenderun Meslek Yüksekokulu"],["iskenderun-organize-sanayi-bolgesi-kaynakcilik-meslek-yuksekokulu","İskenderun Organize Sanayi Bölgesi Kaynakçılık Meslek Yüksekokulu"],["iskilip-meslek-yuksekokulu","İskilip Meslek Yüksekokulu"],["islahiye-iktisadi-ve-idari-bilimler-fakultesi","İslahiye İktisadi ve İdari Bilimler Fakültesi"],["islahiye-meslek-yuksekokulu","İslahiye Meslek Yüksekokulu"],["islami-ilimler-fakultesi","İslami İlimler Fakültesi"],["ispir-hamza-polat-meslek-yuksekokulu","İspir Hamza Polat Meslek Yüksekokulu"],["istanbul-gelisim-meslek-yuksekokulu","İstanbul Gelişim Meslek Yüksekokulu"],["istanbul-saglik-ve-sosyal-bilimler-meslek-yuksekokulu","İstanbul Sağlık ve Sosyal Bilimler Meslek Yüksekokulu"],["istanbul-sisli-meslek-yuksekokulu","İstanbul Şişli Meslek Yüksekokulu"],["istanbul-tip-fakultesi","İstanbul Tıp Fakültesi"],["isletme-fakultesi","İşletme Fakültesi"],["isletme-ve-ekonomi-fakultesi","İşletme ve Ekonomi Fakültesi"],["isletme-ve-iktisat-fakultesi","İşletme ve İktisat Fakültesi"],["isletme-ve-yonetim-bilimleri-fakultesi","İşletme ve Yönetim Bilimleri Fakültesi"],["itu-kktc-egitim-arastirma-yerleskesi-gazimagusa","İTÜ-KKTC Eğitim Araştırma Yerleşkesi (Gazimağusa)"],["ivrindi-saglik-hizmetleri-meslek-yuksekokulu","İvrindi Sağlık Hizmetleri Meslek Yüksekokulu"],["izmir-havacilik-meslek-yuksekokulu","İzmir Havacılık Meslek Yüksekokulu"],["izmir-konak-meslek-yuksekokulu","İzmir Konak Meslek Yüksekokulu"],["izmir-meslek-yuksekokulu","İzmir Meslek Yüksekokulu"],["izmir-tip-fakultesi","İzmir Tıp Fakültesi"],["izmit-meslek-yuksekokulu","İzmit Meslek Yüksekokulu"],["iznik-meslek-yuksekokulu","İznik Meslek Yüksekokulu"],["kadinhani-faik-icil-meslek-yuksekokulu","Kadınhanı Faik İçil Meslek Yüksekokulu"],["kadirli-meslek-yuksekokulu","Kadirli Meslek Yüksekokulu"],["kadirli-sosyal-ve-beseri-bilimler-fakultesi","Kadirli Sosyal ve Beşeri Bilimler Fakültesi"],["kadirli-uygulamali-bilimler-fakultesi","Kadirli Uygulamalı Bilimler Fakültesi"],["kagizman-meslek-yuksekokulu","Kağızman Meslek Yüksekokulu"],["kagizman-uygulamali-bilimler-yuksekokulu","Kağızman Uygulamalı Bilimler Yüksekokulu"],["kahramankazan-meslek-yuksekokulu","Kahramankazan Meslek Yüksekokulu"],["kahramanmaras-saglik-hizmetleri-meslek-yuksekokulu","Kahramanmaraş Sağlık Hizmetleri Meslek Yüksekokulu"],["kahta-meslek-yuksekokulu","Kahta Meslek Yüksekokulu"],["kale-meslek-yuksekokulu","Kale Meslek Yüksekokulu"],["kale-turizm-ve-otel-isletmeciligi-meslek-yuksekokulu","Kale Turizm ve Otel İşletmeciliği Meslek Yüksekokulu"],["kalecik-meslek-yuksekokulu","Kalecik Meslek Yüksekokulu"],["kaman-meslek-yuksekokulu","Kaman Meslek Yüksekokulu"],["kaman-uygulamali-bilimler-yuksekokulu","Kaman Uygulamalı Bilimler Yüksekokulu"],["kamil-ozdag-fen-fakultesi","Kamil Özdağ Fen Fakültesi"],["kandira-meslek-yuksekokulu","Kandıra Meslek Yüksekokulu"],["kangal-meslek-yuksekokulu","Kangal Meslek Yüksekokulu"],["kanik-uygulamali-bilimler-yuksekokulu-ahlat","Kanık Uygulamalı Bilimler Yüksekokulu (Ahlat)"],["kapadokya-meslek-yuksekokulu","Kapadokya Meslek Yüksekokulu"],["karacabey-meslek-yuksekokulu","Karacabey Meslek Yüksekokulu"],["karacasu-memnune-inci-meslek-yuksekokulu","Karacasu Memnune İnci Meslek Yüksekokulu"],["karadeniz-eregli-meslek-yuksekokulu","Karadeniz Ereğli Meslek Yüksekokulu"],["karadeniz-eregli-turizm-fakultesi","Karadeniz Ereğli Turizm Fakültesi"],["karahalli-meslek-yuksekokulu","Karahallı Meslek Yüksekokulu"],["karaisali-meslek-yuksekokulu","Karaisalı Meslek Yüksekokulu"],["karakocan-meslek-yuksekokulu","Karakoçan Meslek Yüksekokulu"],["karamursel-denizcilik-meslek-yuksekokulu","Karamürsel Denizcilik Meslek Yüksekokulu"],["karapinar-aydoganlar-meslek-yuksekokulu","Karapınar Aydoğanlar Meslek Yüksekokulu"],["karatay-meslek-yuksekokulu","Karatay Meslek Yüksekokulu"],["kars-meslek-yuksekokulu","Kars Meslek Yüksekokulu"],["karsiyaka-meslek-yuksekokulu","Karşıyaka Meslek Yüksekokulu"],["kartepe-atcilik-meslek-yuksekokulu","Kartepe Atçılık Meslek Yüksekokulu"],["kartepe-turizm-meslek-yuksekokulu","Kartepe Turizm Meslek Yüksekokulu"],["kavak-meslek-yuksekokulu","Kavak Meslek Yüksekokulu"],["kavaklidere-sehit-mustafa-alper-meslek-yuksekokulu","Kavaklıdere Şehit Mustafa Alper Meslek Yüksekokulu"],["kaynarca-seyfettin-selim-meslek-yuksekokulu","Kaynarca Seyfettin Selim Meslek Yüksekokulu"],["kaynasli-meslek-yuksekokulu","Kaynaşlı Meslek Yüksekokulu"],["kayseri-tip-fakultesi","Kayseri Tıp Fakültesi"],["kazim-karabekir-egitim-fakultesi","Kazım Karabekir Eğitim Fakültesi"],["kazim-karabekir-meslek-yuksekokulu","Kazım Karabekir Meslek Yüksekokulu"],["kazim-karabekir-teknik-bilimler-meslek-yuksekokulu","Kazım Karabekir Teknik Bilimler Meslek Yüksekokulu"],["keban-meslek-yuksekokulu","Keban Meslek Yüksekokulu"],["keciborlu-meslek-yuksekokulu","Keçiborlu Meslek Yüksekokulu"],["keles-meslek-yuksekokulu","Keles Meslek Yüksekokulu"],["kelkit-aydin-dogan-meslek-yuksekokulu","Kelkit Aydın Doğan Meslek Yüksekokulu"],["kelkit-sema-dogan-saglik-hizmetleri-meslek-yuksekokulu","Kelkit Sema Doğan Sağlık Hizmetleri Meslek Yüksekokulu"],["kemah-meslek-yuksekokulu","Kemah Meslek Yüksekokulu"],["kemaliye-haci-ali-akin-meslek-yuksekokulu","Kemaliye Hacı Ali Akın Meslek Yüksekokulu"],["kemaliye-haci-ali-akin-uygulamali-bilimler-yuksekokulu","Kemaliye Hacı Ali Akın Uygulamalı Bilimler Yüksekokulu"],["kemer-denizcilik-fakultesi","Kemer Denizcilik Fakültesi"],["kepsut-meslek-yuksekokulu","Kepsut Meslek Yüksekokulu"],["keskin-meslek-yuksekokulu","Keskin Meslek Yüksekokulu"],["kesan-hakki-yoruk-saglik-yuksekokulu","Keşan Hakkı Yörük Sağlık Yüksekokulu"],["kesan-meslek-yuksekokulu","Keşan Meslek Yüksekokulu"],["kesan-yusuf-capraz-uygulamali-bilimler-yuksekokulu","Keşan Yusuf Çapraz Uygulamalı Bilimler Yüksekokulu"],["kesap-meslek-yuksekokulu","Keşap Meslek Yüksekokulu"],["kirikhan-meslek-yuksekokulu","Kırıkhan Meslek Yüksekokulu"],["kirikkale-meslek-yuksekokulu","Kırıkkale Meslek Yüksekokulu"],["kirkagac-meslek-yuksekokulu","Kırkağaç Meslek Yüksekokulu"],["kizilcahamam-saglik-hizmetleri-meslek-yuksekokulu","Kızılcahamam Sağlık Hizmetleri Meslek Yüksekokulu"],["kiziltepe-tarim-bilimleri-ve-teknolojileri-fakultesi","Kızıltepe Tarım Bilimleri ve Teknolojileri Fakültesi"],["kilisli-muallim-rifat-egitim-fakultesi","Kilisli Muallim Rıfat Eğitim Fakültesi"],["kimya-metalurji-fakultesi","Kimya-Metalurji Fakültesi"],["kiraz-meslek-yuksekokulu","Kiraz Meslek Yüksekokulu"],["kocaeli-meslek-yuksekokulu","Kocaeli Meslek Yüksekokulu"],["kocaeli-saglik-hizmetleri-meslek-yuksekokulu","Kocaeli Sağlık Hizmetleri Meslek Yüksekokulu"],["kocarli-meslek-yuksekokulu","Koçarlı Meslek Yüksekokulu"],["konya-eregli-kemal-akman-meslek-yuksekokulu","Konya Ereğli Kemal Akman Meslek Yüksekokulu"],["konya-organize-sanayi-bolgesi-meslek-yuksekokulu","Konya Organize Sanayi Bölgesi Meslek Yüksekokulu"],["konya-saglik-hizmetleri-meslek-yuksekokulu","Konya Sağlık Hizmetleri Meslek Yüksekokulu"],["korkuteli-meslek-yuksekokulu","Korkuteli Meslek Yüksekokulu"],["kovancilar-meslek-yuksekokulu","Kovancılar Meslek Yüksekokulu"],["koyulhisar-meslek-yuksekokulu","Koyulhisar Meslek Yüksekokulu"],["kozakli-meslek-yuksekokulu","Kozaklı Meslek Yüksekokulu"],["kozan-isletme-fakultesi","Kozan İşletme Fakültesi"],["kozan-meslek-yuksekokulu","Kozan Meslek Yüksekokulu"],["kozluk-meslek-yuksekokulu","Kozluk Meslek Yüksekokulu"],["koprubasi-meslek-yuksekokulu","Köprübaşı Meslek Yüksekokulu"],["kosk-meslek-yuksekokulu","Köşk Meslek Yüksekokulu"],["koycegiz-meslek-yuksekokulu","Köyceğiz Meslek Yüksekokulu"],["kula-meslek-yuksekokulu","Kula Meslek Yüksekokulu"],["kulu-meslek-yuksekokulu","Kulu Meslek Yüksekokulu"],["kulu-saglik-bilimleri-fakultesi","Kulu Sağlık Bilimleri Fakültesi"],["kumluca-meslek-yuksekokulu","Kumluca Meslek Yüksekokulu"],["kumluca-saglik-bilimleri-fakultesi","Kumluca Sağlık Bilimleri Fakültesi"],["kursunlu-meslek-yuksekokulu","Kurşunlu Meslek Yüksekokulu"],["kurtalan-meslek-yuksekokulu","Kurtalan Meslek Yüksekokulu"],["kusadasi-davutlar-meslek-yuksekokulu","Kuşadası Davutlar Meslek Yüksekokulu"],["kultur-varliklarini-koruma-ve-onarim-yuksekokulu","Kültür Varlıklarını Koruma ve Onarım Yüksekokulu"],["kultur-ve-sosyal-bilimler-fakultesi","Kültür ve Sosyal Bilimler Fakültesi"],["kure-meslek-yuksekokulu","Küre Meslek Yüksekokulu"],["kurtun-meslek-yuksekokulu","Kürtün Meslek Yüksekokulu"],["kutahya-guzel-sanatlar-meslek-yuksekokulu","Kütahya Güzel Sanatlar Meslek Yüksekokulu"],["kutahya-meslek-yuksekokulu","Kütahya Meslek Yüksekokulu"],["kutahya-sosyal-bilimler-meslek-yuksekokulu","Kütahya Sosyal Bilimler Meslek Yüksekokulu"],["kutahya-teknik-bilimler-meslek-yuksekokulu","Kütahya Teknik Bilimler Meslek Yüksekokulu"],["kutahya-uygulamali-bilimler-fakultesi","Kütahya Uygulamalı Bilimler Fakültesi"],["ladik-meslek-yuksekokulu","Ladik Meslek Yüksekokulu"],["lapseki-meslek-yuksekokulu","Lapseki Meslek Yüksekokulu"],["luleburgaz-meslek-yuksekokulu","Lüleburgaz Meslek Yüksekokulu"],["macka-meslek-yuksekokulu","Maçka Meslek Yüksekokulu"],["maden-fakultesi","Maden Fakültesi"],["mahmudiye-atcilik-meslek-yuksekokulu","Mahmudiye Atçılık Meslek Yüksekokulu"],["makine-fakultesi","Makine Fakültesi"],["malatya-meslek-yuksekokulu","Malatya Meslek Yüksekokulu"],["malatya-osb-meslek-yuksekokulu","Malatya Osb Meslek Yüksekokulu"],["malazgirt-meslek-yuksekokulu","Malazgirt Meslek Yüksekokulu"],["malkara-meslek-yuksekokulu","Malkara Meslek Yüksekokulu"],["manavgat-meslek-yuksekokulu","Manavgat Meslek Yüksekokulu"],["manavgat-sosyal-ve-beseri-bilimler-fakultesi","Manavgat Sosyal ve Beşeri Bilimler Fakültesi"],["manavgat-turizm-fakultesi","Manavgat Turizm Fakültesi"],["manavgat-yabanci-diller-fakultesi","Manavgat Yabancı Diller Fakültesi"],["manisa-saglik-hizmetleri-meslek-yuksekokulu","Manisa Sağlık Hizmetleri Meslek Yüksekokulu"],["manisa-teknik-bilimler-meslek-yuksekokulu","Manisa Teknik Bilimler Meslek Yüksekokulu"],["manyas-meslek-yuksekokulu","Manyas Meslek Yüksekokulu"],["marmara-ereglisi-meslek-yuksekokulu","Marmara Ereğlisi Meslek Yüksekokulu"],["marmaris-turizm-meslek-yuksekokulu","Marmaris Turizm Meslek Yüksekokulu"],["mehmet-tanrikulu-saglik-hizmetleri-meslek-yuksekokulu","Mehmet Tanrıkulu Sağlık Hizmetleri Meslek Yüksekokulu"],["mengen-meslek-yuksekokulu","Mengen Meslek Yüksekokulu"],["mennan-pasinli-atcilik-meslek-yuksekokulu","Mennan Pasinli Atçılık Meslek Yüksekokulu"],["meram-meslek-yuksekokulu","Meram Meslek Yüksekokulu"],["mersin-tarsus-organize-sanayi-bolgesi-teknik-bilimler-meslek-yuksekokulu","Mersin Tarsus Organize Sanayi Bölgesi Teknik Bilimler Meslek Yüksekokulu"],["merzifon-iktisadi-ve-idari-bilimler-fakultesi","Merzifon İktisadi ve İdari Bilimler Fakültesi"],["merzifon-meslek-yuksekokulu","Merzifon Meslek Yüksekokulu"],["meslek-yuksekokulu","Meslek Yüksekokulu"],["mesudiye-meslek-yuksekokulu","Mesudiye Meslek Yüksekokulu"],["midyat-meslek-yuksekokulu","Midyat Meslek Yüksekokulu"],["midyat-sanat-ve-tasarim-fakultesi","Midyat Sanat ve Tasarım Fakültesi"],["milas-meslek-yuksekokulu","Milas Meslek Yüksekokulu"],["milas-veteriner-fakultesi","Milas Veteriner Fakültesi"],["mimarlik-fakultesi","Mimarlık Fakültesi"],["mimarlik-ve-guzel-sanatlar-fakultesi","Mimarlık ve Güzel Sanatlar Fakültesi"],["mimarlik-ve-muhendislik-fakultesi","Mimarlık ve Mühendislik Fakültesi"],["mimarlik-ve-tasarim-fakultesi","Mimarlık ve Tasarım Fakültesi"],["mimarlik-guzel-sanatlar-ve-tasarim-fakultesi","Mimarlık, Güzel Sanatlar ve Tasarım Fakültesi"],["mimarlik-tasarim-ve-guzel-sanatlar-fakultesi","Mimarlık, Tasarım ve Güzel Sanatlar Fakültesi"],["moda-ve-tasarim-yuksekokulu","Moda ve Tasarım Yüksekokulu"],["mucur-meslek-yuksekokulu","Mucur Meslek Yüksekokulu"],["mudurnu-sureyya-astarci-meslek-yuksekokulu","Mudurnu Süreyya Astarcı Meslek Yüksekokulu"],["mugla-meslek-yuksekokulu","Muğla Meslek Yüksekokulu"],["mugla-saglik-hizmetleri-meslek-yuksekokulu-marmaris","Muğla Sağlık Hizmetleri Meslek Yüksekokulu (Marmaris)"],["muradiye-meslek-yuksekokulu","Muradiye Meslek Yüksekokulu"],["muratli-meslek-yuksekokulu","Muratlı Meslek Yüksekokulu"],["mustafa-baysan-meslek-yuksekokulu","Mustafa Baysan Meslek Yüksekokulu"],["mustafa-cikrikcioglu-meslek-yuksekokulu","Mustafa Çıkrıkçıoğlu Meslek Yüksekokulu"],["mustafakemalpasa-meslek-yuksekokulu","Mustafakemalpaşa Meslek Yüksekokulu"],["mut-meslek-yuksekokulu","Mut Meslek Yüksekokulu"],["mutfak-sanatlari-meslek-yuksekokulu","Mutfak Sanatları Meslek Yüksekokulu"],["muhendislik-fakultesi","Mühendislik Fakültesi"],["muhendislik-ve-doga-bilimleri-fakultesi","Mühendislik ve Doğa Bilimleri Fakültesi"],["muhendislik-ve-mimarlik-fakultesi","Mühendislik ve Mimarlık Fakültesi"],["muhendislik-ve-teknoloji-fakultesi","Mühendislik ve Teknoloji Fakültesi"],["muhendislik-mimarlik-ve-tasarim-fakultesi","Mühendislik, Mimarlık ve Tasarım Fakültesi"],["muhendislik-mimarlik-fakultesi","Mühendislik-Mimarlık Fakültesi"],["muzik-ve-guzel-sanatlar-meslek-yuksekokulu","Müzik ve Güzel Sanatlar Meslek Yüksekokulu"],["naci-topcuoglu-meslek-yuksekokulu","Naci Topçuoğlu Meslek Yüksekokulu"],["nallihan-meslek-yuksekokulu","Nallıhan Meslek Yüksekokulu"],["narman-meslek-yuksekokulu","Narman Meslek Yüksekokulu"],["nazilli-iktisadi-ve-idari-bilimler-fakultesi","Nazilli İktisadi ve İdari Bilimler Fakültesi"],["nazilli-meslek-yuksekokulu","Nazilli Meslek Yüksekokulu"],["nazilli-saglik-hizmetleri-meslek-yuksekokulu","Nazilli Sağlık Hizmetleri Meslek Yüksekokulu"],["necatibey-egitim-fakultesi","Necatibey Eğitim Fakültesi"],["nezahat-kelesoglu-saglik-bilimleri-fakultesi","Nezahat Keleşoğlu Sağlık Bilimleri Fakültesi"],["nigde-sosyal-bilimler-meslek-yuksekokulu","Niğde Sosyal Bilimler Meslek Yüksekokulu"],["nigde-teknik-bilimler-meslek-yuksekokulu","Niğde Teknik Bilimler Meslek Yüksekokulu"],["nigde-zubeyde-hanim-saglik-hizmetleri-meslek-yuksekokulu","Niğde Zübeyde Hanım Sağlık Hizmetleri Meslek Yüksekokulu"],["nihat-delibalta-gole-meslek-yuksekokulu","Nihat Delibalta Göle Meslek Yüksekokulu"],["niksar-meslek-yuksekokulu","Niksar Meslek Yüksekokulu"],["niksar-uygulamali-bilimler-fakultesi","Niksar Uygulamalı Bilimler Fakültesi"],["nizip-egitim-fakultesi","Nizip Eğitim Fakültesi"],["nizip-meslek-yuksekokulu","Nizip Meslek Yüksekokulu"],["nurdagi-meslek-yuksekokulu","Nurdağı Meslek Yüksekokulu"],["nusaybin-meslek-yuksekokulu","Nusaybin Meslek Yüksekokulu"],["odtu-kuzey-kibris-kampusu-kktc-guzelyurt","ODTÜ Kuzey Kıbrıs Kampusu (KKTC-Güzelyurt)"],["of-teknoloji-fakultesi","Of Teknoloji Fakültesi"],["oguzeli-meslek-yuksekokulu","Oğuzeli Meslek Yüksekokulu"],["okul-oncesi-egitim-psikolojik-danismanlik-ve-isitme-engelliler-fakultesi","Okul Öncesi Eğitim, Psikolojik Danışmanlık ve İşitme Engelliler Fakültesi"],["oltu-beseri-ve-sosyal-bilimler-fakultesi","Oltu Beşeri ve Sosyal Bilimler Fakültesi"],["oltu-meslek-yuksekokulu","Oltu Meslek Yüksekokulu"],["organize-sanayi-bolgesi-meslek-yuksekokulu","Organize Sanayi Bölgesi Meslek Yüksekokulu"],["orhaneli-meslek-yuksekokulu","Orhaneli Meslek Yüksekokulu"],["orhangazi-yenikoy-asil-celik-meslek-yuksekokulu","Orhangazi Yeniköy Asil Çelik Meslek Yüksekokulu"],["orman-fakultesi","Orman Fakültesi"],["ormancilik-meslek-yuksekokulu","Ormancılık Meslek Yüksekokulu"],["ortaca-meslek-yuksekokulu","Ortaca Meslek Yüksekokulu"],["ortakoy-meslek-yuksekokulu","Ortaköy Meslek Yüksekokulu"],["osmancik-omer-derindere-meslek-yuksekokulu","Osmancık Ömer Derindere Meslek Yüksekokulu"],["osmaneli-meslek-yuksekokulu","Osmaneli Meslek Yüksekokulu"],["osmaniye-meslek-yuksekokulu","Osmaniye Meslek Yüksekokulu"],["odemis-meslek-yuksekokulu","Ödemiş Meslek Yüksekokulu"],["odemis-saglik-bilimleri-fakultesi","Ödemiş Sağlık Bilimleri Fakültesi"],["omer-seyfettin-uygulamali-bilimler-fakultesi","Ömer Seyfettin Uygulamalı Bilimler Fakültesi"],["omerli-meslek-yuksekokulu","Ömerli Meslek Yüksekokulu"],["ozalp-meslek-yuksekokulu","Özalp Meslek Yüksekokulu"],["ozdemir-bayraktar-havacilik-ve-uzay-bilimleri-fakultesi","Özdemir Bayraktar Havacılık ve Uzay Bilimleri Fakültesi"],["pamukova-meslek-yuksekokulu","Pamukova Meslek Yüksekokulu"],["pasinler-meslek-yuksekokulu","Pasinler Meslek Yüksekokulu"],["patnos-meslek-yuksekokulu","Patnos Meslek Yüksekokulu"],["patnos-sosyal-hizmetler-yuksekokulu","Patnos Sosyal Hizmetler Yüksekokulu"],["pazar-meslek-yuksekokulu","Pazar Meslek Yüksekokulu"],["pazarcik-meslek-yuksekokulu","Pazarcık Meslek Yüksekokulu"],["pazarlar-meslek-yuksekokulu","Pazarlar Meslek Yüksekokulu"],["pazaryeri-meslek-yuksekokulu","Pazaryeri Meslek Yüksekokulu"],["pertek-sakine-genc-meslek-yuksekokulu","Pertek Sakine Genç Meslek Yüksekokulu"],["pinarbasi-meslek-yuksekokulu","Pınarbaşı Meslek Yüksekokulu"],["pinarhisar-meslek-yuksekokulu","Pınarhisar Meslek Yüksekokulu"],["plato-meslek-yuksekokulu","Plato Meslek Yüksekokulu"],["polatli-fen-edebiyat-fakultesi","Polatlı Fen-Edebiyat Fakültesi"],["polatli-sosyal-bilimler-meslek-yuksekokulu","Polatlı Sosyal Bilimler Meslek Yüksekokulu"],["porsuk-meslek-yuksekokulu","Porsuk Meslek Yüksekokulu"],["posof-meslek-yuksekokulu","Posof Meslek Yüksekokulu"],["pozanti-meslek-yuksekokulu","Pozantı Meslek Yüksekokulu"],["rafet-kayis-muhendislik-fakultesi","Rafet Kayış Mühendislik Fakültesi"],["refahiye-bahar-yildirim-saglik-hizmetleri-meslek-yuksekokulu","Refahiye Bahar Yıldırım Sağlık Hizmetleri Meslek Yüksekokulu"],["refahiye-meslek-yuksekokulu","Refahiye Meslek Yüksekokulu"],["resadiye-meslek-yuksekokulu","Reşadiye Meslek Yüksekokulu"],["reyhanli-sosyal-bilimler-meslek-yuksekokulu","Reyhanlı Sosyal Bilimler Meslek Yüksekokulu"],["sabuncuoglu-serefeddin-saglik-hizmetleri-meslek-yuksekokulu","Sabuncuoğlu Şerefeddin Sağlık Hizmetleri Meslek Yüksekokulu"],["safiye-cikrikcioglu-meslek-yuksekokulu","Safiye Çıkrıkçıoğlu Meslek Yüksekokulu"],["safranbolu-basak-cengiz-mimarlik-fakultesi","Safranbolu Başak Cengiz Mimarlık Fakültesi"],["safranbolu-fethi-toker-guzel-sanatlar-ve-tasarim-fakultesi","Safranbolu Fethi Toker Güzel Sanatlar ve Tasarım Fakültesi"],["safranbolu-sefik-yilmaz-dizdar-meslek-yuksekokulu","Safranbolu Şefik Yılmaz Dizdar Meslek Yüksekokulu"],["safranbolu-turizm-fakultesi","Safranbolu Turizm Fakültesi"],["safranbolu-turker-inanoglu-iletisim-fakultesi","Safranbolu Türker İnanoğlu İletişim Fakültesi"],["saglik-bilimleri-fakultesi","Sağlık Bilimleri Fakültesi"],["saglik-bilimleri-fakultesi-akyazi","Sağlık Bilimleri Fakültesi (Akyazı)"],["saglik-bilimleri-fakultesi-piraziz","Sağlık Bilimleri Fakültesi (Piraziz)"],["saglik-bilimleri-meslek-yuksekokulu","Sağlık Bilimleri Meslek Yüksekokulu"],["saglik-bilimleri-yuksekokulu","Sağlık Bilimleri Yüksekokulu"],["saglik-hizmetleri-meslek-yuksekokulu","Sağlık Hizmetleri Meslek Yüksekokulu"],["saglik-hizmetleri-yuksekokulu","Sağlık Hizmetleri Yüksekokulu"],["saglik-meslek-yuksekokulu","Sağlık Meslek Yüksekokulu"],["sakarya-meslek-yuksekokulu","Sakarya Meslek Yüksekokulu"],["sakarya-saglik-hizmetleri-meslek-yuksekokulu","Sakarya Sağlık Hizmetleri Meslek Yüksekokulu"],["salihli-iktisadi-ve-idari-bilimler-fakultesi","Salihli İktisadi ve İdari Bilimler Fakültesi"],["salihli-meslek-yuksekokulu","Salihli Meslek Yüksekokulu"],["samandag-meslek-yuksekokulu","Samandağ Meslek Yüksekokulu"],["samsun-meslek-yuksekokulu","Samsun Meslek Yüksekokulu"],["sanat-fakultesi","Sanat Fakültesi"],["sanat-ve-sosyal-bilimler-fakultesi","Sanat ve Sosyal Bilimler Fakültesi"],["sanat-ve-tasarim-fakultesi","Sanat ve Tasarım Fakültesi"],["sanat-ve-tasarim-fakultesi-arhavi","Sanat ve Tasarım Fakültesi (Arhavi)"],["sanat-ve-tasarim-meslek-yuksekokulu","Sanat ve Tasarım Meslek Yüksekokulu"],["sanat-tasarim-ve-mimarlik-fakultesi","Sanat, Tasarım ve Mimarlık Fakültesi"],["sandikli-meslek-yuksekokulu","Sandıklı Meslek Yüksekokulu"],["sandikli-uygulamali-bilimler-yuksekokulu","Sandıklı Uygulamalı Bilimler Yüksekokulu"],["sapanca-meslek-yuksekokulu","Sapanca Meslek Yüksekokulu"],["sapanca-turizm-meslek-yuksekokulu","Sapanca Turizm Meslek Yüksekokulu"],["saray-meslek-yuksekokulu","Saray Meslek Yüksekokulu"],["saraybosna-uluslararasi-dis-hekimligi-fakultesi","Saraybosna Uluslararası Diş Hekimliği Fakültesi"],["saraybosna-uluslararasi-tip-fakultesi","Saraybosna Uluslararası Tıp Fakültesi"],["saraykoy-meslek-yuksekokulu","Sarayköy Meslek Yüksekokulu"],["sarayonu-meslek-yuksekokulu","Sarayönü Meslek Yüksekokulu"],["sarigol-meslek-yuksekokulu","Sarıgöl Meslek Yüksekokulu"],["sarikamis-meslek-yuksekokulu","Sarıkamış Meslek Yüksekokulu"],["sarikamis-turizm-fakultesi","Sarıkamış Turizm Fakültesi"],["sarikaya-fizyoterapi-ve-rehabilitasyon-yuksekokulu","Sarıkaya Fizyoterapi ve Rehabilitasyon Yüksekokulu"],["saruhanli-meslek-yuksekokulu","Saruhanlı Meslek Yüksekokulu"],["sason-meslek-yuksekokulu","Sason Meslek Yüksekokulu"],["savastepe-meslek-yuksekokulu","Savaştepe Meslek Yüksekokulu"],["savur-meslek-yuksekokulu","Savur Meslek Yüksekokulu"],["seben-izzet-baysal-meslek-yuksekokulu","Seben İzzet Baysal Meslek Yüksekokulu"],["semra-ve-vefa-kucuk-saglik-bilimleri-fakultesi","Semra ve Vefa Küçük Sağlık Bilimleri Fakültesi"],["senirkent-meslek-yuksekokulu","Senirkent Meslek Yüksekokulu"],["serik-gulsun-suleyman-sural-meslek-yuksekokulu","Serik Gülsün-Süleyman Süral Meslek Yüksekokulu"],["serik-isletme-fakultesi","Serik İşletme Fakültesi"],["serinhisar-meslek-yuksekokulu","Serinhisar Meslek Yüksekokulu"],["seydikemer-uygulamali-bilimler-yuksekokulu","Seydikemer Uygulamalı Bilimler Yüksekokulu"],["seydisehir-ahmet-cengiz-muhendislik-fakultesi","Seydişehir Ahmet Cengiz Mühendislik Fakültesi"],["seydisehir-kamil-akkanat-saglik-bilimleri-fakultesi","Seydişehir Kamil Akkanat Sağlık Bilimleri Fakültesi"],["seydisehir-meslek-yuksekokulu","Seydişehir Meslek Yüksekokulu"],["seydisehir-saglik-hizmetleri-meslek-yuksekokulu","Seydişehir Sağlık Hizmetleri Meslek Yüksekokulu"],["sezai-karakoc-edebiyat-fakultesi","Sezai Karakoç Edebiyat Fakültesi"],["sindirgi-meslek-yuksekokulu","Sındırgı Meslek Yüksekokulu"],["siber-guvenlik-meslek-yuksekokulu","Siber Güvenlik Meslek Yüksekokulu"],["silah-ihtisas-organize-sanayi-bolgesi-meslek-yuksekokulu","Silah İhtisas Organize Sanayi Bölgesi Meslek Yüksekokulu"],["silifke-meslek-yuksekokulu","Silifke Meslek Yüksekokulu"],["silifke-tasucu-meslek-yuksekokulu","Silifke Taşucu Meslek Yüksekokulu"],["silifke-uygulamali-teknoloji-ve-isletmecilik-yuksekokulu","Silifke Uygulamalı Teknoloji ve İşletmecilik Yüksekokulu"],["silopi-meslek-yuksekokulu","Silopi Meslek Yüksekokulu"],["silvan-meslek-yuksekokulu","Silvan Meslek Yüksekokulu"],["simav-meslek-yuksekokulu","Simav Meslek Yüksekokulu"],["simav-saglik-hizmetleri-meslek-yuksekokulu","Simav Sağlık Hizmetleri Meslek Yüksekokulu"],["simav-teknoloji-fakultesi","Simav Teknoloji Fakültesi"],["sinanpasa-meslek-yuksekokulu","Sinanpaşa Meslek Yüksekokulu"],["sivas-meslek-yuksekokulu","Sivas Meslek Yüksekokulu"],["sivas-teknik-bilimler-meslek-yuksekokulu","Sivas Teknik Bilimler Meslek Yüksekokulu"],["sivasli-meslek-yuksekokulu","Sivaslı Meslek Yüksekokulu"],["siverek-meslek-yuksekokulu","Siverek Meslek Yüksekokulu"],["siverek-uygulamali-bilimler-fakultesi","Siverek Uygulamalı Bilimler Fakültesi"],["sivil-havacilik-meslek-yuksekokulu","Sivil Havacılık Meslek Yüksekokulu"],["sivil-havacilik-yuksekokulu","Sivil Havacılık Yüksekokulu"],["sivil-havacilik-yuksekokulu-keciborlu","Sivil Havacılık Yüksekokulu (Keçiborlu)"],["sivrice-meslek-yuksekokulu","Sivrice Meslek Yüksekokulu"],["sivrihisar-meslek-yuksekokulu","Sivrihisar Meslek Yüksekokulu"],["siyasal-bilgiler-fakultesi","Siyasal Bilgiler Fakültesi"],["siyasal-bilimler-fakultesi","Siyasal Bilimler Fakültesi"],["solhan-saglik-hizmetleri-meslek-yuksekokulu","Solhan Sağlık Hizmetleri Meslek Yüksekokulu"],["soma-meslek-yuksekokulu","Soma Meslek Yüksekokulu"],["sorgun-meslek-yuksekokulu","Sorgun Meslek Yüksekokulu"],["sosyal-bilimler-fakultesi","Sosyal Bilimler Fakültesi"],["sosyal-bilimler-meslek-yuksekokulu","Sosyal Bilimler Meslek Yüksekokulu"],["sosyal-ve-beseri-bilimler-fakultesi","Sosyal ve Beşeri Bilimler Fakültesi"],["sogut-meslek-yuksekokulu","Söğüt Meslek Yüksekokulu"],["soke-isletme-fakultesi","Söke İşletme Fakültesi"],["soke-meslek-yuksekokulu","Söke Meslek Yüksekokulu"],["soke-saglik-hizmetleri-meslek-yuksekokulu","Söke Sağlık Hizmetleri Meslek Yüksekokulu"],["spor-bilimleri-fakultesi","Spor Bilimleri Fakültesi"],["su-bilimleri-fakultesi","Su Bilimleri Fakültesi"],["su-urunleri-fakultesi","Su Ürünleri Fakültesi"],["sultandagi-meslek-yuksekokulu","Sultandağı Meslek Yüksekokulu"],["sultanhisar-meslek-yuksekokulu","Sultanhisar Meslek Yüksekokulu"],["suluova-meslek-yuksekokulu","Suluova Meslek Yüksekokulu"],["sungurlu-meslek-yuksekokulu","Sungurlu Meslek Yüksekokulu"],["suruc-meslek-yuksekokulu","Suruç Meslek Yüksekokulu"],["susurluk-tarim-ve-orman-meslek-yuksekokulu","Susurluk Tarım ve Orman Meslek Yüksekokulu"],["susuz-meslek-yuksekokulu","Susuz Meslek Yüksekokulu"],["susehri-saglik-yuksekokulu","Suşehri Sağlık Yüksekokulu"],["susehri-timur-karabal-meslek-yuksekokulu","Suşehri Timur Karabal Meslek Yüksekokulu"],["surmene-abdullah-kanca-meslek-yuksekokulu","Sürmene Abdullah Kanca Meslek Yüksekokulu"],["surmene-deniz-bilimleri-fakultesi","Sürmene Deniz Bilimleri Fakültesi"],["sutculer-prof-dr-hasan-gurbuz-meslek-yuksekokulu","Sütçüler Prof.dr.hasan Gürbüz Meslek Yüksekokulu"],["sabanozu-meslek-yuksekokulu","Şabanözü Meslek Yüksekokulu"],["salpazari-meslek-yuksekokulu","Şalpazarı Meslek Yüksekokulu"],["sanliurfa-saglik-hizmetleri-meslek-yuksekokulu","Şanlıurfa Sağlık Hizmetleri Meslek Yüksekokulu"],["sanliurfa-sosyal-bilimler-meslek-yuksekokulu","Şanlıurfa Sosyal Bilimler Meslek Yüksekokulu"],["sanliurfa-teknik-bilimler-meslek-yuksekokulu","Şanlıurfa Teknik Bilimler Meslek Yüksekokulu"],["saphane-meslek-yuksekokulu","Şaphane Meslek Yüksekokulu"],["sarkisla-asik-veysel-meslek-yuksekokulu","Şarkışla Aşık Veysel Meslek Yüksekokulu"],["sarkisla-uygulamali-bilimler-yuksekokulu","Şarkışla Uygulamalı Bilimler Yüksekokulu"],["sarkikaraagac-meslek-yuksekokulu","Şarkikaraağaç Meslek Yüksekokulu"],["sarkikaraagac-turizm-meslek-yuksekokulu","Şarkikaraağaç Turizm Meslek Yüksekokulu"],["sarkoy-meslek-yuksekokulu","Şarköy Meslek Yüksekokulu"],["savsat-meslek-yuksekokulu","Şavşat Meslek Yüksekokulu"],["sebinkarahisar-meslek-yuksekokulu","Şebinkarahisar Meslek Yüksekokulu"],["sebinkarahisar-saglik-hizmetleri-meslek-yuksekokulu","Şebinkarahisar Sağlık Hizmetleri Meslek Yüksekokulu"],["sebinkarahisar-uygulamali-bilimler-yuksekokulu","Şebinkarahisar Uygulamalı Bilimler Yüksekokulu"],["sefaatli-meslek-yuksekokulu","Şefaatli Meslek Yüksekokulu"],["sehit-ressam-hasan-riza-guzel-sanatlar-meslek-yuksekokulu","Şehit Ressam Hasan Rıza Güzel Sanatlar Meslek Yüksekokulu"],["sereflikochisar-berat-comertoglu-meslek-yuksekokulu","Şereflikoçhisar Berat Cömertoğlu Meslek Yüksekokulu"],["sereflikochisar-uygulamali-bilimler-fakultesi","Şereflikoçhisar Uygulamalı Bilimler Fakültesi"],["sirnak-meslek-yuksekokulu","Şırnak Meslek Yüksekokulu"],["siran-dursun-keles-saglik-hizmetleri-meslek-yuksekokulu","Şiran Dursun Keleş Sağlık Hizmetleri Meslek Yüksekokulu"],["siran-mustafa-beyaz-meslek-yuksekokulu","Şiran Mustafa Beyaz Meslek Yüksekokulu"],["suhut-meslek-yuksekokulu","Şuhut Meslek Yüksekokulu"],["suhut-saglik-hizmetleri-meslek-yuksekokulu","Şuhut Sağlık Hizmetleri Meslek Yüksekokulu"],["tapu-kadastro-yuksekokulu","Tapu Kadastro Yüksekokulu"],["tarim-bilimleri-ve-teknoloji-fakultesi","Tarım Bilimleri ve Teknoloji Fakültesi"],["tarim-bilimleri-ve-teknolojileri-fakultesi","Tarım Bilimleri ve Teknolojileri Fakültesi"],["tarim-ve-doga-bilimleri-fakultesi","Tarım ve Doğa Bilimleri Fakültesi"],["tasarim-fakultesi","Tasarım Fakültesi"],["tasarim-meslek-yuksekokulu","Tasarım Meslek Yüksekokulu"],["taskent-meslek-yuksekokulu","Taşkent Meslek Yüksekokulu"],["taskopru-meslek-yuksekokulu","Taşköprü Meslek Yüksekokulu"],["tasova-yuksel-akin-meslek-yuksekokulu","Taşova Yüksel Akın Meslek Yüksekokulu"],["tatvan-meslek-yuksekokulu","Tatvan Meslek Yüksekokulu"],["tavas-meslek-yuksekokulu","Tavas Meslek Yüksekokulu"],["tavas-saglik-hizmetleri-meslek-yuksekokulu","Tavas Sağlık Hizmetleri Meslek Yüksekokulu"],["tavsanli-meslek-yuksekokulu","Tavşanlı Meslek Yüksekokulu"],["tavsanli-saglik-hizmetleri-meslek-yuksekokulu","Tavşanlı Sağlık Hizmetleri Meslek Yüksekokulu"],["tavsanli-uygulamali-bilimler-fakultesi","Tavşanlı Uygulamalı Bilimler Fakültesi"],["tayfur-ata-sokmen-tip-fakultesi","Tayfur Ata Sökmen Tıp Fakültesi"],["tefenni-meslek-yuksekokulu","Tefenni Meslek Yüksekokulu"],["teknik-bilimler-meslek-yuksekokulu","Teknik Bilimler Meslek Yüksekokulu"],["teknoloji-fakultesi","Teknoloji Fakültesi"],["tekstil-teknolojileri-ve-tasarimi-fakultesi","Tekstil Teknolojileri ve Tasarımı Fakültesi"],["temel-bilimler-fakultesi","Temel Bilimler Fakültesi"],["teoman-durali-insan-ve-toplum-bilimleri-fakultesi","Teoman Duralı İnsan ve Toplum Bilimleri Fakültesi"],["tercan-meslek-yuksekokulu","Tercan Meslek Yüksekokulu"],["termal-saglik-hizmetleri-meslek-yuksekokulu","Termal Sağlık Hizmetleri Meslek Yüksekokulu"],["terme-meslek-yuksekokulu","Terme Meslek Yüksekokulu"],["tip-fakultesi","Tıp Fakültesi"],["ticaret-ve-sanayi-meslek-yuksekokulu","Ticaret ve Sanayi Meslek Yüksekokulu"],["ticari-bilimler-fakultesi","Ticari Bilimler Fakültesi"],["tire-kutsan-meslek-yuksekokulu","Tire Kutsan Meslek Yüksekokulu"],["tirebolu-iletisim-fakultesi","Tirebolu İletişim Fakültesi"],["tirebolu-mehmet-bayrak-meslek-yuksekokulu","Tirebolu Mehmet Bayrak Meslek Yüksekokulu"],["tokat-meslek-yuksekokulu","Tokat Meslek Yüksekokulu"],["tokat-saglik-hizmetleri-meslek-yuksekokulu","Tokat Sağlık Hizmetleri Meslek Yüksekokulu"],["tomarza-mustafa-akincioglu-meslek-yuksekokulu","Tomarza Mustafa Akıncıoğlu Meslek Yüksekokulu"],["tonya-meslek-yuksekokulu","Tonya Meslek Yüksekokulu"],["torbali-meslek-yuksekokulu","Torbalı Meslek Yüksekokulu"],["tortum-meslek-yuksekokulu","Tortum Meslek Yüksekokulu"],["torul-meslek-yuksekokulu","Torul Meslek Yüksekokulu"],["tosya-meslek-yuksekokulu","Tosya Meslek Yüksekokulu"],["trabzon-meslek-yuksekokulu","Trabzon Meslek Yüksekokulu"],["tufanbeyli-meslek-yuksekokulu","Tufanbeyli Meslek Yüksekokulu"],["tunca-meslek-yuksekokulu","Tunca Meslek Yüksekokulu"],["tunceli-meslek-yuksekokulu","Tunceli Meslek Yüksekokulu"],["turgut-kiran-denizcilik-fakultesi","Turgut Kıran Denizcilik Fakültesi"],["turgutlu-meslek-yuksekokulu","Turgutlu Meslek Yüksekokulu"],["turhal-meslek-yuksekokulu","Turhal Meslek Yüksekokulu"],["turhal-saglik-hizmetleri-meslek-yuksekokulu","Turhal Sağlık Hizmetleri Meslek Yüksekokulu"],["turhal-uygulamali-bilimler-fakultesi","Turhal Uygulamalı Bilimler Fakültesi"],["turizm-fakultesi","Turizm Fakültesi"],["turizm-fakultesi-bafra","Turizm Fakültesi (Bafra)"],["turizm-fakultesi-egirdir","Turizm Fakültesi (Eğirdir)"],["turizm-fakultesi-ilgaz","Turizm Fakültesi (Ilgaz)"],["turizm-fakultesi-kusadasi","Turizm Fakültesi (Kuşadası)"],["turizm-fakultesi-sapanca","Turizm Fakültesi (Sapanca)"],["turizm-isletmeciligi-ve-otelcilik-yuksekokulu","Turizm İşletmeciliği ve Otelcilik Yüksekokulu"],["turizm-ve-otel-isletmeciligi-meslek-yuksekokulu","Turizm ve Otel İşletmeciliği Meslek Yüksekokulu"],["turizm-ve-otel-isletmeciligi-yuksekokulu","Turizm ve Otel İşletmeciliği Yüksekokulu"],["turizm-ve-otelcilik-meslek-yuksekokulu","Turizm ve Otelcilik Meslek Yüksekokulu"],["turizm-ve-otelcilik-yuksekokulu","Turizm ve Otelcilik Yüksekokulu"],["tusas-kazan-meslek-yuksekokulu","TUSAŞ-Kazan Meslek Yüksekokulu"],["tuzluca-meslek-yuksekokulu","Tuzluca Meslek Yüksekokulu"],["turkeli-meslek-yuksekokulu","Türkeli Meslek Yüksekokulu"],["turkistan-meslek-yuksekokulu","Türkistan Meslek Yüksekokulu"],["turkiye-odalar-ve-borsalar-birligi-teknik-bilimler-meslek-yuksekokulu","Türkiye Odalar ve Borsalar Birliği Teknik Bilimler Meslek Yüksekokulu"],["turkoglu-meslek-yuksekokulu","Türkoğlu Meslek Yüksekokulu"],["tutun-eksperligi-yuksekokulu","Tütün Eksperliği Yüksekokulu"],["ucak-ve-uzay-bilimleri-fakultesi","Uçak ve Uzay Bilimleri Fakültesi"],["ula-ali-kocman-meslek-yuksekokulu","Ula Ali Koçman Meslek Yüksekokulu"],["ulastirma-meslek-yuksekokulu","Ulaştırma Meslek Yüksekokulu"],["ulastirma-ve-lojistik-fakultesi","Ulaştırma ve Lojistik Fakültesi"],["ulubey-meslek-yuksekokulu","Ulubey Meslek Yüksekokulu"],["uluborlu-selahattin-karasoy-meslek-yuksekokulu","Uluborlu Selahattin Karasoy Meslek Yüksekokulu"],["ulukisla-meslek-yuksekokulu","Ulukışla Meslek Yüksekokulu"],["ulus-meslek-yuksekokulu","Ulus Meslek Yüksekokulu"],["uluslararasi-tip-fakultesi","Uluslararası Tıp Fakültesi"],["urla-denizcilik-meslek-yuksekokulu","Urla Denizcilik Meslek Yüksekokulu"],["uygulamali-bilimler-fakultesi","Uygulamalı Bilimler Fakültesi"],["uygulamali-bilimler-fakultesi-civril","Uygulamalı Bilimler Fakültesi (Çivril)"],["uygulamali-bilimler-fakultesi-luleburgaz","Uygulamalı Bilimler Fakültesi (Lüleburgaz)"],["uygulamali-bilimler-fakultesi-oltu","Uygulamalı Bilimler Fakültesi (Oltu)"],["uygulamali-bilimler-yuksekokulu","Uygulamalı Bilimler Yüksekokulu"],["uygulamali-bilimler-yuksekokulu-devrek","Uygulamalı Bilimler Yüksekokulu (Devrek)"],["uygulamali-sosyal-bilimler-yuksekokulu","Uygulamalı Sosyal Bilimler Yüksekokulu"],["uygulamali-yonetim-bilimleri-yuksekokulu","Uygulamalı Yönetim Bilimleri Yüksekokulu"],["uzaktan-egitim-meslek-yuksekokulu","Uzaktan Eğitim Meslek Yüksekokulu"],["uzunciftlik-nuh-cimento-meslek-yuksekokulu","Uzunçiftlik Nuh Çimento Meslek Yüksekokulu"],["uzunkopru-meslek-yuksekokulu","Uzunköprü Meslek Yüksekokulu"],["uzunkopru-uygulamali-bilimler-yuksekokulu","Uzunköprü Uygulamalı Bilimler Yüksekokulu"],["unal-caginer-turizm-ve-mutfak-sanatlari-yuksekokulu","Ünal Çağıner Turizm ve Mutfak Sanatları Yüksekokulu"],["unye-iktisadi-ve-idari-bilimler-fakultesi","Ünye İktisadi ve İdari Bilimler Fakültesi"],["unye-meslek-yuksekokulu","Ünye Meslek Yüksekokulu"],["urgup-sebahat-ve-erol-toksoz-turizm-meslek-yuksekokulu","Ürgüp Sebahat ve Erol Toksöz Turizm Meslek Yüksekokulu"],["uzumlu-meslek-yuksekokulu","Üzümlü Meslek Yüksekokulu"],["vakfikebir-meslek-yuksekokulu","Vakfıkebir Meslek Yüksekokulu"],["van-guvenlik-meslek-yuksekokulu","Van Güvenlik Meslek Yüksekokulu"],["van-meslek-yuksekokulu","Van Meslek Yüksekokulu"],["van-saglik-hizmetleri-meslek-yuksekokulu","Van Sağlık Hizmetleri Meslek Yüksekokulu"],["varto-meslek-yuksekokulu","Varto Meslek Yüksekokulu"],["veteriner-fakultesi","Veteriner Fakültesi"],["veteriner-fakultesi-eregli","Veteriner Fakültesi (Ereğli)"],["veterinerlik-meslek-yuksekokulu","Veterinerlik Meslek Yüksekokulu"],["vezirkopru-meslek-yuksekokulu","Vezirköprü Meslek Yüksekokulu"],["viransehir-meslek-yuksekokulu","Viranşehir Meslek Yüksekokulu"],["viransehir-saglik-yuksekokulu","Viranşehir Sağlık Yüksekokulu"],["vize-meslek-yuksekokulu","Vize Meslek Yüksekokulu"],["yabanci-diller-fakultesi","Yabancı Diller Fakültesi"],["yabanci-diller-ve-turizm-fakultesi","Yabancı Diller ve Turizm Fakültesi"],["yahyali-meslek-yuksekokulu","Yahyalı Meslek Yüksekokulu"],["yalova-iktisadi-ve-idari-bilimler-fakultesi","Yalova İktisadi ve İdari Bilimler Fakültesi"],["yalova-meslek-yuksekokulu","Yalova Meslek Yüksekokulu"],["yalvac-meslek-yuksekokulu","Yalvaç Meslek Yüksekokulu"],["yalvac-teknik-bilimler-meslek-yuksekokulu","Yalvaç Teknik Bilimler Meslek Yüksekokulu"],["yapay-zeka-ve-bilisim-fakultesi","Yapay Zeka ve Bilişim Fakültesi"],["yasam-ve-doga-bilimleri-fakultesi","Yaşam ve Doğa Bilimleri Fakültesi"],["yatagan-meslek-yuksekokulu","Yatağan Meslek Yüksekokulu"],["yayladagi-sosyal-bilimler-meslek-yuksekokulu","Yayladağı Sosyal Bilimler Meslek Yüksekokulu"],["yenice-meslek-yuksekokulu","Yenice Meslek Yüksekokulu"],["yenicaga-yasar-celik-meslek-yuksekokulu","Yeniçağa Yaşar Çelik Meslek Yüksekokulu"],["yenipazar-meslek-yuksekokulu","Yenipazar Meslek Yüksekokulu"],["yenisarbademli-meslek-yuksekokulu","Yenişarbademli Meslek Yüksekokulu"],["yenisehir-ibrahim-orhan-meslek-yuksekokulu","Yenişehir İbrahim Orhan Meslek Yüksekokulu"],["yerkoy-meslek-yuksekokulu","Yerköy Meslek Yüksekokulu"],["yesilhisar-meslek-yuksekokulu","Yeşilhisar Meslek Yüksekokulu"],["yesilova-ismail-akin-turizm-meslek-yuksekokulu","Yeşilova İsmail Akın Turizm Meslek Yüksekokulu"],["yesilyurt-demir-celik-meslek-yuksekokulu","Yeşilyurt Demir Çelik Meslek Yüksekokulu"],["yesilyurt-teknik-bilimler-meslek-yuksekokulu","Yeşilyurt Teknik Bilimler Meslek Yüksekokulu"],["yildizeli-meslek-yuksekokulu","Yıldızeli Meslek Yüksekokulu"],["yozgat-meslek-yuksekokulu","Yozgat Meslek Yüksekokulu"],["yonetim-bilimleri-fakultesi","Yönetim Bilimleri Fakültesi"],["yumurtalik-meslek-yuksekokulu","Yumurtalık Meslek Yüksekokulu"],["yunak-meslek-yuksekokulu","Yunak Meslek Yüksekokulu"],["yunus-emre-saglik-hizmetleri-meslek-yuksekokulu","Yunus Emre Sağlık Hizmetleri Meslek Yüksekokulu"],["yusuf-serefoglu-saglik-bilimleri-fakultesi","Yusuf Şerefoğlu Sağlık Bilimleri Fakültesi"],["yusufeli-meslek-yuksekokulu","Yusufeli Meslek Yüksekokulu"],["yuksekova-meslek-yuksekokulu","Yüksekova Meslek Yüksekokulu"],["zara-ahmet-cuhadaroglu-meslek-yuksekokulu","Zara Ahmet Çuhadaroğlu Meslek Yüksekokulu"],["zara-veysel-dursun-uygulamali-bilimler-yuksekokulu","Zara Veysel Dursun Uygulamalı Bilimler Yüksekokulu"],["zile-dincerler-turizm-isletmeciligi-ve-otelcilik-yuksekokulu","Zile Dinçerler Turizm İşletmeciliği ve Otelcilik Yüksekokulu"],["zile-meslek-yuksekokulu","Zile Meslek Yüksekokulu"],["ziraat-fakultesi","Ziraat Fakültesi"],["ziraat-fakultesi-civril","Ziraat Fakültesi (Çivril)"],["ziraat-fakultesi-kahta","Ziraat Fakültesi (Kahta)"],["ziraat-fakultesi-pazar","Ziraat Fakültesi (Pazar)"],["ziraat-ve-doga-bilimleri-fakultesi","Ziraat ve Doğa Bilimleri Fakültesi"],["ziya-gokalp-egitim-fakultesi","Ziya Gökalp Eğitim Fakültesi"],["zonguldak-meslek-yuksekokulu-kilimli","Zonguldak Meslek Yüksekokulu (Kilimli)"],["zubeyde-hanim-saglik-bilimleri-fakultesi","Zübeyde Hanım Sağlık Bilimleri Fakültesi"]];
const DEPARTMENTS = [["abaza-dili-ve-edebiyati","Abaza Dili ve Edebiyatı"],["acil-durum-ve-afet-yonetimi","Acil Durum ve Afet Yönetimi"],["acil-yardim-ve-afet-yonetimi","Acil Yardım ve Afet Yönetimi"],["acik-deniz-sondaj-teknolojisi","Açık Deniz Sondaj Teknolojisi"],["acik-deniz-tabani-uygulamalari-teknolojisi","Açık Deniz Tabanı Uygulamaları Teknolojisi"],["adli-bilimler","Adli Bilimler"],["adli-bilisim-muhendisligi","Adli Bilişim Mühendisliği"],["agac-isleri-endustri-muhendisligi","Ağaç İşleri Endüstri Mühendisliği"],["agiz-ve-dis-sagligi","Ağız ve Diş Sağlığı"],["akilli-altyapilar-teknikerligi","Akıllı Altyapılar Teknikerliği"],["akilli-sera-teknolojileri","Akıllı Sera Teknolojileri"],["akilli-tarim-ve-gida-yonetimi","Akıllı Tarım ve Gıda Yönetimi"],["aktuerya-bilimleri","Aktüerya Bilimleri"],["alman-dili-ve-edebiyati","Alman Dili ve Edebiyatı"],["almanca-mutercim-ve-tercumanlik","Almanca Mütercim ve Tercümanlık"],["almanca-ogretmenligi","Almanca Öğretmenliği"],["alternatif-enerji-kaynaklari-teknolojisi","Alternatif Enerji Kaynakları Teknolojisi"],["ameliyathane-hizmetleri","Ameliyathane Hizmetleri"],["amerikan-kulturu-ve-edebiyati","Amerikan Kültürü ve Edebiyatı"],["anestezi","Anestezi"],["animasyon-ve-video-uretimi","Animasyon ve Video Üretimi"],["antrenorluk-egitimi","Antrenörlük Eğitimi"],["antropoloji","Antropoloji"],["arap-dili-ve-edebiyati","Arap Dili ve Edebiyatı"],["arapca-mutercim-ve-tercumanlik","Arapça Mütercim ve Tercümanlık"],["arapca-ogretmenligi","Arapça Öğretmenliği"],["aricilik","Arıcılık"],["arka-yuz-yazilim-gelistirme","Arka-Yüz Yazılım Geliştirme"],["arkeoloji","Arkeoloji"],["arkeoloji-ve-sanat-tarihi","Arkeoloji ve Sanat Tarihi"],["arnavut-dili-ve-edebiyati","Arnavut Dili ve Edebiyatı"],["astronomi-ve-uzay-bilimleri","Astronomi ve Uzay Bilimleri"],["ascilik","Aşçılık"],["atcilik-ve-antrenorlugu","Atçılık ve Antrenörlüğü"],["avcilik-ve-yaban-hayati","Avcılık ve Yaban Hayatı"],["ayakkabi-tasarim-ve-uretimi","Ayakkabı Tasarım ve Üretimi"],["ayakkabi-tasarimi-ve-uretimi","Ayakkabı Tasarımı ve Üretimi"],["azerbaycan-turkcesi-ve-edebiyati","Azerbaycan Türkçesi ve Edebiyatı"],["bagcilik","Bağcılık"],["bagcilik-ve-bag-urunleri-teknolojisi","Bağcılık ve Bağ Ürünleri Teknolojisi"],["bahce-bitkileri","Bahçe Bitkileri"],["bahce-tarimi","Bahçe Tarımı"],["bahce-ve-tarla-bitkileri","Bahçe ve Tarla Bitkileri"],["balikcilik-teknolojisi","Balıkçılık Teknolojisi"],["balikcilik-teknolojisi-muhendisligi","Balıkçılık Teknolojisi Mühendisliği"],["bankacilik","Bankacılık"],["bankacilik-ve-finans","Bankacılık ve Finans"],["bankacilik-ve-sigortacilik","Bankacılık ve Sigortacılık"],["basim-teknolojileri","Basım Teknolojileri"],["basim-ve-yayim-teknolojileri","Basım ve Yayım Teknolojileri"],["basin-ve-yayin","Basın ve Yayın"],["beden-egitimi-ve-spor-ogretmenligi","Beden Eğitimi ve Spor Öğretmenliği"],["beslenme-ve-diyetetik","Beslenme ve Diyetetik"],["bicakcilik-ve-el-aletleri-uretim-teknolojisi","Bıçakçılık ve El Aletleri Üretim Teknolojisi"],["bilgi-guvenligi-teknolojisi","Bilgi Güvenliği Teknolojisi"],["bilgi-ve-belge-yonetimi","Bilgi ve Belge Yönetimi"],["bilgisayar-bilimleri","Bilgisayar Bilimleri"],["bilgisayar-bilimleri-ve-muhendisligi","Bilgisayar Bilimleri ve Mühendisliği"],["bilgisayar-destekli-tasarim-ve-animasyon","Bilgisayar Destekli Tasarım ve Animasyon"],["bilgisayar-muhendisligi","Bilgisayar Mühendisliği"],["bilgisayar-operatorlugu","Bilgisayar Operatörlüğü"],["bilgisayar-programciligi","Bilgisayar Programcılığı"],["bilgisayar-teknolojisi","Bilgisayar Teknolojisi"],["bilgisayar-teknolojisi-ve-bilisim-sistemleri","Bilgisayar Teknolojisi ve Bilişim Sistemleri"],["bilgisayar-ve-ogretim-teknolojileri-ogretmenligi","Bilgisayar ve Öğretim Teknolojileri Öğretmenliği"],["bilim-tarihi","Bilim Tarihi"],["bilisim-guvenligi-teknolojisi","Bilişim Güvenliği Teknolojisi"],["bilisim-sistemleri-muhendisligi","Bilişim Sistemleri Mühendisliği"],["bilisim-sistemleri-ve-teknolojileri","Bilişim Sistemleri ve Teknolojileri"],["bitki-koruma","Bitki Koruma"],["bitkisel-uretim-ve-teknolojileri","Bitkisel Üretim ve Teknolojileri"],["biyokimya","Biyokimya"],["biyoloji","Biyoloji"],["biyoloji-ogretmenligi","Biyoloji Öğretmenliği"],["biyomedikal-cihaz-teknolojisi","Biyomedikal Cihaz Teknolojisi"],["biyomedikal-muhendisligi","Biyomedikal Mühendisliği"],["biyomuhendislik","Biyomühendislik"],["biyosistem-muhendisligi","Biyosistem Mühendisliği"],["biyoteknoloji","Biyoteknoloji"],["biyoteknoloji-ve-genetik","Biyoteknoloji ve Genetik"],["bosnak-dili-ve-edebiyati","Boşnak Dili ve Edebiyatı"],["boya-teknolojisi","Boya Teknolojisi"],["bulgar-dili-ve-edebiyati","Bulgar Dili ve Edebiyatı"],["bulgarca-mutercim-ve-tercumanlik","Bulgarca Mütercim ve Tercümanlık"],["bulut-bilisim-operatorlugu","Bulut Bilişim Operatörlüğü"],["buro-yonetimi-ve-yonetici-asistanligi","Büro Yönetimi ve Yönetici Asistanlığı"],["buyuk-veri-analistligi","Büyük Veri Analistliği"],["cevher-hazirlama-muhendisligi","Cevher Hazırlama Mühendisliği"],["ceza-infaz-ve-guvenlik-hizmetleri","Ceza İnfaz ve Güvenlik Hizmetleri"],["cnc-programlama-ve-operatorlugu","Cnc Programlama ve Operatörlüğü"],["cografi-bilgi-sistemleri","Coğrafi Bilgi Sistemleri"],["cografya","Coğrafya"],["cografya-ogretmenligi","Coğrafya Öğretmenliği"],["cagdas-turk-lehceleri-ve-edebiyatlari","Çağdaş Türk Lehçeleri ve Edebiyatları"],["cagdas-yunan-dili-ve-edebiyati","Çağdaş Yunan Dili ve Edebiyatı"],["cagri-merkezi-hizmetleri","Çağrı Merkezi Hizmetleri"],["calisma-ekonomisi-ve-endustri-iliskileri","Çalışma Ekonomisi ve Endüstri İlişkileri"],["cay-tarimi-ve-isleme-teknolojisi","Çay Tarımı ve İşleme Teknolojisi"],["cerkez-dili-ve-edebiyati","Çerkez Dili ve Edebiyatı"],["cerkez-dili-ve-kulturu","Çerkez Dili ve Kültürü"],["ceviribilimi","Çeviribilimi"],["cevre-koruma-ve-kontrol","Çevre Koruma ve Kontrol"],["cevre-muhendisligi","Çevre Mühendisliği"],["cevre-sagligi","Çevre Sağlığı"],["cevre-sagligi-ve-cevresel-risk-yonetimi-teknikerligi","Çevre Sağlığı ve Çevresel Risk Yönetimi Teknikerliği"],["cevresel-olcum-ve-izleme-sistemleri-teknikerligi","Çevresel Ölçüm ve İzleme Sistemleri Teknikerliği"],["cim-alan-tesisi-ve-yonetimi","Çim Alan Tesisi ve Yönetimi"],["cin-dili-ve-edebiyati","Çin Dili ve Edebiyatı"],["cince-mutercim-ve-tercumanlik","Çince Mütercim ve Tercümanlık"],["cini-sanati-ve-tasarimi","Çini Sanatı ve Tasarımı"],["cizgi-film-ve-animasyon","Çizgi Film ve Animasyon"],["cocuk-gelisimi","Çocuk Gelişimi"],["cocuk-koruma-ve-bakim-hizmetleri","Çocuk Koruma ve Bakım Hizmetleri"],["cok-boyutlu-modelleme-ve-animasyon","Çok Boyutlu Modelleme ve Animasyon"],["deniz-brokerligi","Deniz Brokerliği"],["deniz-ulastirma-isletme-muhendisligi","Deniz Ulaştırma İşletme Mühendisliği"],["deniz-ulastirma-ve-isletme","Deniz Ulaştırma ve İşletme"],["deniz-ve-liman-isletmeciligi","Deniz ve Liman İşletmeciliği"],["denizcilik-isletmeleri-yonetimi","Denizcilik İşletmeleri Yönetimi"],["deri-muhendisligi","Deri Mühendisliği"],["deri-teknolojisi","Deri Teknolojisi"],["dezenfeksiyon-sterilizasyon-ve-antisepsi-teknikerligi","Dezenfeksiyon, Sterilizasyon ve Antisepsi Teknikerliği"],["dis-ticaret","Dış Ticaret"],["dijital-donusum-elektronigi","Dijital Dönüşüm Elektroniği"],["dijital-fabrika-teknolojileri","Dijital Fabrika Teknolojileri"],["dijital-oyun-tasarimi","Dijital Oyun Tasarımı"],["dijital-oyun-teknolojileri","Dijital Oyun Teknolojileri"],["dijital-saglik-sistemleri-teknikerligi","Dijital Sağlık Sistemleri Teknikerliği"],["dijital-tarim-teknolojileri","Dijital Tarım Teknolojileri"],["dijital-yapimcilik-ve-yayincilik","Dijital Yapımcılık ve Yayıncılık"],["dil-ve-konusma-terapisi","Dil ve Konuşma Terapisi"],["dilbilimi","Dilbilimi"],["dis-hekimligi","Diş Hekimliği"],["dis-protez-teknolojisi","Diş Protez Teknolojisi"],["diyaliz","Diyaliz"],["doga-koruma-ve-biyocesitlilik-yonetimi","Doğa Koruma ve Biyoçeşitlilik Yönetimi"],["dogal-yapi-taslari-teknolojisi","Doğal Yapı Taşları Teknolojisi"],["dogalgaz-ve-tesisati-teknolojisi","Doğalgaz ve Tesisatı Teknolojisi"],["dokum","Döküm"],["e-isletme-ve-e-ticaret","E-İşletme ve E-Ticaret"],["e-ticaret","E-Ticaret"],["e-ticaret-ve-pazarlama","E-Ticaret ve Pazarlama"],["ebelik","Ebelik"],["eczacilik","Eczacılık"],["eczane-hizmetleri","Eczane Hizmetleri"],["egzersiz-ve-spor-bilimleri","Egzersiz ve Spor Bilimleri"],["ekonometri","Ekonometri"],["ekonomi","Ekonomi"],["ekonomi-ve-finans","Ekonomi ve Finans"],["el-sanatlari","El Sanatları"],["elektrik","Elektrik"],["elektrik-enerjisi-uretim-iletim-ve-dagitimi","Elektrik Enerjisi Üretim, İletim ve Dağıtımı"],["elektrik-makineleri-bakim-ve-onarimi","Elektrik Makineleri Bakım ve Onarımı"],["elektrik-muhendisligi","Elektrik Mühendisliği"],["elektrik-elektronik-muhendisligi","Elektrik-Elektronik Mühendisliği"],["elektrikli-cihaz-teknolojisi","Elektrikli Cihaz Teknolojisi"],["elektronik-haberlesme-teknolojisi","Elektronik Haberleşme Teknolojisi"],["elektronik-muhendisligi","Elektronik Mühendisliği"],["elektronik-teknolojisi","Elektronik Teknolojisi"],["elektronik-ticaret-ve-yonetimi","Elektronik Ticaret ve Yönetimi"],["elektronik-ve-haberlesme-muhendisligi","Elektronik ve Haberleşme Mühendisliği"],["elektronorofizyoloji","Elektronörofizyoloji"],["emlak-yonetimi","Emlak Yönetimi"],["endustri-muhendisligi","Endüstri Mühendisliği"],["endustri-urunleri-tasarimi","Endüstri Ürünleri Tasarımı"],["endustriyel-cam-ve-seramik","Endüstriyel Cam ve Seramik"],["endustriyel-hammaddeler-isleme-teknolojisi","Endüstriyel Hammaddeler İşleme Teknolojisi"],["endustriyel-kalipcilik","Endüstriyel Kalıpçılık"],["endustriyel-tasarim","Endüstriyel Tasarım"],["endustriyel-tasarim-muhendisligi","Endüstriyel Tasarım Mühendisliği"],["enerji-bilimi-ve-teknolojileri","Enerji Bilimi ve Teknolojileri"],["enerji-sistemleri-muhendisligi","Enerji Sistemleri Mühendisliği"],["enerji-tesisleri-isletmeciligi","Enerji Tesisleri İşletmeciliği"],["enerji-yonetimi","Enerji Yönetimi"],["engelli-bakimi-ve-rehabilitasyon","Engelli Bakımı ve Rehabilitasyon"],["engelliler-icin-golge-ogreticilik","Engelliler İçin Gölge Öğreticilik"],["ergoterapi","Ergoterapi"],["ermeni-dili-ve-kulturu","Ermeni Dili ve Kültürü"],["eser-koruma","Eser Koruma"],["eski-yunan-dili-ve-edebiyati","Eski Yunan Dili ve Edebiyatı"],["et-ve-urunleri-teknolojisi","Et ve Ürünleri Teknolojisi"],["evde-hasta-bakimi","Evde Hasta Bakımı"],["fars-dili-ve-edebiyati","Fars Dili ve Edebiyatı"],["farsca-mutercim-ve-tercumanlik","Farsça Mütercim ve Tercümanlık"],["felsefe","Felsefe"],["felsefe-grubu-ogretmenligi","Felsefe Grubu Öğretmenliği"],["felsefe-ve-yapay-zeka","Felsefe ve Yapay Zeka"],["fen-bilgisi-ogretmenligi","Fen Bilgisi Öğretmenliği"],["findik-eksperligi","Fındık Eksperliği"],["fiber-tekne-imalati-ve-kompozit-kalip-teknolojileri","Fiber Tekne İmalatı ve Kompozit Kalıp Teknolojileri"],["fidan-yetistiriciligi","Fidan Yetiştiriciliği"],["film-tasarimi-ve-yonetimi","Film Tasarımı ve Yönetimi"],["filoloji-ingiliz-dili-ve-edebiyati","Filoloji (İngiliz Dili ve Edebiyatı)"],["filoloji-kirgiz-dili-ve-edebiyati","Filoloji (Kırgız Dili ve Edebiyatı)"],["finans-ve-bankacilik","Finans ve Bankacılık"],["finansal-teknoloji","Finansal Teknoloji"],["fizik","Fizik"],["fizik-muhendisligi","Fizik Mühendisliği"],["fizik-ogretmenligi","Fizik Öğretmenliği"],["fizyoterapi","Fizyoterapi"],["fizyoterapi-ve-rehabilitasyon","Fizyoterapi ve Rehabilitasyon"],["fotograf","Fotoğraf"],["fotograf-ve-video","Fotoğraf ve Video"],["fotografcilik-ve-kameramanlik","Fotoğrafçılık ve Kameramanlık"],["fotonik","Fotonik"],["fransiz-dili-ve-edebiyati","Fransız Dili ve Edebiyatı"],["fransizca-mutercim-ve-tercumanlik","Fransızca Mütercim ve Tercümanlık"],["fransizca-ogretmenligi","Fransızca Öğretmenliği"],["gastronomi","Gastronomi"],["gastronomi-ve-mutfak-sanatlari","Gastronomi ve Mutfak Sanatları"],["gayrimenkul-gelistirme-ve-yonetimi","Gayrimenkul Geliştirme ve Yönetimi"],["gazetecilik","Gazetecilik"],["geleneksel-el-sanatlari","Geleneksel El Sanatları"],["geleneksel-tekstillerin-korunmasi-ve-restorasyonu","Geleneksel Tekstillerin Korunması ve Restorasyonu"],["geleneksel-turk-sanatlari","Geleneksel Türk Sanatları"],["gemi-insaati","Gemi İnşaatı"],["gemi-insaati-ve-gemi-makineleri-muhendisligi","Gemi İnşaatı ve Gemi Makineleri Mühendisliği"],["gemi-makineleri-isletme-muhendisligi","Gemi Makineleri İşletme Mühendisliği"],["gemi-makineleri-isletmeciligi","Gemi Makineleri İşletmeciliği"],["gemi-ve-deniz-teknolojisi-muhendisligi","Gemi ve Deniz Teknolojisi Mühendisliği"],["gemi-ve-yat-tasarimi","Gemi ve Yat Tasarımı"],["genetik-ve-biyomuhendislik","Genetik ve Biyomühendislik"],["geoteknik","Geoteknik"],["gerontoloji","Gerontoloji"],["gida-kalite-kontrolu-ve-analizi","Gıda Kalite Kontrolü ve Analizi"],["gida-muhendisligi","Gıda Mühendisliği"],["gida-teknolojisi","Gıda Teknolojisi"],["giyim-uretim-teknolojisi","Giyim Üretim Teknolojisi"],["gorsel-iletisim","Görsel İletişim"],["gorsel-iletisim-tasarimi","Görsel İletişim Tasarımı"],["gorsel-sanatlar","Görsel Sanatlar"],["gorsel-sanatlar-ve-iletisim-tasarimi","Görsel Sanatlar ve İletişim Tasarımı"],["grafik","Grafik"],["grafik-sanatlar","Grafik Sanatlar"],["grafik-tasarimi","Grafik Tasarımı"],["gumruk-isletme","Gümrük İşletme"],["gurcu-dili-ve-edebiyati","Gürcü Dili ve Edebiyatı"],["halicilik-ve-kilimcilik","Halıcılık ve Kilimcilik"],["halkbilimi","Halkbilimi"],["halkla-iliskiler-ve-pazarlama-iletisimi","Halkla İlişkiler ve Pazarlama İletişimi"],["halkla-iliskiler-ve-reklamcilik","Halkla İlişkiler ve Reklamcılık"],["halkla-iliskiler-ve-tanitim","Halkla İlişkiler ve Tanıtım"],["harita-muhendisligi","Harita Mühendisliği"],["harita-ve-kadastro","Harita ve Kadastro"],["hassas-tarim-ve-tarimsal-robotlar","Hassas Tarım ve Tarımsal Robotlar"],["hasta-bakimi","Hasta Bakımı"],["hava-araci-imalat-teknolojileri","Hava Aracı İmalat Teknolojileri"],["hava-lojistigi","Hava Lojistiği"],["havacilik-elektrik-ve-elektronigi","Havacılık Elektrik ve Elektroniği"],["havacilik-elektronigi-teknolojileri","Havacılık Elektroniği Teknolojileri"],["havacilik-ve-uzay-muhendisligi","Havacılık ve Uzay Mühendisliği"],["havacilik-yonetimi","Havacılık Yönetimi"],["hayvancilik-teknolojileri-ve-isletmeciligi","Hayvancılık Teknolojileri ve İşletmeciliği"],["hayvansal-uretim-ve-teknolojileri","Hayvansal Üretim ve Teknolojileri"],["hemsirelik","Hemşirelik"],["hibrid-ve-elektrikli-tasitlar-teknolojisi","Hibrid ve Elektrikli Taşıtlar Teknolojisi"],["hidrojen-ve-enerji-depolama-teknikerligi","Hidrojen ve Enerji Depolama Teknikerliği"],["hidrojeoloji-muhendisligi","Hidrojeoloji Mühendisliği"],["hidrolik-ve-pnomatik-teknikerligi","Hidrolik ve Pnömatik Teknikerliği"],["hindoloji","Hindoloji"],["hititoloji","Hititoloji"],["hukuk","Hukuk"],["hungaroloji","Hungaroloji"],["ibrani-dili-ve-kulturu","İbrani Dili ve Kültürü"],["ic-mekan-tasarimi","İç Mekan Tasarımı"],["ic-mimarlik","İç Mimarlık"],["ic-mimarlik-ve-cevre-tasarimi","İç Mimarlık ve Çevre Tasarımı"],["ic-mimarlik-ve-mobilya-tasarimi","İç Mimarlık ve Mobilya Tasarımı"],["iklim-bilimi-ve-meteoroloji-muhendisligi","İklim Bilimi ve Meteoroloji Mühendisliği"],["iklimlendirme-ve-sogutma-teknolojisi","İklimlendirme ve Soğutma Teknolojisi"],["ikram-hizmetleri","İkram Hizmetleri"],["iktisat","İktisat"],["ilac-uretim-teknolojisi","İlaç Üretim Teknolojisi"],["ilahiyat","İlahiyat"],["iletisim","İletişim"],["iletisim-bilimleri","İletişim Bilimleri"],["iletisim-tasarimi-ve-yonetimi","İletişim Tasarımı ve Yönetimi"],["iletisim-ve-tasarimi","İletişim ve Tasarımı"],["ilk-ve-acil-yardim","İlk ve Acil Yardım"],["ilkogretim-matematik-ogretmenligi","İlköğretim Matematik Öğretmenliği"],["imalat-muhendisligi","İmalat Mühendisliği"],["imalat-yurutme-sistemleri-operatorlugu","İmalat Yürütme Sistemleri Operatörlüğü"],["ingiliz-dilbilimi","İngiliz Dilbilimi"],["ingiliz-dili-ve-edebiyati","İngiliz Dili ve Edebiyatı"],["ingilizce-mutercim-ve-tercumanlik","İngilizce Mütercim ve Tercümanlık"],["ingilizce-ogretmenligi","İngilizce Öğretmenliği"],["ingilizce-ogretmenligi-elt","İngilizce Öğretmenliği-ELT"],["ingilizce-fransizca-mutercim-ve-tercumanlik","İngilizce, Fransızca Mütercim ve Tercümanlık"],["insan-kaynaklari-yonetimi","İnsan Kaynakları Yönetimi"],["insansiz-arac-teknikerligi","İnsansız Araç Teknikerliği"],["insansiz-hava-araci-teknolojisi-ve-operatorlugu","İnsansız Hava Aracı Teknolojisi ve Operatörlüğü"],["insaat-muhendisligi","İnşaat Mühendisliği"],["insaat-teknolojisi","İnşaat Teknolojisi"],["internet-ve-ag-teknolojileri","İnternet ve Ağ Teknolojileri"],["islam-iktisadi-ve-finans","İslam İktisadı ve Finans"],["islami-ilimler","İslami İlimler"],["ispanyol-dili-ve-edebiyati","İspanyol Dili ve Edebiyatı"],["ispanyolca-mutercim-ve-tercumanlik","İspanyolca Mütercim ve Tercümanlık"],["istatistik","İstatistik"],["istatistik-ve-bilgisayar-bilimleri","İstatistik ve Bilgisayar Bilimleri"],["is-makineleri-operatorlugu","İş Makineleri Operatörlüğü"],["is-sagligi-ve-guvenligi","İş Sağlığı ve Güvenliği"],["is-ve-ugrasi-terapisi","İş ve Uğraşı Terapisi"],["isletme","İşletme"],["isletme-muhendisligi","İşletme Mühendisliği"],["isletme-ve-yapay-zeka","İşletme ve Yapay Zeka"],["isletme-yonetimi","İşletme Yönetimi"],["italyan-dili-ve-edebiyati","İtalyan Dili ve Edebiyatı"],["japon-dili-ve-edebiyati","Japon Dili ve Edebiyatı"],["japonca-mutercim-ve-tercumanlik","Japonca Mütercim ve Tercümanlık"],["japonca-ogretmenligi","Japonca Öğretmenliği"],["jeofizik-muhendisligi","Jeofizik Mühendisliği"],["jeoloji-muhendisligi","Jeoloji Mühendisliği"],["kamu-yonetimi","Kamu Yönetimi"],["kanatli-hayvan-yetistiriciligi","Kanatlı Hayvan Yetiştiriciliği"],["karayolu-yuk-tasiti-suruculugu","Karayolu Yük Taşıtı Sürücülüğü"],["karbon-yonetimi-teknikerligi","Karbon Yönetimi Teknikerliği"],["karsilastirmali-edebiyat","Karşılaştırmalı Edebiyat"],["kaynak-teknolojisi","Kaynak Teknolojisi"],["kenevir-dokumaciligi","Kenevir Dokumacılığı"],["kentsel-tasarim-ve-peyzaj-mimarligi","Kentsel Tasarım ve Peyzaj Mimarlığı"],["kimya","Kimya"],["kimya-muhendisligi","Kimya Mühendisliği"],["kimya-ogretmenligi","Kimya Öğretmenliği"],["kimya-teknolojisi","Kimya Teknolojisi"],["kimya-biyoloji-muhendisligi","Kimya-Biyoloji Mühendisliği"],["klasik-arkeoloji","Klasik Arkeoloji"],["kontrol-ve-otomasyon-muhendisligi","Kontrol ve Otomasyon Mühendisliği"],["kontrol-ve-otomasyon-teknolojisi","Kontrol ve Otomasyon Teknolojisi"],["kooperatifcilik","Kooperatifçilik"],["kore-dili-ve-edebiyati","Kore Dili ve Edebiyatı"],["kozmetik-teknolojisi","Kozmetik Teknolojisi"],["kurgu-ses-ve-goruntu-yonetimi","Kurgu, Ses ve Görüntü Yönetimi"],["kurumsal-bilisim-uzmanligi","Kurumsal Bilişim Uzmanlığı"],["kuyumculuk-ve-mucevher-tasarimi","Kuyumculuk ve Mücevher Tasarımı"],["kuyumculuk-ve-taki-tasarimi","Kuyumculuk ve Takı Tasarımı"],["kultur-varliklarini-koruma-ve-onarim","Kültür Varlıklarını Koruma ve Onarım"],["kultur-ve-iletisim-bilimleri","Kültür ve İletişim Bilimleri"],["kulturel-miras-ve-turizm","Kültürel Miras ve Turizm"],["kumes-hayvanlari-yetistiriciligi","Kümes Hayvanları Yetiştiriciliği"],["kuresel-siyaset-ve-uluslararasi-iliskiler","Küresel Siyaset ve Uluslararası İlişkiler"],["kurt-dili-ve-edebiyati","Kürt Dili ve Edebiyatı"],["laborant-ve-veteriner-saglik","Laborant ve Veteriner Sağlık"],["laboratuvar-hayvanlari","Laboratuvar Hayvanları"],["laboratuvar-teknolojisi","Laboratuvar Teknolojisi"],["latin-dili-ve-edebiyati","Latin Dili ve Edebiyatı"],["leh-dili-ve-edebiyati","Leh Dili ve Edebiyatı"],["lojistik","Lojistik"],["lojistik-yonetimi","Lojistik Yönetimi"],["maden-muhendisligi","Maden Mühendisliği"],["madencilik-teknolojisi","Madencilik Teknolojisi"],["mahkeme-buro-hizmetleri","Mahkeme Büro Hizmetleri"],["makine","Makine"],["makine-muhendisligi","Makine Mühendisliği"],["makine-resim-ve-konstruksiyonu","Makine Resim ve Konstrüksiyonu"],["maliye","Maliye"],["malzeme-bilimi-ve-muhendisligi","Malzeme Bilimi ve Mühendisliği"],["malzeme-bilimi-ve-nanoteknoloji-muhendisligi","Malzeme Bilimi ve Nanoteknoloji Mühendisliği"],["malzeme-bilimi-ve-teknolojileri","Malzeme Bilimi ve Teknolojileri"],["mantarcilik","Mantarcılık"],["marina-ve-yat-isletmeciligi","Marina ve Yat İşletmeciliği"],["marka-iletisimi","Marka İletişimi"],["matematik","Matematik"],["matematik-muhendisligi","Matematik Mühendisliği"],["matematik-ogretmenligi","Matematik Öğretmenliği"],["matematik-ve-bilgisayar-bilimleri","Matematik ve Bilgisayar Bilimleri"],["medya-ve-gorsel-sanatlar","Medya ve Görsel Sanatlar"],["medya-ve-iletisim","Medya ve İletişim"],["mekatronik","Mekatronik"],["mekatronik-muhendisligi","Mekatronik Mühendisliği"],["mermer-teknolojisi","Mermer Teknolojisi"],["metalurji","Metalurji"],["metalurji-ve-malzeme-muhendisligi","Metalurji ve Malzeme Mühendisliği"],["meyve-ve-sebze-isleme-teknolojisi","Meyve ve Sebze İşleme Teknolojisi"],["mimari-dekoratif-sanatlar","Mimari Dekoratif Sanatlar"],["mimari-restorasyon","Mimari Restorasyon"],["mimarlik","Mimarlık"],["mobil-guvenlik-teknolojileri","Mobil Güvenlik Teknolojileri"],["mobil-teknolojileri","Mobil Teknolojileri"],["mobilya-ve-dekorasyon","Mobilya ve Dekorasyon"],["moda-tasarimi","Moda Tasarımı"],["moda-yonetimi","Moda Yönetimi"],["molekuler-biyoloji-ve-genetik","Moleküler Biyoloji ve Genetik"],["molekuler-biyoteknoloji","Moleküler Biyoteknoloji"],["muhasebe-ve-finans-yonetimi","Muhasebe ve Finans Yönetimi"],["muhasebe-ve-vergi-uygulamalari","Muhasebe ve Vergi Uygulamaları"],["muhendislik-ve-doga-bilimleri-programlari","Mühendislik ve Doğa Bilimleri Programları"],["mutercim-tercumanlik","Mütercim-Tercümanlık"],["muzecilik","Müzecilik"],["nanobilim-ve-nanoteknoloji","Nanobilim ve Nanoteknoloji"],["nanoteknoloji-muhendisligi","Nanoteknoloji Mühendisliği"],["nukleer-enerji-muhendisligi","Nükleer Enerji Mühendisliği"],["nukleer-teknoloji-ve-radyasyon-guvenligi","Nükleer Teknoloji ve Radyasyon Güvenliği"],["nukleer-tip-teknikleri","Nükleer Tıp Teknikleri"],["odyoloji","Odyoloji"],["odyometri","Odyometri"],["ofis-teknolojileri-ve-veri-yonetimi","Ofis Teknolojileri ve Veri Yönetimi"],["okul-oncesi-ogretmenligi","Okul Öncesi Öğretmenliği"],["optik-ve-akustik-muhendisligi","Optik ve Akustik Mühendisliği"],["optisyenlik","Optisyenlik"],["optoelektronik-ve-elektro-optik-teknolojileri","Optoelektronik ve Elektro Optik Teknolojileri"],["organik-tarim","Organik Tarım"],["organik-tarim-isletmeciligi","Organik Tarım İşletmeciliği"],["orman-endustrisi-muhendisligi","Orman Endüstrisi Mühendisliği"],["orman-muhendisligi","Orman Mühendisliği"],["ormancilik-ve-orman-urunleri","Ormancılık ve Orman Ürünleri"],["ortez-ve-protez","Ortez ve Protez"],["ortopedik-protez-ve-ortez","Ortopedik Protez ve Ortez"],["otel-yoneticiligi","Otel Yöneticiliği"],["otobus-kaptanligi","Otobüs Kaptanlığı"],["otomotiv-govde-ve-yuzey-islem-teknolojileri","Otomotiv Gövde ve Yüzey İşlem Teknolojileri"],["otomotiv-muhendisligi","Otomotiv Mühendisliği"],["otomotiv-teknolojisi","Otomotiv Teknolojisi"],["otonom-sistemler-teknikerligi","Otonom Sistemler Teknikerliği"],["otopsi-yardimciligi","Otopsi Yardımcılığı"],["oyun-gelistirme-ve-programlama","Oyun Geliştirme ve Programlama"],["on-yuz-yazilim-gelistirme","Ön-Yüz Yazılım Geliştirme"],["ozel-egitim-ogretmenligi","Özel Eğitim Öğretmenliği"],["ozel-guvenlik-ve-koruma","Özel Güvenlik ve Koruma"],["paramedik","Paramedik"],["pastacilik-ve-ekmekcilik","Pastacılık ve Ekmekçilik"],["patlayici-ve-enerjetik-malzemeler-teknikerligi","Patlayıcı ve Enerjetik Malzemeler Teknikerliği"],["patoloji-laboratuvar-teknikleri","Patoloji Laboratuvar Teknikleri"],["pazarlama","Pazarlama"],["perakende-satis-ve-magaza-yonetimi","Perakende Satış ve Mağaza Yönetimi"],["perfuzyon","Perfüzyon"],["petrol-ve-dogalgaz-muhendisligi","Petrol ve Doğalgaz Mühendisliği"],["peyzaj-mimarligi","Peyzaj Mimarlığı"],["peyzaj-ve-sus-bitkileri-yetistiriciligi","Peyzaj ve Süs Bitkileri Yetiştiriciliği"],["pilotaj","Pilotaj"],["podoloji","Podoloji"],["polimer-malzeme-muhendisligi","Polimer Malzeme Mühendisliği"],["polimer-teknolojisi","Polimer Teknolojisi"],["politika-ve-ekonomi","Politika ve Ekonomi"],["posta-hizmetleri","Posta Hizmetleri"],["protohistorya-ve-on-asya-arkeolojisi","Protohistorya ve Ön Asya Arkeolojisi"],["psikoloji","Psikoloji"],["psikolojik-danismanlik-ve-rehberlik","Psikolojik Danışmanlık ve Rehberlik"],["psikolojik-danismanlik-ve-rehberlik-ogretmenligi","Psikolojik Danışmanlık ve Rehberlik Öğretmenliği"],["radyo-ve-televizyon-teknolojisi","Radyo ve Televizyon Teknolojisi"],["radyo-televizyon-ve-sinema","Radyo, Televizyon ve Sinema"],["radyoterapi","Radyoterapi"],["rafineri-ve-petro-kimya-teknolojisi","Rafineri ve Petro-Kimya Teknolojisi"],["rayli-sistemler-elektrik-ve-elektronik","Raylı Sistemler Elektrik ve Elektronik"],["rayli-sistemler-isletmeciligi","Raylı Sistemler İşletmeciliği"],["rayli-sistemler-makine-teknolojisi","Raylı Sistemler Makine Teknolojisi"],["rayli-sistemler-makinistligi","Raylı Sistemler Makinistliği"],["rayli-sistemler-muhendisligi","Raylı Sistemler Mühendisliği"],["rayli-sistemler-yol-teknolojisi","Raylı Sistemler Yol Teknolojisi"],["rehberlik-ve-psikolojik-danismanlik","Rehberlik ve Psikolojik Danışmanlık"],["reklam-tasarimi-ve-iletisimi","Reklam Tasarımı ve İletişimi"],["reklamcilik","Reklamcılık"],["rekreasyon","Rekreasyon"],["rekreasyon-yonetimi","Rekreasyon Yönetimi"],["robotik-ve-otonom-sistemler-muhendisligi","Robotik ve Otonom Sistemler Mühendisliği"],["robotik-ve-yapay-zeka","Robotik ve Yapay Zeka"],["rus-dili-ve-edebiyati","Rus Dili ve Edebiyatı"],["rus-dili-ve-edebiyati-ogretmenligi","Rus Dili ve Edebiyatı Öğretmenliği"],["rusca-mutercim-ve-tercumanlik","Rusça Mütercim ve Tercümanlık"],["sac-bakimi-ve-guzellik-hizmetleri","Saç Bakımı ve Güzellik Hizmetleri"],["sac-ve-guzellik-uygulamalari","Saç ve Güzellik Uygulamaları"],["saglik-bilgi-sistemleri-teknikerligi","Sağlık Bilgi Sistemleri Teknikerliği"],["saglik-kurumlari-isletmeciligi","Sağlık Kurumları İşletmeciliği"],["saglik-turizmi-isletmeciligi","Sağlık Turizmi İşletmeciliği"],["saglik-yonetimi","Sağlık Yönetimi"],["sahne-isik-ve-ses-teknolojileri","Sahne Işık ve Ses Teknolojileri"],["sahne-ve-dekor-tasarimi","Sahne ve Dekor Tasarımı"],["sanal-ve-artirilmis-gerceklik","Sanal ve Artırılmış Gerçeklik"],["sanat-tarihi","Sanat Tarihi"],["sanat-ve-kultur-yonetimi","Sanat ve Kültür Yönetimi"],["sanat-ve-sosyal-bilimler-programlari","Sanat ve Sosyal Bilimler Programları"],["seracilik","Seracılık"],["seramik-ve-cam-tasarimi","Seramik ve Cam Tasarımı"],["sermaye-piyasasi","Sermaye Piyasası"],["seyahat-isletmeciligi","Seyahat İşletmeciliği"],["seyahat-isletmeciligi-ve-turizm-rehberligi","Seyahat İşletmeciliği ve Turizm Rehberliği"],["sinif-ogretmenligi","Sınıf Öğretmenliği"],["sirp-dili-ve-edebiyati","Sırp Dili ve Edebiyatı"],["siber-guvenlik","Siber Güvenlik"],["siber-guvenlik-analistligi-ve-operatorlugu","Siber Güvenlik Analistliği ve Operatörlüğü"],["siber-guvenlik-muhendisligi","Siber Güvenlik Mühendisliği"],["sigortacilik","Sigortacılık"],["sigortacilik-ve-aktuerya-bilimleri","Sigortacılık ve Aktüerya Bilimleri"],["sigortacilik-ve-risk-yonetimi","Sigortacılık ve Risk Yönetimi"],["sigortacilik-ve-sosyal-guvenlik","Sigortacılık ve Sosyal Güvenlik"],["silah-sanayi-teknikerligi","Silah Sanayi Teknikerliği"],["sinema-ve-dijital-medya","Sinema ve Dijital Medya"],["sinema-ve-televizyon","Sinema ve Televizyon"],["sinoloji","Sinoloji"],["sivil-hava-ulastirma-isletmeciligi","Sivil Hava Ulaştırma İşletmeciliği"],["sivil-havacilik-kabin-hizmetleri","Sivil Havacılık Kabin Hizmetleri"],["sivil-savunma-ve-itfaiyecilik","Sivil Savunma ve İtfaiyecilik"],["siyaset-bilimi","Siyaset Bilimi"],["siyaset-bilimi-ve-kamu-yonetimi","Siyaset Bilimi ve Kamu Yönetimi"],["siyaset-bilimi-ve-uluslararasi-iliskiler","Siyaset Bilimi ve Uluslararası İlişkiler"],["sondaj-teknolojisi","Sondaj Teknolojisi"],["sosyal-bilgiler-ogretmenligi","Sosyal Bilgiler Öğretmenliği"],["sosyal-guvenlik","Sosyal Güvenlik"],["sosyal-hizmet","Sosyal Hizmet"],["sosyal-hizmetler","Sosyal Hizmetler"],["sosyal-medya-yoneticiligi","Sosyal Medya Yöneticiliği"],["sosyoloji","Sosyoloji"],["su-alti-kaynak-teknolojisi","Su Altı Kaynak Teknolojisi"],["su-alti-teknolojisi","Su Altı Teknolojisi"],["su-bilimleri-ve-muhendisligi","Su Bilimleri ve Mühendisliği"],["su-urunleri-endustrisi-muhendisligi","Su Ürünleri Endüstrisi Mühendisliği"],["su-urunleri-isleme-teknolojisi","Su Ürünleri İşleme Teknolojisi"],["su-urunleri-muhendisligi","Su Ürünleri Mühendisliği"],["su-ve-atik-yonetimi-teknikerligi","Su ve Atık Yönetimi Teknikerliği"],["sulama-teknolojisi","Sulama Teknolojisi"],["sumeroloji","Sümeroloji"],["suryani-dili-ve-edebiyati","Süryani Dili ve Edebiyatı"],["sut-teknolojisi","Süt Teknolojisi"],["sut-ve-besi-hayvanciligi","Süt ve Besi Hayvancılığı"],["sut-ve-urunleri-teknolojisi","Süt ve Ürünleri Teknolojisi"],["sarap-uretim-teknolojisi","Şarap Üretim Teknolojisi"],["sehir-ve-bolge-planlama","Şehir ve Bölge Planlama"],["tahribatsiz-muayene","Tahribatsız Muayene"],["taki-tasarimi-ve-imalati","Takı Tasarımı ve İmalatı"],["talasli-uretim-teknikerligi","Talaşlı Üretim Teknikerliği"],["tapu-kadastro","Tapu Kadastro"],["tapu-ve-kadastro","Tapu ve Kadastro"],["tarim-ekonomisi","Tarım Ekonomisi"],["tarim-makineleri","Tarım Makineleri"],["tarim-makineleri-ve-teknolojileri","Tarım Makineleri ve Teknolojileri"],["tarim-makineleri-ve-teknolojileri-muhendisligi","Tarım Makineleri ve Teknolojileri Mühendisliği"],["tarim-teknolojisi","Tarım Teknolojisi"],["tarim-ticareti-ve-isletmeciligi","Tarım Ticareti ve İşletmeciliği"],["tarimsal-biyoteknoloji","Tarımsal Biyoteknoloji"],["tarimsal-genetik-muhendisligi","Tarımsal Genetik Mühendisliği"],["tarimsal-isletmecilik","Tarımsal İşletmecilik"],["tarimsal-yapilar-ve-sulama","Tarımsal Yapılar ve Sulama"],["tarih","Tarih"],["tarih-ogretmenligi","Tarih Öğretmenliği"],["tarih-oncesi-arkeolojisi","Tarih Öncesi Arkeolojisi"],["tarih-ve-yapay-zeka","Tarih ve Yapay Zeka"],["tarla-bitkileri","Tarla Bitkileri"],["teknoloji-ve-bilgi-yonetimi","Teknoloji ve Bilgi Yönetimi"],["tekstil-muhendisligi","Tekstil Mühendisliği"],["tekstil-tasarimi","Tekstil Tasarımı"],["tekstil-teknolojisi","Tekstil Teknolojisi"],["tekstil-ve-hali-makineleri","Tekstil ve Halı Makineleri"],["tekstil-ve-moda-tasarimi","Tekstil ve Moda Tasarımı"],["tele-saglik-teknikerligi","Tele-Sağlık Teknikerliği"],["televizyon-haberciligi-ve-programciligi","Televizyon Haberciliği ve Programcılığı"],["tespih-tasarimi-ve-imalati","Tespih Tasarımı ve İmalatı"],["tibbi-dokumantasyon-ve-sekreterlik","Tıbbi Dokümantasyon ve Sekreterlik"],["tibbi-goruntuleme-teknikleri","Tıbbi Görüntüleme Teknikleri"],["tibbi-laboratuvar-teknikleri","Tıbbi Laboratuvar Teknikleri"],["tibbi-tanitim-ve-pazarlama","Tıbbi Tanıtım ve Pazarlama"],["tibbi-ve-aromatik-bitkiler","Tıbbi ve Aromatik Bitkiler"],["tibbi-veri-isleme-teknikerligi","Tıbbi Veri İşleme Teknikerliği"],["tip","Tıp"],["tiyatro-elestirmenligi-ve-dramaturji","Tiyatro Eleştirmenliği ve Dramaturji"],["tohum-bilimi-ve-teknolojisi","Tohum Bilimi ve Teknolojisi"],["tohumculuk-teknolojisi","Tohumculuk Teknolojisi"],["toprak-bilimi-ve-bitki-besleme","Toprak Bilimi ve Bitki Besleme"],["turist-rehberligi","Turist Rehberliği"],["turizm-animasyonu","Turizm Animasyonu"],["turizm-isletmeciligi","Turizm İşletmeciliği"],["turizm-rehberligi","Turizm Rehberliği"],["turizm-ve-gastronomi-yonetimi-programlari","Turizm ve Gastronomi Yönetimi Programları"],["turizm-ve-otel-isletmeciligi","Turizm ve Otel İşletmeciliği"],["turizm-ve-otel-yonetimi","Turizm ve Otel Yönetimi"],["turizm-ve-seyahat-hizmetleri","Turizm ve Seyahat Hizmetleri"],["turk-dili-ve-edebiyati","Türk Dili ve Edebiyatı"],["turk-dili-ve-edebiyati-ogretmenligi","Türk Dili ve Edebiyatı Öğretmenliği"],["turk-halkbilimi","Türk Halkbilimi"],["turk-islam-arkeolojisi","Türk İslam Arkeolojisi"],["turkce-ogretmenligi","Türkçe Öğretmenliği"],["turkoloji","Türkoloji"],["tutun-eksperligi","Tütün Eksperliği"],["ucak-bakim-ve-onarim","Uçak Bakım ve Onarım"],["ucak-elektrik-ve-elektronigi","Uçak Elektrik ve Elektroniği"],["ucak-govde-ve-motor-bakimi","Uçak Gövde ve Motor Bakımı"],["ucak-muhendisligi","Uçak Mühendisliği"],["ucak-teknolojisi","Uçak Teknolojisi"],["ucus-harekat-yoneticiligi","Uçuş Harekat Yöneticiliği"],["ukrayna-dili-ve-edebiyati","Ukrayna Dili ve Edebiyatı"],["ulastirma-ve-trafik-hizmetleri","Ulaştırma ve Trafik Hizmetleri"],["uluslararasi-finans","Uluslararası Finans"],["uluslararasi-finans-ve-bankacilik","Uluslararası Finans ve Bankacılık"],["uluslararasi-girisimcilik","Uluslararası Girişimcilik"],["uluslararasi-iliskiler","Uluslararası İlişkiler"],["uluslararasi-isletme-yonetimi","Uluslararası İşletme Yönetimi"],["uluslararasi-ticaret","Uluslararası Ticaret"],["uluslararasi-ticaret-ve-finans","Uluslararası Ticaret ve Finans"],["uluslararasi-ticaret-ve-finansman","Uluslararası Ticaret ve Finansman"],["uluslararasi-ticaret-ve-isletmecilik","Uluslararası Ticaret ve İşletmecilik"],["uluslararasi-ticaret-ve-lojistik","Uluslararası Ticaret ve Lojistik"],["un-ve-unlu-mamuller-teknolojisi","Un ve Unlu Mamuller Teknolojisi"],["urdu-dili-ve-edebiyati","Urdu Dili ve Edebiyatı"],["uygulamali-bankacilik-ve-finans","Uygulamalı Bankacılık ve Finans"],["uzaktan-algilama-ve-cografi-bilgi-sistemleri","Uzaktan Algılama ve Coğrafi Bilgi Sistemleri"],["uzay-bilimleri-ve-teknolojileri","Uzay Bilimleri ve Teknolojileri"],["uzay-muhendisligi","Uzay Mühendisliği"],["uretimde-kalite-kontrol","Üretimde Kalite Kontrol"],["veri-bilimi-ve-analitigi","Veri Bilimi ve Analitiği"],["veri-gorsellestirme-ve-bilgi-tasarimi","Veri Görselleştirme ve Bilgi Tasarımı"],["veri-muhendisligi","Veri Mühendisliği"],["veteriner","Veteriner"],["web-tasarimi-ve-kodlama","Web Tasarımı ve Kodlama"],["yaban-hayati-ekolojisi-ve-yonetimi","Yaban Hayatı Ekolojisi ve Yönetimi"],["yag-endustrisi","Yağ Endüstrisi"],["yapay-zeka-destekli-kodlama","Yapay Zeka Destekli Kodlama"],["yapay-zeka-destekli-tasarim-ve-animasyon","Yapay Zekâ Destekli Tasarım ve Animasyon"],["yapay-zeka-destekli-web-tasarimi-ve-kodlama","Yapay Zekâ Destekli Web Tasarımı ve Kodlama"],["yapay-zeka-muhendisligi","Yapay Zeka Mühendisliği"],["yapay-zeka-operatorlugu","Yapay Zeka Operatörlüğü"],["yapay-zeka-ve-makine-ogrenmesi","Yapay Zeka ve Makine Öğrenmesi"],["yapay-zeka-ve-veri-analizi","Yapay Zeka ve Veri Analizi"],["yapay-zeka-ve-veri-muhendisligi","Yapay Zeka ve Veri Mühendisliği"],["yapi-denetimi","Yapı Denetimi"],["yapi-ressamligi","Yapı Ressamlığı"],["yapi-tesisat-teknolojisi","Yapı Tesisat Teknolojisi"],["yapi-yalitim-teknolojisi","Yapı Yalıtım Teknolojisi"],["yapi-yuzeyi-tasarim-teknikerligi","Yapı Yüzeyi Tasarım Teknikerliği"],["yasli-bakimi","Yaşlı Bakımı"],["yat-kaptanligi","Yat Kaptanlığı"],["yazilim-gelistirme","Yazılım Geliştirme"],["yazilim-muhendisligi","Yazılım Mühendisliği"],["yeni-medya","Yeni Medya"],["yeni-medya-ve-gazetecilik","Yeni Medya ve Gazetecilik"],["yeni-medya-ve-iletisim","Yeni Medya ve İletişim"],["yenilenebilir-enerji-teknikerligi","Yenilenebilir Enerji Teknikerliği"],["yerel-yonetimler","Yerel Yönetimler"],["yesil-ve-ekolojik-bina-teknikerligi","Yeşil ve Ekolojik Bina Teknikerliği"],["yiyecek-ve-icecek-isletmeciligi","Yiyecek ve İçecek İşletmeciliği"],["yonetim-bilimleri-programlari","Yönetim Bilimleri Programları"],["yonetim-bilisim-sistemleri","Yönetim Bilişim Sistemleri"],["yunan-dili-ve-edebiyati","Yunan Dili ve Edebiyatı"],["zaza-dili-ve-edebiyati","Zaza Dili ve Edebiyatı"],["zeytincilik-ve-zeytin-isleme-teknolojisi","Zeytincilik ve Zeytin İşleme Teknolojisi"],["ziraat-muhendisligi-programlari","Ziraat Mühendisliği Programları"],["zootekni","Zootekni"]];
const UNIVERSITIES = [{"id":"abdullah-gul-universitesi","name":"Abdullah Gül Üniversitesi","cityId":"kayseri","type":"Devlet","faculties":[[515,[436,494]],[676,[376]],[694,[59,154,163,291,353,357]],[1005,[76,382]],[1020,[147,303]]]},{"id":"acibadem-mehmet-ali-aydinlar-universitesi","name":"Acıbadem Mehmet Ali Aydınlar Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[293,[143]],[515,[436,501]],[670,[32,61,74]],[695,[59,75,382]],[770,[52,200,254,464]],[775,[8,17,19,134,161,199,278,395,399,407,422,430,441,546,547,548,551]],[917,[552]]]},{"id":"ada-kent-universitesi","name":"Ada Kent Üniversitesi","cityId":"kktc","type":"KKTC","faculties":[[275,[132]],[307,[285]],[487,[261]],[501,[436]],[696,[620]]]},{"id":"adana-alparslan-turkes-bilim-ve-teknoloji-universitesi","name":"Adana Alparslan Türkeş Bilim ve Teknoloji Üniversitesi","cityId":"adana","type":"Devlet","faculties":[[145,[54,59,68,597,607,620]],[148,[27,84,86,333,416,608]],[464,[250,251,268]],[501,[209,284,303,436,493,559,583,587,629]],[679,[376]],[694,[76,154,163,171,225,291,353,356]]]},{"id":"adiyaman-universitesi","name":"Adıyaman Üniversitesi","cityId":"adiyaman","type":"Devlet","faculties":[[130,[47,61,85,306,368,385]],[275,[132]],[293,[143]],[307,[25,187,279,397,417,449,476,496,569]],[356,[28,72,283,362,436,468,501,532,565]],[402,[47,61,85,306,347,385]],[500,[271,303,493]],[503,[273]],[554,[41,47,61,243,342,385,536,564]],[694,[59,154,291,538]],[770,[142,254]],[775,[111,278,399,422,548]],[847,[32,122,306,329,385,418,423,562]],[909,[61,150,226,227,292,324,352,374,379,495]],[917,[552]],[940,[209,559,560]],[1033,[40,69]]]},{"id":"afyon-kocatepe-universitesi","name":"Afyon Kocatepe Üniversitesi","cityId":"afyonkarahisar","type":"Devlet","faculties":[[15,[16,32,74,85,111,150,158,180,226,255,264,292,306,370,375,385,423,448,562]],[123,[47,122]],[125,[288,342]],[148,[86,289,415,593]],[161,[47,61,85,95,122,137,150,226,292,318,385,413,624]],[163,[47,348,384]],[221,[111,150,324,385,412]],[247,[150,292,541]],[273,[61,88,380,385]],[274,[168,481]],[307,[187,279,285,397,417,449,476,496,569]],[322,[32,47,61,122,243,342,612]],[356,[91,93,184,284,321,362,382,436,468,501,532,565,597]],[432,[266,487]],[487,[261]],[500,[271,303,355,493,587,629]],[503,[273]],[522,[300,335,354,370]],[694,[59,75,153,225,242,291,312,322,349,356,620]],[790,[10,61,241,243,306,463,524]],[791,[111,498]],[830,[61,293]],[856,[47,226,409]],[890,[226,342,451]],[910,[154,353,369,372,411]],[940,[209,559,560,561]],[990,[600]]]},{"id":"afyonkarahisar-saglik-bilimleri-universitesi","name":"Afyonkarahisar Sağlık Bilimleri Üniversitesi","cityId":"afyonkarahisar","type":"Devlet","faculties":[[90,[8,127,134,161,199,245,278,407,546,547,548,550,551,617]],[162,[546,551]],[275,[132]],[293,[143]],[770,[52,200,254,464]],[891,[278,422,548]],[917,[552]]]},{"id":"agri-ibrahim-cecen-universitesi","name":"Ağrı İbrahim Çeçen Üniversitesi","cityId":"agri","type":"Devlet","faculties":[[195,[253]],[282,[10,32,111,122,181,237,278,558,612]],[293,[143]],[307,[187,279,397,449,476,496,569]],[317,[47,342,462]],[356,[91,283,284,362,382,436,456,501,532,565]],[500,[240,271,303,493]],[528,[295]],[670,[11,61,86,104,105,150,212,234,352,368,385,392,401,434,608]],[743,[61,74,144,292,375,399,491]],[744,[498]],[770,[52,142,254]],[775,[111,174,278,548,617]],[836,[489,490]],[917,[552]],[946,[209]]]},{"id":"akdeniz-karpaz-universitesi","name":"Akdeniz Karpaz Üniversitesi","cityId":"kktc","type":"KKTC","faculties":[[463,[489,490]],[534,[251,303]]]},{"id":"akdeniz-universitesi","name":"Akdeniz Üniversitesi","cityId":"antalya","type":"Devlet","faculties":[[253,[557]],[275,[132]],[295,[13,28,91,179,184,283,345,436,456,468,501,532,565]],[307,[187,279,285,397,417,449,476,496,569]],[319,[41,61,155,158,306,385,471,491,524]],[354,[72,196,321,362,594]],[365,[41,117,122,373,562]],[414,[32,270,420]],[473,[254]],[487,[261]],[500,[96,146,271,303,355,493,583]],[503,[273]],[506,[211,241,440,451]],[595,[118]],[616,[41,61,156,359,385,423,550]],[629,[41,306,385,471]],[630,[111,254]],[654,[32,61,111,226,306,385,401,423,562,564]],[655,[498,629]],[656,[209,453,559,560]],[657,[14,284]],[676,[265,376,427,516]],[694,[59,102,154,225,291,312,353,611]],[770,[52,200,223]],[775,[111,134,199,278,441,546,547,548,617]],[810,[106,111,212,234,241,375,380,399,428,462,466,540,562]],[811,[148,559]],[847,[47,95,241,306,367,385,396,418,423,489,499,562,564]],[855,[507]],[909,[61,74,90,101,137,150,156,158,243,269,292,328,352,392,401,412,455,491,612]],[917,[552]],[940,[209,453,559,560,561]],[968,[194,589,629]],[1031,[40,69,522,525,528,531,536,556,634]]]},{"id":"aksaray-universitesi","name":"Aksaray Üniversitesi","cityId":"aksaray","type":"Devlet","faculties":[[33,[122,241,385,396,418,562]],[34,[16,41,61,74,101,137,150,213,292,324,352,412,428,514,550]],[275,[132]],[307,[187,279,285,397,417,449,476,496,569]],[342,[342,347]],[356,[28,72,184,283,362,382,501,532,565]],[439,[32,69,226,374,375,562]],[500,[271,303,355,493,583,629]],[503,[273]],[506,[211,240]],[679,[376]],[694,[102,154,163,291,353,620]],[731,[47,85,89,158,352,368,385,497]],[770,[2,254,464]],[775,[399,546,548,617]],[917,[552]],[940,[209,560]],[990,[600]]]},{"id":"alanya-alaaddin-keykubat-universitesi","name":"Alanya Alaaddin Keykubat Üniversitesi","cityId":"antalya","type":"Devlet","faculties":[[35,[61,85,150,375,385,405,491,521]],[46,[47,61,150,162,264,269,385,499]],[47,[32,557,558,562]],[275,[132]],[307,[187,279,285,397,449,476,569]],[375,[251]],[376,[32,306,489,490,550,562]],[501,[271,288,303,355,585]],[758,[59,77,154,163,221,225,291,353,372]],[770,[52,111,200,254]],[775,[111,199,278,548]],[789,[376]],[917,[552]],[940,[209,559]]]},{"id":"alanya-universitesi","name":"Alanya Üniversitesi","cityId":"antalya","type":"Vakıf","faculties":[[501,[303,559,589,629]],[670,[9,32,61,199,224,324,360,562]],[695,[59,168,266]],[770,[142,200,254]],[786,[110,209,277]]]},{"id":"altinbas-universitesi","name":"Altınbaş Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[275,[132]],[293,[143]],[487,[261]],[501,[147,436,493,501,583]],[506,[229,240,440]],[534,[303,348,423,587]],[696,[59,154,163,266,291,353,376,620]],[770,[142,254,464]],[775,[8,17,19,111,144,199,278,395,399,441,546,547,548]],[917,[552]],[968,[209,334,619,629]]]},{"id":"amasya-universitesi","name":"Amasya Üniversitesi","cityId":"amasya","type":"Devlet","faculties":[[61,[32,85,122,241,385,423,451,562]],[62,[61,86,150,158,243,289,292,324,380,412,461]],[307,[51,187,279,285,397,449,476,496,569]],[423,[47,95]],[461,[110]],[503,[273]],[515,[284,362,532,565,609]],[668,[251,271,493]],[669,[49,61,352,368,489,490]],[676,[320,376,516]],[694,[59,154,353]],[763,[111,144,174,199,278,399,546,548,617]],[770,[52,142,200,254]],[858,[1,69,101,224,226,342,491,550]],[897,[58,234,375]],[900,[434,443,444,445,448,579]],[917,[552]]]},{"id":"anadolu-universitesi","name":"Anadolu Üniversitesi","cityId":"eskisehir","type":"Devlet","faculties":[[6,[1,32,47,61,85,90,96,122,162,174,184,203,229,240,241,251,271,273,288,303,306,338,347,355,361,367,385,462,464,493,499,500,501,526,532,546,562,565,583,589,598,601,604,617,629]],[144,[597]],[148,[27,86,415,416]],[293,[143]],[295,[24,28,184,436,456,468,501,532,565]],[307,[15,64,207,279,285,397,417,449,476,496]],[323,[60,613]],[344,[32]],[432,[125]],[487,[261]],[500,[96,271,303,355,493,589,629]],[505,[211,240,487,623]],[770,[52,130,498]],[940,[209,559,560]],[1023,[127,459,617]]]},{"id":"ankara-bilim-universitesi","name":"Ankara Bilim Üniversitesi","cityId":"ankara","type":"Vakıf","faculties":[[437,[191,266,623]],[464,[251,429,575]],[487,[261]],[515,[284,303,436,493,629]],[670,[58,61,66,141,158,290,551,562,576,601]],[696,[59,154,163,620]]]},{"id":"ankara-haci-bayram-veli-universitesi","name":"Ankara Hacı Bayram Veli Üniversitesi","cityId":"ankara","type":"Devlet","faculties":[[295,[22,24,28,91,93,107,184,205,206,283,436,456,468,501,532,565,567]],[364,[194,473,481]],[432,[202,229,336]],[487,[261]],[500,[96,146,271,303,355,464,493,583,587,629]],[503,[273]],[506,[211,241,440]],[693,[32]],[753,[72,196,321,362,532,565]],[754,[49,88,111,227,385,459,521]],[786,[149,334,380,539]],[892,[210,520]],[940,[209,453,559,560]]]},{"id":"ankara-medipol-universitesi","name":"Ankara Medipol Üniversitesi","cityId":"ankara","type":"Vakıf","faculties":[[275,[132]],[293,[143]],[435,[209,266]],[487,[261]],[501,[303,436,587,629]],[506,[240]],[670,[27,61,264,292,351,423,455,605,606]],[695,[59,154]],[770,[52,130,142,176,200,254,394]],[775,[8,17,19,74,133,134,199,278,395,399,441,463,547,548]],[841,[493,494]],[917,[552]]]},{"id":"ankara-muzik-ve-guzel-sanatlar-universitesi","name":"Ankara Müzik ve Güzel Sanatlar Üniversitesi","cityId":"ankara","type":"Devlet","faculties":[[700,[212]],[786,[214,440]]]},{"id":"ankara-sosyal-bilimler-universitesi","name":"Ankara Sosyal Bilimler Üniversitesi","cityId":"ankara","type":"Devlet","faculties":[[84,[86,261,271,273,285,417,436,582,589,608,629]],[487,[261]],[503,[273]],[506,[623]],[786,[229]],[841,[271,303,493,583]],[848,[184,436,501,532,565]],[997,[24,108,283,297,309,458]]],"extraCityIds":["kktc"]},{"id":"ankara-universitesi","name":"Ankara Üniversitesi","cityId":"ankara","type":"Devlet","faculties":[[4,[1,23,47,61,62,85,91,159,211,241,283,293,385,440,456,468,488,497,498,546,562,601,629]],[42,[249,400]],[97,[88,90,418,497]],[105,[124,368]],[110,[300,329,513]],[135,[1,32,35,47,335,380,491,557,562,564]],[148,[61,86,293]],[272,[13,18,22,23,28,55,82,91,93,94,131,177,182,184,205,238,259,260,262,283,296,307,308,326,330,345,346,435,436,456,468,477,488,501,510,532,534,565,578,591,630]],[275,[132]],[293,[143]],[306,[64,397,417,449,476,496]],[318,[85,156,158,385,421]],[354,[31,56,72,196,298,321,362]],[432,[336]],[470,[199,617]],[473,[142,254]],[487,[261]],[503,[273]],[506,[211,241,440,623]],[557,[39,41,69,226,428,550]],[605,[199,302,430]],[694,[59,75,154,197,225,291,311,312,322,353,611,620]],[702,[61,151,158,624]],[770,[52,111,394,406,464,498]],[775,[8,19,144,278,441,546,547,548]],[820,[479]],[841,[96,271,303,355,433,493,583]],[909,[16,74]],[917,[552]],[968,[12,125,210,348]],[990,[600]],[1031,[40,69,427,507,512,522,525,531,536,556,634]]]},{"id":"ankara-yildirim-beyazit-universitesi","name":"Ankara Yıldırım Beyazıt Üniversitesi","cityId":"ankara","type":"Devlet","faculties":[[275,[132]],[464,[250]],[487,[261]],[503,[273]],[506,[240,623]],[515,[24,55,182,184,284,436,468,501,532,565]],[534,[194,303,588,629]],[677,[125,168,229,376]],[695,[59,154,163,171,291,353,362,372,620]],[770,[52,111,130,200,254,394,464,498]],[775,[8,112,161,174,342,399,547,548,550,617]],[841,[271,355,493,583]],[885,[306]],[886,[194,589]],[909,[33,61,86,113,123,226,234,490,491,576]],[917,[552]]]},{"id":"antalya-belek-universitesi","name":"Antalya Belek Üniversitesi","cityId":"antalya","type":"Vakıf","faculties":[[500,[588,629]],[516,[436,501]],[670,[32,47,58,66,144,264,292,351,375,399,489,490,557,601]],[699,[620]],[786,[209,266,277,440]]]},{"id":"antalya-bilim-universitesi","name":"Antalya Bilim Üniversitesi","cityId":"antalya","type":"Vakıf","faculties":[[275,[132]],[436,[266,376]],[487,[261]],[501,[147,303,436,494]],[670,[32,61,292,351]],[695,[59,154,163,291,353]],[770,[52,142,200,254]],[775,[8,17,19,134,199,278,399,547,548]],[837,[429]],[940,[209,559]]]},{"id":"ardahan-universitesi","name":"Ardahan Üniversitesi","cityId":"ardahan","type":"Devlet","faculties":[[231,[351,499]],[500,[271,303,493,583]],[503,[273]],[517,[28,91,93,184,283,456,468,501,532,565]],[694,[59]],[712,[144,342,434,491,513]],[756,[181,278,351]],[770,[2,254,464]],[775,[111,546,547,548,617]],[847,[85,465]],[909,[26,32,61,150,224,292,399,459,461]],[946,[209]]]},{"id":"arkin-yaratici-sanatlar-ve-tasarim-universitesi","name":"Arkın Yaratıcı Sanatlar ve Tasarım Üniversitesi","cityId":"kktc","type":"KKTC","faculties":[[506,[125,229,623]],[784,[191]],[896,[168,266,320,376]]]},{"id":"artvin-coruh-universitesi","name":"Artvin Çoruh Üniversitesi","cityId":"artvin","type":"Devlet","faculties":[[77,[85,122,562]],[83,[1,32,34,47,61,85,174,243,264,344,351,352,385,405,418,491,521]],[167,[111,151,292,328,368,499,612,626]],[307,[279,397,417,449,476,496,569]],[356,[184,283,456,501,532,565]],[483,[271,303,493]],[484,[47,117,288,347]],[504,[273]],[534,[194,464]],[694,[59,102,154]],[728,[403,404]],[770,[2,52,254,301]],[775,[8,104,111,144,199,278,302,399,546,548,617]],[787,[229,427]],[879,[127,497,550,617]],[940,[209]],[1025,[69,181]]]},{"id":"atasehir-adiguzel-meslek-yuksekokulu","name":"Ataşehir Adıgüzel Meslek Yüksekokulu","cityId":"istanbul","type":"Vakıf","faculties":[[87,[32,47,61,111,306,368,399,490,551]]]},{"id":"ataturk-universitesi","name":"Atatürk Üniversitesi","cityId":"erzurum","type":"Devlet","faculties":[[5,[1,47,61,85,95,122,141,162,203,233,241,295,303,306,313,347,385,451,452,462,464,489,498,499,501,532,542,546,562,601,622]],[85,[111,150,347,396,462,489]],[275,[132]],[293,[143]],[295,[13,18,23,28,55,91,93,182,184,283,284,436,456,468,501,532,565]],[354,[31,72,196,321,362,382,597]],[432,[201]],[473,[254]],[478,[111,144,342,399,548]],[485,[61,342,418,434,448,491]],[487,[261]],[500,[96,146,271,303,313,583,589,629]],[503,[273]],[506,[211,241,440,623]],[529,[47,74,150,405,462,624]],[584,[15,73,92,185,187,207,279,285,323,364,397,417,449,476,496,533,566,569]],[679,[265,376,427,516]],[694,[59,102,154,163,291,322,353,372,611,620]],[703,[47,292,342,546]],[723,[194,303,498]],[724,[47,224,234,241,292,405,546]],[742,[47,61,95,243,288,292]],[770,[52,111,142]],[775,[8,17,19,133,134,144,161,174,199,278,395,407,546,547,548,617]],[847,[88,111,122,385,396,489,562]],[855,[507]],[909,[33,61,150,156,224,226,227,252,292,324,352,412,508]],[917,[552]],[928,[61,234]],[940,[209,559,560]],[971,[2,68,597,609]],[990,[600]],[1031,[40,69,225,522,525,528,531,536,556,634]]]},{"id":"atilim-universitesi","name":"Atılım Üniversitesi","cityId":"ankara","type":"Vakıf","faculties":[[93,[141,351]],[356,[283,284,362,436]],[435,[168,234,266,376,542]],[487,[261]],[534,[240,271,303,355,493,583,589]],[694,[59,67,154,163,171,250,291,322,353,369,411,620]],[770,[52,111,200,254,394]],[775,[17,19,199,278,547,548]],[837,[251,429,573,574]],[917,[552]]]},{"id":"avrasya-universitesi","name":"Avrasya Üniversitesi","cityId":"trabzon","type":"Vakıf","faculties":[[500,[303,493]],[506,[229,623]],[515,[283,284,436,565]],[670,[32,61,66,122,141,150,241,243,264,292,347,351,368,375,380,412,490,499,601]],[695,[59,266,291,376,382]],[770,[52,111,142,176,200,254,394]],[775,[8,17,19,111,133,134,144,161,199,278,302,395,399,407,422,441,547,548]],[972,[209,629]]]},{"id":"aydin-adnan-menderes-universitesi","name":"Aydın Adnan Menderes Üniversitesi","cityId":"aydin","type":"Devlet","faculties":[[92,[85,241,521]],[99,[49,61,85,111,292,306,380,385,412,608]],[100,[19,103,134,199,278,546,547,548]],[170,[241,342]],[182,[85,95,111,432,624]],[235,[47,128,224,226,401,513,514]],[271,[32,562,564]],[275,[132]],[307,[187,279,285,397,417,449,476,496,569]],[354,[72,196,321,362]],[390,[151,158,352,354,418]],[473,[254]],[503,[273]],[506,[211,229,240,440,623]],[515,[13,28,184,205,283,436,501,532,565]],[566,[122,306,374,375,385,562]],[612,[111,344,401,428,524,550,596]],[624,[224,226,347]],[633,[32,270,562]],[694,[59,154,225,291,353]],[704,[96,271,303,355,493,583,587]],[705,[47,122,306,347]],[706,[181,199,430,617]],[770,[52,111,142,200]],[841,[146,148,271,355,583]],[850,[147,288,313,348,588,629]],[851,[16,47,58,122,151,241,333,380,412,455]],[852,[17,181,278,547]],[857,[10,69,288,306,423,459,530]],[917,[552]],[944,[474,559,560,627]],[990,[600]],[1010,[47,162,385]],[1031,[40,69,77,427,512,522,528,536,556,634]]]},{"id":"azerbaycan-devlet-pedagoji-universitesi","name":"Azerbaycan Devlet Pedagoji Üniversitesi","cityId":"yurt-disi","type":"Yurt Dışı","faculties":[[722,[438]]]},{"id":"bahcesehir-kibris-universitesi","name":"Bahçeşehir Kıbrıs Üniversitesi","cityId":"kktc","type":"KKTC","faculties":[[501,[195,303,436,494,629]],[670,[61,455]],[678,[59,376,620]],[940,[209]]]},{"id":"bahcesehir-universitesi","name":"Bahçeşehir Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[275,[132]],[293,[143]],[306,[285]],[487,[261]],[501,[147,148,284,303,348,436,494,501,580,588,629]],[506,[125,229,241,451,487,621]],[679,[168,266,376]],[695,[54,59,75,154,163,171,291,304,369,382,607,620]],[770,[52,130,200,254,394]],[775,[8,17,19,111,133,199,278,399,548,551]],[917,[552]],[972,[209,429]]]},{"id":"balikesir-universitesi","name":"Balıkesir Üniversitesi","cityId":"balikesir","type":"Devlet","faculties":[[55,[61,324,550]],[104,[306,375,423,562]],[111,[61,85,111,150,156,158,234,269,292,306,328,350,352,385,412,423,540,562,608]],[143,[47,150,199,243,347,385,579]],[189,[306,333,385,423,562]],[190,[194,209,559,585]],[290,[292,335,405,626]],[298,[61,150,292,352,368,632]],[299,[251]],[356,[72,91,196,321,362,382,436,501,532,565]],[467,[85,141,306,385]],[487,[261]],[500,[271,303,355,493,589]],[503,[273]],[539,[127,278,546]],[596,[47,342,418]],[676,[376]],[694,[59,102,154,163,225,291,353]],[707,[73,187,279,285,323,364,397,417,449,476,496,566,569]],[770,[142,200,223,254]],[805,[162,342]],[819,[32,122,150,462,562]],[861,[224,342,344,514]],[917,[552]],[940,[209,453,559,560]],[990,[600]]]},{"id":"bandirma-onyedi-eylul-universitesi","name":"Bandırma Onyedi Eylül Üniversitesi","cityId":"balikesir","type":"Devlet","faculties":[[113,[61,88,122,180,226,306,367,385]],[255,[115,118,216,217]],[256,[117,215,503]],[330,[463,562]],[410,[58,61,66,137,234,306,385,562,601]],[500,[96,146,271,303,355,493,583]],[503,[273]],[506,[240,623]],[515,[284,468,501,532,565]],[660,[47,418,462,497]],[695,[59,153,154,620]],[737,[589,629]],[770,[52,200,254,464,498]],[775,[199,399,499,547]],[917,[552]]]},{"id":"bartin-universitesi","name":"Bartın Üniversitesi","cityId":"bartin","type":"Devlet","faculties":[[116,[61,117,215,234,241,306,351,360,379,385,401,428,455,497,562,564,608]],[117,[158]],[118,[403,404]],[119,[111,174,181,199,278,399,459,543,546,549,617]],[307,[187,279,285,397,417,449,476,496,569]],[354,[63,78,362,382]],[500,[271,303,493,559,589,629]],[503,[273]],[515,[24,55,93,184,284,436,468,501,532,565]],[698,[59,154,291,353,372,427]],[770,[142,254,498]],[853,[452]],[965,[9,85,227,405,521]]]},{"id":"baskent-universitesi","name":"Başkent Üniversitesi","cityId":"ankara","type":"Vakıf","faculties":[[9,[19,199,278,547]],[64,[156,290,318,352,596]],[275,[132]],[293,[143]],[307,[279,285,397,449,476,569]],[356,[18,284,382,436,501,565]],[435,[110,191,209,229,234,266,376,542]],[487,[261]],[500,[271,303,494,537]],[506,[241,277,440]],[552,[158,166,226,328,347,352,401,412]],[615,[278]],[694,[59,75,154,163,291,353,607]],[770,[52,130,200,254,394,464,498]],[775,[8,17,19,134,199,278,422,546,547,617]],[847,[32,85,111,122,203,306,351,385,420,562]],[909,[61,74,127,455]],[917,[552]],[919,[384,481,559,581,587,629]]],"extraCityIds":["adana","konya"]},{"id":"batman-universitesi","name":"Batman Üniversitesi","cityId":"batman","type":"Devlet","faculties":[[133,[16,318,352,368,540]],[275,[132]],[356,[283,362,468,501,532,565]],[458,[32,420]],[500,[271,303,493,583]],[528,[295]],[622,[111,385,612]],[699,[59,154,291,353,426]],[770,[142,254,464]],[775,[199,278,399,462,546,548,617]],[804,[111,178,401,550]],[847,[47,85,111,241,385,418,491]],[909,[62,150,156,158,212,226,227,264,292,324,335,342,352,412,442,495]],[940,[209,559,560]]]},{"id":"bayburt-universitesi","name":"Bayburt Üniversitesi","cityId":"bayburt","type":"Devlet","faculties":[[102,[111,112,226,243,292]],[252,[33,300,342,489,490]],[307,[187,279,285,397,449,476,496,569]],[500,[271,303,493,588]],[503,[273]],[515,[501,532,565]],[694,[291]],[770,[52,200,254,464]],[775,[19,111,144,278,399,462,543,546,548,617]],[786,[623]],[847,[32,47,85,88,306,347,351,420,434,497]],[909,[16,61,74,127,155,203,234,368,418,491]],[968,[2,235,629]]]},{"id":"beykoz-universitesi","name":"Beykoz Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[134,[117,122,141,347,444,490]],[537,[303,348,587,629]],[670,[61,66,86,126,608]],[696,[59,163,376,607,620]],[786,[125,209,234,240,266,277,440]],[837,[251]],[846,[436,494]]]},{"id":"bezm-i-alem-vakif-universitesi","name":"Bezm-i Âlem Vakıf Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[275,[132]],[293,[143]],[770,[52,176,200,254,394,464]],[775,[8,17,19,144,161,278,399,407,422,441,546,547,548,617]],[917,[552]]]},{"id":"bilecik-seyh-edebali-universitesi","name":"Bilecik Şeyh Edebali Üniversitesi","cityId":"bilecik","type":"Devlet","faculties":[[174,[47,122,234,385,451]],[275,[132]],[354,[299,362,382]],[408,[47,85,241,451,499]],[437,[168,266]],[500,[271,303,355,493,629]],[503,[273]],[515,[91,532,565]],[670,[32,61,74,101,150,151,156,158,224,226,255,264,292,324,328,352,368,371,412,428,596]],[694,[59,154,163,291,322,353,372]],[733,[122,150,181,352,385,462,546,562]],[748,[47,61,164,293,549,601]],[770,[111,254,464,498]],[775,[17,111,134,144,278,399,546,548]],[849,[32,49,61,85,241,264,351,380,497]],[917,[552]],[968,[194,384,559,560]],[1035,[77,633]]]},{"id":"bingol-universitesi","name":"Bingöl Üniversitesi","cityId":"bingol","type":"Devlet","faculties":[[148,[61,123,601]],[151,[32,85,95,141,241,306,367,385,418,490,497,557,562]],[152,[16,137,150,156,227,234,237,243,264,292,352,368,412]],[275,[132]],[356,[23,24,91,184,283,284,341,362,382,436,498,501,532,565,631]],[366,[200]],[387,[66,111,150,405,461,491]],[395,[26,41,224,226,342,401,428,509,514,536,550]],[500,[271,303,493,629]],[503,[273]],[699,[59,154,291,353,376]],[770,[52,254,301,464]],[775,[8,103,111,112,133,134,144,174,181,199,278,395,399,422,462,546,548,617]],[843,[111,546,548]],[853,[452]],[990,[600]],[1031,[40,69,77,427,536,556,634]]]},{"id":"biruni-universitesi","name":"Biruni Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[275,[132]],[293,[143]],[307,[285,397,417,449]],[670,[1,8,17,19,61,74,111,133,134,144,199,278,395,399,422,455,547,548]],[695,[59,75,154,168,266,322,382,620]],[770,[52,111,130,142,176,200,254,394]],[917,[552]],[968,[209,284,619]]]},{"id":"bitlis-eren-universitesi","name":"Bitlis Eren Üniversitesi","cityId":"bitlis","type":"Devlet","faculties":[[12,[61,156,385,418,434]],[17,[47,178,374,396,472]],[356,[23,283,362,468,501,532,565]],[430,[203,241]],[432,[440]],[481,[26,47,342,347,351,549]],[500,[271,303,493,494]],[503,[273]],[563,[209,559]],[699,[59,154,291,353]],[725,[150,226,318,517]],[770,[52,142,200,254,498]],[775,[19,104,111,174,278,399,422,499,547,548,617]],[847,[32,95,385,462,497]],[901,[62,117,243,344,385,461,614]],[909,[74,292,352,368,375,412,491,521,579,612]],[917,[552]]]},{"id":"bogazici-universitesi","name":"Boğaziçi Üniversitesi","cityId":"istanbul","type":"Devlet","faculties":[[307,[64,187,198,279,285,323,364,397,449]],[354,[196,321,362,382]],[487,[261]],[500,[271,303,494,559,585,629]],[515,[100,131,184,283,436,501,532,565]],[694,[59,154,163,291,322,353]]]},{"id":"bolu-abant-izzet-baysal-universitesi","name":"Bolu Abant İzzet Baysal Üniversitesi","cityId":"bolu","type":"Devlet","faculties":[[159,[47,288,306,329,385,462,562]],[160,[61,150,158,226,234,264,412,428,540]],[275,[132]],[307,[187,279,285,397,417,449,476,496,569]],[356,[72,196,283,284,321,362,436,501,532,565]],[388,[35,61,120,306,324,354,380,385,412,418,434,491,540]],[389,[194,423,589]],[487,[261]],[500,[146,271,303,313,355,583]],[503,[273]],[506,[211,229,241,440]],[663,[8,111,278,546,547]],[664,[32,420]],[676,[376,516]],[684,[306,339,342,375,405,562]],[694,[59,154,163,225,291,353]],[770,[52,200,254]],[807,[10,69,497,499]],[917,[552]],[940,[209,559,560]],[1009,[122,224,292,347]],[1031,[40,69,314,536,554]]]},{"id":"burdur-mehmet-akif-ersoy-universitesi","name":"Burdur Mehmet Akif Ersoy Üniversitesi","cityId":"burdur","type":"Devlet","faculties":[[16,[47,61,66,85,351,434,564]],[59,[1,491]],[176,[67,620]],[177,[27,58,74,151,234,380,467,601,608,624]],[178,[111,122,241,306,347,385,489,490]],[179,[148,241,303]],[180,[2,111,142,254]],[181,[68,235,384,629]],[187,[26,32,41,69,128,226,252,339,342,513,514]],[188,[8,17,19,127,199,278,407,461,543,551]],[220,[499,617]],[275,[132]],[307,[187,279,285,397,417,449,476,496,569]],[356,[22,28,72,91,184,244,283,296,321,362,382,389,501,532,565,597]],[404,[10,47,61,90,105,150,243,293,316,375,405,497,521]],[405,[111,144,181,278,302,399,546]],[406,[68,520]],[500,[194,271,303,355,464,493,498]],[503,[273]],[699,[59,154,163,353,376,427]],[770,[2,52,200,223,254]],[786,[125,229]],[847,[49,85,95,385,462,489]],[908,[288,333,396]],[909,[9,61,84,123,137,155,255,258,264,281,292,328,352,368,412,413]],[917,[552]],[940,[209,559]],[990,[600]],[1015,[32,557,562]]]},{"id":"bursa-teknik-universitesi","name":"Bursa Teknik Üniversitesi","cityId":"bursa","type":"Devlet","faculties":[[255,[118,216]],[515,[284,303,436,501,583,589]],[679,[376,427,516]],[695,[59,76,102,154,163,196,225,291,321,322,353,362,369,372,431,597,609]],[728,[403,404]]]},{"id":"bursa-uludag-universitesi","name":"Bursa Uludağ Üniversitesi","cityId":"bursa","type":"Devlet","faculties":[[194,[34,111,405]],[275,[132]],[307,[15,64,187,207,279,285,397,417,449,476,496,569]],[356,[28,72,91,184,196,321,362,382,436,468,501,532,565]],[386,[41,61,117,122,226,243,255,352]],[455,[32,379,385,562]],[488,[261]],[500,[96,146,271,303,355,493,583]],[503,[273]],[513,[303,588,629]],[514,[111,122,151,278,292,306,354,379,385,423,540]],[545,[109,226,243,375,472,557]],[565,[61,226,252,306,342,385,401,514]],[589,[47,61,226,306]],[665,[33]],[676,[376]],[691,[226,306,385,401,423,555]],[694,[59,102,154,163,291,353,411,538]],[726,[85,95,227,385]],[727,[61,158,352,412,428]],[770,[52,200,254]],[775,[19,278,546,547,548]],[847,[47,85,122,162,306,347,385,418,423,562]],[909,[61,137,150,158,167,180,226,234,255,269,352,380,412,428,455,514,523,540]],[917,[552]],[990,[600]],[1012,[69,111,122,226,269,342,385,410,489]],[1031,[40,69,77,225,427,522,536,556,634]]]},{"id":"cag-universitesi","name":"Çağ Üniversitesi","cityId":"mersin","type":"Vakıf","faculties":[[356,[284,436]],[487,[261]],[500,[581,583,584,589,629]],[670,[47,111,122,351,462,499,546]]]},{"id":"canakkale-onsekiz-mart-universitesi","name":"Çanakkale Onsekiz Mart Üniversitesi","cityId":"canakkale","type":"Devlet","faculties":[[103,[47,212,306,557,562]],[127,[111,241,344,405]],[140,[96,146,271,303,313,355,583]],[141,[150,151,226,306,329,352,379,385,412,423,514,624]],[142,[194,589]],[207,[16,74,151,158,172,316,347,350,368,374,385,495]],[208,[301,588]],[209,[19,144,161,278,547,548]],[210,[85,111,203,241,306,385]],[211,[16,61,150,224,227,234,264,289,292,378,413,415,455,519,616]],[212,[43,54,173,226,388,464]],[254,[115,505,507]],[256,[215,368,502,503]],[275,[132]],[307,[92,187,279,285,310,323,397,417,449,476,496,569]],[348,[122,224,241,306,347,385,423,514,564]],[354,[72,196,298,321,362,382,594]],[382,[117,288,562,564]],[397,[122,241,306,562]],[398,[209]],[503,[273]],[506,[211,440,623]],[515,[28,91,184,283,436,468,501,532,565]],[644,[11,47,69,71,190,344,385,401,428]],[679,[376,427,516]],[694,[59,76,102,154,225,242,291,322,620]],[770,[2,142,254]],[841,[271,303,493,583]],[917,[552]],[940,[209,475,559]],[1008,[47,122,342,347,374,380,405]],[1031,[40,69,522,525,528,531,536,556,634]]]},{"id":"cankaya-universitesi","name":"Çankaya Üniversitesi","cityId":"ankara","type":"Vakıf","faculties":[[213,[61,122,141]],[356,[56,283,284,362,436]],[487,[261]],[500,[240,271,303,494,587,629]],[676,[265,376,516]],[694,[59,154,163,291,353,369,620]]]},{"id":"cankiri-karatekin-universitesi","name":"Çankırı Karatekin Üniversitesi","cityId":"cankiri","type":"Devlet","faculties":[[227,[165,181,551,617]],[275,[132]],[315,[111,278,399]],[354,[72,196,298,321,362]],[394,[34,536,550]],[487,[261]],[500,[96,194,271,303,493,583,587]],[515,[23,55,91,184,283,436,501,532,565]],[528,[295]],[631,[16,543]],[670,[47,61,85,150,155,156,158,264,269,292,352,368,385,562]],[694,[59,154,225,291,322,353]],[728,[404,427]],[770,[52,111,142,176,200,223,254,464,498]],[789,[487,542]],[847,[418,491,499]],[868,[104,342,548]],[943,[559,560]]]},{"id":"cukurova-universitesi","name":"Çukurova Üniversitesi","cityId":"adana","type":"Devlet","faculties":[[1,[8,19,133,199,278,547,548,551,617]],[7,[61,111,150,158,162,264,269,292,352,380,385,412,459,540,564]],[8,[90,150,158,318,352,540]],[45,[34,350,405]],[197,[61,85,150,292,385,423,491,523]],[198,[353]],[199,[600]],[275,[132]],[293,[143]],[307,[15,64,185,187,207,279,285,397,449,476,496,569]],[356,[28,56,72,196,298,321,362,436,565,609]],[432,[209,234]],[487,[261]],[500,[146,271,303,355,494]],[503,[273]],[506,[211,275,440]],[509,[62,137,344]],[570,[58,61,89,243,471,550]],[620,[303]],[621,[41,47,61,385,396]],[676,[265,376,427]],[694,[59,75,102,154,163,225,291,312,349,353,411,538]],[757,[41,385,562]],[770,[52,142,254]],[855,[507]],[917,[552]],[932,[151]],[1021,[122,401,503,562]],[1031,[40,69,522,525,531,536,556,634]]]},{"id":"demiroglu-bilim-universitesi","name":"Demiroğlu Bilim Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[356,[382,436]],[369,[254]],[537,[303,629]],[770,[52,142,200,464]],[775,[17,19,134,199,278,543,546,547,548]],[917,[552]]]},{"id":"dicle-universitesi","name":"Dicle Üniversitesi","cityId":"diyarbakir","type":"Devlet","faculties":[[89,[52,254]],[90,[8,19,133,134,199,407,546,547,548,617]],[155,[61,401,523]],[229,[47,85,306]],[275,[132]],[277,[32,111,306,385,558,562]],[278,[41,226,401,513,514,555]],[279,[49,61,136,150,155,158,243,264,292,324,352,354,379,412,428,439,459,540]],[293,[143]],[336,[61,111,306,385]],[354,[72,196,321,362,382]],[487,[261]],[500,[271,303,464,493,498]],[503,[273]],[506,[211,241,440]],[676,[376]],[694,[59,154,291,349,353]],[818,[23,28,93,184,283,341,436,501,532,565]],[826,[61,111,150]],[837,[251]],[917,[552]],[990,[600]],[998,[209]],[1031,[40,69,525,536,634]],[1036,[15,92,187,279,285,364,397,476,496,533,566,569]]]},{"id":"dogu-akdeniz-universitesi","name":"Doğu Akdeniz Üniversitesi","cityId":"kktc","type":"KKTC","faculties":[[144,[54,68]],[147,[292]],[148,[27,61,84,123,415]],[275,[132]],[293,[143]],[307,[64,279,286,397,417,449,476,569]],[355,[12,29,196,284,299,321,365,382,436,565]],[487,[261]],[506,[125,229,240,440,623]],[535,[47,194,271,288,303,313,384,423,492,581,583,588,629]],[676,[265,376]],[694,[59,67,75,154,160,163,171,291,304,353,369,607,620]],[770,[52,145,200,254,464]],[776,[8,17,19,134,199,278,407,441,547]],[917,[552]],[940,[209,559]],[950,[32,420,490,562]]]},{"id":"dogus-universitesi","name":"Doğuş Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[487,[261]],[501,[271,275,283,284,303,436,493,583,588,629]],[670,[8,19,32,47,58,61,62,66,111,122,123,144,150,158,161,199,234,241,264,278,281,288,289,292,293,316,333,351,352,368,395,399,412,413,414,422,455,490,546,547,548,562,601,608]],[695,[59,154,163,353,619,620]],[774,[254]],[786,[125,168,209,229,232,265,542]]]},{"id":"dokuz-eylul-universitesi","name":"Dokuz Eylül Üniversitesi","cityId":"izmir","type":"Devlet","faculties":[[129,[16,62,300]],[175,[15,64,73,92,187,198,207,279,285,323,364,397,417,449,476,496,533,566,569]],[255,[115,118,217,348]],[275,[132]],[295,[18,28,131,184,284,317,388,436,456,501,532,565]],[300,[226,338,489,490,562]],[354,[56,72,196,298,321,362]],[366,[200]],[432,[201,332,440]],[473,[254]],[487,[261]],[500,[96,146,271,303,313,355,629]],[503,[273]],[534,[271,303,494,559,588]],[542,[61,85,138,150,156,158,243,269,292,324,335,352,354,368,385,423,462,530,540,562,614]],[609,[342,514,524]],[676,[376,516]],[694,[59,102,154,163,250,291,311,312,349,353,372,538]],[775,[8,19,74,278,343,393,395,441,546,547,548]],[917,[552]],[927,[136,165,222,318,350,491,495]],[940,[209,559,561]],[990,[600]]]},{"id":"duzce-universitesi","name":"Düzce Üniversitesi","cityId":"duzce","type":"Devlet","faculties":[[26,[271,493,583]],[27,[32,61,122,226,306,351,385,562]],[234,[342,385,550]],[286,[85,167,352,368]],[293,[143]],[307,[187,279,285,397,417,449,476,569]],[356,[0,28,72,98,184,236,321,362,436,501,532,565]],[409,[61,141,234,241,562]],[427,[318,354,371,596]],[503,[273]],[534,[303,464,484,587,629]],[582,[1,104,122,212,243,347,432,613]],[670,[26,27,61,150,158,264,269,292,328,352,380,412,455,624]],[694,[59,75,154,163,291,353,369]],[728,[7,403,404,427]],[729,[405]],[770,[254,498]],[775,[111,278,551,617]],[789,[229,376,440,553]],[847,[95,306,385,497]],[917,[552]],[940,[209,559]],[1031,[69,77,536]]]},{"id":"ege-universitesi","name":"Ege Üniversitesi","cityId":"izmir","type":"Devlet","faculties":[[53,[150,352,371,442]],[90,[17,19,111,134,144,174,278,399,546,548]],[126,[106,380,428,471]],[129,[61,69,178,328,359,385,471,558,562]],[144,[59,611]],[154,[273]],[230,[559,560]],[275,[132]],[293,[143]],[295,[13,14,18,91,184,283,284,326,435,436,468,501,532,565]],[302,[49,61,74,150,156,158,226,234,264,306,352,354,368,385,412,413,415,416,432,472,523]],[307,[64,187,397,417,449,476,496,569]],[320,[227,380,540]],[354,[31,71,72,196,298,321,362]],[435,[229]],[463,[489,576]],[473,[254]],[500,[271,303,583]],[506,[211,241,440,451]],[682,[168,380]],[694,[76,119,154,225,291,322,353,538]],[735,[41,342,401,513,514,550,555]],[736,[111]],[770,[52,142,200,394]],[820,[479]],[855,[507]],[917,[552]],[920,[61,226,385]],[967,[116,503]],[1031,[40,69,427,512,522,525,531,536,556,634]]]},{"id":"erciyes-universitesi","name":"Erciyes Üniversitesi","cityId":"kayseri","type":"Devlet","faculties":[[275,[132]],[293,[143]],[295,[99,107,177,184,263,283,308,330,456,468,501,532,565,567]],[307,[187,279,285,397,449,476,496,569]],[354,[31,72,196,321,362]],[446,[8,17,19,161,278,395,441,546,547,548]],[464,[248,251,574,575,595]],[487,[261]],[500,[271,303,355,493,583]],[503,[273]],[506,[211,241,440]],[676,[376,516]],[694,[59,75,102,154,163,169,171,225,242,291,353,369,372,538,620]],[770,[52,254]],[917,[552]],[940,[209,559,560]],[990,[600]],[1031,[40,69,77,528,536,556,634]]]},{"id":"erzincan-binali-yildirim-universitesi","name":"Erzincan Binali Yıldırım Üniversitesi","cityId":"erzincan","type":"Devlet","faculties":[[50,[248,251,572]],[224,[342,548]],[275,[132]],[293,[143]],[307,[187,279,285,397,449,476,496,569]],[356,[72,91,321,362,501,532,565]],[487,[261]],[500,[194,271,303,464,493,498]],[503,[273]],[508,[151,521,548]],[592,[47,66,95,446,462]],[593,[127,342,375]],[594,[209]],[670,[27,49,61,85,88,150,158,243,264,292,347,351,380,385,416,489,490,519,576,624]],[699,[59,154,291,353]],[759,[111,546]],[760,[434,443,444,448]],[770,[52,254]],[775,[1,8,19,111,144,181,278,546,547]],[914,[61,151,499]],[917,[552]],[949,[32,557,562]],[984,[61,264,491]],[998,[283,284]]]},{"id":"erzurum-teknik-universitesi","name":"Erzurum Teknik Üniversitesi","cityId":"erzurum","type":"Devlet","faculties":[[295,[184,283,436,532,565]],[354,[204,362,382]],[500,[271,303]],[696,[59,154,163,250,291,353,376]],[770,[2,52,200,254]]]},{"id":"eskisehir-osmangazi-universitesi","name":"Eskişehir Osmangazi Üniversitesi","cityId":"eskisehir","type":"Devlet","faculties":[[275,[132]],[307,[187,279,285,397,417,449,476,496]],[344,[89,101,368,576]],[354,[72,196,298,321,365]],[487,[261]],[500,[271,303,355,493,583]],[503,[273]],[515,[317,436,532,565]],[648,[33]],[699,[59,154,163,291,312,322,349,353,372,376,575,620]],[770,[142,254,464]],[775,[278,399,407,546,547,548,617]],[786,[168,229]],[840,[16,61,292,352,385]],[917,[552]],[940,[209,559]],[1031,[40,69,225,528,536,556,634]]]},{"id":"eskisehir-teknik-universitesi","name":"Eskişehir Teknik Üniversitesi","cityId":"eskisehir","type":"Devlet","faculties":[[144,[54,68,609]],[148,[61,84,290,368,415,455,479,593]],[354,[72,196,298,321,362]],[464,[248,250,251,429,574]],[679,[168,265,376,542]],[694,[59,102,154,163,291,322,353,356,575]],[755,[49,151,234,256,354,439,612]],[960,[347,443,444,445,446,448,490,579]]]},{"id":"fatih-sultan-mehmet-vakif-universitesi","name":"Fatih Sultan Mehmet Vakıf Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[307,[25,397,417,449,476,569]],[487,[261]],[500,[271,303,494,629]],[515,[65,251,284,436,532,565]],[528,[295]],[670,[61,66,74,111,175,178,212,228,247,264,289,292,347,351,375,380,396,455,478,485,490,557,576,624]],[694,[59,154,291,454,611,620]],[789,[234,265,336,376]]]},{"id":"fenerbahce-universitesi","name":"Fenerbahçe Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[293,[143]],[501,[148,283,303,436,494,629]],[506,[240,440,623]],[679,[168,266,376]],[695,[59,154,163,597,620]],[770,[52,130,142,176,200,254]],[775,[8,17,19,133,134,144,199,278,407,422,441,547,548,551]]]},{"id":"firat-universitesi","name":"Fırat Üniversitesi","cityId":"elazig","type":"Devlet","faculties":[[120,[16,41,401,446]],[275,[132]],[293,[143]],[307,[187,279,285,397,449,476,496,569]],[312,[61,137,158,164,227,292,318,324,612]],[354,[72,196,298,321,362,382]],[500,[96,271,303,355,493,498,629]],[503,[273]],[506,[211,229,241,440]],[515,[13,91,93,283,468,501,532,565]],[571,[61,226,521,612]],[587,[101,151,222,226,428]],[617,[61,144,181,278,306,399,462]],[676,[376]],[694,[59,102,154,291,312,322,353,369,372,611,620]],[770,[52,142,200,254]],[775,[19,111,199,395,414,546,547,548]],[837,[248,572]],[839,[33,243,342,562]],[847,[32,47,85,122,241,306,385,423,562]],[855,[507]],[909,[61,74,150,158,234,255,264,292,352,368,375,412,479]],[910,[6,154,171,291,353,369,372,411,620]],[917,[552]],[990,[600]]]},{"id":"galatasaray-universitesi","name":"Galatasaray Üniversitesi","cityId":"istanbul","type":"Devlet","faculties":[[256,[116,218]],[356,[184,205,362,501]],[487,[261]],[500,[271,303,492,583]],[506,[274]],[697,[59,163]]]},{"id":"gazi-universitesi","name":"Gazi Üniversitesi","cityId":"ankara","type":"Devlet","faculties":[[275,[132]],[293,[143]],[354,[72,196,298,321,362]],[373,[15,25,64,73,92,185,187,198,207,279,285,323,364,397,417,449,476,496,533,566,569]],[473,[254]],[676,[168,376,516]],[694,[59,154,163,291,322,353]],[770,[52,130,200,394,498]],[775,[8,278,422,546,547,548,617]],[909,[151,158,164,167,318,324,352,368,432]],[910,[7,59,154,169,171,280,291,372,411]],[917,[552]],[951,[61,66,328,576]],[968,[204,629]]]},{"id":"gaziantep-islam-bilim-ve-teknoloji-universitesi","name":"Gaziantep İslam Bilim ve Teknoloji Üniversitesi","cityId":"gaziantep","type":"Devlet","faculties":[[275,[132]],[435,[209]],[501,[24,284]],[503,[273]],[695,[59,154,163,611]],[770,[142,200,254]],[775,[17,278,548,617]],[909,[61,352]],[917,[552]]]},{"id":"gaziantep-universitesi","name":"Gaziantep Üniversitesi","cityId":"gaziantep","type":"Devlet","faculties":[[70,[111,342,401]],[275,[132]],[356,[28,72,91,184,283,321,362,501,532,565]],[374,[279,285,417,449,476,569]],[432,[191]],[464,[250,251]],[487,[261]],[500,[271,303,355,493,589]],[503,[273]],[506,[211,240]],[526,[271,303,313]],[527,[292,306,342,347,385,401,513,546]],[676,[376,516]],[694,[59,154,163,197,225,291,353,372,398,538]],[701,[35,74,137,150,156,158,224,226,227,237,269,281,324,328,352,368,412,540,541,590]],[715,[279,476,496,569]],[716,[47,61,85,95,122,226,306,385,401]],[717,[428,550]],[721,[61,88,306,347,385,418,491,497]],[770,[52,142,200,254]],[775,[8,17,133,199,278,546,548,617]],[847,[47,85,95,111,122,141,306,347,385]],[909,[27,335,374,416,439,455]],[917,[552]],[940,[209,561]],[949,[32,270,562,564]]]},{"id":"gebze-teknik-universitesi","name":"Gebze Teknik Üniversitesi","cityId":"kocaeli","type":"Devlet","faculties":[[464,[575]],[534,[271,303,629]],[676,[168,376,516]],[694,[59,76,102,157,163,242,291,322,353,356]],[820,[479]],[912,[196,321,362,382,597]]]},{"id":"giresun-universitesi","name":"Giresun Üniversitesi","cityId":"giresun","type":"Devlet","faculties":[[60,[47,241,342,367,462,497,546]],[183,[348,559,587]],[184,[150,158,188,352,540]],[264,[32,95,405,562]],[275,[132]],[307,[187,279,285,397,417,449,476,496,569]],[345,[1,224,418,491,550]],[347,[111,172,351,499]],[356,[72,91,283,362,501,532,565,597]],[396,[47,61,85,234,241,243,306,375,380,385,564,626]],[412,[234,336]],[413,[194,348]],[500,[271,303,493,583]],[503,[273]],[601,[122,162,292,462]],[694,[59,154,221,291,353]],[772,[142,254]],[775,[19,111,134,199,278,399,543,548,551,617]],[837,[251]],[880,[47,66,150,226,241,264,269,288,375,380]],[881,[278,551]],[882,[226,542]],[917,[552]],[921,[211,241,440]],[922,[16,47,61,151,385,434,462,564,601]],[940,[209,453]]]},{"id":"girne-amerikan-universitesi","name":"Girne Amerikan Üniversitesi","cityId":"kktc","type":"KKTC","faculties":[[131,[18,283,284,436]],[259,[115,348]],[293,[143]],[307,[285,397,449,476,569]],[465,[251,429]],[474,[142,254]],[487,[261]],[506,[50,241,440,623]],[534,[147,288,303,481,584]],[670,[32,47,61,114,116,264,306,368,490,562]],[681,[265,376]],[694,[59,154,163,171,291,607,620]],[770,[2,176,200,464]],[777,[8,17,19,278,441,547,549]],[842,[493,583]],[974,[194,209,384,423,559,629]]]},{"id":"girne-universitesi","name":"Girne Üniversitesi","cityId":"kktc","type":"KKTC","faculties":[[256,[116,117,218]],[260,[44,115,118,217]],[275,[132]],[307,[285,417,449,569]],[353,[436]],[463,[290,489,490]],[464,[251,429,575]],[487,[261]],[500,[194,348,583,584]],[676,[376]],[694,[59,154,291,353,620]],[770,[52,200,254]],[775,[8,19,199,278,547]],[909,[61,101]],[917,[552]],[940,[209,559]],[949,[32]]]},{"id":"gumushane-universitesi","name":"Gümüşhane Üniversitesi","cityId":"gumushane","type":"Devlet","faculties":[[295,[91,184,283,436,501,532,565]],[424,[271,288,303,355,493,583,629]],[425,[61,74,90,150,234,264,292,344,350,368,375,405]],[426,[111,134,199,278,422,548,617]],[503,[273]],[506,[211,241,440]],[521,[88,347,434,497]],[590,[61,151,158,342,385,489,490,521]],[591,[19,111,278,547]],[637,[405,491]],[695,[154,291,349,353,620]],[770,[2,52,254,301,464,498]],[847,[385,462,499,562]],[888,[134,144,199,278,546]],[889,[1,32,224,342,548]],[929,[49,61,351,399,418,499]],[940,[209,560]],[972,[251]]]},{"id":"hacettepe-universitesi","name":"Hacettepe Üniversitesi","cityId":"ankara","type":"Devlet","faculties":[[122,[61,243,269,292,318,352]],[144,[59,611]],[275,[132]],[293,[143]],[295,[13,14,18,22,28,55,93,184,205,206,282,283,284,436,468,501,532,565,567]],[307,[15,64,73,187,198,207,279,285,323,364,397,417,449,476,569]],[354,[12,72,298,321,362]],[366,[200]],[432,[266]],[440,[16,150,164,352]],[473,[254]],[487,[261]],[500,[271,303,355,464,493,498,583]],[506,[275,440]],[676,[376]],[694,[102,154,163,197,225,242,257,291,312,322,349,353,391]],[770,[52,111,130,176,394,419]],[775,[8,17,121,133,144,161,395,407,441,546,547,548]],[847,[85,385,465,562]],[917,[552]]]},{"id":"hakkari-universitesi","name":"Hakkari Üniversitesi","cityId":"hakkari","type":"Devlet","faculties":[[239,[47,61,69,150,212,243,292,342,385,562]],[307,[15,187,279,285,417,449,476,569]],[500,[271,303,355,494]],[503,[273]],[694,[59,291,356]],[770,[254]],[775,[103,111,134,278,462,546,547,548]],[1026,[26,137,347,359,396,434,513]]]},{"id":"halic-universitesi","name":"Haliç Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[356,[18,284,362,382,436,565]],[432,[110,125,209,229]],[534,[147,303,348,494,588,629]],[670,[19,32,47,61,62,66,84,86,111,122,123,141,150,158,199,234,264,278,281,288,289,292,306,333,347,351,352,368,380,399,413,415,444,455,459,461,463,478,489,547,562,576,608]],[676,[168,266,376]],[694,[59,154,163,353,607,620]],[770,[52,130,142,176,200,254]],[917,[552]]]},{"id":"harran-universitesi","name":"Harran Üniversitesi","cityId":"sanliurfa","type":"Devlet","faculties":[[25,[385,401]],[153,[61,95,241,342,385]],[173,[101,316,385]],[200,[530,555]],[275,[132]],[293,[143]],[307,[187,279,285,397,476]],[356,[23,28,72,91,196,321,362,382,501,532,565,597]],[432,[376,440]],[445,[32,557]],[479,[47,396,615]],[500,[146,271,303,313,355]],[503,[273]],[694,[59,102,154,163,242,291,353,620]],[725,[35,61,150,158,226,227,269,281,292,324,352,412,540]],[770,[200,254,425]],[834,[61,111,226,385,546]],[835,[589]],[860,[33,47]],[870,[8,17,19,74,133,134,144,199,278,395,399,407,430,463,546,547,548,549,617]],[871,[32,111,122,141,241,306,385,396,562]],[872,[150,243,333,375,413,455,491,579,601]],[917,[552]],[940,[209,453,559,560]],[990,[600]],[994,[61,111,385]],[995,[142,254]],[1031,[40,69,522,525,531,536,556,634]]]},{"id":"hasan-kalyoncu-universitesi","name":"Hasan Kalyoncu Üniversitesi","cityId":"gaziantep","type":"Vakıf","faculties":[[307,[285,397,417,449,476]],[436,[168,266,376]],[464,[250,251]],[487,[261]],[501,[47,271,303,436,494,589]],[506,[125,229,440]],[670,[19,47,134,278,290,351,478,489,490,608]],[694,[59,154,163,291,353,620]],[770,[52,200,254]],[940,[209,559]]]},{"id":"hatay-mustafa-kemal-universitesi","name":"Hatay Mustafa Kemal Üniversitesi","cityId":"hatay","type":"Devlet","faculties":[[57,[128,226,324,508,550,632]],[69,[32,61,62,111,122,150,158,162,243,292,333,347,367,385,396,418,423,461,562,564]],[275,[132]],[307,[187,279,285,417,449,476,496,569]],[356,[22,28,72,91,283,321,362,468,501,532,565]],[459,[61,74,105,415]],[460,[19,278,302,546,547,548,617]],[500,[271,303,355,493,583,629]],[503,[273]],[506,[211,241,440]],[602,[8,27,62,66,122,133,144,181,385,396,399]],[676,[376,427]],[762,[47,122,347,385,497,499]],[770,[2,200,254]],[782,[10,69,342]],[788,[178,234,374,375]],[907,[552]],[946,[209]],[990,[600]],[1007,[47,111,112,122,347,385]],[1031,[40,69,77,522,536,556,634]]]},{"id":"hitit-universitesi","name":"Hitit Üniversitesi","cityId":"corum","type":"Devlet","faculties":[[43,[32,156,226,342,491,548]],[500,[194,271,303,355,493,583,589]],[503,[273]],[515,[22,28,532,565]],[525,[234,264,278,375]],[695,[59,68,154,163,353,362,382,609]],[732,[61,85,158,164,243,347,521,546]],[770,[52,111,254,464,498]],[775,[104,112,144,174,302,395]],[847,[32,47,85,306,351,367,385,489,497,499,562]],[859,[61,111,199,306,462,499,549]],[909,[61,89,150,243,255,264,281,292,318,335,344,352,368,374,380,392,412,421,508,612,626]],[917,[552]]]},{"id":"hoca-ahmet-yesevi-uluslararasi-turk-kazak-universitesi","name":"Hoca Ahmet Yesevi Uluslararası Türk-Kazak Üniversitesi","cityId":"yurt-disi","type":"Yurt Dışı","faculties":[[275,[132]],[295,[93,283,565]],[310,[457,533]],[500,[313,559,583]],[503,[273]],[506,[211]],[694,[59,154,353,610,629]],[954,[61]]]},{"id":"igdir-universitesi","name":"Iğdır Üniversitesi","cityId":"igdir","type":"Devlet","faculties":[[275,[132]],[356,[91,283,362,468,532,565]],[490,[32,47,95,347,385,418,462,489,490,491]],[491,[34,61,150,203,212,243,264,292,324,331,352,412,472,521]],[500,[251,271,303,348,464,493]],[503,[273]],[694,[59,291,620]],[770,[52,200,254]],[775,[8,103,111,133,181,199,278,399,546,547,548,617]],[940,[209]],[952,[111,144,174,342,351,434,499]],[968,[235,240,402,498]],[1031,[40,69,77,522,528,556,634]]]},{"id":"isparta-uygulamali-bilimler-universitesi","name":"Isparta Uygulamalı Bilimler Üniversitesi","cityId":"isparta","type":"Devlet","faculties":[[36,[47,101,288]],[86,[61,69,85,190,405,550]],[193,[47,384,588]],[303,[32,85,224,288,385,562]],[305,[507]],[381,[144,226,288]],[410,[47,85,95,212,335,374,380]],[493,[84,86,281,415,608]],[494,[32,47,122,234,241,288,306,347,385,423,462,562]],[495,[368,485]],[588,[47,61,300,412,489,490,576,624]],[728,[403,404]],[809,[61,347,399,462,613]],[867,[34,347,405,434]],[876,[85,226,306,342,462]],[877,[32]],[909,[61,74,150,158,203,212,243,292,331,352,392,399,540,579,615]],[910,[59,154,291,353,369]],[942,[209,453,559,560]],[963,[66,74,127,174,181,234,241,243,293]],[976,[61,95,461,546]],[1002,[32,47,241,557]],[1003,[61,101,151,227,375,612]],[1011,[34,405]],[1031,[40,69,522,525,528,531,536,556,634]]]},{"id":"isik-universitesi","name":"Işık Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[501,[271,303,436,583,587,629]],[670,[17,19,61,66,122,199,234,278,292,399,547,548]],[695,[59,75,154,163,353,369,620]],[789,[168,229,266,376,487]]]},{"id":"ibn-haldun-universitesi","name":"İbn Haldun Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[306,[449]],[487,[261]],[506,[623]],[515,[186,436,494,501,532]],[528,[295]],[1020,[271,303]]]},{"id":"ihsan-dogramaci-bilkent-universitesi","name":"İhsan Doğramacı Bilkent Üniversitesi","cityId":"ankara","type":"Vakıf","faculties":[[307,[476]],[354,[196,321,362,382]],[435,[234,266,277,320,376]],[487,[261]],[501,[271,436,493,583]],[517,[18,28,184,283,287]],[534,[303]],[694,[59,154,163,353]],[968,[68,562]]]},{"id":"inonu-universitesi","name":"İnönü Üniversitesi","cityId":"malatya","type":"Devlet","faculties":[[275,[132]],[293,[143]],[307,[187,279,285,397,417,449,476,496,569]],[356,[72,91,184,196,283,321,362,382,436,501,532,565]],[437,[209,427]],[473,[254]],[487,[261]],[500,[96,146,271,303,355,493,494,588]],[503,[273]],[506,[211,241,440]],[650,[47,88,243,306,351,385,418,497]],[651,[61,150,156,158,167,226,255,269,292,318,352,540]],[694,[59,75,154,225,291,322,349,353,620]],[770,[52,111,130,142,200,223,394]],[775,[8,19,111,144,181,199,278,422,546,547,548]],[917,[552]]]},{"id":"iskenderun-teknik-universitesi","name":"İskenderun Teknik Üniversitesi","cityId":"hatay","type":"Devlet","faculties":[[115,[115,118,216]],[254,[507]],[258,[117,347,502,503]],[284,[85,385,497]],[285,[546]],[340,[61,328,352]],[464,[248,250,251,572]],[523,[49,61,85,101,150,212,227,243,255,290,292,352,368,371,385,412]],[524,[318]],[537,[147,348,588,629]],[676,[265,376,427,516]],[695,[59,75,154,163,291,353,369,372,426]],[940,[209,559,560]]]},{"id":"istanbul-arel-universitesi","name":"İstanbul Arel Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[356,[54,283,284,382,436]],[432,[110,125,209,234]],[500,[194,251,303,348,384,493,583,587,629]],[506,[229,240,487,623]],[670,[8,19,32,47,58,61,74,89,111,122,133,144,151,158,199,234,278,281,288,306,316,333,347,351,368,375,380,385,399,415,459,489,490,508,546,547,548,551,557,576,614,617]],[676,[265,376]],[694,[59,75,154,163,291,353,620]],[770,[52,111,200,254,464,498]],[917,[552]]]},{"id":"istanbul-atlas-universitesi","name":"İstanbul Atlas Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[275,[132]],[515,[283,284,303,436,587,629]],[670,[8,17,19,61,66,104,133,134,141,199,234,264,278,347,399,543,547,548,549,617,626]],[695,[59,75,154,163,382,597,611,620]],[770,[52,130,142,176,200,254]],[789,[125,168,229,266]],[917,[552]]]},{"id":"istanbul-aydin-universitesi","name":"İstanbul Aydın Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[63,[32,47,58,61,74,111,122,150,158,226,234,241,247,255,288,290,292,293,306,335,347,351,352,375,380,385,412,423,459,478,489,490,557,562,576,577,618]],[275,[132]],[293,[143]],[307,[25,279,285,397,417,449,476,569]],[356,[24,283,284,382,436,458,501,532,565]],[432,[125,209]],[487,[261]],[500,[148,251,303,313,384,494,587]],[506,[211,229,241,440,451,544,623]],[679,[168,265,376]],[694,[59,154,163,250,291,353,611,620]],[770,[52,111,142,200,254,394,464,498]],[775,[8,17,19,133,134,144,161,199,278,395,399,407,422,441,499,546,547,548]],[917,[552]],[968,[248,429,572,619,629]]]},{"id":"istanbul-beykent-universitesi","name":"İstanbul Beykent Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[275,[132]],[356,[68,283,284,299,362,365,436,458,501,532,565,609,619]],[432,[209,234,277,440,542]],[487,[261]],[500,[194,271,303,348,473,493,559,583,587,629]],[506,[125,229,240,367,621]],[670,[8,17,19,32,47,58,61,62,66,74,89,105,111,122,133,134,137,144,161,164,172,199,234,241,255,264,278,288,290,306,347,351,368,375,380,395,399,407,412,415,420,422,441,459,489,490,508,540,547,548,551,557,562,608,615]],[699,[59,154,163,168,265,291,322,353,376,620]],[770,[52,111,142,200,254,464]],[917,[552]]]},{"id":"istanbul-bilgi-universitesi","name":"İstanbul Bilgi Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[150,[619]],[487,[261]],[506,[125,129,229,241,276,440,451,623]],[534,[147,148,303,423,580,588,629]],[670,[32,47,61,66,86,122,141,234,241,264,292,306,375,380,385,415,489,490]],[676,[168,265,376]],[695,[59,154,163,291,353,362,369,382,611]],[770,[52,111,200,254]],[775,[8,17,19,111,133,134,199,278,395,399,422,547,548]],[848,[283,317,436,493,583]],[968,[209,251,348,559]]]},{"id":"istanbul-29-mayis-universitesi","name":"İstanbul 29 Mayıs Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[148,[61,86,333,608]],[295,[24,55,184,283,284,436,532,565]],[307,[25,279,285,397,417,449,476,569]],[487,[261]],[500,[147,494,498,629]],[503,[273]],[695,[59,154,607]]]},{"id":"istanbul-esenyurt-universitesi","name":"İstanbul Esenyurt Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[148,[58,61,62,66,290,293,415,455]],[537,[148,159,251,303,348,494,587,629]],[670,[9,32,47,88,122,141,151,226,234,241,292,306,347,459,489,490,557,577]],[696,[59,154,168,265,266,620]],[770,[52,111,142,200,254,498]],[775,[8,17,19,111,133,181,199,278,546,547,548]],[785,[125,209,240,436,440,501,623]],[968,[68,597,619]]]},{"id":"istanbul-galata-universitesi","name":"İstanbul Galata Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[275,[132]],[670,[8,19,32,122,123,141,144,199,278,415,416,547,551]],[695,[59,597]],[770,[52,200,254]],[785,[209,240,266,277,283,303,348,436,629]]]},{"id":"istanbul-gedik-universitesi","name":"İstanbul Gedik Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[378,[17,19,32,47,61,66,74,111,122,150,234,278,288,318,324,351,352,367,368,385,399,489,490,503,517,546,547,608]],[487,[261]],[501,[303,436,494,587,589,629]],[679,[125,209,229,266,376]],[694,[59,163,353,357,369,620]],[770,[52,111,200,254]]]},{"id":"istanbul-gelisim-universitesi","name":"İstanbul Gelişim Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[275,[132]],[432,[209,229,234,265,266,440]],[501,[148,241,251,283,284,303,348,436,440,451,493,494,501,560,565,587,588,623,629]],[530,[9,32,47,58,61,62,66,117,122,123,151,158,226,234,241,247,255,264,288,290,292,316,347,351,352,368,380,410,413,415,416,420,489,490,557,576,577,601]],[699,[59,154,163,291,369,376,575,620]],[770,[52,111,130,176,200,254,394,425,464,498]],[775,[8,17,19,74,111,127,133,134,161,199,224,278,344,395,399,407,414,422,430,441,459,543,546,547,548,551]],[968,[47,68,159,209,240,248,251,284,544,572,597,623,629]]]},{"id":"istanbul-kent-universitesi","name":"İstanbul Kent Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[275,[132]],[293,[143]],[501,[148,240,303,436,493,583,588,589]],[670,[61,66,141,331,351,459]],[695,[59,163]],[770,[52,111,130,142,200,254,464]],[775,[8,17,19,111,127,133,144,199,278,422,543,546,547,548,551,617]],[786,[125,209,229,265,320,440]]]},{"id":"istanbul-kultur-universitesi","name":"İstanbul Kültür Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[307,[285,397,417]],[356,[283,365,382,436]],[487,[261]],[500,[147,303,494,587,629]],[670,[47,61,111,122,141,158,234,241,247,269,290,292,306,347,351,380,399,489,490,546,562,576,577,624]],[676,[266,376]],[694,[59,154,163,291,620]],[770,[52,200,254]],[786,[110,125,229,240,440,623]]]},{"id":"istanbul-medeniyet-universitesi","name":"İstanbul Medeniyet Üniversitesi","cityId":"istanbul","type":"Devlet","faculties":[[275,[132]],[295,[55,131,182,184,296,436,468,501,532,565]],[306,[279,397,417,449,476,569]],[487,[261]],[503,[273]],[695,[59,76,154,163,197,291,362,382]],[770,[52,200,254,394,464,498]],[789,[191,229]],[841,[271,303,355,493,583]],[917,[552]],[940,[209,559]]]},{"id":"istanbul-medipol-universitesi","name":"İstanbul Medipol Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[275,[132]],[293,[143]],[307,[279,285,397,417,449]],[435,[168,209,229,266,320,376]],[487,[261]],[506,[211,240,366,440,623]],[515,[186,436,493,494,535]],[537,[47,148,251,288,303,305,348,587,629]],[670,[8,17,19,27,61,74,111,133,134,150,161,199,264,278,292,352,368,375,395,399,441,455,462,478,489,546,547,548]],[695,[59,75,154,163,291,607]],[770,[52,111,130,142,176,200,254,394,406,464,498]],[774,[52,111,142,200,254,394,498]],[775,[8,17,19,111,133,134,144,161,199,278,395,399,422,441,462,546,547,548,551]],[847,[47,122,241,288,306,347,351,385,490,499]],[917,[552]],[966,[552]]]},{"id":"istanbul-nisantasi-universitesi","name":"İstanbul Nişantaşı Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[275,[132]],[501,[148,194,240,251,271,283,284,303,384,436,473,493,498,501,559,583,589,623,629]],[670,[32,47,61,114,116,122,150,158,203,234,241,264,289,292,293,306,347,351,352,360,368,375,378,380,385,412,489,490,557,562,576,601,626]],[699,[59,154,163,291,353,369,376,620]],[770,[52,130,142,200,254]],[775,[8,17,19,74,111,127,133,134,144,161,199,278,395,399,407,422,441,499,546,547,548,551]],[786,[125,168,209,265,277,440]],[837,[248,429,572]],[917,[552]],[972,[68,560,588,597,619]]]},{"id":"istanbul-okan-universitesi","name":"İstanbul Okan Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[275,[132]],[293,[143]],[307,[285,397,417]],[487,[261]],[515,[108,284,436,458]],[537,[148,303,348,494,581,585]],[670,[9,32,47,58,61,84,122,123,137,141,150,156,234,243,264,269,288,290,292,300,306,328,347,351,352,368,375,378,385,489,490,576,577,601,608]],[695,[59,154,163,221,242,291,353,369,411,620]],[770,[52,111,200,254,464]],[775,[8,17,19,111,127,134,161,278,395,399,422,441,547,548,617]],[789,[125,229,266,376,487,542]],[917,[552]],[968,[68,209,240,251,429,623]]]},{"id":"istanbul-rumeli-universitesi","name":"İstanbul Rumeli Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[501,[251,303,436,493,583]],[670,[32,61,234,264,351,420,489,490,576]],[695,[56,59,609]],[770,[52,200,223,254]],[775,[8,17,19,111,133,134,161,181,199,278,395,422,441,546,547,548]],[789,[209,265,376,440]]]},{"id":"istanbul-sabahattin-zaim-universitesi","name":"İstanbul Sabahattin Zaim Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[307,[25,279,285,397,417,449,476,569]],[487,[261]],[515,[229,436,494,501,532,565]],[528,[295]],[537,[271,294,303,587]],[695,[59,154,163,225,266,376,382,620]],[770,[52,254,464,498]]]},{"id":"istanbul-saglik-ve-sosyal-bilimler-meslek-yuksekokulu","name":"İstanbul Sağlık ve Sosyal Bilimler Meslek Yüksekokulu","cityId":"istanbul","type":"Vakıf","faculties":[[531,[8,19,199,234,264,278,380,396,415,546,547,548,551,606,624]]],"extraCityIds":["bursa"]},{"id":"istanbul-saglik-ve-teknoloji-universitesi","name":"İstanbul Sağlık ve Teknoloji Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[275,[132]],[293,[143]],[501,[284,303,436]],[695,[59,163,169,322,376,382,620]],[770,[52,200,254]],[917,[552]]]},{"id":"istanbul-sisli-meslek-yuksekokulu","name":"İstanbul Şişli Meslek Yüksekokulu","cityId":"istanbul","type":"Vakıf","faculties":[[532,[8,17,19,32,47,111,122,141,161,199,234,264,278,351,367,395,441,459,490,546,547,562,617]]]},{"id":"istanbul-teknik-universitesi","name":"İstanbul Teknik Üniversitesi","cityId":"istanbul","type":"Devlet","faculties":[[145,[59,67,480,611]],[255,[115,217]],[316,[153,160,327]],[356,[197,321,363,382]],[384,[216,219]],[518,[102,242,291]],[534,[147,163,303,304,597]],[538,[59,115,118,148,154,163,216,217,265,376]],[608,[76,225,322,372]],[647,[87,311,312,349,426]],[649,[353]],[676,[168,265,376,427,516]],[820,[479]],[911,[538]],[958,[268,575,595]]],"extraCityIds":["kktc"]},{"id":"istanbul-ticaret-universitesi","name":"İstanbul Ticaret Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[487,[261]],[506,[229,240,367]],[515,[298,362,436,494,501]],[534,[194,251,271,303,348,585,587,597,629]],[670,[61,62,478]],[679,[168,266,376,542]],[694,[59,154,163,369,620]]]},{"id":"istanbul-topkapi-universitesi","name":"İstanbul Topkapı Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[438,[125,209,266,376]],[501,[147,251,303,494,588,597,629]],[506,[191,229,240,440,623]],[515,[47,184,283,284,436,501,532]],[695,[54,59,67,154,163,609,620]],[752,[8,17,19,32,58,61,62,111,133,141,144,150,199,234,243,247,264,278,293,375,378,380,395,399,412,422,478,489,490,543,546,547,548,551,557,562,576,601,617,626]],[770,[142,176,254]]]},{"id":"istanbul-universitesi","name":"İstanbul Üniversitesi","cityId":"istanbul","type":"Devlet","faculties":[[4,[1,47,61,90,91,122,141,184,211,234,241,271,273,288,301,303,306,313,338,361,367,440,452,462,489,493,494,499,501,532,546,582,589,601,617,629]],[146,[59,611]],[275,[132]],[293,[143]],[295,[13,14,18,22,23,24,55,65,80,91,93,94,107,131,179,182,184,205,206,260,283,284,296,307,326,330,336,345,346,388,435,436,456,468,501,532,534,553,565,578,591]],[354,[31,56,72,196,321,362,382]],[473,[254]],[487,[261]],[502,[96,146,271,303,355,494,559,561,629]],[503,[273]],[506,[211,241,440]],[533,[552]],[534,[303]],[670,[88]],[676,[168,265,376,516]],[841,[303,493,494]],[854,[504]],[961,[348]]]},{"id":"istanbul-universitesi-cerrahpasa","name":"İstanbul Üniversitesi-Cerrahpaşa","cityId":"istanbul","type":"Devlet","faculties":[[196,[552]],[275,[132]],[293,[143]],[370,[254]],[456,[15,64,187,207,279,285,397,417,449,476,496,569]],[694,[59,102,115,154,163,291,311,312,321,322,349,353,372]],[728,[403,404,427]],[729,[34,379,428,509]],[770,[142,200,223,394,464,498]],[775,[8,133,393,441,546,547,548]],[847,[47,122,162,306,385,423,562]],[909,[35,49,61,74,150,156,158,228,234,269,328,352,412,418,432,467,472,490,491,503,508,576]],[990,[600]],[992,[33,226]]]},{"id":"istanbul-yeni-yuzyil-universitesi","name":"İstanbul Yeni Yüzyıl Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[275,[132]],[293,[143]],[356,[283,284,382,436,565]],[487,[261]],[500,[303,494,589]],[506,[229,240,440,623]],[670,[47,61,122,241,347,351,562]],[699,[75,154,266,376]],[770,[52,200,254,301,464]],[775,[8,17,19,111,144,278,395,399,547,548,551,617]],[917,[552]]]},{"id":"istinye-universitesi","name":"İstinye Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[275,[132]],[293,[143]],[435,[125,209,266,376]],[501,[147,303,348,464,493,583,588,629]],[506,[229,240,440,623]],[515,[283,284,436,565]],[670,[32,58,61,62,66,74,122,141,158,226,234,264,347,412,490,576]],[695,[59,75,154,163,321,353,362,382,619,620]],[770,[52,111,130,142,200,254]],[775,[8,17,19,111,134,144,199,278,399,422,441,547,548]],[917,[552]]]},{"id":"izmir-bakircay-universitesi","name":"İzmir Bakırçay Üniversitesi","cityId":"izmir","type":"Devlet","faculties":[[487,[261]],[500,[271,303,588,629]],[515,[91,436,501,532]],[576,[342]],[696,[59,75,154,163]],[770,[130,200,254,394,464]],[917,[552]]]},{"id":"izmir-demokrasi-universitesi","name":"İzmir Demokrasi Üniversitesi","cityId":"izmir","type":"Devlet","faculties":[[275,[132]],[307,[279,285,397,417,449]],[356,[28,283,362,436,501,532,565]],[487,[261]],[500,[271,288,303,355,493,583,629]],[670,[47,428]],[676,[376,427,516]],[694,[75,154,163,291,353]],[770,[52,200,254]],[775,[74,617]],[917,[552]]]},{"id":"izmir-ekonomi-universitesi","name":"İzmir Ekonomi Üniversitesi","cityId":"izmir","type":"Vakıf","faculties":[[356,[196,284,362,436,501]],[437,[168,229,266,376,542]],[487,[261]],[506,[240,486,623]],[534,[147,303,348,494,587]],[670,[47,61,122,234,264,292,367,375,489,490,562]],[694,[59,154,163,221,250,291,353,369,620]],[770,[52,200,254]],[775,[111,199,278,399,546,547,548,617]],[917,[552]],[975,[209]]]},{"id":"izmir-katip-celebi-universitesi","name":"İzmir Katip Çelebi Üniversitesi","cityId":"izmir","type":"Devlet","faculties":[[275,[132]],[293,[143]],[385,[216,219]],[487,[261]],[500,[271,303,355,464,493,583,588,597]],[503,[273]],[696,[59,75,154,242,291,353,369,372,426]],[728,[403,404]],[770,[52,200,254,498]],[775,[8,199,278,548,617]],[786,[229]],[848,[54,55,91,184,283,367,436,501,532,565,568]],[855,[507]],[917,[552]],[940,[209,560,561]]]},{"id":"izmir-konak-meslek-yuksekokulu","name":"İzmir Konak Meslek Yüksekokulu","cityId":"izmir","type":"Vakıf","faculties":[[541,[8,17,19,32,47,61,66,104,111,122,134,150,199,203,234,241,264,278,288,292,318,347,351,352,375,399,413,455,459,462,490,499,546,547,548,624]]]},{"id":"izmir-tinaztepe-universitesi","name":"İzmir Tınaztepe Üniversitesi","cityId":"izmir","type":"Vakıf","faculties":[[275,[132]],[770,[52,130,142,176,200,254,394]],[775,[8,17,19,61,121,133,134,144,199,278,395,399,407,414,422,461,547,548,617]],[917,[552]]]},{"id":"izmir-yuksek-teknoloji-enstitusu","name":"İzmir Yüksek Teknoloji Enstitüsü","cityId":"izmir","type":"Devlet","faculties":[[354,[196,204,321,362,382]],[676,[168,376,516]],[694,[59,76,102,160,171,225,291,322,353,356]]]},{"id":"kadir-has-universitesi","name":"Kadir Has Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[487,[261]],[501,[147,303,436,494,587,629]],[506,[229,440,451,623]],[695,[59,154,163,369,382,611]],[786,[168,266,376]]]},{"id":"kafkas-universitesi","name":"Kafkas Üniversitesi","cityId":"kars","type":"Devlet","faculties":[[90,[19,181,278,546,547,548,549,617]],[248,[187,279,397,449,476,496,569]],[275,[132]],[356,[23,28,37,72,196,236,283,287,321,362,382,456,468,532,565]],[434,[380]],[500,[159,271,303,493,494,498,589,629]],[503,[273]],[550,[144,174,399,462,499]],[551,[464]],[575,[71,224,342,344,432,513]],[586,[58,150,178,352,375,608]],[699,[154,225,291,322,353]],[770,[142,254]],[800,[32,111,347,418,521]],[801,[209]],[847,[47,88,241,385,396,418,434]],[862,[351,462,490]],[917,[552]],[990,[600]]]},{"id":"kahramanmaras-istiklal-universitesi","name":"Kahramanmaraş İstiklal Üniversitesi","cityId":"kahramanmaras","type":"Devlet","faculties":[[23,[89,352,371,576]],[313,[150,158,292,342,352,385,396,412,491]],[314,[144,399,617]],[506,[125,229]],[698,[163,353,620]],[770,[52]],[940,[209]],[956,[16,224,226,324,347,418,491,540]]]},{"id":"kahramanmaras-sutcu-imam-universitesi","name":"Kahramanmaraş Sütçü İmam Üniversitesi","cityId":"kahramanmaras","type":"Devlet","faculties":[[13,[61,85,324,350,385]],[14,[254]],[67,[61,151,405,612]],[275,[132]],[307,[187,279,285,397,449,476,496,569]],[354,[72,321,362]],[400,[47,61,111,122,243,278,306,385,401,521]],[401,[194]],[432,[542]],[500,[271,303,313,464,494,498,589]],[503,[273]],[515,[28,91,184,284,436,532,565]],[553,[19,111,199,278,399,546,547,548,617]],[699,[59,154,225,291,353,538]],[728,[403,404,427]],[746,[95,122,497]],[770,[142,200,254]],[847,[32,47,85,95,241,306,347,385,423,562]],[909,[58,61,137,150,158,212,226,227,269,292,335,352,375,379,380,412,540]],[917,[552]],[1031,[40,69,77,522,536,556,634]]]},{"id":"kapadokya-universitesi","name":"Kapadokya Üniversitesi","cityId":"nevsehir","type":"Vakıf","faculties":[[146,[54,68,597,609,619,629]],[275,[132]],[515,[283,284,436,493,494,565]],[564,[8,17,19,61,62,88,133,134,199,278,290,395,399,422,441,455,478,489,490,547,548,557,576,577,608]],[681,[266,320,516]],[774,[52,111,130,142,200,254,394]],[972,[209,248,251,560,574]]],"extraCityIds":["istanbul"]},{"id":"karabuk-universitesi","name":"Karabük Üniversitesi","cityId":"karabuk","type":"Devlet","faculties":[[144,[59,620]],[148,[27,84,413,415,416,608]],[275,[132]],[301,[32,33,224]],[343,[66,178,418,443,446]],[500,[271,493,498,583]],[503,[273]],[515,[28,91,184,283,436,468,501,532,565]],[534,[12,194,241,303]],[695,[75,154,163,291,321,353,362,369,372,411,447]],[728,[135,404]],[765,[376]],[766,[168]],[767,[62,111,212,264,306,375,380,385,557,562]],[768,[209,453,559,560]],[769,[211,440]],[770,[111,142,200,254]],[775,[8,17,199,278,395,399,407,462,546,548,549,617]],[917,[552]],[955,[61,150,158,255,269,318,352,371,409,412,491,579]],[1008,[61,445]]]},{"id":"karadeniz-teknik-universitesi","name":"Karadeniz Teknik Üniversitesi","cityId":"trabzon","type":"Devlet","faculties":[[72,[123,347,608]],[81,[137,234,264,379]],[275,[132]],[293,[143]],[295,[28,283,436,456,501,532,565]],[354,[56,72,196,321,362,382,619]],[500,[96,146,271,303,313,355,583,629]],[646,[71,144,224,226,342,344,562]],[676,[265,376,516]],[694,[59,154,163,242,291,311,312,349,353,372,611,620]],[720,[160,171,291,620]],[728,[403,404,427,602]],[770,[52,142,200,254,464]],[775,[278,546,547,548]],[865,[150,158,215,218,318,352,368]],[866,[44,115,118,216,217]],[917,[552]],[931,[61,74,150,158,212,243,292,352,380]]]},{"id":"karamanoglu-mehmetbey-universitesi","name":"Karamanoğlu Mehmetbey Üniversitesi","cityId":"karaman","type":"Devlet","faculties":[[19,[132]],[295,[14,24,28,183,184,206,283,501,532,565]],[307,[187,279,397,417,449,476,569]],[337,[61,105,150,497,551]],[338,[144,278]],[500,[271,303,493,494,588]],[503,[273]],[560,[362,597,619]],[585,[95,103,499,508,546,549]],[694,[59,154,291,353,372]],[770,[52,111,200,254,464,498]],[775,[8,17,111,134,144,174,181,199,278,302,395,399,547,617]],[847,[32,47,162,347,385,418,420,462,497,562]],[909,[61,128,150,212,226,234,243,352,374,401,412,524,596]],[917,[552]],[968,[47,209,453,560,589,623]]]},{"id":"kastamonu-universitesi","name":"Kastamonu Üniversitesi","cityId":"kastamonu","type":"Devlet","faculties":[[0,[137,155,499,508,612]],[71,[34,405,546,549]],[172,[156,491]],[201,[58,61,111,158,351,385]],[218,[61,174,199,617]],[242,[32,33,47,462,590]],[270,[85,128,144,342]],[275,[132]],[307,[187,279,397,417,449,476,496,569]],[354,[72,362]],[498,[243,342,351]],[500,[194,271,303,493,583,589]],[503,[273]],[506,[211,240,440]],[512,[117,144,385,462]],[515,[28,55,91,93,184,436,532,565]],[636,[300,347]],[670,[49,61,66,111,150,158,234,288,292,306,352,368,418,439,497]],[696,[59,75,154,291,353,427]],[728,[135,403,404]],[770,[52,142,254]],[837,[251]],[899,[47,61,155,278,289,546]],[917,[552]],[930,[74,150,181,379,385,455,546,608]],[940,[209,559,560]],[990,[600]]]},{"id":"kayseri-universitesi","name":"Kayseri Üniversitesi","cityId":"kayseri","type":"Devlet","faculties":[[144,[597,609]],[148,[123,289,413,608]],[192,[418,434,491]],[266,[10,32,41,61,62,111,270,347,396,524]],[267,[273]],[268,[464,532,565]],[511,[134,174,199,278]],[690,[16,49,137,212,234,324,344,540]],[698,[59,154,163,620]],[725,[164,318,432]],[750,[47,385,423]],[764,[26,32,41,226,342,401]],[770,[111]],[847,[122,306,351,462,489]],[909,[61,74,150,156,158,264,292,328,352,368,439]],[925,[243,292,375,612]],[968,[209,288,384,589,629]],[999,[16,104,151]],[1014,[69,342]]]},{"id":"kibris-amerikan-universitesi","name":"Kıbrıs Amerikan Üniversitesi","cityId":"kktc","type":"KKTC","faculties":[[432,[229,266,376]],[535,[559,584]],[670,[32,61]],[697,[68]],[777,[19,144,199,462]],[841,[493,583]]]},{"id":"kibris-aydin-universitesi","name":"Kıbrıs Aydın Üniversitesi","cityId":"kktc","type":"KKTC","faculties":[[487,[261]],[515,[436]],[670,[490,557]],[699,[59,154,266,369]],[770,[200,254]],[775,[199,278,399]],[968,[209]]]},{"id":"kibris-bati-universitesi","name":"Kıbrıs Batı Üniversitesi","cityId":"kktc","type":"KKTC","faculties":[[501,[251,303,436]],[696,[59]]]},{"id":"kibris-saglik-ve-toplum-bilimleri-universitesi","name":"Kıbrıs Sağlık ve Toplum Bilimleri Üniversitesi","cityId":"kktc","type":"KKTC","faculties":[[275,[132]],[770,[52,111,200]],[775,[8]],[848,[436]]]},{"id":"kirgizistan-turkiye-manas-universitesi","name":"Kırgızistan-Türkiye Manas Üniversitesi","cityId":"yurt-disi","type":"Yurt Dışı","faculties":[[295,[192,193,387,449,501,532,570]],[354,[362]],[500,[194,271,303,583]],[503,[273]],[506,[211,240,440]],[694,[59,102,154,225,322,611]],[917,[552]],[940,[209,475,562]],[990,[600]],[1031,[42,69]]]},{"id":"kirikkale-universitesi","name":"Kırıkkale Üniversitesi","cityId":"kirikkale","type":"Devlet","faculties":[[250,[69,128,342,499]],[275,[132]],[307,[187,279,397,417,449,476,496,569]],[350,[85,162,306,351,385,562]],[432,[110,168,214,266,427]],[442,[74]],[487,[261]],[500,[12,146,271,303,355,493,583]],[515,[24,55,183,184,206,284,436,501,532,565]],[528,[295]],[597,[111,241,288,385,423]],[603,[33,61,66,151,156,158,234,264,269,290,292,328,359,401,412,432,442,485,519]],[695,[59,72,154,163,196,291,298,321,353,362,372]],[770,[52,111,200,254,464,498]],[775,[8,19,133,181,278,547,548,551]],[821,[421]],[917,[552]],[990,[600]]]},{"id":"kirklareli-universitesi","name":"Kırklareli Üniversitesi","cityId":"kirklareli","type":"Devlet","faculties":[[106,[47,85,95,122]],[356,[93,184,283,284,362,436,501,532,565]],[487,[261]],[500,[96,271,303,355,493,583]],[503,[273]],[645,[61,85,150,234,288,324,385,412,423,497,540]],[676,[376,427,516]],[694,[154,291,353,620]],[725,[89,151,258,318,324,371]],[751,[32,61,241,328,367,562,612]],[770,[52,111,142,200,254,464,498]],[775,[111,399,462,546,548,549,617]],[847,[49,122,306,347,385,490]],[909,[61,150,158,226,264,292,352,368,380]],[910,[369]],[917,[552]],[940,[209,453,559,560]],[970,[194,384,589]],[996,[47,316,347,385,499,626]]]},{"id":"kirsehir-ahi-evran-universitesi","name":"Kırşehir Ahi Evran Üniversitesi","cityId":"kirsehir","type":"Devlet","faculties":[[233,[85,111,342,461]],[307,[187,279,397,449,476,496,569]],[356,[22,28,91,184,362,382,501,532,565]],[367,[200]],[500,[271,303,355,493,583]],[503,[273]],[558,[9,85,150,156,226,243,292,352,495]],[559,[209,629]],[683,[47,58,203,228,234,347,415,601]],[699,[59,154,291,353]],[770,[111,142,254]],[775,[161,199,278,399,407,546,547,548,617]],[847,[47,85,95,122,241,306,385,562]],[909,[10,61,62,69,74,86,150,292,324,368,401,513,624]],[917,[552]],[1031,[40,69,77,522,528,536,634]]]},{"id":"kilis-7-aralik-universitesi","name":"Kilis 7 Aralık Üniversitesi","cityId":"kilis","type":"Devlet","faculties":[[354,[362,382]],[500,[271,303,493,589]],[503,[273]],[506,[623]],[515,[23,91,184,501,532,565]],[607,[187,279,397,417,449,476,496,569]],[699,[154,291]],[775,[111,144,199,278,399,546,617]],[847,[122,306,351,385]],[909,[41,61,150,212,226,292,352,418,521,550,612]],[949,[32,562]],[1024,[254,464]],[1031,[40]]]},{"id":"kocaeli-saglik-ve-teknoloji-universitesi","name":"Kocaeli Sağlık ve Teknoloji Üniversitesi","cityId":"kocaeli","type":"Vakıf","faculties":[[95,[8,17,19,61,111,134,144,199,255,278,395,399,546,547,548,551]],[275,[132]],[293,[143]],[377,[133,150]],[695,[59]],[770,[142,200,254]],[848,[303,436]]]},{"id":"kocaeli-universitesi","name":"Kocaeli Üniversitesi","cityId":"kocaeli","type":"Devlet","faculties":[[52,[162,306,385,423]],[249,[335,472]],[255,[118,217]],[275,[132]],[307,[187,279,285,397,449,476,569]],[356,[28,72,184,196,283,321,362,532,565,609]],[371,[167,281,354,410,412,455]],[372,[85,241,306,385]],[403,[122,352,412]],[464,[248,250,251,574]],[476,[81,105,158,292,331,352,368,371,540]],[477,[85,122,203,288,306,347,385,418]],[487,[261]],[503,[273]],[506,[211,229,241,440,451]],[534,[303]],[544,[101,226,491,550]],[561,[47,241,306]],[572,[116,117,158,215,218,368]],[577,[33]],[578,[557,562,564]],[610,[61,74,150,156,158,269,272,292,324,328,352,432,442]],[611,[19,278,302,430,546,547,548]],[679,[265,376]],[694,[59,102,153,160,163,242,291,322,353,369,372,620]],[770,[142,254,498]],[841,[96,271,493,583]],[910,[67,75,171,411]],[917,[552]],[940,[209,559]],[977,[16,318,352,354]],[1031,[40,69]]]},{"id":"koc-universitesi","name":"Koç Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[354,[196,321,362,382]],[473,[254]],[487,[261]],[500,[147,303,583]],[517,[29,184,317,366,436,501,532]],[694,[59,154,163,325,353]],[917,[552]]]},{"id":"konya-gida-ve-tarim-universitesi","name":"Konya Gıda ve Tarım Üniversitesi","cityId":"konya","type":"Vakıf","faculties":[[670,[128,224]],[696,[59,265]],[848,[436,588,629]],[895,[70,382]]]},{"id":"konya-teknik-universitesi","name":"Konya Teknik Üniversitesi","cityId":"konya","type":"Devlet","faculties":[[144,[59,609,620]],[679,[265,376,516]],[695,[154,163,242,291,312,322,353,372]],[909,[35,49,61,150,156,158,226,227,243,269,292,324,328,335,352,354,379,392,523,615]]]},{"id":"kto-karatay-universitesi","name":"KTO Karatay Üniversitesi","cityId":"konya","type":"Vakıf","faculties":[[437,[168,234,265,376]],[487,[261]],[501,[24,173,277,284,294,303,436,484,498,501,532,589]],[574,[351]],[695,[59,154,163,291,353]],[770,[52,111,142,200,254,394]],[775,[17,19,111,134,199,278,399,547]],[917,[552]],[918,[61,66,122,141,281,352,368,485,490,576]],[972,[429]]]},{"id":"kutahya-dumlupinar-universitesi","name":"Kütahya Dumlupınar Üniversitesi","cityId":"kutahya","type":"Devlet","faculties":[[58,[224,226,344,434]],[219,[557]],[283,[47,347,497]],[288,[16,111]],[307,[187,279,397,476,496,569]],[321,[111,324,371,462,499]],[356,[28,71,72,196,283,284,321,362,501,532,565]],[379,[47,61,85,234,347,351,368,380,462,548,549]],[432,[229,518]],[480,[47,88,241,288,347,521]],[500,[146,271,303,313,355,494,587]],[503,[273]],[638,[109,178,212,234,264,374,375]],[640,[47,85,95,122,162,306,315,347,385,409,423,557,564]],[641,[60,61,150,158,292,324,352,368,416,491,612]],[642,[159,194,384,483]],[676,[265]],[694,[59,154,163,291,353,372,620]],[747,[32,226,354,461,543]],[827,[10,47,61,74,150,264,288,344,347,368,463]],[829,[154,169,353,620]],[873,[1,47,111,128,351,373,499]],[904,[61,74,85,122,243,281,293,347,352,385,412]],[906,[209,453,559,629]]]},{"id":"kutahya-saglik-bilimleri-universitesi","name":"Kütahya Sağlık Bilimleri Üniversitesi","cityId":"kutahya","type":"Devlet","faculties":[[275,[132]],[380,[111,144,278,543,546,551]],[639,[19,74,133,245,608]],[695,[5,59,382]],[770,[52,130,142,176,200,254,464,498]],[828,[127,199,331,399,547,548,617]],[905,[8,121,199,302,395,543,551]],[917,[552]]]},{"id":"lefke-avrupa-universitesi","name":"Lefke Avrupa Üniversitesi","cityId":"kktc","type":"KKTC","faculties":[[275,[132]],[287,[279,286,397,417,449,476,569]],[355,[284,382,436]],[474,[254]],[487,[261]],[500,[147,194,303,493,583]],[505,[125,229,240,440,623]],[670,[32,61,66,86,101,141,292,375,420,455,490,562]],[676,[265,266,376]],[694,[59,154,160,291,620]],[770,[52,200,464]],[775,[8,17,19,111,133,134,144,161,199,278,395,399,407,422,441,546,547,548]],[894,[40]],[948,[209,559]],[972,[54,68,597,609,629]]]},{"id":"lokman-hekim-universitesi","name":"Lokman Hekim Üniversitesi","cityId":"ankara","type":"Vakıf","faculties":[[275,[132]],[293,[143]],[473,[254]],[770,[52,130,142,176,200,394]],[775,[8,17,19,133,134,144,278,399,547,548,551,617]],[917,[552]]]},{"id":"malatya-turgut-ozal-universitesi","name":"Malatya Turgut Özal Üniversitesi","cityId":"malatya","type":"Devlet","faculties":[[24,[61,306,342,489]],[73,[47,61,85,150,300,368,375,385,412]],[124,[10,33,41,49,111,128,428,550]],[148,[551]],[245,[226,243,292,399,626]],[281,[61,95,122,491,497]],[472,[264,350,495,612]],[556,[32,557,562]],[695,[59,154,291,620]],[770,[2,52,142,223,254,498]],[789,[229,265,440]],[837,[251]],[848,[284,336,384,436,493,501,532,559,565,584,587,623,629]],[917,[552]],[1017,[74,165,227,290,380,412,445,548,624]],[1031,[40,69,77,507,522,536,556,634]]]},{"id":"maltepe-universitesi","name":"Maltepe Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[307,[285,397,417]],[432,[209]],[474,[254]],[487,[261]],[506,[211,229,241,440]],[515,[184,436,501]],[537,[303,494,589]],[670,[19,47,61,111,241,278,351,375,380,489,490,547,562,576,615]],[679,[220,265,376]],[695,[59,154,163,620]],[774,[130]],[917,[552]]]},{"id":"manisa-celal-bayar-universitesi","name":"Manisa Celâl Bayar Üniversitesi","cityId":"manisa","type":"Devlet","faculties":[[22,[47,85,288,385]],[30,[61,150,339,344,352,423,632]],[49,[38,69,329,344,401,550]],[144,[597,609]],[251,[47,90,122,385,405]],[309,[187,279,449,476,496,569]],[411,[1,85,241,385]],[435,[376]],[457,[153,171,353,369,620]],[500,[96,146,271,303,355,493,494]],[503,[273]],[506,[241]],[515,[28,91,184,283,284,436,468,501,532,565]],[534,[148,303]],[604,[61,347,385,497,499]],[623,[243,306,351]],[626,[241,264,306,375,601]],[658,[278,459,546,547,548,617]],[659,[16,61,86,123,150,167,281,292,352,354,368]],[695,[59,72,76,154,163,196,225,291,321,353,362,372]],[770,[142,200,254,498]],[780,[271,303,355]],[781,[61,111,122,162,380,418,423]],[799,[243,521]],[803,[226,306]],[844,[74,150,234,350,352,368]],[917,[552]],[936,[61,150,158,212,222,292,328,352,612]],[957,[571]],[968,[194,473,587]]]},{"id":"mardin-artuklu-universitesi","name":"Mardin Artuklu Üniversitesi","cityId":"mardin","type":"Devlet","faculties":[[295,[22,23,28,182,184,283,284,341,436,468,501,511,532,565]],[432,[440]],[500,[271,303,494]],[503,[273]],[606,[536]],[670,[61,292,306,375,385,545,562]],[672,[32,61,111,136,150,335,499]],[673,[334]],[699,[59,376]],[718,[122,241,338,564]],[725,[150,158,352]],[738,[396]],[770,[52,142,254]],[775,[111,133,181,278,546,548,549,617]],[806,[47,243,499]],[917,[552]],[940,[209,559,560,561]]]},{"id":"marmara-universitesi","name":"Marmara Üniversitesi","cityId":"istanbul","type":"Devlet","faculties":[[88,[15,64,73,92,187,198,207,279,285,323,364,397,417,449,476,496,533,566,569]],[275,[132]],[293,[143]],[354,[72,196,298,321,362]],[364,[12,45,473,481]],[432,[168,191,265]],[487,[261]],[502,[96,146,271,355]],[503,[273]],[506,[211,241,440]],[515,[13,14,55,91,184,206,283,284,436,468,501,532,565]],[534,[303,629]],[679,[168,376]],[694,[59,76,102,154,163,291,322,353,372]],[770,[52,142,200,254,464]],[775,[19,133,278,422,547,548]],[841,[493,494,583,625]],[847,[47,88,122,385,396,423,557,562,564]],[909,[49,61,89,151,156,158,227,328,380,608]],[910,[59,154,353,369,372,480,538]],[917,[552]],[968,[48,125,334,460,561,609]]]},{"id":"mef-universitesi","name":"MEF Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[487,[261]],[501,[147,303,436,494,629]],[694,[59,154,163,291,353,607]],[789,[125,265,376]]]},{"id":"mersin-universitesi","name":"Mersin Üniversitesi","cityId":"mersin","type":"Devlet","faculties":[[65,[32,41,241,306,396,418,423,562,564]],[66,[559]],[101,[392]],[255,[115,118]],[256,[116,117,218]],[275,[132]],[293,[143]],[307,[187,279,285,397,417,449,476,496,569]],[331,[47,61,306,385,558]],[332,[68,629]],[354,[72,78,196,321,362]],[473,[254]],[500,[96,271,303,313,355,583]],[503,[273]],[506,[211,440]],[515,[14,28,184,206,282,436,468,501,532,565]],[676,[376,516]],[689,[190,385,405]],[692,[41,61,226,385]],[694,[59,154,225,242,291,322,353,372]],[770,[142]],[775,[17,19,278,546,547,548,617]],[822,[41,241,306,401]],[824,[629]],[847,[122,306,347,385,396,423,499,562,564]],[855,[507]],[909,[61,123,150,156,158,226,243,269,292,324,328,335,342,352,379,399,412,459,579]],[917,[552]],[940,[209,453,559,560]]]},{"id":"mimar-sinan-guzel-sanatlar-universitesi","name":"Mimar Sinan Güzel Sanatlar Üniversitesi","cityId":"istanbul","type":"Devlet","faculties":[[356,[28,184,196,298,362,436,468,501,532,565]],[432,[487]],[506,[125]],[634,[336]],[670,[227,375]],[676,[168,265,376,516]]]},{"id":"mudanya-universitesi","name":"Mudanya Üniversitesi","cityId":"bursa","type":"Vakıf","faculties":[[670,[8,19,32,61,122,123,156,199,234,278,281,412,543,547]],[698,[59,79,154,163,168,358]],[770,[52,111,130,142,200,254]],[785,[148,209,229,283,303,348,436,629]]]},{"id":"mugla-sitki-kocman-universitesi","name":"Muğla Sıtkı Koçman Üniversitesi","cityId":"mugla","type":"Devlet","faculties":[[156,[215,618]],[157,[125]],[243,[122,347,385,489]],[244,[251]],[246,[360,385,562]],[275,[132]],[295,[28,93,184,283,284,436,468,501,532,565]],[307,[15,187,279,285,397,417,449,476,496,569]],[354,[72,196,298,321,362,382]],[358,[41,101,385,401,428,471,562,564]],[359,[148,303,559,589,629]],[360,[52,223,254]],[361,[278,617]],[362,[40,69]],[500,[96,271,303,313,494,587]],[503,[273]],[580,[1,34,405,491]],[625,[69,144,405,418,550]],[662,[32,270,557,558,562]],[674,[32,212,227,306,335,375,385,423,562]],[675,[600]],[676,[376,516]],[685,[16,32,49,61,111,122,150,158,264,324,331,385,423,439,499,562,564]],[686,[399,546,548,549,617]],[694,[59,154,291,349,372,620]],[730,[32,557,562,564]],[770,[52,130,200,254,464]],[813,[235,384,498]],[855,[507]],[910,[7,67,171]],[917,[552]],[940,[209,559,560,561,627]],[959,[26,47,137,150,224,241,269,292]],[1006,[85,136,150,243,292,351,521]]]},{"id":"munzur-universitesi","name":"Munzur Üniversitesi","cityId":"tunceli","type":"Devlet","faculties":[[226,[47,111,292,418,461]],[295,[91,184,283,501,532,565,631]],[438,[209]],[500,[194,464,493,588]],[506,[241,440]],[694,[59,154,291,353]],[749,[47,243,342,399,503,546,562]],[770,[2,52,111,142,254,498]],[855,[507]],[934,[32,61,85,111,181,226,243,278,292,306,344,352,380,385,401,459,499,546,624]]]},{"id":"mus-alparslan-universitesi","name":"Muş Alparslan Üniversitesi","cityId":"mus","type":"Devlet","faculties":[[185,[1,111,342,499]],[307,[187,279,285,397,449,476,496,569]],[356,[184,283,341,362,382,436,501,532,565]],[500,[271,303,493,588]],[503,[273]],[506,[211]],[652,[47,111,181,617]],[699,[353,620]],[770,[223,254,301,464,498]],[775,[8,17,111,174,199,278,422,546,548,617]],[847,[32,47,85,203,241,385,462,490,562]],[909,[61,74,150,158,224,226,234,290,292,368,374,444,448,579]],[968,[68,70,253]],[989,[144,278,399,418]]]},{"id":"necmettin-erbakan-universitesi","name":"Necmettin Erbakan Üniversitesi","cityId":"konya","type":"Devlet","faculties":[[20,[15,25,73,92,187,198,279,285,323,364,397,417,449,476,496,533,566]],[21,[273]],[275,[132]],[333,[279,397,449,476,569]],[334,[547,548,551]],[335,[77,536]],[354,[78,298,365,382]],[436,[214,266,376,440,516]],[464,[248,250,251,575]],[473,[254]],[487,[261]],[613,[33,47,61,88,150,156,292,306,351,352,385]],[614,[86,89,138,167,258,318,328,608]],[666,[32,234,418,491,550,590]],[694,[59,154,163,171,225,242,291,353,369,372]],[708,[52,200,464,498]],[775,[8,278]],[814,[59,353]],[815,[254]],[816,[61,150,234,306,352,368,624]],[817,[127,199,543]],[841,[271,303,355,493,494]],[848,[131,184,240,436,468,501,532,565]],[917,[552]],[940,[209,453,559,560]],[968,[194,348,384,587,629]],[991,[600]]]},{"id":"nevsehir-haci-bektas-veli-universitesi","name":"Nevşehir Hacı Bektaş Veli Üniversitesi","cityId":"nevsehir","type":"Devlet","faculties":[[2,[344]],[94,[374,375,401,550]],[265,[342]],[275,[132]],[307,[15,187,279,285,397,417,449,476,496,569]],[356,[28,72,91,93,107,184,308,362,382,436,456,468,501,532,565,567]],[422,[47,95,122,288,347,418]],[433,[229,265]],[441,[61,151,234,281,290]],[500,[194,271,303,313,583,589]],[503,[273]],[619,[127,199,302,463]],[670,[16,61,74,85,234,241,328,385]],[699,[59,154,225,291,427]],[775,[111,543,546,549,617]],[808,[254]],[940,[209,559,560]],[983,[32,338,557,562,564]]]},{"id":"nigde-omer-halisdemir-universitesi","name":"Niğde Ömer Halisdemir Üniversitesi","cityId":"nigde","type":"Devlet","faculties":[[144,[54,68,597]],[164,[104,105,120,212,227,234,380,508]],[165,[10,16,61,150,158,224,243,256,342,352,379,443,445,514,521,523]],[166,[52,200]],[275,[132]],[307,[187,279,285,397,417,449,476,496,569]],[354,[72,78,196,321,362]],[432,[542]],[500,[194,271,303,313,355,494,589]],[503,[295]],[506,[211,240,440,623]],[515,[91,93,283,468,501,532,565]],[676,[376,427,516]],[694,[59,102,154,225,242,291,312,322,349,353]],[709,[32,47,85,306,351,385,418,423,489,497,562]],[710,[137,289,292,368,412,439,455,612,626]],[711,[111,199,278,302,399,546,551,617]],[894,[70,77,244,253,529]],[917,[552]],[964,[34,385,444]],[1038,[142,254,464,498]]]},{"id":"nuh-naci-yazgan-universitesi","name":"Nuh Naci Yazgan Üniversitesi","cityId":"kayseri","type":"Vakıf","faculties":[[275,[132]],[437,[266]],[487,[261]],[501,[303,436,493]],[670,[8,19,61,150,199,278,292,547]],[770,[52,200,254]]]},{"id":"ondokuz-mayis-universitesi","name":"Ondokuz Mayıs Üniversitesi","cityId":"samsun","type":"Devlet","faculties":[[44,[95,117,347,434]],[51,[261]],[107,[61,69,385,401,418,550]],[108,[564]],[148,[27,289,415,416]],[215,[532]],[216,[47,61,66,95,385,497]],[275,[132]],[294,[143]],[307,[15,73,187,198,207,279,285,364,397,417,449,476,496,569]],[354,[54,72,196,298,321,362,382,619]],[432,[168]],[466,[377]],[469,[85,162,199,306,491,562]],[500,[271,303,482,493,589]],[503,[273]],[507,[211,241,277,440]],[515,[24,28,91,184,284,436,468,501,532,565]],[643,[26,237,319,339,513,550]],[676,[265,376,516]],[694,[59,102,154,163,225,242,291,322,353,372]],[770,[52,111,130,142,200,254,394,406,464,498]],[775,[8,19,133,134,144,278,395,399,422,546,547,548,617]],[783,[49,61,111,234,241,367,374,385,428,471,523,562]],[916,[122,224,226,347,385,423]],[917,[552]],[941,[559,560]],[990,[600]],[993,[61,111,264,293,385,405]],[1016,[74,150,158,167,226,255,324,455,485]],[1031,[40,69,244,522,525,528,531,536,556,634]]]},{"id":"ordu-universitesi","name":"Ordu Üniversitesi","cityId":"ordu","type":"Devlet","faculties":[[31,[104]],[98,[32]],[275,[132]],[307,[187,279,397,417,449,476,496,569]],[351,[44,115,118,216]],[352,[111,116,215,218,227,380,385]],[356,[283,362,382,468,501,532,565]],[407,[151]],[432,[440]],[499,[47,174,617]],[503,[273]],[671,[61]],[770,[52,200,254,464]],[847,[32,241,306,385,562]],[909,[61,137,150,156,158,212,292,352,368,374,412,550]],[917,[552]],[940,[209]],[962,[47,226,342,344,367,385]],[981,[96,271,303,493]],[982,[61,158,288,347,375,385]],[1031,[40,69,225,427,536]]]},{"id":"orta-dogu-teknik-universitesi","name":"Orta Doğu Teknik Üniversitesi","cityId":"ankara","type":"Devlet","faculties":[[307,[51,64,187,198,279,285,323,364,397]],[356,[72,184,196,298,321,362,382,436,501,532]],[500,[271,303,340,493,583]],[676,[168,376,516]],[694,[59,102,154,163,225,250,291,312,322,349,353,372,426]],[719,[59,154,163,250,271,285,291,303,322,353,426,436,480,494,620]]],"extraCityIds":["kktc"]},{"id":"osmaniye-korkut-ata-universitesi","name":"Osmaniye Korkut Ata Üniversitesi","cityId":"osmaniye","type":"Devlet","faculties":[[109,[47,122,226,324,344,347]],[291,[66,418,444,445,497]],[500,[271,303,493,583,589,629]],[503,[273]],[515,[28,283,284,532,565]],[547,[32,152,158,269,293,385,461]],[548,[55,91]],[549,[209,226,402,453]],[681,[266]],[695,[59,72,154,163,196,242,291,321,353,362]],[734,[61,101,151,156,243,255,256,306,367,385,434,519,540,613]],[770,[52,111,142,200,223,254,464,498]],[775,[111,144,199,278,342,617]]]},{"id":"ostim-teknik-universitesi","name":"OSTİM Teknik Üniversitesi","cityId":"ankara","type":"Vakıf","faculties":[[148,[61,66,126]],[500,[147,303,423,587,597,629]],[670,[74,141,150,158,255,290,300,347,352,368,485,596]],[679,[168,229,266]],[694,[59,154,163,250,353,390,607,620]]]},{"id":"ozyegin-universitesi","name":"Özyeğin Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[464,[251,429]],[487,[261]],[534,[147,303,580,588,629]],[679,[168,266,277,376]],[694,[59,154,163,291,353,611]],[846,[22,436,583]],[968,[209,408]]]},{"id":"pamukkale-universitesi","name":"Pamukkale Üniversitesi","cityId":"denizli","type":"Devlet","faculties":[[3,[35,85,95,111,342,418,514]],[128,[47,122,241]],[172,[489,579]],[186,[47,85,122,375,380,385]],[205,[128,226,385]],[206,[521]],[214,[328,368]],[236,[47,61,162,462]],[261,[19,111,134,199,278,546,547,548,617]],[262,[122,557,562,564]],[263,[61,74,150,158,212,227,234,264,324,352,380,412,540]],[275,[132]],[307,[187,279,285,397,417,449,476,496,569]],[354,[72,196,321,362]],[368,[200]],[482,[47,88,122,141,241,306,347,385,396]],[487,[261]],[500,[96,146,147,303,355,493,587,629]],[503,[273]],[506,[241,623]],[515,[28,91,93,184,205,283,336,436,468,501,532,565]],[555,[111,306,350,385,564]],[679,[168,376,427,516,542]],[694,[59,102,154,163,225,291,322,353,538,611]],[770,[254]],[797,[16,199]],[812,[1,53,497]],[902,[32,111,401,550]],[903,[144]],[910,[75,353,369,372,411]],[917,[552]],[940,[209,453,559,560]],[969,[402,473,589]],[1032,[40,536]]]},{"id":"piri-reis-universitesi","name":"Piri Reis Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[255,[115,217]],[256,[32,61,114,116,117,215,218,255,347,360,368,503]],[487,[261]],[500,[118,148,348,588,629]],[694,[59,154,163,216,353]]]},{"id":"rauf-denktas-universitesi","name":"Rauf Denktaş Üniversitesi","cityId":"kktc","type":"KKTC","faculties":[[535,[194,303,583,588]],[678,[376,620]]]},{"id":"recep-tayyip-erdogan-universitesi","name":"Recep Tayyip Erdoğan Üniversitesi","cityId":"rize","type":"Devlet","faculties":[[75,[47,61,562,564]],[76,[209,559]],[275,[132]],[308,[187,279,449,476,496,569]],[356,[72,196,236,283,321,362,532,565]],[363,[194,589]],[429,[200]],[487,[261]],[500,[271,303,355,493,583]],[503,[273]],[696,[59,154,171,291,353,376,427]],[745,[97,401,550]],[770,[52,254,498]],[775,[19,199,278,548,617]],[847,[85,88,122,241,306,347,351,385,489]],[855,[507]],[909,[101,137,150,158,212,269,292,324,352,354,368,379,412,503,540,612]],[917,[552]],[935,[115]],[1034,[40,536]]]},{"id":"sabanci-universitesi","name":"Sabancı Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[695,[386]],[785,[470]],[1020,[628]]]},{"id":"saglik-bilimleri-universitesi","name":"Sağlık Bilimleri Üniversitesi","cityId":"istanbul","type":"Devlet","faculties":[[10,[552]],[80,[181,199,245,617]],[191,[552]],[341,[552]],[415,[132]],[416,[143]],[417,[200]],[418,[254]],[419,[52,111,142,176,394,406,464,498]],[420,[8,19,133,144,278,407,422,547,548,617]],[421,[552]],[447,[132]],[448,[143]],[449,[254]],[450,[2,52,111,130,142,176,200,301,394,464,498]],[451,[8,19,74,133,134,144,278,399,414,422,547,548,550]],[452,[552]],[453,[552]],[454,[436]],[543,[552]],[583,[552]],[795,[132]],[796,[552]]],"extraCityIds":["ankara","adana","bursa","erzurum","izmir","kayseri","yurt-disi"]},{"id":"sakarya-uygulamali-bilimler-universitesi","name":"Sakarya Uygulamalı Bilimler Üniversitesi","cityId":"sakarya","type":"Devlet","faculties":[[41,[199,278,462,548]],[78,[137,255,269,289,318,410,412,428]],[149,[27,61,66,84,86,113,415,416,608]],[257,[116,117,215,218,491]],[357,[234,306,380,381,540]],[393,[47,122,162,241,288,306,375,385]],[475,[123,150,158,164,256,281,306,352,354,368,385,413,455,624]],[581,[58,264,306,379]],[741,[144,224,226,342,344]],[771,[130,200,254,464]],[778,[61,85,89,101,158,167,241,292,306,347,352,354,367,368,385,424]],[792,[47,122,241,367,385,423]],[793,[32,420,463,562,564]],[910,[59,154,291,353,369,372]],[945,[209,453,559,560]],[968,[194,587,589]],[1031,[40,69,427,536]]]},{"id":"sakarya-universitesi","name":"Sakarya Üniversitesi","cityId":"sakarya","type":"Devlet","faculties":[[11,[1,61,293,461,601]],[144,[59,67,68,480,597,620]],[275,[132]],[307,[187,279,285,397,417,449,476,496,569]],[354,[72,196,321,362]],[487,[261]],[503,[273]],[506,[211,240,440,623]],[515,[14,91,184,284,436,468,498,501,532,565]],[534,[288,303,464,589,629]],[694,[102,154,163,225,291,353,372]],[770,[142,254]],[779,[8,19,111,199,278,399,546,548,617]],[789,[229,376]],[841,[96,146,271,294,355,493,583]],[917,[552]]]},{"id":"samsun-universitesi","name":"Samsun Üniversitesi","cityId":"samsun","type":"Devlet","faculties":[[144,[611,620]],[503,[273]],[515,[91,276,284,436,464,501,532,565]],[579,[90,150,243,292,300,375,612]],[679,[376]],[695,[75,154,163,353]],[740,[250,268,572]],[837,[251]],[841,[118,148,493,588]],[909,[27,354,416,490]],[917,[552]]]},{"id":"sanko-universitesi","name":"Sanko Üniversitesi","cityId":"gaziantep","type":"Vakıf","faculties":[[770,[200,254]],[775,[17,19,278,547]],[917,[552]]]},{"id":"selcuk-universitesi","name":"Selçuk Üniversitesi","cityId":"konya","type":"Devlet","faculties":[[32,[47,61,158,347,385]],[37,[303,355]],[38,[52,254]],[39,[47,306,385,557,562]],[40,[225,353]],[136,[303,588,629]],[137,[32,47,122,306,347,385,557,562]],[138,[209,559,560]],[139,[2,498]],[171,[16,61,241,375,461]],[202,[352,354,385,412]],[240,[90,137,226,344,354,401]],[241,[402]],[275,[132]],[280,[47,347,579]],[293,[143]],[295,[13,23,24,28,182,184,205,283,284,317,436,456,468,501,532,565,591]],[307,[279,449,476,569]],[354,[12,71,72,78,196,298,321,362]],[428,[66,243,521]],[432,[110,168]],[443,[47,85,243]],[473,[254]],[486,[66,352,485]],[487,[261]],[492,[61,150,158,352,368]],[500,[271,303,493,583,587]],[503,[273]],[506,[211,241,440,451]],[546,[243,292,306,347,368,461,491,612]],[573,[16,224,342,418,514]],[627,[61,150]],[628,[52,200,254]],[679,[36,149,265,380,427]],[770,[2,52,111,142,200,394,464,498]],[775,[17,19,111,134,174,199,278,395,547,548,617]],[798,[61,101,226,401,555]],[823,[32,41,122,158,292,557,562]],[837,[251,574]],[847,[47,85,95,122,162,241,306,347,385,423,562]],[898,[47,243]],[910,[59,154,353,369,372]],[917,[552]],[940,[209,453,559,560]],[990,[600]],[1022,[47]],[1031,[40,69,225,522,525,531,536,556,634]]]},{"id":"siirt-universitesi","name":"Siirt Üniversitesi","cityId":"siirt","type":"Devlet","faculties":[[307,[187,279,285,449,476,496,569]],[339,[111,243,499]],[356,[24,91,284,321,501,532,565]],[437,[427,516]],[500,[271,355,493,498]],[503,[273]],[632,[47,434,499,509,564]],[694,[59,154,291,322,353]],[770,[254,301]],[775,[134,199,278,546,547,548]],[847,[32,85,95,111,212,306,385,499]],[897,[58,264]],[909,[61,150,226,292,324,352,418,443]],[917,[552]],[946,[209,453]],[990,[600]],[1031,[40,69,522,536,634]]]},{"id":"sinop-universitesi","name":"Sinop Üniversitesi","cityId":"sinop","type":"Devlet","faculties":[[96,[111,122,264,293,328,347,405]],[168,[210,464,493,588]],[169,[90,162,243,292,344,375,491]],[289,[144,278]],[307,[187,279,285,397,417,449,476,496,569]],[356,[28,72,362,501,532,565,597]],[391,[32,47,49,61,117,234,380,409,461,540,562]],[503,[273]],[670,[43,61,86,150,167,255,352,368,385,392,415,503]],[696,[59,154,353,391]],[770,[111,142,254,301,498]],[775,[19,103,134,546,548,617]],[855,[507]],[940,[209,453,560]],[953,[1,112,181]]]},{"id":"sivas-bilim-ve-teknoloji-universitesi","name":"Sivas Bilim ve Teknoloji Üniversitesi","cityId":"sivas","type":"Devlet","faculties":[[464,[575,595]],[695,[59,154,322,353,372]],[831,[290]],[893,[69,244,536]]]},{"id":"sivas-cumhuriyet-universitesi","name":"Sivas Cumhuriyet Üniversitesi","cityId":"sivas","type":"Devlet","faculties":[[204,[32,47,95,122,288,306,333,351,385,463,497,562]],[275,[132]],[276,[47,150,347,445,446,562]],[293,[143]],[295,[13,28,93,184,205,283,287,436,468,498,501,532,565,567]],[307,[187,279,285,397,417,449,476,496,569]],[354,[71,72,196,299,321,362,382]],[383,[47,241,344,461]],[431,[32,47,461,499]],[444,[47,111,444,462]],[487,[261]],[500,[96,146,194,271,303,355,493,589,629]],[503,[273]],[506,[211,241,440,623]],[510,[418,491]],[562,[47,241,444,461,462]],[618,[405,434,497]],[680,[376,516]],[694,[59,102,154,163,291,312,322,353,390,620]],[770,[52,142,200,254,464]],[775,[8,17,19,111,133,134,144,199,278,395,399,546,547,548,617]],[832,[61,86,123,137,150,156,158,212,292,350,352,368,374,401,412,445,495,540,550,612]],[863,[254]],[864,[47,111,224,462]],[874,[47,111,144,241,342,462]],[875,[68,609]],[910,[369]],[917,[552]],[940,[209,559]],[990,[600]],[1018,[47,71,111,226,344,462,548,549]],[1027,[47,95,224]],[1028,[194,481]]]},{"id":"suleyman-demirel-universitesi","name":"Süleyman Demirel Üniversitesi","cityId":"isparta","type":"Devlet","faculties":[[91,[199,278,548]],[275,[132]],[293,[143]],[304,[111,174,278,499,546,617]],[307,[25,187,279,285,476,496,569]],[487,[261]],[496,[8,19,111,133,199,278,546,547,548,551,617]],[500,[96,146,194,271,288,303,355,464,493,498,559,583,589]],[503,[273]],[506,[211,229,241,440]],[515,[28,91,184,283,436,468,501,532,565]],[676,[376,427,516]],[695,[59,72,102,154,163,196,225,291,298,321,322,353,362,411,538]],[770,[52,142,200,254]],[838,[251]],[917,[552]]]},{"id":"sirnak-universitesi","name":"Şırnak Üniversitesi","cityId":"sirnak","type":"Devlet","faculties":[[203,[61,111,156,269,385,499]],[497,[111,155,342,499]],[500,[271,303,493,629]],[503,[273]],[694,[59,291,349,426]],[770,[142,254,464,498]],[775,[111,181,278,399,546,548,617]],[825,[47,111,122,347,462]],[887,[85,150,292,335,352,385,412,418,495]],[948,[209,559]],[1031,[40,536,634]]]},{"id":"tarsus-universitesi","name":"Tarsus Üniversitesi","cityId":"mersin","type":"Devlet","faculties":[[464,[250,251]],[500,[493,629]],[667,[158,226,269,318,324,352,368,412]],[670,[47,61,85,122,234,288,347,380,385,423,489]],[694,[59,154,163,353]],[770,[111,130,142,200,254]],[775,[111,144,278,462,546,617]],[968,[194,235,464,498,589]]]},{"id":"ted-universitesi","name":"TED Üniversitesi","cityId":"ankara","type":"Vakıf","faculties":[[307,[285,397,449,476]],[356,[283,362,436,501]],[500,[271,303,494]],[679,[168,229,266,376,516]],[694,[59,154,163,291,353,620]]]},{"id":"tekirdag-namik-kemal-universitesi","name":"Tekirdağ Namık Kemal Üniversitesi","cityId":"tekirdag","type":"Devlet","faculties":[[114,[117]],[228,[241,347,396,491,540]],[237,[101,120,158,164,212,226,306,329,352,385,412,423,508,540]],[238,[59,75,102,154,163,291,353,538]],[356,[13,28,72,91,196,205,283,321,362,436,501,532,565]],[438,[376,427,440]],[471,[47,85,352,412]],[487,[261]],[500,[96,271,303,355,493,583]],[503,[273]],[653,[155,226,306,352]],[661,[85,385,562]],[688,[306,324,385,497]],[770,[2,52,254]],[775,[111,199,278,546,548,617]],[794,[122,234,306,385,521]],[847,[85,122,306,347,385,499,562]],[878,[32,515,562]],[909,[61,74,150,156,158,226,227,269,292,352,354,368,379,412,455,471,523,540,612]],[917,[552]],[990,[600]],[1031,[40,69,77,225,522,528,536,556,634]]]},{"id":"tiran-new-york-universitesi","name":"Tiran New York Üniversitesi","cityId":"yurt-disi","type":"Yurt Dışı","faculties":[[489,[261,436,494]],[536,[139,148,303,592,629]],[696,[56,234,265,620]]]},{"id":"tobb-ekonomi-ve-teknoloji-universitesi","name":"TOBB Ekonomi ve Teknoloji Üniversitesi","cityId":"ankara","type":"Vakıf","faculties":[[356,[283,436,532,565]],[487,[261]],[500,[271,303,494,582,629]],[679,[168,229,266,376]],[694,[59,75,154,163,353,357,607]],[917,[552]]]},{"id":"tokat-gaziosmanpasa-universitesi","name":"Tokat Gaziosmanpaşa Üniversitesi","cityId":"tokat","type":"Devlet","faculties":[[54,[34,85,344,405,434,497]],[82,[95,112,174,342]],[275,[132]],[293,[143]],[307,[187,279,285,397,417,449,476,496,569]],[324,[47,61,85,234,241,380,385,418]],[325,[254,464]],[326,[181,278,399,546]],[327,[277,565]],[356,[72,91,283,321,362,382,468,532,565]],[432,[209]],[487,[261]],[500,[271,303,313,355,494]],[528,[295]],[696,[59,154,163,225,242,291,353,376]],[713,[47,61,152,241,368,385,405,491,562,624]],[714,[240]],[725,[324,540]],[745,[47,61,111,181,490,499]],[761,[61,95,111,199,462,463,617]],[770,[2,52,142,200,254]],[917,[552]],[923,[32,66,85,88,137,150,158,243,264,292,306,351,352,385,415,416,562]],[924,[8,17,111,144,422,459,548]],[937,[61,74,151,156,234,255,306,368,385]],[938,[462,546,549]],[939,[47,159,589]],[1029,[209,453]],[1030,[47,61,226,347,375,396,521]],[1031,[40,69,77,522,536,556,634]]]},{"id":"toros-universitesi","name":"Toros Üniversitesi","cityId":"mersin","type":"Vakıf","faculties":[[438,[209,265,376]],[501,[284,303,436,589]],[670,[32,61,234,292,351,368]],[694,[154,163,291,620]],[770,[52,200,254]],[775,[8,17,19,111,134,199,278,399,547,548]]]},{"id":"trabzon-universitesi","name":"Trabzon Üniversitesi","cityId":"trabzon","type":"Devlet","faculties":[[132,[85,95,122,306,385,423]],[144,[59,125,607]],[217,[58,62,293,415,455]],[292,[289]],[349,[187,279,285,364,397,417,449,476,496,569]],[487,[261]],[503,[273]],[506,[211,240,440]],[515,[284,436,501,532,565]],[841,[493,589]],[869,[1,351,491]],[917,[552]],[926,[181,199,278,547,548,617]],[949,[562,564]],[972,[2,629]],[985,[47,241,306,385]]]},{"id":"trakya-universitesi","name":"Trakya Üniversitesi","cityId":"edirne","type":"Devlet","faculties":[[74,[32,144,226,324,344,603]],[275,[132]],[293,[143]],[295,[14,28,30,80,83,94,284,468,532,565]],[296,[47,122,241,347,385,396,423,499,562]],[297,[49,61,74,128,150,158,227,243,255,289,352,378,439,455,576]],[307,[15,187,279,285,397,417,449,476,496,569]],[354,[54,72,196,321,362,619]],[432,[277]],[468,[47,306,347,385]],[500,[96,146,271,303,355,493,583]],[503,[273]],[520,[122,158,344,347,351,368]],[598,[254]],[599,[111,150,342,412,562,624]],[600,[47,68,235,240,587]],[676,[265,376,427]],[694,[59,154,221,225,353]],[770,[52,176,200,254,394,464]],[775,[8,17,19,127,161,199,278,395,407,422,441,546,547,548]],[884,[212,234,335,374,375,472]],[917,[552]],[933,[61,601]],[968,[194,559,629]],[978,[162,306,396,462]],[979,[47,384]]]},{"id":"turk-hava-kurumu-universitesi","name":"Türk Hava Kurumu Üniversitesi","cityId":"ankara","type":"Vakıf","faculties":[[68,[86,246,247,255,489,490,576,577,608]],[462,[429,572]],[464,[575,595]],[534,[251,303,348,629]],[540,[247,489,490,576]],[694,[59,154,163,353,620]]],"extraCityIds":["izmir"]},{"id":"turk-alman-universitesi","name":"Türk-Alman Üniversitesi","cityId":"istanbul","type":"Devlet","faculties":[[354,[170,358,383]],[487,[261]],[500,[271,303,494]],[635,[13,337,436,501]],[694,[59,154,163,291,353,369]]]},{"id":"turk-japon-bilim-ve-teknoloji-universitesi","name":"Türk-Japon Bilim ve Teknoloji Üniversitesi","cityId":"ankara","type":"Devlet","faculties":[[694,[59,102,154,356]]]},{"id":"ufuk-universitesi","name":"Ufuk Üniversitesi","cityId":"ankara","type":"Vakıf","faculties":[[307,[285]],[356,[436]],[474,[254]],[487,[261]],[500,[303,494,587,629]],[670,[61,62,66,306,351,385,462]],[696,[59]],[775,[17,19,161,199,278,422,547,548]],[917,[552]]]},{"id":"uluslararasi-balkan-universitesi","name":"Uluslararası Balkan Üniversitesi","cityId":"yurt-disi","type":"Yurt Dışı","faculties":[[275,[132]],[307,[285,437,476,569]],[487,[261,494]],[500,[46,140,147,208,303,563]],[694,[59,163,291,376,599,607]],[786,[20,230,234,267,380]],[848,[239,436]]]},{"id":"uluslararasi-final-universitesi","name":"Uluslararası Final Üniversitesi","cityId":"kktc","type":"KKTC","faculties":[[275,[132]],[306,[285,397,417]],[356,[436]],[487,[261]],[500,[303,494,581]],[670,[32,61]],[677,[376]],[694,[59,154,291,607,620]],[770,[52,200]],[980,[209,559]]]},{"id":"uluslararasi-kibris-universitesi","name":"Uluslararası Kıbrıs Üniversitesi","cityId":"kktc","type":"KKTC","faculties":[[275,[132]],[293,[143]],[307,[285,397,417,476]],[356,[382,436]],[435,[265,376]],[487,[261]],[500,[303,583]],[506,[125,240,440]],[670,[61]],[694,[59,75,154,163,171,291,353,369,426,607,620]],[770,[52,200,498]],[773,[19,111,278]],[774,[111,254]],[894,[70]],[948,[209,559]],[972,[54,629]]]},{"id":"uluslararasi-saraybosna-universitesi","name":"Uluslararası Saraybosna Üniversitesi","cityId":"yurt-disi","type":"Yurt Dışı","faculties":[[307,[285,569]],[311,[271,303,494,586]],[487,[261]],[695,[57,154,221,353,376,611,620]],[785,[231,283,367,436]]]},{"id":"usak-universitesi","name":"Uşak Üniversitesi","cityId":"usak","type":"Devlet","faculties":[[112,[264,292,324,344,374,405,472,562]],[275,[132]],[307,[187,279,397,417,449,476,496,569]],[346,[47,85,144,226,237,342,347]],[432,[542]],[500,[271,303,313,355,498]],[503,[273]],[506,[211,240,440,623]],[515,[28,91,93,283,436,468,501,532,565]],[569,[61,122,347]],[679,[376,516]],[695,[154,291,322,353,362,382,390,538]],[770,[254,301,464]],[775,[8,278,462,546,547,548,617]],[833,[69,521]],[836,[490,576]],[847,[306,385,497]],[853,[21,51,452]],[909,[61,137,150,227,318,352,368,412,540]],[917,[552]],[962,[47,111,380,399,564]],[968,[194,348,384,587]],[976,[61]],[1031,[40,69,536,634]]]},{"id":"uskudar-universitesi","name":"Üsküdar Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[275,[132]],[506,[110,211,229,241,440,451,623]],[515,[184,284,436,494,501,532,629]],[695,[5,59,76,154,163,322,382,620]],[770,[52,111,130,142,176,200,254,301,394,425,464,498]],[775,[1,8,17,19,74,103,111,112,133,134,144,161,174,181,199,226,278,344,392,395,399,407,414,422,430,441,459,461,462,497,499,546,547,548,549,550,617]],[917,[552]]]},{"id":"van-yuzuncu-yil-universitesi","name":"Van Yüzüncü Yıl Üniversitesi","cityId":"van","type":"Devlet","faculties":[[121,[61,151,401]],[275,[132]],[293,[143]],[295,[22,28,91,182,184,283,436,468,501,532,565]],[307,[73,187,279,285,323,364,397,417,449,476,496,533,566,569]],[328,[303]],[329,[47,74,111,137,212,292,385,423]],[354,[72,321,362,382]],[392,[41,47,61,342,385,401,562]],[432,[440]],[500,[146,271,303,493,583]],[503,[273]],[679,[376,427,516]],[687,[243,324,344,399,428]],[694,[59,154,291,353]],[739,[61,122,226,548]],[770,[52,142,200,254]],[855,[507]],[917,[552]],[940,[209,453,559]],[986,[1,418]],[987,[61,85,150,158,212,292,306,352,375,379,385,412,540,557,562]],[988,[8,19,111,134,144,174,278,441,546,547,548,617]],[990,[600]],[1031,[40,69,77,522,528,536,556,634]]]},{"id":"yakin-dogu-universitesi","name":"Yakın Doğu Üniversitesi","cityId":"kktc","type":"KKTC","faculties":[[88,[279,286,397,417,449,476,496,569]],[275,[132]],[293,[143]],[356,[283,284,362,382,436,532,565]],[473,[254]],[487,[261]],[500,[68,147,194,288,303,423,493,583,584]],[503,[273]],[506,[229,241,440,623]],[519,[102,291]],[670,[16,47,58,61,122,158,203,234,292,375,412,439,459,562]],[676,[265,376]],[694,[75,154,353,369,411,426]],[770,[52,142,176,200,394,498]],[775,[8,17,19,74,111,134,144,161,199,278,342,395,422,441,546,547,548,617]],[917,[552]],[947,[32]],[950,[209]],[990,[600]],[1004,[59,67,480,607,620]],[1031,[225,427]]]},{"id":"yalova-universitesi","name":"Yalova Üniversitesi","cityId":"yalova","type":"Devlet","faculties":[[56,[215,318,503]],[79,[224,226,241,347,506,562]],[232,[111,189,333,367,385,396]],[487,[261]],[503,[273]],[515,[436,498,532,623]],[694,[59,154,163,171,291,322,353,431]],[770,[200,254]],[786,[265]],[915,[199,278,462,617]],[917,[552]],[1000,[96,271,303,493,583,587]],[1001,[32,61,116,117,269,360,416,428,432,491,540,562]]]},{"id":"yasar-universitesi","name":"Yaşar Üniversitesi","cityId":"izmir","type":"Vakıf","faculties":[[487,[261]],[506,[229,240,440,623]],[515,[283,284,436,583]],[534,[147,303,348,587]],[670,[58,61,117,122,234,241,347,375,562]],[676,[266,376]],[694,[59,154,163,291,353,620]],[786,[110,168]],[894,[522,525,556]],[972,[209,560,629]]]},{"id":"yeditepe-universitesi","name":"Yeditepe Üniversitesi","cityId":"istanbul","type":"Vakıf","faculties":[[144,[54,68,619,629]],[275,[132]],[293,[143]],[307,[279,285,397,449]],[487,[261]],[506,[211,229,241,440,450]],[515,[22,100,184,283,313,436,456,494,501,532,565]],[534,[147,159,303,348,527,559,580,584,588]],[676,[168,265,320,376]],[695,[59,154,163,196,221,291,322,353,357,362]],[770,[52,200,254]],[786,[125,209,469]],[917,[552]]]},{"id":"yildiz-teknik-universitesi","name":"Yıldız Teknik Üniversitesi","cityId":"istanbul","type":"Devlet","faculties":[[307,[64,187,279,285,397,449,476,496,569]],[316,[59,75,153,160,327,611]],[356,[196,206,298,321,362,382,565]],[385,[216,217]],[500,[271,303,494]],[518,[102,242,291]],[608,[76,225,322,363,372]],[649,[163,353,369]],[676,[336,376,516]],[786,[202,277,469]]]},{"id":"yozgat-bozok-universitesi","name":"Yozgat Bozok Üniversitesi","cityId":"yozgat","type":"Devlet","faculties":[[28,[47,111,150,234,352,375]],[29,[254,301]],[158,[61,86,158,226,342,375,405]],[225,[111,181,278,546,549,617]],[275,[132]],[307,[187,279,285,397,449,476,496,569]],[356,[283,362,382,468,501,532,565]],[487,[261]],[500,[194,271,303,355,464,493,583]],[503,[273]],[506,[211,240,440,623]],[699,[59,154,291,353,376,516]],[770,[111,142,254,498]],[775,[19,111,144,278,462,546,547,617]],[802,[200]],[845,[61,292,385,399,412,418,445]],[883,[342,418,521]],[917,[552]],[940,[209]],[990,[600]],[1013,[88,351,497]],[1019,[32,47,58,61,85,86,95,150,158,212,234,264,292,306,352,385,412,491,523]],[1031,[40,69,522,536]]]},{"id":"yuksek-ihtisas-universitesi","name":"Yüksek İhtisas Üniversitesi","cityId":"ankara","type":"Vakıf","faculties":[[670,[61,144,150,234]],[770,[52,130,142,176,200,254,464]],[775,[17,19,74,161,199,278,399,543,546,548,549,551]],[917,[552]]]},{"id":"zonguldak-bulent-ecevit-universitesi","name":"Zonguldak Bülent Ecevit Üniversitesi","cityId":"zonguldak","type":"Devlet","faculties":[[18,[8,17,19,111,144,278,395,399,422,430,459,547,548,549,551,617]],[48,[47,150,156,158,215,218,292,306,328,352,371,385,455,612,613]],[148,[27,86,415]],[222,[224,226,324,342,344]],[223,[3,4,95,264,288,396,405,489,490,497]],[255,[118]],[269,[32,61,212,293,333,351,385,396,418,434,562]],[275,[132]],[293,[143]],[333,[187,279,397,417,449,476,496,569]],[354,[72,196,321,362,382,619]],[399,[241,374,462]],[500,[96,271,303,355,493,588]],[503,[273]],[506,[241,623]],[567,[62,66,84,117,234]],[568,[559,560]],[694,[59,75,154,242,291,349,353]],[770,[200,254,498]],[913,[184,283,436,501,532,565]],[917,[552]],[973,[68,194]],[1037,[74,243,292,306,347,350,385,562]]]}];

/**
 * YÖK Katalog yardımcıları: İl → Üniversite → Fakülte → Bölüm
 * Firestore'a yalnızca ID'ler yazılır; isimler bu katalogdan çözülür.
 */
const OTHER_ID = 'diger';

const collator = new Intl.Collator('tr', { sensitivity: 'base' });
const byName = (a, b) => collator.compare(a.name, b.name);

const cityMap = new Map(CITIES.map((c) => [c.id, c]));
const uniMap = new Map(UNIVERSITIES.map((u) => [u.id, u]));
const facIdMap = new Map(FACULTIES.map(([id, name]) => [id, name]));
const depIdMap = new Map(DEPARTMENTS.map(([id, name]) => [id, name]));

// Precompute university counts per city
const cityUniCounts = new Map();
for (const c of CITIES) cityUniCounts.set(c.id, 0);
for (const u of UNIVERSITIES) {
  cityUniCounts.set(u.cityId, (cityUniCounts.get(u.cityId) || 0) + 1);
  if (Array.isArray(u.extraCityIds)) {
    for (const ec of u.extraCityIds) {
      cityUniCounts.set(ec, (cityUniCounts.get(ec) || 0) + 1);
    }
  }
}

const PRIORITY_CITY_IDS = ['istanbul', 'ankara', 'izmir'];

/**
 * Tüm illeri döndürür: Başta İstanbul, Ankara, İzmir; ardından diğer iller alfabetik (KKTC ve Yurt Dışı sonda).
 * @returns {Array<{ id: string, name: string, uniCount: number, popular?: boolean }>}
 */
function getCities() {
  const all = CITIES.map((c) => ({
    id: c.id,
    name: c.name,
    uniCount: cityUniCounts.get(c.id) || 0,
    popular: PRIORITY_CITY_IDS.includes(c.id),
  }));
  const priority = PRIORITY_CITY_IDS.map((id) => all.find((c) => c.id === id)).filter(Boolean);
  const rest = all.filter((c) => !PRIORITY_CITY_IDS.includes(c.id));
  return [...priority, ...rest];
}

/**
 * Seçilen ildeki üniversiteleri alfabetik döndürür.
 * @param {string} cityId
 * @returns {Array<{ id: string, name: string, cityId: string, type: string, facultyCount: number }>}
 */
function getUniversitiesByCity(cityId) {
  if (!cityId || !cityMap.has(cityId)) return [];
  const list = UNIVERSITIES.filter(
    (u) => u.cityId === cityId || (Array.isArray(u.extraCityIds) && u.extraCityIds.includes(cityId))
  )
    .map((u) => ({
      id: u.id,
      name: u.name,
      cityId,
      type: u.type || 'Devlet',
      facultyCount: u.faculties.length,
    }))
    .sort(byName);

  return [
    ...list,
    { id: OTHER_ID, name: 'Listede Yok / Diğer Üniversite', cityId, type: 'Diğer', facultyCount: 1 },
  ];
}

/**
 * Seçilen üniversitenin fakülte/yüksekokullarını alfabetik döndürür.
 * @param {string} universityId
 * @returns {Array<{ id: string, name: string, departmentCount: number }>}
 */
function getFacultiesByUniversity(universityId) {
  if (!universityId) return [];
  if (universityId === OTHER_ID) {
    return [{ id: OTHER_ID, name: 'Diğer Fakülte / Yüksekokul', departmentCount: 1 }];
  }
  const u = uniMap.get(universityId);
  if (!u) return [];

  const list = u.faculties
    .map(([facIdx, depIndices]) => {
      const [id, name] = FACULTIES[facIdx];
      return { id, name, departmentCount: depIndices.length };
    })
    .sort(byName);

  return [...list, { id: OTHER_ID, name: 'Diğer Fakülte / Yüksekokul', departmentCount: 1 }];
}

/**
 * Geriye dönük uyumluluk için: universityId verilmezse tüm fakülteleri döndürür.
 * @param {string} [universityId]
 */
function getFaculties(universityId) {
  if (universityId) return getFacultiesByUniversity(universityId);
  return [
    ...FACULTIES.map(([id, name]) => ({ id, name })).sort(byName),
    { id: OTHER_ID, name: 'Diğer Fakülte / Yüksekokul' },
  ];
}

/**
 * Seçilen üniversite ve fakültedeki bölümleri alfabetik döndürür.
 * @param {string} universityId
 * @param {string} facultyId
 * @returns {Array<{ id: string, name: string }>}
 */
function getDepartmentsByUniversityFaculty(universityId, facultyId) {
  if (!universityId || !facultyId) return [];
  if (universityId === OTHER_ID || facultyId === OTHER_ID) {
    return [{ id: OTHER_ID, name: 'Diğer Bölüm' }];
  }
  const u = uniMap.get(universityId);
  if (!u) return [];

  const facEntry = u.faculties.find(([facIdx]) => FACULTIES[facIdx][0] === facultyId);
  if (!facEntry) return [];

  const list = facEntry[1]
    .map((depIdx) => {
      const [id, name] = DEPARTMENTS[depIdx];
      return { id, name };
    })
    .sort(byName);

  return [...list, { id: OTHER_ID, name: 'Diğer Bölüm' }];
}

/**
 * Geriye dönük uyumluluk için.
 */
function getDepartments(facultyId, universityId) {
  if (universityId) return getDepartmentsByUniversityFaculty(universityId, facultyId);
  if (facultyId === OTHER_ID) return [{ id: OTHER_ID, name: 'Diğer Bölüm' }];
  return [...DEPARTMENTS.map(([id, name]) => ({ id, name })).sort(byName), { id: OTHER_ID, name: 'Diğer Bölüm' }];
}
function cityName(id) {
  return cityMap.get(id)?.name || 'Bilinmeyen İl';
}
function universityName(id) {
  if (id === OTHER_ID) return 'Diğer Üniversite';
  return uniMap.get(id)?.name || 'Bilinmeyen Üniversite';
}
function facultyName(id) {
  if (id === OTHER_ID) return 'Diğer Fakülte / Yüksekokul';
  return facIdMap.get(id) || 'Bilinmeyen Fakülte';
}

/**
 * Bölüm adını çözer. Hem departmentName(departmentId) hem de
 * eski imzalı departmentName(facultyId, departmentId) çağrılarını destekler.
 * @param {string} a
 * @param {string} [b]
 */
function departmentName(a, b) {
  const depId = b !== undefined ? b : a;
  if (depId === OTHER_ID) return 'Diğer Bölüm';
  return depIdMap.get(depId) || 'Bilinmeyen Bölüm';
}

/**
 * Kısa üniversite etiketi (header chip için)
 * @param {string} id
 */
function universityShortName(id) {
  const name = universityName(id);
  return name.replace(/ Üniversitesi$/u, '').replace(/ Meslek Yüksekokulu$/u, ' MYO');
}

/**
 * Seçimlerin YÖK kataloğuyla tutarlı olduğunu doğrular.
 * @param {{ cityId: string, universityId: string, facultyId: string, departmentId: string }} p
 */
function isValidSelection(p) {
  if (!p || !cityMap.has(p.cityId)) return false;

  if (p.universityId === OTHER_ID) {
    return p.facultyId === OTHER_ID && p.departmentId === OTHER_ID;
  }

  const u = uniMap.get(p.universityId);
  if (!u) return false;
  const inCity =
    u.cityId === p.cityId || (Array.isArray(u.extraCityIds) && u.extraCityIds.includes(p.cityId));
  if (!inCity) return false;

  if (p.facultyId === OTHER_ID) {
    return p.departmentId === OTHER_ID;
  }

  const facEntry = u.faculties.find(([facIdx]) => FACULTIES[facIdx][0] === p.facultyId);
  if (!facEntry) return false;

  if (p.departmentId === OTHER_ID) return true;
  return facEntry[1].some((depIdx) => DEPARTMENTS[depIdx][0] === p.departmentId);
}

/**
 * FCM topic adları (Cloud Function ile aynı mantık; bkz. functions/index.js)
 * @param {{ cityId: string, universityId: string }} p
 */
function topicsForProfile(p) {
  const topics = ['all'];
  if (p?.cityId) topics.push(`city-${p.cityId}`);
  if (p?.universityId && p.universityId !== OTHER_ID) topics.push(`uni-${p.universityId}`);
  return topics;
}

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


/** Aydınlatma metni sürümü — kvkk.html'i değiştirdiğinde artır. */
const NOTICE_VERSION = '2026-11';

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
    const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
  } catch {
    // ignore cookie errors
  }
}

function removeCookie(name) {
  try {
    const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${secure}`;
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

const VALID_DEVICE_ID_RE = /^dev-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return 'dev-' + crypto.randomUUID().toLowerCase();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    return `dev-${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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
function getDeviceId() {
  let id = null;
  try {
    id = localStorage.getItem(DEVICE_ID_KEY);
  } catch {
    // ignore
  }
  if (!id) {
    id = getCookie(DEVICE_ID_KEY);
  }
  if (!id || typeof id !== 'string' || !VALID_DEVICE_ID_RE.test(id)) {
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
function getLocalProfile() {
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
function saveLocalProfile(profile) {
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
function clearLocalProfile() {
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
let anonymousAuthBlocked = false;

const ANON_BLOCKED_SESSION_KEY = 'ko_anon_auth_blocked';

async function tryEnsureAnonymousUser() {
  if (!isFirebaseConfigured() || !auth) return null;
  if (auth.currentUser) return auth.currentUser;
  if (anonymousAuthBlocked) return null;
  try {
    if (sessionStorage.getItem(ANON_BLOCKED_SESSION_KEY) === '1') {
      anonymousAuthBlocked = true;
      return null;
    }
  } catch {
    // ignore
  }
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    const code = err?.code || '';
    if (code === 'auth/admin-restricted-operation' || code === 'auth/operation-not-allowed') {
      anonymousAuthBlocked = true;
      try {
        sessionStorage.setItem(ANON_BLOCKED_SESSION_KEY, '1');
      } catch {
        // ignore
      }
    }
    return null;
  }
}

/** @type {Array<(user: any, profile: StudentProfile | null, admin: boolean) => void>} */
const listeners = [];
function onAuthChange(cb) {
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
async function fetchProfile(uid) {
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
  const deviceId = getDeviceId();
  let localProf = getLocalProfile();
  if (!localProf) {
    const idbProf = await idbGet(LOCAL_PROFILE_KEY);
    if (idbProf && isValidSelection(idbProf)) {
      localProf = saveLocalProfile(idbProf);
    }
  }

  let remoteProfile = null;
  let admin = false;
  const targetDocId = user?.uid || (localProf ? deviceId : null);

  if (targetDocId && isFirebaseConfigured() && db) {
    try {
      [remoteProfile, admin] = await Promise.all([
        fetchProfile(targetDocId),
        user && !user.isAnonymous ? checkAdmin(user.uid) : Promise.resolve(false),
      ]);
    } catch {
      // Firestore okuma yetkisi henüz yoksa yerel profil ile devam edilir
    }

    // Cihazda yerel profil var ama Firestore'da henüz yoksa arka planda Firestore'a yaz
    if (!remoteProfile && localProf && isValidSelection(localProf)) {
      try {
        await writeProfileToFirestore(targetDocId, {
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
          uid: targetDocId,
          deviceId,
        };
      } catch {
        // Firestore yazma yetkisi henüz yoksa yerel kayıt zaten tamamlandı
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
      uid: user?.uid || remoteProfile.uid || deviceId,
      deviceId,
    });
  } else if (localProf && isValidSelection(localProf)) {
    currentProfile = saveLocalProfile({
      ...localProf,
      uid: user?.uid || localProf.uid || deviceId,
      deviceId,
    });
  } else {
    currentProfile = null;
  }

  notify();
}

/**
  * Öğrenci profilini hem kullanıcının cihazına (anında) hem de Firebase'e kaydeder.
  * Oturum yoksa önce anonim oturum denenir; kapalıysa doğrudan deviceId ile Firestore'a yazılır.
  * @param {{ cityId: string, universityId: string, facultyId: string, departmentId: string }} selection
  */
async function saveProfile(selection) {
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

  // 2. Firebase yapılandırılmışsa anonim kimlik (veya deviceId) ile Firestore'a kaydet
  if (isFirebaseConfigured() && db) {
    try {
      const user = await tryEnsureAnonymousUser();
      const targetDocId = user?.uid || deviceId;

      const isNew = !currentProfile || currentProfile.uid !== targetDocId;
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

      await writeProfileToFirestore(targetDocId, data);
      currentProfile = saveLocalProfile({
        ...currentProfile,
        uid: targetDocId,
        deviceId,
      });
      await refresh(user);
    } catch {
      // Cihaz kaydı zaten tamamlandı; Firestore kuralları yayınlandığında otomatik senkronize olur
    }
  }

  return currentProfile;
}

/**
  * KVKK m.11 — silme hakkı: hem cihazdaki yerel kaydı hem de Firestore belgesini ve anonim hesabı siler.
  */
async function deleteMyData() {
  const deviceId = getDeviceId();
  clearLocalProfile();
  currentProfile = null;

  if (isFirebaseConfigured() && db) {
    const user = auth?.currentUser;
    const idsToDelete = new Set([deviceId]);
    if (user?.uid) idsToDelete.add(user.uid);

    for (const id of idsToDelete) {
      try {
        await deleteDoc(doc(db, 'users', id));
      } catch {
        // ignore
      }
    }

    if (user) {
      if (user.isAnonymous) {
        try {
          await deleteUser(user);
        } catch {
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
async function loginAdmin({ email, password }) {
  await ensureFirebaseSdk();
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase henüz yapılandırılmamış.');
  }
  const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  await refresh(cred.user);
  return cred.user;
}
async function logout() {
  await signOut(auth);
}
function getCurrentUser() {
  return currentUser;
}
function getCurrentProfile() {
  return currentProfile || getLocalProfile();
}
function isAdmin() {
  return currentIsAdmin;
}

/**
  * Auth durum dinleyicisini başlatır.
  * Cihazda yerel profil varsa ama Firebase anonim oturumu henüz açılmamışsa otomatik oturum açıp senkronize eder.
  */
async function initAuth() {
  getDeviceId();
  const sdkOk = await ensureFirebaseSdk();
  if (!sdkOk) return { user: null, profile: getCurrentProfile() };
  if (!isFirebaseConfigured() || !auth) {
    return Promise.resolve({ user: null, profile: getCurrentProfile() });
  }

  return new Promise((resolve) => {
    let first = true;
    onAuthStateChanged(auth, async (user) => {
      if (!user && getLocalProfile()) {
        user = await tryEnsureAnonymousUser();
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
async function reloadProfile() {
  if (isFirebaseConfigured() && auth) {
    await refresh(auth.currentUser);
  }
  return getCurrentProfile();
}
function mapAuthError(error) {
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

/**
 * KampüsKazan — Kampanya Servisi (campaigns.json tabanlı, Firebase yükü 0)
 *
 * Kampanyalar doğrudan kök dizindeki `campaigns.json` dosyasından okunur.
 * Böylece öğrenciler siteye girdiğinde Firebase Firestore'a hiçbir kampanya sorgusu atılmaz,
 * sunucuya veya kotaya yük binmez. Yeni kampanya eklemek veya mevcutları güncellemek için
 * `campaigns.json` dosyasını düzenlemeniz yeterlidir.
 */

const CAMPAIGNS_JSON_URL = './campaigns.json';

/**
 * file:// protokolünde (Finder'dan çift tıklayarak açıldığında) fetch() tarayıcı tarafından
 * engellenirse kullanılacak yerleşik yedek liste (campaigns.json ile senkron tutulur).
 */
const FALLBACK_CAMPAIGNS = [
  {
    id: 'kuveytturk-davet-1000tl',
    active: true,
    brand: 'Kuveyt Türk Kampüs',
    category: 'Banka',
    type: 'Hediye',
    title: "Kuveyt Türk'te arkadaşını davet edenlere 1.000 TL, toplamda 10.000 TL!",
    description:
      'Kuveyt Türk Kampüslü üniversite öğrencilerine özel! Kuveyt Türk Mobil → Davet Et Kazan menüsünden davet kodunla çağırdığın her arkadaşın için 1.000 TL, toplamda 10 kişiye kadar 10.000 TL nakit ödül kazan.',
    image: 'images/kuveytturk-kampus.svg',
    logo: 'images/kuveytturk-logo.svg',
    link: 'https://www.kuveytturk.com.tr/bireysel/kampus',
    date: 'Güncel',
    cities: [],
    universities: [],
  },
  {
    id: 'spotify-premium-ogrenci-60tl',
    active: true,
    brand: 'Spotify',
    category: 'Müzik',
    type: 'İndirim',
    title: 'Spotify Premium Öğrenci — İlk 1 Ay Ücretsiz, Sonra Aylık ₺60',
    description:
      'Üniversite öğrencilerine özel Spotify Premium neredeyse yarı fiyatına! İlk 1 ay ₺0 (ücretsiz deneme), sonrasında öğrenci olduğun süre boyunca aylık ₺115 yerine sadece ₺60. Reklamsız müzik dinleme, çevrimdışı indirme ve istediğin an iptal imkanı. SheerID ile öğrenci belgeni doğrulayarak hemen katılabilirsin.',
    image: 'images/spotify-student.svg',
    logo: 'images/spotify-logo.svg',
    link: 'https://www.spotify.com/tr-tr/student/',
    date: 'Güncel',
    cities: [],
    universities: [],
  },
];

/**
 * Ham JSON verisini normalize eder.
 * @param {any} raw
 * @returns {Array<object>}
 */
function normalizeCampaignList(raw) {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.campaigns)
    ? raw.campaigns
    : [];

  return list
    .map((item, idx) => {
      if (!item || typeof item !== 'object') return null;
      const title = String(item.title || '').trim();
      if (!title) return null;

      return {
        id: String(item.id || `kampanya-${idx + 1}`).trim(),
        active: item.active !== false,
        brand: String(item.brand || '').trim(),
        category: String(item.category || 'Genel').trim(),
        type: String(item.type || '').trim(),
        title,
        description: String(item.description || '').trim(),
        image: String(item.image || '').trim(),
        logo: String(item.logo || '').trim(),
        link: String(item.link || '').trim(),
        date: String(item.date || 'Güncel').trim(),
        cities: Array.isArray(item.cities) ? item.cities.filter(Boolean) : [],
        universities: Array.isArray(item.universities) ? item.universities.filter(Boolean) : [],
        faculties: Array.isArray(item.faculties) ? item.faculties.filter(Boolean) : [],
        departments: Array.isArray(item.departments) ? item.departments.filter(Boolean) : [],
      };
    })
    .filter(Boolean);
}

/**
 * `campaigns.json` dosyasından tüm kampanyaları getirir (Firebase'e istek atmaz).
 * @returns {Promise<Array<object>>}
 */
async function fetchAllCampaigns() {
  await ensureFirebaseSdk();
  try {
    const res = await fetch(`${CAMPAIGNS_JSON_URL}?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      const parsed = normalizeCampaignList(json);
      if (parsed.length > 0 || Array.isArray(json) || Array.isArray(json?.campaigns)) {
        return parsed;
      }
    }
  } catch {
    // file:// protokolünde veya çevrimdışı durumda yerleşik listeye düşer
  }
  return normalizeCampaignList(FALLBACK_CAMPAIGNS);
}

/**
 * Kampanyanın öğrencinin seçtiği şehir/üniversite/fakülte/bölüm ile eşleşip eşleşmediğini kontrol eder.
 * Eğer kampanyada ilgili filtre dizisi boşsa (`[]`), tüm öğrencilere gösterilir.
 * @param {object} campaign
 * @param {{ cityId?: string, universityId?: string, facultyId?: string, departmentId?: string } | null} profile
 */
function matchesStudentProfile(campaign, profile) {
  if (!profile) return true;

  if (Array.isArray(campaign.cities) && campaign.cities.length > 0) {
    if (!profile.cityId || !campaign.cities.includes(profile.cityId)) return false;
  }
  if (Array.isArray(campaign.universities) && campaign.universities.length > 0) {
    if (!profile.universityId || !campaign.universities.includes(profile.universityId)) return false;
  }
  if (Array.isArray(campaign.faculties) && campaign.faculties.length > 0) {
    if (!profile.facultyId || !campaign.faculties.includes(profile.facultyId)) return false;
  }
  if (Array.isArray(campaign.departments) && campaign.departments.length > 0) {
    if (!profile.departmentId || !campaign.departments.includes(profile.departmentId)) return false;
  }

  return true;
}

/**
 * Aktif kampanyaları `campaigns.json` dosyasından getirir (öğrenciler için).
 * Firebase Firestore'a hiçbir okuma isteği gönderilmez.
 * @param {{ cityId?: string, universityId?: string, facultyId?: string, departmentId?: string } | null} [profile]
 * @returns {Promise<Array<object>>}
 */
async function fetchActiveCampaigns(profile = null) {
  const all = await fetchAllCampaigns();
  return all.filter((c) => c.active !== false && matchesStudentProfile(c, profile));
}

/**
 * Öğrenci istatistikleri (admin) — KVKK gereği yalnızca TOPLU sayılar döner,
 * tekil kayıt listelenmez.
 * @returns {Promise<{ total: number, pushEnabled: number, byCity: Map<string, number>, byUniversity: Map<string, number>, byFaculty: Map<string, number>, byDepartment: Map<string, number> }>}
 */
async function fetchStudentStats() {
  await ensureFirebaseSdk();
  const stats = {
    total: 0,
    pushEnabled: 0,
    byCity: new Map(),
    byUniversity: new Map(),
    byFaculty: new Map(),
    byDepartment: new Map(),
  };
  if (!db) return stats;

  const snap = await getDocs(collection(db, 'users'));
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


/** Bildirim açık rıza metni sürümü — kvkk.html'deki metni değiştirirsen artır. */
const PUSH_CONSENT_VERSION = '2026-11';

const MESSAGING_URL = 'https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging.js';

/** @type {Promise<ServiceWorkerRegistration | null> | null} */
let swPromise = null;
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
}
function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Bildirim neden kullanılamıyor? (UI'da gösterilecek açıklama)
 * @returns {string | null} null = kullanılabilir
 */
function pushUnavailableReason() {
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
function registerServiceWorker() {
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
function requestPermission() {
  if (!('Notification' in window)) return Promise.resolve('denied');
  return Notification.requestPermission();
}

/**
 * İzin alındıktan sonra token alır ve profile kaydeder.
 * @param {string} uid
 * @param {NotificationPermission | Promise<NotificationPermission>} permission
 */
async function enablePush(uid, permission) {
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
async function disablePush(uid) {
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
async function listenForegroundMessages(cb) {
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
async function syncPushToken(profile) {
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

/**
 * KampüsKazan — Mobil-First PWA Ana Uygulama
 *
 * Akış:
 *  1. Kullanıcı siteye/uygulamaya hayatında İLK DEFA girdiğinde:
 *     - Doğrudan "Sana uygun kampanyalar için aşağıdaki kısımları seç" ekranı (#onboardingScreen) açılır.
 *     - 1. Kutu (Şehir) açıktır. Şehir seçildiği salisede otomatik 2. Kutu (Üniversite) açılır,
 *       üniversite seçilince 3. Kutu (Fakülte), fakülte seçilince 4. Kutu (Bölüm) açılır.
 *     - Bölüm seçildiği anda bilgiler hem kullanıcının cihazına (deviceId ile localStorage + Cookie + IndexedDB)
 *       hem de Firebase'e (Anonymous Auth + Firestore users/{uid}) kaydedilir ve DİREKT Kampanya Ekranı açılır.
 *  2. Kullanıcı siteye/uygulamaya sonraki girişlerinde:
 *     - Şehir/üniversite sorulmaz; doğrudan Kampanya Ekranı (#mainAppView) açılır.
 *  3. Kampanyalar doğrudan `campaigns.json` dosyasından okunur (Firebase'e sunucu yükü binmez).
 */





(function () {
  'use strict';

  const CATEGORY_ICONS = {
    'Yapay Zeka': '✨',
    Teknoloji: '💻',
    Yemek: '🍔',
    Kafe: '☕',
    Eğitim: '📚',
    Ulaşım: '🚌',
    Eğlence: '🎬',
    Sağlık: '🏥',
    Giyim: '👕',
    Kitap: '📖',
    Müzik: '🎵',
    Yazılım: '⚡',
    Spor: '⚽',
    Kültür: '🎭',
    Finans: '💳',
    Banka: '🏦',
    Alışveriş: '🛍️',
    Market: '🛒',
    default: '🎯',
  };

  const TYPE_MAP = {
    İndirim: 'indirim',
    Fırsat: 'firsat',
    Ücretsiz: 'ucretsiz',
    Hediye: 'ucretsiz',
    indirim: 'indirim',
    fırsat: 'firsat',
    ücretsiz: 'ucretsiz',
    hediye: 'ucretsiz',
  };

  const BANNER_DISMISS_KEY = 'ko_push_banner_dismissed';

  let allCampaigns = [];
  let activeCategory = 'all';
  let searchQuery = '';
  let foregroundListening = false;
  let tokenSynced = false;
  let currentViewMode = 'brands'; // 'brands' | 'flat'
  /** @type {Promise<any> | null} */
  let authInitPromise = null;
  /** @type {any} */
  let deferredInstallPrompt = null;

  const $ = (id) => document.getElementById(id);

  // Main Screen & Onboarding Screen
  const onboardingScreen = $('onboardingScreen');
  const mainAppView = $('mainAppView');
  const studentContextBar = $('studentContextBar');
  const studentContextText = $('studentContextText');

  // Progressive 4-Box Onboarding DOM elements
  const onbBoxCity = $('onbBoxCity');
  const onbBoxUni = $('onbBoxUni');
  const onbBoxFac = $('onbBoxFac');
  const onbBoxDep = $('onbBoxDep');

  const onbHeaderCity = $('onbHeaderCity');
  const onbHeaderUni = $('onbHeaderUni');
  const onbHeaderFac = $('onbHeaderFac');
  const onbHeaderDep = $('onbHeaderDep');

  const onbNumCity = $('onbNumCity');
  const onbNumUni = $('onbNumUni');
  const onbNumFac = $('onbNumFac');
  const onbNumDep = $('onbNumDep');

  const onbValCity = $('onbValCity');
  const onbValUni = $('onbValUni');
  const onbValFac = $('onbValFac');
  const onbValDep = $('onbValDep');

  const onbActionCity = $('onbActionCity');
  const onbActionUni = $('onbActionUni');
  const onbActionFac = $('onbActionFac');
  const onbActionDep = $('onbActionDep');

  const onbBodyCity = $('onbBodyCity');
  const onbBodyUni = $('onbBodyUni');
  const onbBodyFac = $('onbBodyFac');
  const onbBodyDep = $('onbBodyDep');

  const onbSearchCity = $('onbSearchCity');
  const onbSearchUni = $('onbSearchUni');
  const onbSearchFac = $('onbSearchFac');
  const onbSearchDep = $('onbSearchDep');

  const onbClearCity = $('onbClearCity');
  const onbClearUni = $('onbClearUni');
  const onbClearFac = $('onbClearFac');
  const onbClearDep = $('onbClearDep');

  const onbListCity = $('onbListCity');
  const onbListUni = $('onbListUni');
  const onbListFac = $('onbListFac');
  const onbListDep = $('onbListDep');

  // Campaigns & Layout DOM elements
  const campaignsGrid = $('campaignsGrid');
  const loadingState = $('loadingState');
  const categoryFilter = $('categoryFilter');
  const searchInput = $('searchInput');
  const campaignCount = $('campaignCount');
  const statCampaigns = $('statCampaigns');
  const statCategories = $('statCategories');
  const header = $('header');
  const navLinks = $('navLinks');
  const mobileMenuBtn = $('mobileMenuBtn');
  const backToTop = $('backToTop');
  const authArea = $('authArea');

  // Campaign Detail Modal
  const modalOverlay = $('modalOverlay');
  const modalContent = $('modalContent');
  const modalTitle = $('modalTitle');
  const modalDescription = $('modalDescription');
  const modalBadges = $('modalBadges');

  // Brand Detail Modal (Pop-up Hub)
  const brandModalOverlay = $('brandModalOverlay');
  const brandModalContent = $('brandModalContent');
  const brandModalLogoWrap = $('brandModalLogoWrap');
  const brandModalTitle = $('brandModalTitle');
  const brandModalSubtitle = $('brandModalSubtitle');
  const brandModalFilterBar = $('brandModalFilterBar');
  const brandModalCampaignsList = $('brandModalCampaignsList');
  const brandModalClose = $('brandModalClose');
  const brandModalBottomCloseBtn = $('brandModalBottomCloseBtn');

  // View Switcher Elements
  const viewModeBrands = $('viewModeBrands');
  const viewModeFlat = $('viewModeFlat');
  const campaignStatsText = $('campaignStatsText');

  // Profile Edit Modal (for manual editing later)
  const profileModal = $('authModal');
  const profileForm = $('authForm');
  const profileTitle = $('authTitle');
  const profileSubtitle = $('authSubtitle');
  const profileError = $('authError');
  const profileSuccess = $('authSuccess');
  const profileSubmitBtn = $('authSubmitBtn');
  const chkPushConsent = $('chkPushConsent');
  const pushStatusHint = $('pushStatusHint');
  const dangerZone = $('profileDangerZone');

  const wizardSteps = $('wizardSteps');
  const stepBtnCity = $('stepBtnCity');
  const stepBtnUni = $('stepBtnUni');
  const stepBtnFac = $('stepBtnFac');
  const stepBtnDep = $('stepBtnDep');
  const stepValCity = $('stepValCity');
  const stepValUni = $('stepValUni');
  const stepValFac = $('stepValFac');
  const stepValDep = $('stepValDep');
  const wizardBackBtn = $('wizardBackBtn');
  const wizardStepTitle = $('wizardStepTitle');
  const wizardStepCount = $('wizardStepCount');
  const wizardSearchInput = $('wizardSearchInput');
  const wizardSearchClear = $('wizardSearchClear');
  const wizardList = $('wizardList');
  const wizardSummaryCard = $('wizardSummaryCard');

  const pushBanner = $('pushBanner');
  const pushBannerTitle = $('pushBannerTitle');
  const pushBannerDesc = $('pushBannerDesc');
  const btnBannerEnablePush = $('btnBannerEnablePush');
  const pushToast = $('pushToast');

  // First-time Onboarding State
  const onbState = {
    step: 'city', // 'city' | 'uni' | 'fac' | 'dep'
    cityId: '',
    universityId: '',
    facultyId: '',
    departmentId: '',
    queries: { city: '', uni: '', fac: '', dep: '' },
    saving: false,
  };

  // Edit Modal Wizard State
  const wizState = {
    step: 'city',
    cityId: '',
    universityId: '',
    facultyId: '',
    departmentId: '',
    query: '',
  };

  // =====================
  // HELPERS
  // =====================
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeAssetUrl(url) {
    const s = String(url || '').trim();
    if (!s) return '';
    if (/^(https:\/\/|images\/|icons\/|\.\/)/i.test(s) && !/[\s"'<>`\\]/.test(s)) {
      return s;
    }
    return '';
  }

  function normalizeSearch(s) {
    return String(s || '')
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .toLocaleLowerCase('tr')
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u')
      .replace(/â/g, 'a')
      .replace(/î/g, 'i')
      .replace(/û/g, 'u')
      .trim();
  }

  function linkifyText(text) {
    const urlPattern = /(https?:\/\/[^\s<>"'&]+|www\.[^\s<>"'&]+)/gi;
    return text.replace(urlPattern, (url) => {
      const href = url.startsWith('http') ? url : 'https://' + url;
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`;
    });
  }

  let toastTimer;
  function showToast(title, text) {
    $('pushToastTitle').textContent = title;
    $('pushToastText').textContent = text || '';
    pushToast.hidden = false;
    requestAnimationFrame(() => pushToast.classList.add('visible'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 5000);
  }

  function hideToast() {
    pushToast.classList.remove('visible');
    setTimeout(() => (pushToast.hidden = true), 300);
  }

  $('pushToastClose')?.addEventListener('click', hideToast);

  // =========================================================
  // EKRAN YÖNETİMİ: İLK GİRİŞ (ONBOARDING) vs KAMPANYA EKRANI
  // =========================================================
  function updateStudentContextBar(profile) {
    if (!studentContextBar || !studentContextText) return;
    if (!profile) {
      studentContextBar.hidden = true;
      return;
    }
    const cName = cityName(profile.cityId);
    const uName = universityName(profile.universityId);
    const fName = facultyName(profile.facultyId);
    const dName = departmentName(profile.facultyId, profile.departmentId);
    studentContextText.textContent = `${cName} • ${uName} • ${fName} • ${dName}`;
    studentContextBar.hidden = false;
  }

  $('btnContextEditProfile')?.addEventListener('click', () => openProfileModal());

  function showOnboardingScreen() {
    document.body.classList.add('is-onboarding');
    if (header) header.hidden = true;
    mainAppView.hidden = true;
    onboardingScreen.hidden = false;
    onbState.step = 'city';
    onbState.cityId = '';
    onbState.universityId = '';
    onbState.facultyId = '';
    onbState.departmentId = '';
    onbState.queries = { city: '', uni: '', fac: '', dep: '' };
    onbState.saving = false;
    if (onbSearchCity) onbSearchCity.value = '';
    if (onbSearchUni) onbSearchUni.value = '';
    if (onbSearchFac) onbSearchFac.value = '';
    if (onbSearchDep) onbSearchDep.value = '';
    renderOnboardingBoxes();
  }

  function showMainCampaignScreen(profile) {
    document.body.classList.remove('is-onboarding');
    if (header) header.hidden = false;
    onboardingScreen.hidden = true;
    mainAppView.hidden = false;
    updateStudentContextBar(profile);
  }

  // =========================================================
  // 4 ADIMLI OTOMATİK AÇILAN İLK GİRİŞ KUTULARI (ONBOARDING BOXES)
  // =========================================================
  function setOnboardingStep(step) {
    onbState.step = step;
    renderOnboardingBoxes();

    const searchMap = {
      city: onbSearchCity,
      uni: onbSearchUni,
      fac: onbSearchFac,
      dep: onbSearchDep,
    };

    if (window.innerWidth > 768) {
      setTimeout(() => {
        searchMap[step]?.focus();
      }, 40);
    }
  }

  function renderOnboardingBoxes() {
    const hasCity = Boolean(onbState.cityId);
    const hasUni = Boolean(onbState.universityId);
    const hasFac = Boolean(onbState.facultyId);
    const hasDep = Boolean(onbState.departmentId);

    // --- KUTU 1: ŞEHİR ---
    const cityActive = onbState.step === 'city';
    onbBoxCity.className = `onb-acc-box ${cityActive ? 'active' : ''} ${hasCity && !cityActive ? 'done' : ''}`;
    onbHeaderCity.disabled = false;
    onbHeaderCity.setAttribute('aria-expanded', String(cityActive));
    onbNumCity.textContent = hasCity && !cityActive ? '✓' : '1';
    onbValCity.textContent = hasCity ? cityName(onbState.cityId) : 'Şehir';
    onbActionCity.textContent = hasCity && !cityActive ? 'Değiştir' : '';
    onbActionCity.hidden = !(hasCity && !cityActive);
    onbBodyCity.hidden = !cityActive;
    if (cityActive) renderOnbStepList('city');

    // --- KUTU 2: ÜNİVERSİTE ---
    const uniActive = onbState.step === 'uni';
    const uniLocked = !hasCity;
    onbBoxUni.className = `onb-acc-box ${uniActive ? 'active' : ''} ${hasUni && !uniActive ? 'done' : ''} ${uniLocked ? 'locked' : ''}`;
    onbHeaderUni.disabled = uniLocked;
    onbHeaderUni.setAttribute('aria-expanded', String(uniActive));
    onbNumUni.textContent = hasUni && !uniActive ? '✓' : '2';
    onbValUni.textContent = hasUni ? universityName(onbState.universityId) : 'Üniversite';
    onbActionUni.textContent = hasUni && !uniActive ? 'Değiştir' : '';
    onbActionUni.hidden = !(hasUni && !uniActive);
    onbBodyUni.hidden = !uniActive;
    if (uniActive) {
      onbSearchUni.placeholder = 'Üniversite ara...';
      renderOnbStepList('uni');
    }

    // --- KUTU 3: FAKÜLTE / MYO ---
    const facActive = onbState.step === 'fac';
    const facLocked = !hasUni;
    onbBoxFac.className = `onb-acc-box ${facActive ? 'active' : ''} ${hasFac && !facActive ? 'done' : ''} ${facLocked ? 'locked' : ''}`;
    onbHeaderFac.disabled = facLocked;
    onbHeaderFac.setAttribute('aria-expanded', String(facActive));
    onbNumFac.textContent = hasFac && !facActive ? '✓' : '3';
    onbValFac.textContent = hasFac ? facultyName(onbState.facultyId) : 'Fakülte / Yüksekokul';
    onbActionFac.textContent = hasFac && !facActive ? 'Değiştir' : '';
    onbActionFac.hidden = !(hasFac && !facActive);
    onbBodyFac.hidden = !facActive;
    if (facActive) renderOnbStepList('fac');

    // --- KUTU 4: BÖLÜM ---
    const depActive = onbState.step === 'dep';
    const depLocked = !hasFac;
    onbBoxDep.className = `onb-acc-box ${depActive ? 'active' : ''} ${hasDep && !depActive ? 'done' : ''} ${depLocked ? 'locked' : ''}`;
    onbHeaderDep.disabled = depLocked;
    onbHeaderDep.setAttribute('aria-expanded', String(depActive));
    onbNumDep.textContent = hasDep && !depActive ? '✓' : '4';
    onbValDep.textContent = hasDep ? departmentName(onbState.facultyId, onbState.departmentId) : 'Bölüm';
    onbActionDep.textContent = hasDep && !depActive ? 'Değiştir' : '';
    onbActionDep.hidden = !(hasDep && !depActive);
    onbBodyDep.hidden = !depActive;
    if (depActive) renderOnbStepList('dep');
  }

  function renderOnbStepList(step) {
    const q = normalizeSearch(onbState.queries[step] || '');
    let items = [];
    let listEl = null;

    if (step === 'city') {
      listEl = onbListCity;
      items = getCities().map((c) => ({
        id: c.id,
        title: c.name,
        selected: c.id === onbState.cityId,
      }));
    } else if (step === 'uni') {
      listEl = onbListUni;
      items = getUniversitiesByCity(onbState.cityId).map((u) => ({
        id: u.id,
        title: u.name,
        selected: u.id === onbState.universityId,
      }));
    } else if (step === 'fac') {
      listEl = onbListFac;
      items = getFacultiesByUniversity(onbState.universityId).map((f) => ({
        id: f.id,
        title: f.name,
        selected: f.id === onbState.facultyId,
      }));
    } else if (step === 'dep') {
      listEl = onbListDep;
      items = getDepartmentsByUniversityFaculty(onbState.universityId, onbState.facultyId).map((d) => ({
        id: d.id,
        title: d.name,
        selected: d.id === onbState.departmentId,
      }));
    }

    if (!listEl) return;

    const filtered = q
      ? items.filter((item) => normalizeSearch(item.title).includes(q))
      : items;

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="wizard-empty">
          <span>Sonuç bulunamadı</span>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered
      .map(
        (item) => `
        <button type="button" class="wizard-option ${item.selected ? 'selected' : ''}" data-step="${step}" data-id="${escapeHtml(item.id)}" role="option" aria-selected="${item.selected}">
          <span class="wizard-option-title">${escapeHtml(item.title)}</span>
          <span class="wizard-option-arrow">›</span>
        </button>
      `
      )
      .join('');
    listEl.scrollTop = 0;
  }

  async function onSelectOnboardingItem(step, id) {
    if (!id || onbState.saving) return;

    if (step === 'city') {
      onbState.cityId = id;
      onbState.universityId = '';
      onbState.facultyId = '';
      onbState.departmentId = '';
      onbState.queries.uni = '';
      if (onbSearchUni) onbSearchUni.value = '';
      if (onbClearUni) onbClearUni.hidden = true;
      setOnboardingStep('uni');
    } else if (step === 'uni') {
      onbState.universityId = id;
      onbState.facultyId = '';
      onbState.departmentId = '';
      onbState.queries.fac = '';
      if (onbSearchFac) onbSearchFac.value = '';
      if (onbClearFac) onbClearFac.hidden = true;

      if (id === OTHER_ID) {
        onbState.facultyId = OTHER_ID;
        onbState.departmentId = OTHER_ID;
        await finalizeFirstTimeOnboarding();
      } else {
        setOnboardingStep('fac');
      }
    } else if (step === 'fac') {
      onbState.facultyId = id;
      onbState.departmentId = '';
      onbState.queries.dep = '';
      if (onbSearchDep) onbSearchDep.value = '';
      if (onbClearDep) onbClearDep.hidden = true;

      if (id === OTHER_ID) {
        onbState.departmentId = OTHER_ID;
        await finalizeFirstTimeOnboarding();
      } else {
        setOnboardingStep('dep');
      }
    } else if (step === 'dep') {
      onbState.departmentId = id;
      await finalizeFirstTimeOnboarding();
    }
  }

  async function finalizeFirstTimeOnboarding() {
    if (onbState.saving) return;
    onbState.saving = true;
    renderOnboardingBoxes();

    const selection = {
      cityId: onbState.cityId,
      universityId: onbState.universityId,
      facultyId: onbState.facultyId,
      departmentId: onbState.departmentId,
    };

    try {
      // saveProfile anında cihazın yerel deposuna (localStorage + Cookie + IndexedDB) yazar
      // ve arka planda Firebase Anonymous Auth + Firestore users/{uid} belgesine kaydeder.
      const savedPromise = saveProfile(selection);
      const localProfile = getCurrentProfile();

      // Hiç bekletmeden direkt Kampanya Ekranını aç ve campaigns.json'dan kampanyaları yükle!
      showMainCampaignScreen(localProfile);
      loadCampaigns();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast('🎉 Hoş geldin!', 'Bilgilerin cihazına kaydedildi. Sana uygun kampanyalar hazır!');

      await savedPromise;
      const finalProfile = getCurrentProfile();
      updateStudentContextBar(finalProfile);
      renderAuthArea(getCurrentUser(), finalProfile, isAdmin());
      updatePushBanner(finalProfile);
    } catch (err) {
      console.error('Onboarding kayıt hatası:', err);
      showToast('Uyarı', mapAuthError(err));
    } finally {
      onbState.saving = false;
    }
  }

  // Onboarding Box Header Clicks (to re-open a previous box)
  [
    [onbHeaderCity, 'city'],
    [onbHeaderUni, 'uni'],
    [onbHeaderFac, 'fac'],
    [onbHeaderDep, 'dep'],
  ].forEach(([hdr, step]) => {
    hdr?.addEventListener('click', () => {
      if (hdr.disabled) return;
      setOnboardingStep(step);
    });
  });

  // Onboarding List Clicks
  $('onbBoxes')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.wizard-option[data-step]');
    if (!btn) return;
    const step = btn.getAttribute('data-step');
    const id = btn.getAttribute('data-id');
    onSelectOnboardingItem(step, id);
  });

  // Onboarding Search Inputs & Clear Buttons
  [
    ['city', onbSearchCity, onbClearCity, onbListCity],
    ['uni', onbSearchUni, onbClearUni, onbListUni],
    ['fac', onbSearchFac, onbClearFac, onbListFac],
    ['dep', onbSearchDep, onbClearDep, onbListDep],
  ].forEach(([step, inputEl, clearEl, listEl]) => {
    inputEl?.addEventListener('input', () => {
      onbState.queries[step] = inputEl.value;
      if (clearEl) clearEl.hidden = !inputEl.value;
      renderOnbStepList(step);
    });
    inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const firstBtn = listEl?.querySelector('.wizard-option');
        if (firstBtn) onSelectOnboardingItem(step, firstBtn.getAttribute('data-id'));
      }
    });
    clearEl?.addEventListener('click', () => {
      onbState.queries[step] = '';
      if (inputEl) inputEl.value = '';
      clearEl.hidden = true;
      renderOnbStepList(step);
      inputEl?.focus();
    });
  });

  // =====================
  // HEADER / AUTH AREA
  // =====================
  function renderAuthArea(user, profile, admin) {
    if (!authArea) return;

    if (!profile) {
      authArea.innerHTML = '';
      return;
    }

    const installBtn = deferredInstallPrompt
      ? `<button type="button" class="btn btn-outline btn-sm" id="btnInstallPwa" title="Uygulamayı ana ekrana ekle">📲 Yükle</button>`
      : '';
    const uni = universityShortName(profile.universityId);
    const dep = departmentName(profile.facultyId, profile.departmentId);
    const bell = profile.pushEnabled ? '🔔' : '🔕';
    const bellTitle = profile.pushEnabled ? 'Bildirimler açık — kapatmak için tıkla' : 'Bildirimleri aç';
    authArea.innerHTML = `
      <div class="user-chip" title="${escapeHtml(cityName(profile.cityId))} • ${escapeHtml(universityName(profile.universityId))}">
        <span class="user-chip-name">${escapeHtml(uni)}</span>
        <span class="user-chip-uni">${escapeHtml(dep)}</span>
      </div>
      ${installBtn}
      <button type="button" class="btn btn-outline btn-sm icon-btn" id="btnTogglePush" title="${bellTitle}" aria-label="${bellTitle}">${bell}</button>
      <button type="button" class="btn btn-outline btn-sm" id="btnOpenProfile">Profilim</button>
    `;
    $('btnTogglePush')?.addEventListener('click', onTogglePush);

    $('btnOpenProfile')?.addEventListener('click', () => openProfileModal());
    $('btnInstallPwa')?.addEventListener('click', onInstallClick);
  }

  // =====================
  // PROFİL DÜZENLEME MODALI (Kullanıcı daha sonra "Profilim / Değiştir"e tıklarsa)
  // =====================
  function openProfileModal(opts = {}) {
    const profile = getCurrentProfile();
    const editing = Boolean(profile);

    clearProfileMessages();
    profileTitle.textContent = editing ? 'Profilim & Akademik Bilgilerim' : 'Üniversiteni Seç';
    profileSubtitle.textContent = editing
      ? 'Yukarıdaki adımlara tıklayarak şehir, üniversite, fakülte veya bölümünü değiştirebilirsin.'
      : 'Sırasıyla şehir, üniversite, fakülte ve bölümünü seçerek kampanyaları hemen keşfet.';
    profileSubmitBtn.textContent = editing ? 'Değişiklikleri Kaydet' : '🚀 Kaydet ve Kampanyaları Gör';
    dangerZone.hidden = !editing;

    if (opts.initialCityId) {
      wizState.cityId = opts.initialCityId;
      wizState.universityId = '';
      wizState.facultyId = '';
      wizState.departmentId = '';
      wizState.step = 'uni';
    } else if (profile) {
      wizState.cityId = profile.cityId || '';
      wizState.universityId = profile.universityId || '';
      wizState.facultyId = profile.facultyId || '';
      wizState.departmentId = profile.departmentId || '';
      wizState.step = 'dep';
    } else {
      wizState.cityId = '';
      wizState.universityId = '';
      wizState.facultyId = '';
      wizState.departmentId = '';
      wizState.step = 'city';
    }

    wizState.query = '';
    wizardSearchInput.value = '';
    wizardSearchClear.hidden = true;

    syncPushConsentUI(profile);
    renderWizard();

    profileModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeProfileModal() {
    profileModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function setWizardStep(step) {
    wizState.step = step;
    wizState.query = '';
    if (wizardSearchInput) wizardSearchInput.value = '';
    if (wizardSearchClear) wizardSearchClear.hidden = true;
    renderWizard(true);
    if (window.innerWidth > 768) {
      setTimeout(() => wizardSearchInput?.focus(), 60);
    }
  }

  function renderWizard(animate = false) {
    stepValCity.textContent = wizState.cityId ? cityName(wizState.cityId) : 'Seçiniz';
    stepValUni.textContent = wizState.universityId
      ? universityShortName(wizState.universityId)
      : wizState.cityId
        ? 'Seçiniz'
        : 'Önce şehir';
    stepValFac.textContent = wizState.facultyId
      ? facultyName(wizState.facultyId)
      : wizState.universityId
        ? 'Seçiniz'
        : 'Önce üniversite';
    stepValDep.textContent = wizState.departmentId
      ? departmentName(wizState.facultyId, wizState.departmentId)
      : wizState.facultyId
        ? 'Seçiniz'
        : 'Önce fakülte';

    stepBtnUni.disabled = !wizState.cityId;
    stepBtnFac.disabled = !wizState.universityId;
    stepBtnDep.disabled = !wizState.facultyId;

    [
      [stepBtnCity, 'city', Boolean(wizState.cityId)],
      [stepBtnUni, 'uni', Boolean(wizState.universityId)],
      [stepBtnFac, 'fac', Boolean(wizState.facultyId)],
      [stepBtnDep, 'dep', Boolean(wizState.departmentId)],
    ].forEach(([btn, key, done]) => {
      btn.classList.toggle('active', wizState.step === key);
      btn.classList.toggle('done', done && wizState.step !== key);
    });

    const stepOrder = ['city', 'uni', 'fac', 'dep'];
    const currentIdx = stepOrder.indexOf(wizState.step);
    wizardBackBtn.hidden = currentIdx <= 0;

    if (wizState.step === 'city') {
      wizardStepTitle.textContent = '📍 1. Hangi şehirde okuyorsun?';
      wizardSearchInput.placeholder = 'Şehir ara... (örn: İstanbul, Ankara, İzmir, Kayseri)';
    } else if (wizState.step === 'uni') {
      wizardStepTitle.textContent = `🏛️ 2. ${cityName(wizState.cityId)} — Üniversiteni Seç`;
      wizardSearchInput.placeholder = `${cityName(wizState.cityId)} içindeki üniversitelerde ara...`;
    } else if (wizState.step === 'fac') {
      wizardStepTitle.textContent = `🎓 3. ${universityShortName(wizState.universityId)} — Fakülte / MYO Seç`;
      wizardSearchInput.placeholder = 'Fakülte veya Meslek Yüksekokulu ara...';
    } else {
      wizardStepTitle.textContent = `📚 4. ${facultyName(wizState.facultyId)} — Bölümünü Seç`;
      wizardSearchInput.placeholder = 'Bölüm ara... (örn: Bilgisayar, Hukuk, İşletme)';
    }

    renderWizardItems(animate);
    renderCompletionPanel();
  }

  function renderWizardItems(animate = false) {
    const q = normalizeSearch(wizState.query);
    let items = [];
    let isCityGrid = false;

    if (wizState.step === 'city') {
      isCityGrid = true;
      items = getCities().map((c) => ({
        id: c.id,
        title: c.name,
        badge: c.popular ? `🔥 ${c.uniCount} Üni` : `${c.uniCount} Üni`,
        badgeClass: c.popular ? 'badge-devlet' : 'badge-count',
        selected: c.id === wizState.cityId,
      }));
    } else if (wizState.step === 'uni') {
      items = getUniversitiesByCity(wizState.cityId).map((u) => ({
        id: u.id,
        title: u.name,
        sub: u.id === OTHER_ID ? 'Listede olmayan üniversite' : `${u.facultyCount} Fakülte / MYO`,
        badge: u.type,
        badgeClass: u.type === 'Vakıf' ? 'badge-vakif' : u.type === 'Devlet' ? 'badge-devlet' : 'badge-count',
        selected: u.id === wizState.universityId,
      }));
    } else if (wizState.step === 'fac') {
      items = getFacultiesByUniversity(wizState.universityId).map((f) => ({
        id: f.id,
        title: f.name,
        badge: f.id === OTHER_ID ? 'Diğer' : `${f.departmentCount} Bölüm`,
        badgeClass: 'badge-count',
        selected: f.id === wizState.facultyId,
      }));
    } else if (wizState.step === 'dep') {
      items = getDepartmentsByUniversityFaculty(wizState.universityId, wizState.facultyId).map((d) => ({
        id: d.id,
        title: d.name,
        badge: d.id === OTHER_ID ? 'Diğer' : 'Seç →',
        badgeClass: 'badge-count',
        selected: d.id === wizState.departmentId,
      }));
    }

    const filtered = q
      ? items.filter((item) => normalizeSearch(item.title).includes(q))
      : items;

    wizardStepCount.textContent = `${filtered.length} seçenek`;
    wizardList.className = `wizard-list ${isCityGrid ? 'is-city-grid' : 'is-item-grid'}`;

    if (animate) {
      wizardList.classList.remove('step-anim');
      void wizardList.offsetWidth;
      wizardList.classList.add('step-anim');
    }

    if (filtered.length === 0) {
      wizardList.innerHTML = `
        <div class="wizard-empty">
          <span>🔍 "${escapeHtml(wizState.query)}" için sonuç bulunamadı.</span>
        </div>
      `;
      return;
    }

    wizardList.innerHTML = filtered
      .map(
        (item) => `
        <button type="button" class="wizard-option ${item.selected ? 'selected' : ''}" data-id="${escapeHtml(item.id)}" role="option" aria-selected="${item.selected}">
          <div class="wizard-option-main">
            <span class="wizard-option-title">${escapeHtml(item.title)}</span>
            ${item.sub ? `<span class="wizard-option-sub">${escapeHtml(item.sub)}</span>` : ''}
          </div>
          <span class="wizard-option-badge ${item.badgeClass || ''}">${escapeHtml(item.badge || '')}</span>
        </button>
      `
      )
      .join('');

    wizardList.scrollTop = 0;
  }

  function renderCompletionPanel() {
    const complete = Boolean(
      wizState.cityId && wizState.universityId && wizState.facultyId && wizState.departmentId
    );
    profileForm.hidden = !complete;
    if (!complete) return;

    wizardSummaryCard.innerHTML = `
      <div class="wizard-summary-header">
        <span class="wizard-summary-badge">✅ Seçimin Hazır</span>
        <button type="button" class="wizard-edit-btn" id="btnResetWizardStep">Baştan Seç</button>
      </div>
      <div class="wizard-summary-grid">
        <div class="wizard-summary-item">
          <span class="wizard-summary-label">📍 Şehir</span>
          <strong class="wizard-summary-val">${escapeHtml(cityName(wizState.cityId))}</strong>
        </div>
        <div class="wizard-summary-item">
          <span class="wizard-summary-label">🏛️ Üniversite</span>
          <strong class="wizard-summary-val">${escapeHtml(universityName(wizState.universityId))}</strong>
        </div>
        <div class="wizard-summary-item">
          <span class="wizard-summary-label">🎓 Fakülte / MYO</span>
          <strong class="wizard-summary-val">${escapeHtml(facultyName(wizState.facultyId))}</strong>
        </div>
        <div class="wizard-summary-item">
          <span class="wizard-summary-label">📚 Bölüm</span>
          <strong class="wizard-summary-val">${escapeHtml(departmentName(wizState.facultyId, wizState.departmentId))}</strong>
        </div>
      </div>
    `;
    $('btnResetWizardStep')?.addEventListener('click', () => setWizardStep('city'));
  }

  function onSelectOption(id) {
    if (!id) return;
    clearProfileMessages();

    if (wizState.step === 'city') {
      if (wizState.cityId !== id) {
        wizState.cityId = id;
        wizState.universityId = '';
        wizState.facultyId = '';
        wizState.departmentId = '';
      }
      setWizardStep('uni');
    } else if (wizState.step === 'uni') {
      if (wizState.universityId !== id) {
        wizState.universityId = id;
        wizState.facultyId = '';
        wizState.departmentId = '';
      }
      if (id === OTHER_ID) {
        wizState.facultyId = OTHER_ID;
        wizState.departmentId = OTHER_ID;
        renderWizard(true);
        scrollToCompletion();
      } else {
        setWizardStep('fac');
      }
    } else if (wizState.step === 'fac') {
      if (wizState.facultyId !== id) {
        wizState.facultyId = id;
        wizState.departmentId = '';
      }
      if (id === OTHER_ID) {
        wizState.departmentId = OTHER_ID;
        renderWizard(true);
        scrollToCompletion();
      } else {
        setWizardStep('dep');
      }
    } else if (wizState.step === 'dep') {
      wizState.departmentId = id;
      renderWizard(false);
      scrollToCompletion();
    }
  }

  function scrollToCompletion() {
    setTimeout(() => {
      profileForm?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
  }

  wizardList?.addEventListener('click', (e) => {
    const btn = e.target.closest('.wizard-option');
    if (!btn) return;
    onSelectOption(btn.getAttribute('data-id'));
  });

  wizardSteps?.addEventListener('click', (e) => {
    const btn = e.target.closest('.wizard-step');
    if (!btn || btn.disabled) return;
    setWizardStep(btn.getAttribute('data-step'));
  });

  wizardBackBtn?.addEventListener('click', () => {
    const stepOrder = ['city', 'uni', 'fac', 'dep'];
    const idx = stepOrder.indexOf(wizState.step);
    if (idx > 0) setWizardStep(stepOrder[idx - 1]);
  });

  wizardSearchInput?.addEventListener('input', () => {
    wizState.query = wizardSearchInput.value;
    wizardSearchClear.hidden = !wizState.query;
    renderWizardItems(false);
  });

  wizardSearchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const firstOption = wizardList.querySelector('.wizard-option');
      if (firstOption) onSelectOption(firstOption.getAttribute('data-id'));
    }
  });

  wizardSearchClear?.addEventListener('click', () => {
    wizState.query = '';
    wizardSearchInput.value = '';
    wizardSearchClear.hidden = true;
    renderWizardItems(false);
    wizardSearchInput.focus();
  });

  function syncPushConsentUI(profile) {
    const enabled = Boolean(profile?.pushEnabled);
    const reason = pushUnavailableReason();
    chkPushConsent.checked = enabled;
    chkPushConsent.disabled = !enabled && Boolean(reason);
    pushStatusHint.textContent = enabled
      ? 'Bildirimler açık. İşareti kaldırıp kaydedersen kapatılır ve bildirim anahtarın silinir.'
      : reason || 'İstediğin zaman kapatabilirsin. Bildirim almadan da tüm kampanyaları görebilirsin.';
    pushStatusHint.classList.toggle('visible', true);
    pushStatusHint.classList.toggle('error', !enabled && Boolean(reason));
  }

  function clearProfileMessages() {
    profileError.hidden = true;
    profileSuccess.hidden = true;
    profileError.textContent = '';
    profileSuccess.textContent = '';
  }

  function showProfileError(msg) {
    profileSuccess.hidden = true;
    profileError.hidden = false;
    profileError.textContent = msg;
  }

  function showProfileSuccess(msg) {
    profileError.hidden = true;
    profileSuccess.hidden = false;
    profileSuccess.textContent = msg;
  }

  $('authCloseBtn')?.addEventListener('click', closeProfileModal);
  profileModal?.addEventListener('click', (e) => {
    if (e.target === profileModal) closeProfileModal();
  });

  profileForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearProfileMessages();

    const selection = {
      cityId: wizState.cityId,
      universityId: wizState.universityId,
      facultyId: wizState.facultyId,
      departmentId: wizState.departmentId,
    };
    if (!selection.cityId || !selection.universityId || !selection.facultyId || !selection.departmentId) {
      showProfileError('Lütfen şehir, üniversite, fakülte ve bölüm seçimlerinin hepsini tamamla.');
      return;
    }

    const hadPush = Boolean(getCurrentProfile()?.pushEnabled);
    const wantPush = chkPushConsent.checked && !chkPushConsent.disabled;
    const permissionPromise = wantPush && !hadPush ? requestPermission() : null;

    profileSubmitBtn.disabled = true;
    const prevText = profileSubmitBtn.textContent;
    profileSubmitBtn.textContent = 'Kaydediliyor...';

    try {
      const profile = await saveProfile(selection);
      let pushMsg = '';

      if (profile && wantPush && !hadPush) {
        try {
          await enablePush(profile.uid, permissionPromise);
          pushMsg = ' Bildirimler açıldı 🔔';
        } catch (err) {
          pushMsg = ` Bildirimler açılamadı: ${err.message || err}`;
        }
      } else if (profile && !wantPush && hadPush) {
        await disablePush(profile.uid);
        pushMsg = ' Bildirimler kapatıldı.';
      }

      await reloadProfile();
      const updated = getCurrentProfile();
      showMainCampaignScreen(updated);
      loadCampaigns();
      const failed = pushMsg.includes('açılamadı');
      showProfileSuccess(`Bilgilerin güncellendi!${pushMsg}`);
      if (!failed) setTimeout(closeProfileModal, 600);
      else syncPushConsentUI(updated);
    } catch (err) {
      console.error(err);
      showProfileError(mapAuthError(err));
    } finally {
      profileSubmitBtn.disabled = false;
      profileSubmitBtn.textContent = prevText;
    }
  });

  $('btnDeleteMyData')?.addEventListener('click', async () => {
    const ok = confirm(
      'Cihazındaki ve sunucudaki profil kaydın (şehir, üniversite, fakülte, bölüm) ve bildirim anahtarın kalıcı olarak silinecek. Emin misin?'
    );
    if (!ok) return;

    const btn = $('btnDeleteMyData');
    btn.disabled = true;
    try {
      if (getCurrentProfile()?.pushEnabled) await disablePush(null);
      await deleteMyData();
      sessionStorage.clear();
      localStorage.removeItem(BANNER_DISMISS_KEY);
      closeProfileModal();
      showOnboardingScreen();
      showToast('Verilerin silindi', 'Tüm kayıtların kaldırıldı.');
    } catch (err) {
      console.error(err);
      showProfileError('Silme başarısız: ' + mapAuthError(err));
    } finally {
      btn.disabled = false;
    }
  });

  // =====================
  // PUSH (header bell + banner)
  // =====================
  async function turnOnPush() {
    const profile = getCurrentProfile();
    if (!profile) return;
    const reason = pushUnavailableReason();
    if (reason) {
      showToast('Bildirim açılamadı', reason);
      return;
    }
    const permissionPromise = requestPermission();
    try {
      await enablePush(profile.uid, permissionPromise);
      await reloadProfile();
      showToast('Bildirimler açıldı 🔔', 'Yeni kampanyalardan haberdar olacaksın. İstediğin an kapatabilirsin.');
      startForegroundListener();
    } catch (err) {
      showToast('Bildirim açılamadı', err.message || String(err));
    }
  }

  async function onTogglePush() {
    const profile = getCurrentProfile();
    if (!profile) return;
    if (profile.pushEnabled) {
      if (!confirm('Bildirimleri kapatmak istiyor musun? Bildirim anahtarın silinecek.')) return;
      try {
        await disablePush(profile.uid);
        await reloadProfile();
        showToast('Bildirimler kapatıldı', 'Artık bildirim almayacaksın.');
      } catch (err) {
        showToast('Hata', mapAuthError(err));
      }
    } else {
      await turnOnPush();
    }
  }

  function updatePushBanner(profile) {
    if (!pushBanner) return;
    const dismissed = localStorage.getItem(BANNER_DISMISS_KEY) === '1';
    if (!profile || profile.pushEnabled || dismissed) {
      pushBanner.hidden = true;
      return;
    }

    const reason = pushUnavailableReason();
    if (isIOS() && !isStandalone()) {
      pushBannerTitle.textContent = 'iPhone’da bildirim almak ister misin?';
      pushBannerDesc.textContent =
        'Safari’de Paylaş (⬆︎) → “Ana Ekrana Ekle” ile uygulamayı yükle, sonra uygulamadan açıp bildirimleri aç.';
      btnBannerEnablePush.hidden = true;
      pushBanner.hidden = false;
      return;
    }
    if (reason) {
      pushBanner.hidden = true;
      return;
    }
    pushBannerTitle.textContent = 'Yeni kampanyalardan anında haberdar ol!';
    pushBannerDesc.textContent =
      'İsteğe bağlı bildirimleri açarak şehrine ve üniversitene özel fırsatları kaçırma. İstediğin an kapatabilirsin.';
    btnBannerEnablePush.hidden = false;
    pushBanner.hidden = false;
  }

  btnBannerEnablePush?.addEventListener('click', turnOnPush);
  $('btnBannerDismissPush')?.addEventListener('click', () => {
    localStorage.setItem(BANNER_DISMISS_KEY, '1');
    pushBanner.hidden = true;
  });

  function startForegroundListener() {
    if (foregroundListening) return;
    foregroundListening = true;
    listenForegroundMessages(({ title, body }) => showToast(title, body));
  }

  // =====================
  // PWA INSTALL
  // =====================
  window.addEventListener('beforeinstallprompt', (e) => {
    deferredInstallPrompt = e;
    renderAuthArea(getCurrentUser(), getCurrentProfile(), isAdmin());
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    renderAuthArea(getCurrentUser(), getCurrentProfile(), isAdmin());
  });

  async function onInstallClick() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    try {
      await deferredInstallPrompt.userChoice;
    } finally {
      deferredInstallPrompt = null;
      renderAuthArea(getCurrentUser(), getCurrentProfile(), isAdmin());
    }
  }

  // =====================
  // CAMPAIGNS (campaigns.json)
  // =====================
  async function loadCampaigns() {
    const profile = getCurrentProfile();
    if (!profile) {
      showOnboardingScreen();
      return;
    }

    showMainCampaignScreen(profile);

    campaignsGrid.innerHTML = '';
    if (loadingState) {
      campaignsGrid.appendChild(loadingState);
      loadingState.style.display = 'flex';
    }

    try {
      allCampaigns = await fetchActiveCampaigns(profile);
      if (allCampaigns.length === 0) {
        showEmptyState('Henüz aktif kampanya bulunamadı.');
        updateStats();
        return;
      }
      buildCategoryButtons();
      renderCampaigns();
      updateStats();
    } catch (error) {
      console.error('Kampanyalar yüklenirken hata:', error);
      showErrorState();
    }
  }

  function buildCategoryButtons() {
    // Collect all distinct categories from category and tags
    const catSet = new Set();
    allCampaigns.forEach((c) => {
      if (c.category) catSet.add(c.category);
      if (Array.isArray(c.tags)) {
        c.tags.forEach((t) => t && catSet.add(t));
      }
    });
    const categories = Array.from(catSet);

    categoryFilter.querySelectorAll('.category-btn:not([data-category="all"])').forEach((btn) => btn.remove());

    const allBtn = categoryFilter.querySelector('.category-btn[data-category="all"]');
    if (allBtn) {
      allBtn.innerHTML = `✨ Tümü <span class="category-count">${allCampaigns.length}</span>`;
    }

    categories.forEach((cat) => {
      const icon = CATEGORY_ICONS[cat] || CATEGORY_ICONS.default;
      const count = allCampaigns.filter(
        (c) => c.category === cat || (Array.isArray(c.tags) && c.tags.includes(cat))
      ).length;
      const btn = document.createElement('button');
      btn.className = 'category-btn';
      btn.dataset.category = cat;
      btn.innerHTML = `${icon} ${escapeHtml(cat)} <span class="category-count">${count}</span>`;
      if (cat === activeCategory) btn.classList.add('active');
      categoryFilter.appendChild(btn);
    });

    if (activeCategory !== 'all' && !categories.includes(activeCategory)) {
      activeCategory = 'all';
    }
    categoryFilter.querySelectorAll('.category-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.category === activeCategory);
    });

    if (statCategories) statCategories.textContent = String(categories.length || 0);
  }

  categoryFilter?.addEventListener('click', (e) => {
    const btn = e.target.closest('.category-btn');
    if (!btn) return;
    categoryFilter.querySelector('.category-btn.active')?.classList.remove('active');
    btn.classList.add('active');
    activeCategory = btn.dataset.category;
    if (getCurrentProfile()) renderCampaigns();
  });

  // View Mode Switcher
  viewModeBrands?.addEventListener('click', () => {
    if (currentViewMode === 'brands') return;
    currentViewMode = 'brands';
    viewModeBrands.classList.add('active');
    viewModeFlat?.classList.remove('active');
    renderCampaigns();
  });

  viewModeFlat?.addEventListener('click', () => {
    if (currentViewMode === 'flat') return;
    currentViewMode = 'flat';
    viewModeFlat.classList.add('active');
    viewModeBrands?.classList.remove('active');
    renderCampaigns();
  });

  function renderCampaigns() {
    let filtered = [...allCampaigns];

    if (activeCategory !== 'all') {
      filtered = filtered.filter(
        (c) => c.category === activeCategory || (Array.isArray(c.tags) && c.tags.includes(activeCategory))
      );
    }

    if (searchQuery) {
      const q = searchQuery.toLocaleLowerCase('tr');
      filtered = filtered.filter((c) => {
        const matchTitle = (c.title || '').toLocaleLowerCase('tr').includes(q);
        const matchDesc = (c.description || '').toLocaleLowerCase('tr').includes(q);
        const matchBrand = (c.brand || '').toLocaleLowerCase('tr').includes(q);
        const matchCat = (c.category || '').toLocaleLowerCase('tr').includes(q);
        const matchType = (c.type || '').toLocaleLowerCase('tr').includes(q);
        const matchTags = Array.isArray(c.tags) && c.tags.some((t) => t.toLocaleLowerCase('tr').includes(q));
        return matchTitle || matchDesc || matchBrand || matchCat || matchType || matchTags;
      });
    }

    if (loadingState) loadingState.style.display = 'none';
    campaignsGrid.innerHTML = '';

    if (filtered.length === 0) {
      showEmptyState(
        searchQuery ? `"${searchQuery}" için sonuç bulunamadı.` : 'Bu kategoride kampanya bulunamadı.'
      );
      updateCount(0);
      return;
    }

    updateCount(filtered.length);

    if (currentViewMode === 'brands') {
      renderBrandCards(filtered);
    } else {
      filtered.forEach((campaign, index) => {
        campaignsGrid.appendChild(createCampaignCard(campaign, index));
      });
    }
  }

  // =====================
  // BRAND HUB CARDS (Markalara Göre Görünüm)
  // =====================
  function renderBrandCards(filteredCampaigns) {
    const brandMap = new Map();
    filteredCampaigns.forEach((c) => {
      const brandKey = (c.brand || c.category || 'Genel').trim();
      if (!brandMap.has(brandKey)) {
        brandMap.set(brandKey, []);
      }
      brandMap.get(brandKey).push(c);
    });

    let index = 0;
    brandMap.forEach((brandCampaigns, brandName) => {
      const flagship = brandCampaigns.find((c) => c.featured) || brandCampaigns[0];
      const card = createBrandHubCard(brandName, brandCampaigns, flagship, index++);
      campaignsGrid.appendChild(card);
    });
  }

  function createBrandHubCard(brandName, brandCampaigns, flagship, index) {
    const card = document.createElement('div');
    card.className = 'brand-card';
    card.style.animationDelay = `${index * 0.05}s`;

    const safeLogo = sanitizeAssetUrl(flagship.logo || brandCampaigns.find((c) => c.logo)?.logo);
    const safeHeroBanner = sanitizeAssetUrl(flagship.image || brandCampaigns.find((c) => c.image)?.image);

    const brandTags = new Set();
    brandCampaigns.forEach((c) => {
      if (c.category) brandTags.add(c.category);
      if (Array.isArray(c.tags)) {
        c.tags.forEach((t) => t && brandTags.add(t));
      }
    });

    const otherCount = brandCampaigns.length - 1;

    card.innerHTML = `
      <div class="brand-card-top">
        <div class="brand-card-identity">
          ${
            safeLogo
              ? `<div class="brand-card-logo-wrap"><img src="${escapeHtml(safeLogo)}" alt="${escapeHtml(brandName)}" loading="lazy" /></div>`
              : `<div class="brand-card-logo-wrap"><span style="font-size: 20px;">🏦</span></div>`
          }
          <div>
            <h3 class="brand-card-name">${escapeHtml(brandName)}</h3>
          </div>
        </div>
        <span class="brand-card-badge">🔥 ${brandCampaigns.length} Fırsat</span>
      </div>

      <div class="brand-tags-row">
        ${Array.from(brandTags)
          .slice(0, 4)
          .map((t) => `<span class="brand-tag-chip">${CATEGORY_ICONS[t] || '🏷️'} ${escapeHtml(t)}</span>`)
          .join('')}
      </div>

      <div class="brand-hero-preview">
        ${
          safeHeroBanner
            ? `<div class="brand-hero-img-wrap">
                <img src="${escapeHtml(safeHeroBanner)}" alt="${escapeHtml(flagship.title)}" loading="lazy" />
                <span class="brand-hero-badge">👑 EN GÖZDE FIRSAT</span>
              </div>`
            : `<span class="brand-hero-badge" style="position: static; display: inline-block; margin-bottom: 8px;">👑 EN GÖZDE FIRSAT</span>`
        }
        <h4 class="brand-hero-title">${escapeHtml(flagship.title)}</h4>
        <p class="brand-hero-desc">${escapeHtml(flagship.description || '')}</p>
      </div>

      <div class="brand-card-footer">
        <span class="brand-other-hint">${otherCount > 0 ? `+${otherCount} fırsat daha` : 'Tek fırsat'}</span>
        <button type="button" class="brand-card-cta">
          Tüm Fırsatları Gör (${brandCampaigns.length}) ➔
        </button>
      </div>
    `;

    card.querySelectorAll('img').forEach((imgEl) => {
      imgEl.addEventListener('error', () => {
        const wrap = imgEl.closest('.brand-hero-img-wrap, .brand-card-logo-wrap');
        if (wrap) wrap.style.display = 'none';
      });
    });

    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      openBrandModal(brandName, brandCampaigns);
    });

    return card;
  }

  // =====================
  // BRAND DETAIL POP-UP MODAL
  // =====================
  let activeBrandSubCategory = 'all';

  function openBrandModal(brandName, brandCampaigns) {
    if (!brandModalOverlay) return;

    activeBrandSubCategory = 'all';
    const brandLogo = sanitizeAssetUrl(brandCampaigns.find((c) => c.logo)?.logo || '');

    if (brandModalLogoWrap) {
      if (brandLogo) {
        brandModalLogoWrap.innerHTML = `<img src="${escapeHtml(brandLogo)}" alt="${escapeHtml(brandName)}" />`;
      } else {
        brandModalLogoWrap.innerHTML = `<span style="font-size: 24px;">🏦</span>`;
      }
    }

    if (brandModalTitle) {
      brandModalTitle.textContent = brandName;
    }

    if (brandModalSubtitle) {
      brandModalSubtitle.textContent = `${brandCampaigns.length} Doğrulanmış Öğrenci ve Gençlik Fırsatı`;
    }

    const brandCategories = new Set();
    brandCampaigns.forEach((c) => {
      if (c.category) brandCategories.add(c.category);
      if (Array.isArray(c.tags)) {
        c.tags.forEach((t) => t && brandCategories.add(t));
      }
    });

    if (brandModalFilterBar) {
      if (brandCategories.size > 1) {
        brandModalFilterBar.hidden = false;
        let pillsHtml = `<button type="button" class="brand-subfilter-btn active" data-bcat="all">✨ Tümü (${brandCampaigns.length})</button>`;
        brandCategories.forEach((cat) => {
          const catCount = brandCampaigns.filter(
            (c) => c.category === cat || (Array.isArray(c.tags) && c.tags.includes(cat))
          ).length;
          const icon = CATEGORY_ICONS[cat] || '🏷️';
          pillsHtml += `<button type="button" class="brand-subfilter-btn" data-bcat="${escapeHtml(cat)}">${icon} ${escapeHtml(cat)} (${catCount})</button>`;
        });
        brandModalFilterBar.innerHTML = pillsHtml;

        brandModalFilterBar.querySelectorAll('.brand-subfilter-btn').forEach((pill) => {
          pill.addEventListener('click', () => {
            brandModalFilterBar.querySelectorAll('.brand-subfilter-btn').forEach((p) => p.classList.remove('active'));
            pill.classList.add('active');
            activeBrandSubCategory = pill.getAttribute('data-bcat');
            renderBrandModalList(brandCampaigns);
          });
        });
      } else {
        brandModalFilterBar.hidden = true;
        brandModalFilterBar.innerHTML = '';
      }
    }

    renderBrandModalList(brandCampaigns);

    brandModalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function renderBrandModalList(brandCampaigns) {
    if (!brandModalCampaignsList) return;
    brandModalCampaignsList.innerHTML = '';

    let items = [...brandCampaigns];
    if (activeBrandSubCategory !== 'all') {
      items = items.filter(
        (c) => c.category === activeBrandSubCategory || (Array.isArray(c.tags) && c.tags.includes(activeBrandSubCategory))
      );
    }

    items.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

    items.forEach((c) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'brand-modal-item';

      const safeBanner = sanitizeAssetUrl(c.image);
      const catIcon = CATEGORY_ICONS[c.category] || CATEGORY_ICONS.default;
      const { typeClass, typeIcon } = typeInfo(c.type);

      const allItemTags = [c.category, ...(Array.isArray(c.tags) ? c.tags.filter((t) => t !== c.category) : [])];

      itemEl.innerHTML = `
        ${
          safeBanner
            ? `<div class="brand-item-banner-wrap">
                <img src="${escapeHtml(safeBanner)}" alt="${escapeHtml(c.title)}" loading="lazy" />
                ${c.featured ? `<span class="brand-hero-badge">👑 EN GÖZDE FIRSAT</span>` : ''}
              </div>`
            : ''
        }
        <div class="brand-item-content">
          <div class="brand-item-badges">
            <span class="card-category">${catIcon} ${escapeHtml(c.category)}</span>
            ${c.type ? `<span class="card-type ${typeClass}">${typeIcon} ${escapeHtml(c.type)}</span>` : ''}
          </div>

          <h3 class="brand-item-title">${escapeHtml(c.title)}</h3>
          <p class="brand-item-description">${linkifyText(escapeHtml(c.description || ''))}</p>

          ${
            allItemTags.length > 1
              ? `<div class="brand-tags-row" style="margin-bottom: 12px;">
                  ${allItemTags.map((t) => `<span class="brand-tag-chip">${CATEGORY_ICONS[t] || '🏷️'} ${escapeHtml(t)}</span>`).join('')}
                </div>`
              : ''
          }

          <div class="brand-item-footer">
            <span class="brand-item-date">📅 ${escapeHtml(c.date || 'Güncel')}</span>
            <div style="display: flex; gap: 8px; align-items: center;">
              ${
                c.link && /^https:\/\//i.test(c.link) && !/[\s"'<>`\\]/.test(c.link)
                  ? `<a href="${escapeHtml(c.link)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm brand-item-btn">
                      Kampanyaya Git ↗
                    </a>`
                  : ''
              }
              <button type="button" class="btn btn-outline btn-sm brand-item-detail-btn" style="padding: 6px 12px; font-size: 0.8rem;">
                Detay ℹ️
              </button>
            </div>
          </div>
        </div>
      `;

      itemEl.querySelectorAll('img').forEach((imgEl) => {
        imgEl.addEventListener('error', () => {
          const wrap = imgEl.closest('.brand-item-banner-wrap');
          if (wrap) wrap.style.display = 'none';
        });
      });

      itemEl.querySelector('.brand-item-detail-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openModal(c);
      });

      brandModalCampaignsList.appendChild(itemEl);
    });
  }

  function closeBrandModal() {
    if (!brandModalOverlay) return;
    brandModalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  brandModalClose?.addEventListener('click', closeBrandModal);
  brandModalBottomCloseBtn?.addEventListener('click', closeBrandModal);
  brandModalOverlay?.addEventListener('click', (e) => {
    if (e.target === brandModalOverlay) closeBrandModal();
  });

  let brandTouchStartY = 0;
  brandModalContent?.addEventListener(
    'touchstart',
    (e) => {
      brandTouchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );
  brandModalContent?.addEventListener(
    'touchend',
    (e) => {
      const diff = e.changedTouches[0].clientY - brandTouchStartY;
      if (diff > 80 && brandModalContent.scrollTop <= 0) closeBrandModal();
    },
    { passive: true }
  );

  function typeInfo(type) {
    const typeClass = TYPE_MAP[type] || 'default';
    let typeIcon = '📌';
    if (typeClass === 'indirim') typeIcon = '🏷️';
    else if (typeClass === 'firsat') typeIcon = '🔥';
    else if (typeClass === 'ucretsiz') typeIcon = '🎁';
    return { typeClass, typeIcon };
  }

  function createCampaignCard(campaign, index) {
    const card = document.createElement('div');
    card.className = 'campaign-card';
    card.style.animationDelay = `${index * 0.06}s`;

    const icon = CATEGORY_ICONS[campaign.category] || CATEGORY_ICONS.default;
    const { typeClass, typeIcon } = typeInfo(campaign.type);
    const dateText = campaign.date || 'Güncel';
    const safeBanner = sanitizeAssetUrl(campaign.image);
    const safeLogo = sanitizeAssetUrl(campaign.logo);

    card.innerHTML = `
      ${
        safeBanner
          ? `<div class="card-banner-wrap">
              <img class="card-banner-img" src="${escapeHtml(safeBanner)}" alt="${escapeHtml(campaign.title)}" loading="lazy" />
            </div>`
          : ''
      }
      <div class="card-header">
        <div class="card-header-left">
          ${
            safeLogo
              ? `<span class="card-brand-logo"><img src="${escapeHtml(safeLogo)}" alt="${escapeHtml(campaign.brand || campaign.category)}" loading="lazy" /></span>`
              : ''
          }
          <span class="card-category">${icon} ${escapeHtml(campaign.category)}</span>
        </div>
        ${campaign.type ? `<span class="card-type ${typeClass}">${typeIcon} ${escapeHtml(campaign.type)}</span>` : ''}
      </div>
      <h3 class="card-title">${escapeHtml(campaign.title)}</h3>
      <p class="card-description">${linkifyText(escapeHtml(campaign.description || ''))}</p>
      <div class="card-footer">
        <span class="card-date">📅 ${escapeHtml(dateText)}</span>
        <button class="card-action" type="button">Detaylar →</button>
      </div>
    `;

    card.querySelectorAll('img').forEach((imgEl) => {
      imgEl.addEventListener('error', () => {
        const wrap = imgEl.closest('.card-banner-wrap, .card-brand-logo');
        if (wrap) wrap.style.display = 'none';
      });
    });

    card.querySelector('.card-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal(campaign);
    });

    card.addEventListener('click', () => openModal(campaign));

    return card;
  }

  function showEmptyState(message) {
    if (loadingState) loadingState.style.display = 'none';
    campaignsGrid.querySelector('.empty-state')?.remove();
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-state';
    emptyDiv.style.gridColumn = '1 / -1';
    emptyDiv.innerHTML = `
      <div class="empty-state-icon">📭</div>
      <h3 class="empty-state-title">Kampanya Bulunamadı</h3>
      <p class="empty-state-text">${escapeHtml(message)}</p>
    `;
    campaignsGrid.appendChild(emptyDiv);
  }

  function showErrorState() {
    if (loadingState) loadingState.style.display = 'none';
    campaignsGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">⚠️</div>
        <h3 class="empty-state-title">Bir Hata Oluştu</h3>
        <p class="empty-state-text">Kampanyalar yüklenirken bir sorun oluştu. Lütfen sayfayı yenileyin.</p>
        <button class="btn btn-primary btn-sm" style="margin-top: 20px;" type="button" id="retryCampaigns">
          🔄 Yeniden Dene
        </button>
      </div>
    `;
    $('retryCampaigns')?.addEventListener('click', () => loadCampaigns());
  }

  function updateStats() {
    if (statCampaigns) statCampaigns.textContent = String(allCampaigns.length);
    updateCount(allCampaigns.length);
  }

  function updateCount(count) {
    if (campaignCount) {
      campaignCount.innerHTML = `📢 Toplam <strong>${Number(count) || 0}</strong> kampanya`;
    }
    const statsTextEl = $('campaignStatsText');
    if (statsTextEl) {
      if (currentViewMode === 'brands') {
        const brandCount = new Set(
          (allCampaigns || []).map((c) => c.brand || c.category || 'Genel')
        ).size;
        statsTextEl.textContent = `${brandCount} Marka • ${count} Fırsat`;
      } else {
        statsTextEl.textContent = `${count} Fırsat Listeleniyor`;
      }
    }
  }

  // =====================
  // CAMPAIGN DETAIL MODAL
  // =====================
  function openModal(campaign) {
    const icon = CATEGORY_ICONS[campaign.category] || CATEGORY_ICONS.default;
    const { typeClass, typeIcon } = typeInfo(campaign.type);
    const safeLogo = sanitizeAssetUrl(campaign.logo);
    const safeBanner = sanitizeAssetUrl(campaign.image);

    modalBadges.innerHTML = `
      ${
        safeLogo
          ? `<span class="card-brand-logo modal-brand-logo"><img src="${escapeHtml(safeLogo)}" alt="${escapeHtml(campaign.brand || campaign.category)}" /></span>`
          : ''
      }
      <span class="card-category">${icon} ${escapeHtml(campaign.category)}</span>
      ${campaign.type ? `<span class="card-type ${typeClass}">${typeIcon} ${escapeHtml(campaign.type)}</span>` : ''}
    `;
    modalTitle.textContent = campaign.title;
    const bannerHtml = safeBanner
      ? `<div class="modal-banner-wrap"><img class="modal-banner-img" src="${escapeHtml(safeBanner)}" alt="${escapeHtml(campaign.title)}" /></div>`
      : '';
    const descHtml = linkifyText(escapeHtml(campaign.description || ''));
    const linkHtml =
      campaign.link && /^https:\/\//i.test(campaign.link) && !/[\s"'<>`\\]/.test(campaign.link)
        ? `<div style="margin-top: 18px;"><a href="${escapeHtml(campaign.link)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">Kampanyaya Git ↗</a></div>`
        : '';
    modalDescription.innerHTML = bannerHtml + descHtml + linkHtml;
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  $('modalClose')?.addEventListener('click', closeModal);
  $('modalCloseBtn')?.addEventListener('click', closeModal);
  modalOverlay?.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (brandModalOverlay?.classList.contains('active')) closeBrandModal();
      else if (profileModal?.classList.contains('active')) closeProfileModal();
      else if (modalOverlay?.classList.contains('active')) closeModal();
    }
  });

  let touchStartY = 0;
  modalContent?.addEventListener(
    'touchstart',
    (e) => {
      touchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );
  modalContent?.addEventListener(
    'touchend',
    (e) => {
      const diff = e.changedTouches[0].clientY - touchStartY;
      if (diff > 80 && modalContent.scrollTop <= 0) closeModal();
    },
    { passive: true }
  );

  // =====================
  // SEARCH / NAV / UI
  // =====================
  let searchTimeout;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = e.target.value.trim();
      if (getCurrentProfile()) renderCampaigns();
    }, 250);
  });

  window.addEventListener(
    'scroll',
    () => {
      const currentScroll = window.scrollY;
      if (currentScroll > 30) header?.classList.add('scrolled');
      else header?.classList.remove('scrolled');
      if (currentScroll > 500) backToTop?.classList.add('visible');
      else backToTop?.classList.remove('visible');
    },
    { passive: true }
  );

  mobileMenuBtn?.addEventListener('click', () => {
    mobileMenuBtn.classList.toggle('active');
    navLinks?.classList.toggle('open');
    document.body.style.overflow = navLinks?.classList.contains('open') ? 'hidden' : '';
  });

  navLinks?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mobileMenuBtn?.classList.remove('active');
      navLinks?.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { root: null, rootMargin: '0px 0px -60px 0px', threshold: 0.1 }
  );
  document.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el));

  // =====================
  // INIT
  // =====================
  async function init() {
    registerServiceWorker();

    // 1. SENKRON KONTROL (0ms): Cihazda kayıtlı profil var mı?
    const initialProfile = getCurrentProfile();
    renderAuthArea(getCurrentUser(), initialProfile, isAdmin());

    if (initialProfile) {
      // Kullanıcı daha önce seçim yapmış -> Şehir/Üni SORMA, direkt Kampanya Ekranını aç!
      showMainCampaignScreen(initialProfile);
      updatePushBanner(initialProfile);
    } else {
      // Kullanıcı siteye hayatında ilk defa giriyor -> İlk Giriş Seçim Ekranını aç!
      showOnboardingScreen();
    }

    // 2. Arka planda Firebase Auth + Firestore senkronizasyonu
    let lastProfileKey = initialProfile
      ? `${initialProfile.cityId}|${initialProfile.universityId}|${initialProfile.facultyId}|${initialProfile.departmentId}`
      : null;

    authInitPromise = initAuth();

    if (initialProfile) {
      loadCampaigns();
    }

    onAuthChange((user, profile, admin) => {
      renderAuthArea(user, profile, admin);
      updatePushBanner(profile);
      updateStudentContextBar(profile);

      const key = profile
        ? `${profile.cityId}|${profile.universityId}|${profile.facultyId}|${profile.departmentId}`
        : null;
      if (key === lastProfileKey) return;
      lastProfileKey = key;

      if (profile) {
        showMainCampaignScreen(profile);
        loadCampaigns();
        if (profile.pushEnabled) {
          startForegroundListener();
          if (!tokenSynced) {
            tokenSynced = true;
            syncPushToken(profile);
          }
        }
      }
    });

    await authInitPromise;
    const syncedProfile = getCurrentProfile();
    if (syncedProfile && syncedProfile.pushEnabled) {
      startForegroundListener();
      if (!tokenSynced) {
        tokenSynced = true;
        syncPushToken(syncedProfile);
      }
    }
  }

  init();
})();

})();
