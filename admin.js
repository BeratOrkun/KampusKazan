/**
 * KazananÖğrenci — Admin paneli
 * KVKK: Öğrenci tekil kayıtları gösterilmez; yalnızca toplu dağılım.
 */

import { isFirebaseConfigured } from './js/firebase-config.js';
import {
  initAuth,
  onAuthChange,
  loginAdmin,
  logout,
  mapAuthError,
  isAdmin,
  getCurrentUser,
} from './js/auth.js';
import {
  fetchAllCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  fetchStudentStats,
} from './js/campaigns-service.js';
import {
  getCities,
  getUniversitiesByCity,
  cityName,
  universityName,
  facultyName,
  departmentName,
  OTHER_ID,
} from './js/catalog.js';

const $ = (id) => document.getElementById(id);

const loginCard = $('adminLoginCard');
const dashboard = $('adminDashboard');
const authArea = $('adminAuthArea');
const loginForm = $('adminLoginForm');
const loginError = $('adminLoginError');
const adminError = $('adminError');
const adminSuccess = $('adminSuccess');

const campaignFormCard = $('campaignFormCard');
const campaignForm = $('campaignForm');
const formTitle = $('formTitle');
const campaignsTableBody = $('campaignsTableBody');

let campaigns = [];
let editingId = null;
let dashboardLoaded = false;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function showError(el, msg) {
  if (!el) return;
  el.hidden = !msg;
  el.textContent = msg || '';
}

function showAdminMessage(type, msg) {
  showError(adminError, type === 'error' ? msg : '');
  showError(adminSuccess, type === 'success' ? msg : '');
}

function renderAuthArea(user, admin) {
  if (!authArea) return;
  if (!user || user.isAnonymous) {
    authArea.innerHTML = `<a href="index.html" class="btn btn-outline btn-sm">Siteye Dön</a>`;
    return;
  }
  authArea.innerHTML = `
    <span class="user-chip">
      <span class="user-chip-name">${escapeHtml(user.email || '')}</span>
      ${admin ? '<span class="user-chip-uni">Admin</span>' : ''}
    </span>
    <a href="index.html" class="btn btn-outline btn-sm">Site</a>
    <button type="button" class="btn btn-outline btn-sm" id="adminLogout">Çıkış</button>
  `;
  $('adminLogout')?.addEventListener('click', () => logout());
}

function showLogin() {
  loginCard.hidden = false;
  dashboard.hidden = true;
}

function showDashboard() {
  loginCard.hidden = true;
  dashboard.hidden = false;
}

// =====================
// CAMPAIGNS
// =====================
function renderCampaignsTable() {
  const active = campaigns.filter((c) => c.active).length;
  $('statTotal').textContent = String(campaigns.length);
  $('statActive').textContent = String(active);

  if (!campaigns.length) {
    campaignsTableBody.innerHTML = `<tr><td colspan="5" class="admin-empty">Henüz kampanya yok. İlk kampanyanı ekle.</td></tr>`;
    return;
  }

  campaignsTableBody.innerHTML = campaigns
    .map(
      (c) => `
      <tr>
        <td><strong>${escapeHtml(c.title)}</strong></td>
        <td>${escapeHtml(c.category || '—')}</td>
        <td>${escapeHtml(c.type || '—')}</td>
        <td>
          <span class="status-pill ${c.active ? 'active' : 'inactive'}">
            ${c.active ? 'Aktif' : 'Pasif'}
          </span>
        </td>
        <td class="admin-actions">
          <button type="button" class="btn btn-outline btn-xs" data-edit="${escapeHtml(c.id)}">Düzenle</button>
          <button type="button" class="btn btn-danger btn-xs" data-delete="${escapeHtml(c.id)}">Sil</button>
        </td>
      </tr>
    `
    )
    .join('');
}

campaignsTableBody?.addEventListener('click', (e) => {
  const editBtn = e.target.closest('[data-edit]');
  const delBtn = e.target.closest('[data-delete]');
  if (editBtn) startEdit(editBtn.getAttribute('data-edit'));
  if (delBtn) confirmDelete(delBtn.getAttribute('data-delete'));
});

// =====================
// AGGREGATED STATS
// =====================
function renderStatList(tbody, map, labelFn, limit = 15) {
  if (!tbody) return;
  const rows = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  if (!rows.length) {
    tbody.innerHTML = `<tr><td class="admin-empty">Henüz veri yok.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows
    .map(
      ([key, count]) => `
      <tr>
        <td>${escapeHtml(labelFn(key))}</td>
        <td class="num">${count}</td>
      </tr>`
    )
    .join('');
}

function renderStudentStats(stats) {
  $('statStudents').textContent = String(stats.total);
  $('statPush').textContent = String(stats.pushEnabled);
  renderStatList($('statsCityBody'), stats.byCity, cityName);
  renderStatList($('statsUniBody'), stats.byUniversity, universityName);
  renderStatList($('statsFacultyBody'), stats.byFaculty, facultyName);
  renderStatList($('statsDepartmentBody'), stats.byDepartment, (key) => {
    const [fac, dep] = key.split('|');
    return `${departmentName(fac, dep)} (${facultyName(fac).replace(/ Fakültesi$/u, '')})`;
  });
}

async function refreshData() {
  showAdminMessage('error', '');
  try {
    const [cams, stats] = await Promise.all([fetchAllCampaigns(), fetchStudentStats()]);
    campaigns = cams;
    renderCampaignsTable();
    renderStudentStats(stats);
  } catch (err) {
    console.error(err);
    showAdminMessage('error', 'Veriler yüklenemedi: ' + mapAuthError(err));
    campaignsTableBody.innerHTML = `<tr><td colspan="5" class="admin-empty">Yükleme hatası</td></tr>`;
  }
}

// =====================
// TOPIC HELPER
// =====================
const topicCity = $('topicCity');
const topicUniversity = $('topicUniversity');
const topicNameEl = $('topicName');

function fillOptions(select, items, placeholder) {
  select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>`;
  items.forEach((i) => {
    const opt = document.createElement('option');
    opt.value = i.id;
    opt.textContent = i.name;
    select.appendChild(opt);
  });
}

function updateTopicName() {
  let topic = 'all';
  if (topicUniversity.value) topic = `uni-${topicUniversity.value}`;
  else if (topicCity.value) topic = `city-${topicCity.value}`;
  topicNameEl.textContent = topic;
}

function initTopicHelper() {
  if (!topicCity) return;
  fillOptions(topicCity, getCities(), 'Tüm Türkiye (all)');
  fillOptions(topicUniversity, [], 'Önce il seçin');

  topicCity.addEventListener('change', () => {
    if (topicCity.value) {
      const unis = getUniversitiesByCity(topicCity.value).filter((u) => u.id !== OTHER_ID);
      fillOptions(topicUniversity, unis, 'İldeki tüm üniversiteler');
      topicUniversity.disabled = false;
    } else {
      fillOptions(topicUniversity, [], 'Önce il seçin');
      topicUniversity.disabled = true;
    }
    updateTopicName();
  });
  topicUniversity.addEventListener('change', updateTopicName);

  $('btnCopyTopic')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(topicNameEl.textContent);
      showAdminMessage('success', `Topic kopyalandı: ${topicNameEl.textContent}`);
    } catch {
      showAdminMessage('error', 'Kopyalanamadı, elle seçip kopyala.');
    }
  });
  updateTopicName();
}

// =====================
// CAMPAIGN FORM
// =====================
function openForm(campaign = null) {
  editingId = campaign?.id || null;
  formTitle.textContent = editingId ? 'Kampanyayı Düzenle' : 'Yeni Kampanya';
  $('campaignId').value = editingId || '';
  $('campaignTitle').value = campaign?.title || '';
  $('campaignCategory').value = campaign?.category || '';
  $('campaignType').value = campaign?.type || 'İndirim';
  $('campaignDescription').value = campaign?.description || '';
  $('campaignActive').checked = campaign ? campaign.active !== false : true;
  campaignFormCard.hidden = false;
  campaignFormCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeForm() {
  editingId = null;
  campaignForm.reset();
  $('campaignActive').checked = true;
  campaignFormCard.hidden = true;
}

function startEdit(id) {
  const campaign = campaigns.find((c) => c.id === id);
  if (campaign) openForm(campaign);
}

async function confirmDelete(id) {
  const campaign = campaigns.find((c) => c.id === id);
  if (!campaign) return;
  if (!confirm(`"${campaign.title}" kampanyasını silmek istediğine emin misin?`)) return;
  try {
    await deleteCampaign(id);
    showAdminMessage('success', 'Kampanya silindi.');
    await refreshData();
  } catch (err) {
    showAdminMessage('error', mapAuthError(err));
  }
}

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  showError(loginError, '');
  const btn = $('adminLoginBtn');
  btn.disabled = true;
  try {
    await loginAdmin({
      email: $('adminEmail').value,
      password: $('adminPassword').value,
    });
  } catch (err) {
    showError(loginError, mapAuthError(err));
  } finally {
    btn.disabled = false;
  }
});

$('btnNewCampaign')?.addEventListener('click', () => openForm());
$('campaignCancelBtn')?.addEventListener('click', closeForm);

campaignForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  showAdminMessage('error', '');
  const btn = $('campaignSaveBtn');
  btn.disabled = true;
  const data = {
    title: $('campaignTitle').value,
    category: $('campaignCategory').value,
    type: $('campaignType').value,
    description: $('campaignDescription').value,
    active: $('campaignActive').checked,
  };

  try {
    const user = getCurrentUser();
    if (!user) throw new Error('Oturum gerekli.');
    if (editingId) {
      await updateCampaign(editingId, data);
      showAdminMessage('success', 'Kampanya güncellendi.');
    } else {
      await createCampaign(data, user.uid);
      showAdminMessage('success', 'Kampanya oluşturuldu.');
    }
    closeForm();
    await refreshData();
  } catch (err) {
    console.error(err);
    showAdminMessage('error', mapAuthError(err));
  } finally {
    btn.disabled = false;
  }
});

// =====================
// INIT
// =====================
async function init() {
  initTopicHelper();

  if (!isFirebaseConfigured()) {
    showLogin();
    showError(loginError, 'Firebase yapılandırılmamış. js/firebase-config.js dosyasını doldurun (FIREBASE_SETUP.md).');
    return;
  }

  onAuthChange(async (user, _profile, admin) => {
    renderAuthArea(user, admin);

    if (!user || user.isAnonymous) {
      dashboardLoaded = false;
      showLogin();
      return;
    }
    if (!admin) {
      dashboardLoaded = false;
      showLogin();
      showError(
        loginError,
        `Bu hesap admin değil. Firestore’da admins/${user.uid} belgesini oluşturun.`
      );
      return;
    }
    showError(loginError, '');
    showDashboard();
    if (!dashboardLoaded) {
      dashboardLoaded = true;
      await refreshData();
    }
  });

  await initAuth();
  if (getCurrentUser() && !getCurrentUser().isAnonymous && !isAdmin()) {
    showLogin();
  }
}

init();
