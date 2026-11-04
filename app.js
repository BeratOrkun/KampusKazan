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

import { isFirebaseConfigured } from './js/firebase-config.js';
import {
  initAuth,
  onAuthChange,
  saveProfile,
  deleteMyData,
  reloadProfile,
  mapAuthError,
  getCurrentUser,
  getCurrentProfile,
  isAdmin,
} from './js/auth.js';
import {
  getCities,
  getUniversitiesByCity,
  getFacultiesByUniversity,
  getDepartmentsByUniversityFaculty,
  universityShortName,
  universityName,
  facultyName,
  departmentName,
  cityName,
  OTHER_ID,
} from './js/catalog.js';
import { fetchActiveCampaigns } from './js/campaigns-service.js';
import {
  registerServiceWorker,
  requestPermission,
  enablePush,
  disablePush,
  pushUnavailableReason,
  isIOS,
  isStandalone,
  listenForegroundMessages,
  syncPushToken,
} from './js/notifications.js';

(function () {
  'use strict';

  const CATEGORY_ICONS = {
    'Yapay Zeka': '✨',
    Teknoloji: '💻',
    Yemek: '🍔',
    Kafe: '☕',
    Eğitim: '📚',
    Ulaşım: '🚌',
    Eğlence: '🎮',
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
    const categories = [...new Set(allCampaigns.map((c) => c.category).filter(Boolean))];
    categoryFilter.querySelectorAll('.category-btn:not([data-category="all"])').forEach((btn) => btn.remove());

    const allBtn = categoryFilter.querySelector('.category-btn[data-category="all"]');
    if (allBtn) {
      allBtn.innerHTML = `✨ Tümü <span class="category-count">${allCampaigns.length}</span>`;
    }

    categories.forEach((cat) => {
      const icon = CATEGORY_ICONS[cat] || CATEGORY_ICONS.default;
      const count = allCampaigns.filter((c) => c.category === cat).length;
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

  function renderCampaigns() {
    let filtered = [...allCampaigns];

    if (activeCategory !== 'all') {
      filtered = filtered.filter((c) => c.category === activeCategory);
    }

    if (searchQuery) {
      const q = searchQuery.toLocaleLowerCase('tr');
      filtered = filtered.filter(
        (c) =>
          (c.title || '').toLocaleLowerCase('tr').includes(q) ||
          (c.description || '').toLocaleLowerCase('tr').includes(q) ||
          (c.brand || '').toLocaleLowerCase('tr').includes(q) ||
          (c.category || '').toLocaleLowerCase('tr').includes(q) ||
          (c.type || '').toLocaleLowerCase('tr').includes(q)
      );
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
    filtered.forEach((campaign, index) => {
      campaignsGrid.appendChild(createCampaignCard(campaign, index));
    });
  }

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
      if (profileModal?.classList.contains('active')) closeProfileModal();
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
