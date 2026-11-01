# KampüsKazan — Firebase Kurulum

Site **Firebase Authentication** (öğrenci: Anonim, admin: e-posta/şifre), **Cloud Firestore**,
**Cloud Messaging (web push)** ve isteğe bağlı **Cloud Functions** kullanır.

## 1) Authentication

Firebase Console → **Authentication → Sign-in method**:

| Sağlayıcı | Durum | Neden |
|---|---|---|
| **Anonymous** | ✅ Enable | Öğrenciler e-posta/şifre vermeden profil oluşturur |
| **Email/Password** | ✅ Enable | Sadece admin girişi için |

> Öğrenci kaydı için e-posta doğrulama **yoktur**. Kimse e-posta ile öğrenci hesabı açmaz.
> Biri API ile e-posta hesabı açsa bile `admins/{uid}` belgesi olmadan admin paneline erişemez.

## 2) Firestore kuralları

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Kurallar `users/{uid}` belgesine yalnızca şu alanların yazılmasına izin verir:
`cityId, universityId, facultyId, departmentId, noticeVersion, createdAt, updatedAt,
pushEnabled, pushToken, pushConsentVersion, pushConsentAt`. Başka bir alan (ör. `email`) yazılmaya
çalışılırsa istek reddedilir.

## 3) İlk admin

1. Authentication → **Add user** → e-posta + şifre ile admin hesabı oluştur, **User UID**’yi kopyala
2. Firestore → **Start collection** → `admins` → Document ID = o UID (alan eklemen gerekmez, istersen `note: "ben"` yaz)
3. `admin.html` üzerinden giriş yap

> Eski sürümdeki `users/{uid}.role = "admin"` yöntemi artık **kullanılmıyor**.

## 4) Web Push (bildirim)

1. Console → Project settings → **Cloud Messaging** → *Web configuration* → **Web Push certificates** → **Generate key pair**
2. Çıkan anahtarı `js/firebase-config.js` içindeki `VAPID_KEY` alanına yapıştır
3. Siteyi **HTTPS** üzerinden yayınla (Firebase Hosting otomatik HTTPS’tir; `localhost` da çalışır)

### Bildirim gönderme

Console → **Messaging** → **New campaign** → *Firebase Notification messages*:

- **Herkese:** Target → *User segment* → web uygulamanı seç
- **Belirli il / üniversite:** (5. adımdaki fonksiyon gerekli) Target → *Topic* → ör. `city-ankara`, `uni-metu`
  — admin panelindeki “Bildirim Gönder” kartı doğru topic adını üretir
- **Tıklayınca açılacak sayfa:** *Additional options → Custom data* → anahtar `link`, değer `/` (veya başka bir yol)
- **Test:** *Send test message* → token gerekir; tarayıcı konsolunda değil Firestore’daki kendi `users/{uid}.pushToken` alanından alabilirsin

### Platform notları

| Platform | Durum |
|---|---|
| Android Chrome / Edge / Samsung | ✅ Sitede doğrudan çalışır, PWA olarak da yüklenebilir |
| Masaüstü Chrome / Edge / Firefox | ✅ |
| macOS Safari 16+ | ✅ |
| iPhone / iPad (iOS 16.4+) | ⚠️ Sadece **Ana Ekrana Ekle** ile yüklenen uygulamada. Site bunu kullanıcıya otomatik anlatır |

## 5) (Opsiyonel) İl / üniversiteye özel bildirim — Cloud Function

`functions/index.js`, öğrencinin token’ını otomatik olarak `all`, `city-<il>`, `uni-<üniversite>`
topic’lerine abone eder; bildirim kapatılınca / kayıt silinince abonelikten çıkarır.

Gereksinim: **Blaze** planı (ücretsiz kota bu iş için fazlasıyla yeterli).

```bash
cd functions && npm install && cd ..
firebase deploy --only functions
```

Bu fonksiyon olmadan da site çalışır; sadece “herkese” bildirim atabilirsin.

## 6) Yerel çalıştırma

```bash
python3 -m http.server 5500
# veya
npx serve .
```

`http://localhost:5500` — Admin: `http://localhost:5500/admin.html`

> Service worker `localhost`’ta da çalışır. Kod değiştirip eski sürümü görüyorsan DevTools → Application →
> Service Workers → **Update on reload**’u işaretle veya `sw.js` içindeki `CACHE_VERSION`’ı artır.

## 7) Yayınlama

```bash
firebase deploy --only hosting
```

Özel alan adı kullanıyorsan Authentication → Settings → **Authorized domains** listesine ekle.

## 8) Veri modeli

| Koleksiyon | İçerik | Kim okur / yazar |
|---|---|---|
| `users/{anonimUid}` | `cityId, universityId, facultyId, departmentId`, `noticeVersion`, (opsiyonel) push alanları | Öğrenci kendi belgesini; admin sadece toplu istatistik için okur |
| `admins/{uid}` | boş belge | Sadece Console’dan |
| `campaigns/{id}` | `title, description, category, type, active, createdBy, createdAt, updatedAt` | Oturumlu herkes aktifleri okur; admin yazar |

> Eski sürümden kalan `universities` koleksiyonu ve `users` içindeki `email`/`displayName` alanlarını
> **silmen gerekir** (bkz. `KVKK_NOTLARI.md` → Eski veri temizliği).
