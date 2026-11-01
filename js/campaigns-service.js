/**
 * KampüsKazan — Kampanya Servisi (campaigns.json tabanlı, Firebase yükü 0)
 *
 * Kampanyalar doğrudan kök dizindeki `campaigns.json` dosyasından okunur.
 * Böylece öğrenciler siteye girdiğinde Firebase Firestore'a hiçbir kampanya sorgusu atılmaz,
 * sunucuya veya kotaya yük binmez. Yeni kampanya eklemek veya mevcutları güncellemek için
 * `campaigns.json` dosyasını düzenlemeniz yeterlidir.
 */

import {
  db,
  collection,
  getDocs,
} from './firebase.js';

const CAMPAIGNS_JSON_URL = './campaigns.json';

/**
 * file:// protokolünde (Finder'dan çift tıklayarak açıldığında) fetch() tarayıcı tarafından
 * engellenirse kullanılacak yerleşik yedek liste (campaigns.json ile senkron tutulur).
 */
const FALLBACK_CAMPAIGNS = [
  {
    id: 'kuveytturk-davet-1000tl',
    active: true,
    category: 'Banka',
    type: 'Hediye',
    title: "Kuveyt Türk'te arkadaşını davet edenlere 1000 TL.",
    description: 'Çağırdığın her arkadasın ıcın 1000 TL. Toplamda 10.000 TL.',
    link: '',
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
export function normalizeCampaignList(raw) {
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
        category: String(item.category || 'Genel').trim(),
        type: String(item.type || '').trim(),
        title,
        description: String(item.description || '').trim(),
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
export async function fetchAllCampaigns() {
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
export function matchesStudentProfile(campaign, profile) {
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
export async function fetchActiveCampaigns(profile = null) {
  const all = await fetchAllCampaigns();
  return all.filter((c) => c.active !== false && matchesStudentProfile(c, profile));
}

/**
 * Öğrenci istatistikleri (admin) — KVKK gereği yalnızca TOPLU sayılar döner,
 * tekil kayıt listelenmez.
 * @returns {Promise<{ total: number, pushEnabled: number, byCity: Map<string, number>, byUniversity: Map<string, number>, byFaculty: Map<string, number>, byDepartment: Map<string, number> }>}
 */
export async function fetchStudentStats() {
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
