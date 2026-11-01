/**
 * YÖK Katalog yardımcıları: İl → Üniversite → Fakülte → Bölüm
 * Firestore'a yalnızca ID'ler yazılır; isimler bu katalogdan çözülür.
 */

import { CITIES, UNIVERSITIES, FACULTIES, DEPARTMENTS } from './data/yok-catalog.js';

export const OTHER_ID = 'diger';

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
export function getCities() {
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
export function getUniversitiesByCity(cityId) {
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
export function getFacultiesByUniversity(universityId) {
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
export function getFaculties(universityId) {
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
export function getDepartmentsByUniversityFaculty(universityId, facultyId) {
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
export function getDepartments(facultyId, universityId) {
  if (universityId) return getDepartmentsByUniversityFaculty(universityId, facultyId);
  if (facultyId === OTHER_ID) return [{ id: OTHER_ID, name: 'Diğer Bölüm' }];
  return [...DEPARTMENTS.map(([id, name]) => ({ id, name })).sort(byName), { id: OTHER_ID, name: 'Diğer Bölüm' }];
}

export function cityName(id) {
  return cityMap.get(id)?.name || 'Bilinmeyen İl';
}

export function universityName(id) {
  if (id === OTHER_ID) return 'Diğer Üniversite';
  return uniMap.get(id)?.name || 'Bilinmeyen Üniversite';
}

export function facultyName(id) {
  if (id === OTHER_ID) return 'Diğer Fakülte / Yüksekokul';
  return facIdMap.get(id) || 'Bilinmeyen Fakülte';
}

/**
 * Bölüm adını çözer. Hem departmentName(departmentId) hem de
 * eski imzalı departmentName(facultyId, departmentId) çağrılarını destekler.
 * @param {string} a
 * @param {string} [b]
 */
export function departmentName(a, b) {
  const depId = b !== undefined ? b : a;
  if (depId === OTHER_ID) return 'Diğer Bölüm';
  return depIdMap.get(depId) || 'Bilinmeyen Bölüm';
}

/**
 * Kısa üniversite etiketi (header chip için)
 * @param {string} id
 */
export function universityShortName(id) {
  const name = universityName(id);
  return name.replace(/ Üniversitesi$/u, '').replace(/ Meslek Yüksekokulu$/u, ' MYO');
}

/**
 * Seçimlerin YÖK kataloğuyla tutarlı olduğunu doğrular.
 * @param {{ cityId: string, universityId: string, facultyId: string, departmentId: string }} p
 */
export function isValidSelection(p) {
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
export function topicsForProfile(p) {
  const topics = ['all'];
  if (p?.cityId) topics.push(`city-${p.cityId}`);
  if (p?.universityId && p.universityId !== OTHER_ID) topics.push(`uni-${p.universityId}`);
  return topics;
}
