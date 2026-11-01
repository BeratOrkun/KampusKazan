# KVKK Notları — KampüsKazan

> ⚠️ Bu dosya teknik bir kontrol listesidir, **hukuki görüş değildir**. Yayına almadan önce
> `kvkk.html` metnini bir KVKK avukatına kontrol ettirmen önerilir.

## Kısa cevap: "Sadece il / üniversite / fakülte / bölüm alırsam sıkıntı olur mu?"

Risk **düşük** ama **sıfır değil**:

- Bu 4 bilgi tek başına çoğu zaman kimseyi tanımlamaz. Ama küçük bir bölümde (ör. 15 kişilik bir sınıf)
  ve bir cihaz kimliği / bildirim anahtarıyla birlikte düşünüldüğünde **“belirlenebilir kişi”**ye ait veri
  sayılabilir. KVKK’da takma adlı (pseudonymous) veri de kişisel veridir.
- Firebase anonim oturum kimliği, FCM token ve sunuculara ulaşan IP adresi de kişisel veri kabul edilebilir.
- Dolayısıyla KVKK yükümlülükleri **hafiflemiş haliyle** devam eder: aydınlatma, (bildirim için) açık rıza,
  yurt dışı aktarım kuralı, silme hakkı, güvenlik.

## Projede yapılanlar

| KVKK ilkesi | Uygulama |
|---|---|
| Veri minimizasyonu (m.4) | E-posta, ad-soyad, şifre, telefon **alınmıyor**. Sadece 4 seçim (katalog kodu). Serbest metin yok. |
| Teknik zorlama | `firestore.rules` → `hasOnly([...])` ile başka alan yazılamaz. |
| Aydınlatma (m.10) | `kvkk.html#aydinlatma` — profil formunda link. Aydınlatma “onay” kutusuna **bağlanmadı** (Kurul bunu hatalı buluyor). |
| Açık rıza (m.5/1) | Bildirim **ayrı, isteğe bağlı** onay kutusu + tarayıcı izni. Varsayılan kapalı. Onay zamanı ve sürümü saklanıyor (ispat yükü veri sorumlusunda). |
| Rızayı geri alma | 🔔/🔕 düğmesi ve Profilim ekranı → token silinir. |
| Silme hakkı (m.11) | “Kaydımı ve Verilerimi Sil” → Firestore belgesi + anonim hesap silinir; Cloud Function token’ı topic’lerden çıkarır. |
| Yönetici erişimi | Admin panelinde tekil kayıt yok, sadece toplu sayılar. |
| Takip yok | Google Analytics (`measurementId`) kaldırıldı. Reklam/takip çerezi yok. |
| Güvenlik (m.12) | Kurallar: öğrenci sadece kendi belgesini okur; admin `admins/{uid}` ile belirlenir; diğer her şey kapalı. |

## 🔴 Senin yapman gerekenler

1. **`kvkk.html` içindeki turuncu `[...]` alanlarını doldur**: veri sorumlusu adı/unvanı, adres, KVKK iletişim e-postası,
   saklama süresi, yurt dışı aktarım dayanağı.
2. **Yurt dışı aktarım (KVKK m.9, 1 Haziran 2024 sonrası):** Firebase sunucuları yurt dışında. Haziran 2024 değişikliğinden
   sonra ana yol **standart sözleşme**dir: sözleşme imzalanır ve imzadan itibaren **5 iş günü içinde Kurul’a bildirilir**.
   Google’ın Türkiye için standart sözleşme sunup sunmadığını Google Cloud / Firebase veri işleme şartlarından kontrol et
   veya avukatına sor. (Açık rıza artık yalnızca “arızi” aktarımlar için istisna.)
3. **VERBİS:** Yıllık çalışan sayısı 50’den az **ve** yıllık mali bilanço toplamı 100 milyon TL’den az ise ve ana faaliyetin
   özel nitelikli veri işlemek değilse genellikle kayıt **muafiyeti** vardır. Şirketleşirsen tekrar kontrol et.
4. **Saklama süresini gerçekten uygula:** `kvkk.html`’de yazan süreden (varsayılan 24 ay) eski `updatedAt` değerine
   sahip `users` belgelerini periyodik olarak sil (Console’dan elle veya ileride zamanlanmış bir Cloud Function ile).
5. **Firestore konumu:** Yeni proje açıyorsan Firestore’u `europe-west` bölgesinde oluşturmak iyi bir pratiktir
   (yine yurt dışıdır ama AB veri koruma rejimi altındadır). Mevcut veritabanının konumu sonradan değiştirilemez.
6. **Eski veri temizliği** (aşağıda).

## Eski veri temizliği (önemli)

Önceki sürüm öğrencilerden **e-posta ve ad-soyad** topluyordu. Bu veriler artık amaçla bağlantılı olmadığı için silinmeli
(KVKK m.7 — işleme şartları ortadan kalkınca silme/yok etme):

1. Firestore → `users` koleksiyonundaki eski belgeleri sil (yeni sürüm bu alanlarla belge kabul etmez zaten).
2. Firestore → `universities` koleksiyonunu tamamen sil.
3. Authentication → Users → e-posta ile açılmış **öğrenci** hesaplarını sil (admin hesabın hariç).
4. Silme işlemini tarih ve kapsamıyla kısa bir not olarak sakla (imha kaydı).

## Ticari ileti (6563 sayılı Kanun) notu

Kampanya bildirimleri ticari ileti niteliğinde olabilir. İYS (İleti Yönetim Sistemi) SMS, e-posta ve sesli arama içindir;
web push için İYS kaydı gerekmez. Yine de **önceden onay** (bizdeki açık onay kutusu + tarayıcı izni) ve **kolay ret**
(🔕 düğmesi) zorunlu kabul edilmeli — ikisi de projede var. Bildirimlerde kim olduğunu (KampüsKazan) açıkça belirt.

## Ek iyileştirme önerileri (opsiyonel)

- **Google Fonts:** `style.css` fontları Google sunucularından yüklüyor; bu da ziyaretçinin IP’sinin Google’a gitmesi
  demek. Firebase zaten Google olduğu için ek risk küçük, ama tamamen önlemek istersen fontları projeye indirip
  yerelden sunabilirsin.
- **Anonim hesap birikmesi:** Tarayıcı verisini silen öğrenci yeni bir anonim hesap oluşturur; eski boş hesaplar
  Authentication’da birikir. Identity Platform’a yükseltirsen “anonim hesapları otomatik sil” seçeneği kullanılabilir.
