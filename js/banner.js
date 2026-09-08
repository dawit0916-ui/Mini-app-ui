// ============================================
// HOME BANNER CAROUSEL
// ============================================

let bannerSlides = [];
let currentSlideIndex = 0;
let autoAdvanceTimer = null;

const DEFAULT_BANNER_SLIDE = {
  imageUrl: '/assets/default-banner.jpg',
  title: 'Welcome to Dash Earn',
  subtitle: 'Complete tasks, earn DASH',
  actionType: 'tab',
  actionTarget: 'earn'
};

async function initBannerCarousel() {
  renderBannerSkeleton();
  try {
    const res = await secureFetch('/api/banners');
    const data = await res.json();
    bannerSlides = (data.slides && data.slides.length > 0) ? data.slides : [DEFAULT_BANNER_SLIDE];
  } catch (err) {
    console.error('Failed to load banners:', err);
    bannerSlides = [DEFAULT_BANNER_SLIDE];
  }
  renderBannerSlides();
  setupBannerDrag();
  startAutoAdvance();
}

function renderBannerSkeleton() {
  const track = document.getElementById('bannerTrack');
  if (!track) return;
  track.innerHTML = `<div class="banner-skeleton"></div>`;
  const dots = document.getElementById('bannerDots');
  if (dots) dots.innerHTML = '';
}

function renderBannerSlides() {
  const track = document.getElementById('bannerTrack');
  const dots = document.getElementById('bannerDots');
  if (!track) return;

  track.innerHTML = bannerSlides.map((s, i) => `
    <div class="banner-slide" data-index="${i}" data-slide-id="${s._id || ''}" data-action-type="${s.actionType}" data-action-target="${s.actionTarget}">
      <img src="${s.imageUrl}" alt="${s.title || ''}" draggable="false" ${i === 0 ? '' : 'loading="lazy"'}>
      ${(s.title || s.subtitle) ? `
        <div class="banner-slide-text">
          ${s.title ? `<p class="banner-slide-title">${s.title}</p>` : ''}
          ${s.subtitle ? `<p class="banner-slide-subtitle">${s.subtitle}</p>` : ''}
        </div>
      ` : ''}
    </div>
  `).join('');

  dots.innerHTML = bannerSlides.length > 1
    ? bannerSlides.map((_, i) => `<div class="banner-dot ${i === 0 ? 'active' : ''}"></div>`).join('')
    : '';

  track.querySelectorAll('.banner-slide').forEach(slide => {
    slide.addEventListener('click', () => {
      if (slide.dataset.wasDragged === 'true') return;
      const index = Number(slide.dataset.index);
      const slideData = bannerSlides[index];
      trackBannerClick(slideData._id);
      handleBannerAction(slide.dataset.actionType, slide.dataset.actionTarget);
    });
  });
}

function trackBannerClick(slideId) {
  if (!slideId) return;
  secureFetch(`/api/banners/${slideId}/click`, { method: 'POST' }).catch(() => {});
}

function handleBannerAction(type, target) {
  switch (type) {
    case 'tab': {
      const btn = [...document.querySelectorAll('.nav-btn')]
        .find(b => b.getAttribute('onclick')?.includes(`'${target}'`));
      switchTab(target, btn);
      break;
    }
    case 'shop-section': {
      const shopBtn = [...document.querySelectorAll('.nav-btn')]
        .find(b => b.getAttribute('onclick')?.includes(`'shop'`));
      switchTab('shop', shopBtn);
      switchShopSection(target);
      break;
    }
    case 'earn-section': {
      const earnBtn = [...document.querySelectorAll('.nav-btn')]
        .find(b => b.getAttribute('onclick')?.includes(`'earn'`));
      switchTab('earn', earnBtn);
      openEarnSection(target);
      break;
    }
    case 'url':
      window.open(target, '_blank');
      break;
    default:
      break;
  }
}

// Pointer-based drag (mouse + touch unified)
function setupBannerDrag() {
  const track = document.getElementById('bannerTrack');
  if (!track) return;

  let isDown = false;
  let startX = 0;
  let scrollStart = 0;
  let moved = false;

  track.addEventListener('pointerdown', (e) => {
    isDown = true;
    moved = false;
    startX = e.clientX;
    scrollStart = track.scrollLeft;
    track.classList.add('dragging');
    track.setPointerCapture(e.pointerId);
    stopAutoAdvance();
  });

  track.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 5) moved = true;
    track.scrollLeft = scrollStart - dx;
  });

  track.addEventListener('pointerup', () => {
    isDown = false;
    track.classList.remove('dragging');
    if (moved) {
      track.querySelectorAll('.banner-slide').forEach(s => s.dataset.wasDragged = 'true');
      setTimeout(() => {
        track.querySelectorAll('.banner-slide').forEach(s => s.dataset.wasDragged = 'false');
      }, 50);
    }
    snapToNearestSlide();
    updateActiveDot();
    startAutoAdvance();
  });

  track.addEventListener('scroll', () => {
    updateActiveDot();
  });
}

function snapToNearestSlide() {
  const track = document.getElementById('bannerTrack');
  if (!track || !track.children[0]) return;
  const slideWidth = track.children[0].offsetWidth + 12;
  const index = Math.round(track.scrollLeft / slideWidth);
  currentSlideIndex = Math.max(0, Math.min(index, bannerSlides.length - 1));
  goToSlide(currentSlideIndex);
}

function goToSlide(index) {
  const track = document.getElementById('bannerTrack');
  if (!track || !track.children[0]) return;
  const slideWidth = track.children[0].offsetWidth + 12;
  track.scrollTo({ left: index * slideWidth, behavior: 'smooth' });
  currentSlideIndex = index;
  updateActiveDot();
}

function updateActiveDot() {
  document.querySelectorAll('.banner-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === currentSlideIndex);
  });
}

function startAutoAdvance() {
  stopAutoAdvance();
  if (bannerSlides.length <= 1) return; // no point auto-advancing a single/fallback slide
  autoAdvanceTimer = setInterval(() => {
    const next = (currentSlideIndex + 1) % bannerSlides.length;
    goToSlide(next);
  }, 4000);
}

function stopAutoAdvance() {
  if (autoAdvanceTimer) clearInterval(autoAdvanceTimer);
}

// ============================================
// ADMIN — BANNER MANAGEMENT
// ============================================

let adminBannerSlides = [];
let bannerSortMode = 'order'; // 'order' | 'clicks'
let editingBannerId = null;

const BANNER_ACTION_TARGETS = {
  'tab': ['home', 'earn', 'history', 'friends', 'admin', 'profile', 'levels', 'shop', 'reminders'],
  'shop-section': ['courses', 'apk', 'my-purchases'],
  'earn-section': ['ads', 'daily', 'youtube']
};

async function loadAdminBanners() {
  try {
    const res = await secureFetch('/api/admin/banners');
    const data = await res.json();
    adminBannerSlides = data.slides || [];
    renderAdminBannerList();
  } catch (err) {
    console.error('Load admin banners error:', err);
    showAppAlert('Failed to load banners', 'error');
  }
}

function setBannerSort(mode) {
  bannerSortMode = mode;
  document.getElementById('bannerSortDefault').classList.toggle('active', mode === 'order');
  document.getElementById('bannerSortClicks').classList.toggle('active', mode === 'clicks');
  renderAdminBannerList();
}

function renderAdminBannerList() {
  const list = document.getElementById('bannerAdminList');
  if (!list) return;

  const sorted = [...adminBannerSlides].sort((a, b) => {
    return bannerSortMode === 'clicks'
      ? b.clickCount - a.clickCount
      : a.order - b.order;
  });

  if (sorted.length === 0) {
    list.innerHTML = `<p class="text-white/50 text-sm text-center py-6">No banners yet. Tap "+ Add Slide" to create one.</p>`;
    return;
  }

  list.innerHTML = sorted.map(s => `
    <div class="banner-admin-row ${!s.isActive ? 'banner-admin-inactive' : ''}">
      <img src="${s.imageUrl}" class="banner-admin-thumb">
      <div class="banner-admin-info">
        <div class="banner-admin-title">${s.title || '(untitled)'}</div>
        <div class="banner-admin-meta">
          Order ${s.order} · ${s.actionType}${s.actionTarget ? ' → ' + s.actionTarget : ''}
        </div>
        <div class="banner-admin-meta">
          ${s.clickCount || 0} clicks${s.resetClicksAt ? ' · reset ' + timeAgo(s.resetClicksAt) : ''}
        </div>
      </div>
      <div class="banner-admin-actions">
        <button onclick="openBannerForm('${s._id}')">Edit</button>
        <button onclick="resetBannerClicks('${s._id}')">Reset</button>
        <button onclick="deleteBannerSlide('${s._id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

// ---- Create / Edit form ----

function openBannerForm(slideId) {
  editingBannerId = slideId;
  const modal = document.getElementById('bannerFormModal');
  const title = document.getElementById('bannerFormTitle');

  if (slideId) {
    const s = adminBannerSlides.find(b => b._id === slideId);
    if (!s) return;
    title.textContent = 'Edit Banner';
    document.getElementById('bannerImageUrlField').value = s.imageUrl;
    document.getElementById('bannerImagePreview').src = s.imageUrl;
    document.getElementById('bannerImagePreview').classList.remove('hidden');
    document.getElementById('bannerTitleField').value = s.title || '';
    document.getElementById('bannerSubtitleField').value = s.subtitle || '';
    document.getElementById('bannerOrderField').value = s.order || 0;
    document.getElementById('bannerActionTypeField').value = s.actionType || 'none';
    document.getElementById('bannerActiveField').checked = s.isActive !== false;
    updateBannerActionTargetOptions();
    if (s.actionType === 'url') {
      document.getElementById('bannerActionTargetUrl').value = s.actionTarget || '';
    } else {
      document.getElementById('bannerActionTargetSelect').value = s.actionTarget || '';
    }
  } else {
    title.textContent = 'Add Banner';
    document.getElementById('bannerImageUrlField').value = '';
    document.getElementById('bannerImagePreview').classList.add('hidden');
    document.getElementById('bannerTitleField').value = '';
    document.getElementById('bannerSubtitleField').value = '';
    document.getElementById('bannerOrderField').value = adminBannerSlides.length; // sensible default: append to end
    document.getElementById('bannerActionTypeField').value = 'none';
    document.getElementById('bannerActiveField').checked = true;
    updateBannerActionTargetOptions();
  }

  modal.classList.remove('hidden');
}

function closeBannerForm() {
  document.getElementById('bannerFormModal').classList.add('hidden');
  document.getElementById('bannerImageInput').value = '';
  editingBannerId = null;
}

function updateBannerActionTargetOptions() {
  const type = document.getElementById('bannerActionTypeField').value;
  const selectEl = document.getElementById('bannerActionTargetSelect');
  const urlEl = document.getElementById('bannerActionTargetUrl');

  if (type === 'url') {
    selectEl.classList.add('hidden');
    urlEl.classList.remove('hidden');
    return;
  }
  urlEl.classList.add('hidden');

  if (type === 'none' || !BANNER_ACTION_TARGETS[type]) {
    selectEl.classList.add('hidden');
    return;
  }

  selectEl.classList.remove('hidden');
  selectEl.innerHTML = BANNER_ACTION_TARGETS[type]
    .map(val => `<option value="${val}">${val}</option>`)
    .join('');
}

async function uploadBannerImage() {
  const fileInput = document.getElementById('bannerImageInput');
  if (!fileInput.files[0]) return showAppAlert('Pick an image first', 'error');

  const formData = new FormData();
  formData.append('image', fileInput.files[0]);

  try {
    const res = await fetch('/api/admin/banners/upload', {
      method: 'POST',
      headers: { 'X-Admin-Init-Data': window.Telegram.WebApp.initData },
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      const imageUrl = `/api/image/${data.fileId}`;
      document.getElementById('bannerImageUrlField').value = imageUrl;
      document.getElementById('bannerImagePreview').src = imageUrl;
      document.getElementById('bannerImagePreview').classList.remove('hidden');
      showAppAlert('Image uploaded', 'success');
    } else {
      showAppAlert('Upload failed', 'error');
    }
  } catch (err) {
    console.error('Banner upload error:', err);
    showAppAlert('Upload failed', 'error');
  }
}

async function saveBannerSlide() {
  const imageUrl = document.getElementById('bannerImageUrlField').value;
  if (!imageUrl) return showAppAlert('Upload an image first', 'error');

  const actionType = document.getElementById('bannerActionTypeField').value;
  const actionTarget = actionType === 'url'
    ? document.getElementById('bannerActionTargetUrl').value
    : document.getElementById('bannerActionTargetSelect').value;

  const payload = {
    imageUrl,
    title: document.getElementById('bannerTitleField').value,
    subtitle: document.getElementById('bannerSubtitleField').value,
    order: Number(document.getElementById('bannerOrderField').value) || 0,
    actionType,
    actionTarget: actionType === 'none' ? '' : actionTarget,
    isActive: document.getElementById('bannerActiveField').checked
  };

  try {
    const url = editingBannerId ? `/api/admin/banners/${editingBannerId}` : '/api/admin/banners';
    const method = editingBannerId ? 'PUT' : 'POST';
    const res = await secureFetch(url, { method, body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.success) {
      showAppAlert('Banner saved', 'success');
      closeBannerForm();
      loadAdminBanners();
    } else {
      showAppAlert('Save failed', 'error');
    }
  } catch (err) {
    console.error('Save banner error:', err);
    showAppAlert('Save failed', 'error');
  }
}

async function deleteBannerSlide(slideId) {
  if (!confirm('Delete this banner?')) return;
  try {
    const res = await secureFetch(`/api/admin/banners/${slideId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showAppAlert('Banner deleted', 'success');
      loadAdminBanners();
    }
  } catch (err) {
    console.error('Delete banner error:', err);
    showAppAlert('Delete failed', 'error');
  }
}

async function resetBannerClicks(slideId) {
  if (!confirm('Reset click count for this banner?')) return;
  try {
    const res = await secureFetch(`/api/admin/banners/${slideId}/reset-clicks`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showAppAlert('Clicks reset', 'success');
      loadAdminBanners();
    }
  } catch (err) {
    console.error('Reset clicks error:', err);
    showAppAlert('Reset failed', 'error');
  }
}
