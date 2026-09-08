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
