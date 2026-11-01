# KazananÖğrenci

Öğrencilere özel kampanya platformu (PWA). **KVKK veri minimizasyonu** ilkesine göre tasarlandı:
öğrenciden e-posta, isim veya şifre alınmaz; yalnızca **il, üniversite, fakülte ve bölüm** seçilir.

## Hızlı başlangıç

1. `FIREBASE_SETUP.md` adımlarını tamamla (Anonymous + Email/Password auth, kurallar, ilk admin, VAPID key)
2. `kvkk.html` içindeki `[...]` alanlarını doldur ve `KVKK_NOTLARI.md`’yi oku
3. Yerel sunucu:

```bash
python3 -m http.server 5500
```

4. Site: `http://localhost:5500` — Admin: `http://localhost:5500/admin.html`

## Özellikler

- Anonim öğrenci profili: il → üniversite (81 il, 206 üniversite kataloğu) → fakülte → bölüm
- Firestore kuralları ile başka kişisel alan yazılmasının teknik olarak engellenmesi
- PWA: ana ekrana yükleme, çevrimdışı açılış
- İsteğe bağlı web push bildirimleri (ayrı açık rıza, tek tıkla kapatma)
- “Kaydımı ve Verilerimi Sil” (KVKK m.11)
- Admin: kampanya CRUD, toplu öğrenci dağılımı (tekil kayıt yok), bildirim topic yardımcısı
- Opsiyonel Cloud Function: il / üniversiteye özel bildirim için topic aboneliği

## Dosya yapısı

| Dosya | Açıklama |
|---|---|
| `index.html`, `app.js` | Öğrenci arayüzü |
| `admin.html`, `admin.js` | Admin paneli |
| `kvkk.html` | Aydınlatma metni + bildirim açık rıza metni |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA + arka plan bildirimleri |
| `js/auth.js` | Anonim profil, admin girişi, veri silme |
| `js/notifications.js` | Bildirim izni, FCM token, ön plan mesajları |
| `js/catalog.js`, `js/data/*` | İl / üniversite / fakülte / bölüm kataloğu |
| `js/campaigns-service.js` | Kampanya CRUD + toplu istatistik |
| `firestore.rules` | Güvenlik kuralları (alan beyaz listesi) |
| `functions/` | Opsiyonel topic senkronizasyonu |

Üniversite listesi: [anilozmen/TR-iller-universiteler-JSON](https://github.com/anilozmen/TR-iller-universiteler-JSON) (Apache-2.0).
Listede olmayan üniversiteler için “Listede yok / Diğer” seçeneği vardır; yeni üniversite eklemek için
`js/data/universities.js` dosyasına satır eklemen yeterli.
