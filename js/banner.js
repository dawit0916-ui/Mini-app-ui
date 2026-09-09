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
    
    bannerSlides = (res.slides && res.slides.length > 0) ? res.slides : [DEFAULT_BANNER_SLIDE];
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
let bannerSortMode = 'order';
let editingBannerId = null;

const BANNER_ACTION_TARGETS = {
  'tab': ['home', 'earn', 'history', 'friends', 'admin', 'profile', 'levels', 'shop', 'reminders'],
  'shop-section': ['courses', 'apk', 'my-purchases'],
  'earn-section': ['ads', 'daily', 'youtube']
};

async function loadAdminBanners() {
  try {
    const res = await secureFetch('/api/admin/banners');
    
    adminBannerSlides = res.slides || [];
    renderAdminBannerList();
  } catch (err) {
    console.error('Load admin banners error:', err);
  }
}

function setBannerSort(mode) {
  bannerSortMode = mode;
  document.getElementById('banner-sort-order').classList.toggle('bg-pink-600', mode === 'order');
  document.getElementById('banner-sort-order').classList.toggle('text-white', mode === 'order');
  document.getElementById('banner-sort-order').classList.toggle('text-slate-400', mode !== 'order');
  document.getElementById('banner-sort-clicks').classList.toggle('bg-pink-600', mode === 'clicks');
  document.getElementById('banner-sort-clicks').classList.toggle('text-white', mode === 'clicks');
  document.getElementById('banner-sort-clicks').classList.toggle('text-slate-400', mode !== 'clicks');
  renderAdminBannerList();
}

function renderAdminBannerList() {
  const list = document.getElementById('admin-banners-list');
  const sorted = [...adminBannerSlides].sort((a, b) =>
    bannerSortMode === 'clicks' ? b.clickCount - a.clickCount : a.order - b.order
  );

  if (sorted.length === 0) {
    list.innerHTML = `<p class="text-center text-[10px] text-slate-500 py-4">No banners yet.</p>`;
    return;
  }

  list.innerHTML = sorted.map(s => `
    <div class="bg-white/5 p-3 rounded-xl flex gap-3 items-center ${!s.isActive ? 'opacity-40' : ''}">
      <img src="${s.imageUrl}" class="w-16 rounded-lg" style="aspect-ratio:16/9; object-fit:cover;">
      <div class="flex-1 min-w-0">
        <p class="text-xs font-bold text-white truncate">${s.title || '(untitled)'}</p>
        <p class="text-[9px] text-slate-500">Order ${s.order} · ${s.actionType}${s.actionTarget ? ' → ' + s.actionTarget : ''}</p>
        <p class="text-[9px] text-slate-500">${s.clickCount || 0} clicks${s.resetClicksAt ? ' · reset ' + timeAgoShort(s.resetClicksAt) : ''}</p>
      </div>
      <div class="flex flex-col gap-1">
        <button onclick="editBannerSlide('${s._id}')" class="text-[9px] font-black uppercase text-blue-400 px-2 py-1">Edit</button>
        <button onclick="resetBannerClicks('${s._id}')" class="text-[9px] font-black uppercase text-yellow-400 px-2 py-1">Reset</button>
        <button onclick="deleteBannerSlide('${s._id}')" class="text-[9px] font-black uppercase text-red-400 px-2 py-1">Delete</button>
      </div>
    </div>
  `).join('');
}

function timeAgoShort(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  return days === 0 ? 'today' : `${days}d ago`;
}

function updateBannerActionTargetOptions() {
  const type = document.getElementById('banner-action-type').value;
  const selectEl = document.getElementById('banner-action-target-select');
  const urlEl = document.getElementById('banner-action-target-url');

  urlEl.classList.add('hidden');
  selectEl.classList.add('hidden');

  if (type === 'url') {
    urlEl.classList.remove('hidden');
  } else if (BANNER_ACTION_TARGETS[type]) {
    selectEl.classList.remove('hidden');
    selectEl.innerHTML = BANNER_ACTION_TARGETS[type].map(v => `<option value="${v}">${v}</option>`).join('');
  }
}

function previewBannerImage() {
  const url = document.getElementById('banner-image-url').value.trim();
  const preview = document.getElementById('banner-image-preview');
  if (url) {
    preview.src = url;
    preview.classList.remove('hidden');
  } else {
    preview.classList.add('hidden');
  }
}
function editBannerSlide(id) {
  const s = adminBannerSlides.find(b => b._id === id);
  if (!s) return;
  editingBannerId = id;

  document.getElementById('banner-form-heading').textContent = 'Edit Banner';
  document.getElementById('banner-image-url').value = s.imageUrl;
  document.getElementById('banner-image-preview').src = s.imageUrl;
  document.getElementById('banner-image-preview').classList.remove('hidden');
  document.getElementById('banner-title').value = s.title || '';
  document.getElementById('banner-subtitle').value = s.subtitle || '';
  document.getElementById('banner-order').value = s.order || 0;
  document.getElementById('banner-action-type').value = s.actionType || 'none';
  document.getElementById('banner-active').checked = s.isActive !== false;
  updateBannerActionTargetOptions();
  if (s.actionType === 'url') {
    document.getElementById('banner-action-target-url').value = s.actionTarget || '';
  } else {
    document.getElementById('banner-action-target-select').value = s.actionTarget || '';
  }
  document.getElementById('banner-cancel-edit-btn').classList.remove('hidden');
  document.getElementById('panel-banners').scrollIntoView({ behavior: 'smooth' });
}

function resetBannerForm() {
  editingBannerId = null;
  document.getElementById('banner-form-heading').textContent = 'Add Banner';
  document.getElementById('banner-image-url').value = '';
  document.getElementById('banner-image-preview').classList.add('hidden');
  document.getElementById('banner-title').value = '';
  document.getElementById('banner-subtitle').value = '';
  document.getElementById('banner-order').value = '';
  document.getElementById('banner-action-type').value = 'none';
  document.getElementById('banner-active').checked = true;
  updateBannerActionTargetOptions();
  document.getElementById('banner-cancel-edit-btn').classList.add('hidden');
}

async function saveBannerSlide() {
  const imageUrl = document.getElementById('banner-image-url').value;
  if (!imageUrl) return showAppAlert('Upload an image first', 'error');

  const actionType = document.getElementById('banner-action-type').value;
  const actionTarget = actionType === 'url'
    ? document.getElementById('banner-action-target-url').value
    : document.getElementById('banner-action-target-select').value;

  const payload = {
    imageUrl,
    title: document.getElementById('banner-title').value,
    subtitle: document.getElementById('banner-subtitle').value,
    order: Number(document.getElementById('banner-order').value) || 0,
    actionType,
    actionTarget: actionType === 'none' ? '' : actionTarget,
    isActive: document.getElementById('banner-active').checked
  };

  try {
    const url = editingBannerId ? `/api/admin/banners/${editingBannerId}` : '/api/admin/banners';
    const method = editingBannerId ? 'PUT' : 'POST';
    const res = await secureFetch(url, { method, body: JSON.stringify(payload) });

    if (res.success) {
      showAppAlert('Banner saved', 'success');
      resetBannerForm();
      loadAdminBanners();
    } else {
      showAppAlert('Save failed', 'error');
    }
  } catch (err) {
    console.error('Save banner error:', err);
    showAppAlert('Save failed', 'error');
  }
}

async function deleteBannerSlide(id) {
  if (!confirm('Delete this banner?')) return;
  try {
    const res = await secureFetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
    
    if (res.success) {
      showAppAlert('Banner deleted', 'success');
      loadAdminBanners();
    }
  } catch (err) {
    console.error('Delete banner error:', err);
  }
}

async function resetBannerClicks(id) {
  if (!confirm('Reset click count?')) return;
  try {
    const res = await secureFetch(`/api/admin/banners/${id}/reset-clicks`, { method: 'POST' });
    
    if (res.success) {
      showAppAlert('Clicks reset', 'success');
      loadAdminBanners();
    }
  } catch (err) {
    console.error('Reset clicks error:', err);
  }
}
