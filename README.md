# KampüsKazan (`kampuskazan`)

Öğrencilere özel kampanya platformu (Mobil-First PWA). **KVKK veri minimizasyonu** ilkesine göre tasarlandı:
öğrenciden e-posta, isim veya şifre alınmaz; yalnızca **şehir, üniversite, fakülte ve bölüm** seçilir.

## Kampanya Ekleme / Güncelleme (`campaigns.json`)

Sitedeki kampanyalar Firebase sunucusuna hiçbir yük bindirmemek için doğrudan kök dizindeki [`campaigns.json`](./campaigns.json) dosyasından okunur. Yeni bir kampanya eklemek veya mevcut kampanyayı düzenlemek için `campaigns.json` dosyasına yeni bir nesne eklemeniz yeterlidir:

```json
[
  {
    "id": "kuveytturk-davet-1000tl",
    "active": true,
    "category": "Banka",
    "type": "Hediye",
    "title": "Kuveyt Türk'te arkadaşını davet edenlere 1000 TL.",
    "description": "Çağırdığın her arkadasın ıcın 1000 TL. Toplamda 10.000 TL.",
    "link": "",
    "date": "Güncel",
    "cities": [],
    "universities": []
  }
]
```

### `campaigns.json` Alanları
- `title` *(zorunlu)*: Kampanya başlığı
- `category` *(zorunlu)*: Kategori (`Banka`, `Yemek`, `Kafe`, `Teknoloji`, `Eğitim`, `Ulaşım`, `Eğlence`, `Giyim`, `Kitap`, `Müzik`, `Yazılım`, `Spor`, `Kültür`, `Finans`, `Alışveriş` vb.)
- `type`: Rozet türü (`İndirim`, `Fırsat`, `Ücretsiz`, `Hediye`)
- `description`: Kampanya açıklaması (içindeki `https://...` linkler otomatik tıklanabilir olur)
- `link`: İsteğe bağlı harici kampanya linki (doldurulursa detay penceresinde **"Kampanyaya Git ↗"** butonu çıkar)
- `active`: `true` ise sitede görünür, `false` yapılırsa silinmeden gizlenir
- `cities` / `universities`: Boş dizi (`[]`) bırakılırsa **tüm öğrencilere** gösterilir; belirli il veya üniversite ID'leri yazılırsa (örn. `["istanbul", "ankara"]`) yalnızca o öğrencilere gösterilir

## Özellikler

- İlk girişte 4 adımlı otomatik açılan seçim kutuları: **Şehir → Üniversite (228 üniversite) → Fakülte (1.039 fakülte/MYO) → Bölüm (635 bölüm)**
- Cihaz kimliği (`deviceId`) ile yerel depolama (`localStorage` + `Cookie` + `IndexedDB`) ve Firebase Firestore (`users/{uid}`) senkronizasyonu
- Sonraki girişlerde şehir/üniversite sormadan doğrudan kampanya ekranının açılması
- `campaigns.json` ile sıfır Firebase okuma maliyetiyle anında kampanya yükleme
- PWA: ana ekrana yükleme, çevrimdışı açılış ve isteğe bağlı web push bildirimleri
- “Kaydımı ve Verilerimi Sil” (KVKK m.11)
