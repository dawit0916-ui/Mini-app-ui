let navObserved = false;

function moveNavIndicator(animate = true) {
    const nav = document.getElementById('bottomNav');
    const bar = document.getElementById('navIndicator');
    const active = nav && nav.querySelector('.nav-btn[aria-current="page"]');
    if (!nav || !bar || !active || active.offsetWidth === 0) return;

    // Re-align automatically on resize and when core.js unhides the admin tab
    if (!navObserved) {
        navObserved = true;
        new ResizeObserver(() => moveNavIndicator(false)).observe(nav);
        new MutationObserver(() => moveNavIndicator(false))
            .observe(nav, { subtree: true, attributes: true, attributeFilter: ['class'] });
    }

    const barW = 28;
    const left = active.offsetLeft + (active.offsetWidth - barW) / 2;
    const right = nav.clientWidth - left - barW;
    const first = !bar.dataset.ready;
    const movingRight = left > (parseFloat(bar.style.left) || 0);

    // Leading edge is fast, trailing edge is slow, so the bar stretches in transit
    bar.style.transitionDuration = (!animate || first)
        ? '0s, 0s'
        : (movingRight ? '0.38s, 0.18s' : '0.18s, 0.38s');
    bar.style.left = left + 'px';
    bar.style.right = right + 'px';
    bar.dataset.ready = '1';
}

// Position it once the nav is on screen
requestAnimationFrame(() => moveNavIndicator(false));

function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const targetTab = document.getElementById('tab-' + tabId);
    if(targetTab) targetTab.classList.add('active');
    window.scrollTo(0,0);

    // Reset all nav buttons
    document.querySelectorAll('.nav-btn').forEach(b => b.removeAttribute('aria-current'));

    // Activate selected
    if (btn) btn.setAttribute('aria-current', 'page');
    moveNavIndicator();
    tg.HapticFeedback.selectionChanged();
    
    if(tabId === 'home') { loadAvailableTasks(); initBannerCarousel(); }
    if(tabId === 'earn') loadAndShowAdsgram();
    if(tabId === 'history') loadUserHistory();
    if(tabId === 'friends') loadReferralData();
    if(tabId === 'marketplace') loadMarketplaceTasks();
    if(tabId === 'tasks');
    if(tabId === 'posts');
    if(tabId === 'myposts');
    if(tabId === 'admin') loadAdminData();
    if(tabId === 'profile') loadUserProfileMetrics();

    if(tabId === 'shop') { if (shopState.courses.length === 0) loadShopCourses(); }
    if(tabId === 'reminders') {
    loadReminderConfig();  // ✅ FIX: Load toggle config FIRST (which also loads stats)
}
        
    
}
// --- ADMIN HUB NAVIGATION ---
function switchAdminPanel(panelId) {
    const panels = [
        'panel-task-manager', 
        'panel-youtube-tasks',
        'panel-broadcast', 
        'panel-settings', 
        'panel-users', 
        'panel-payouts', 
        'panel-proofs', 
        'panel-admins', 
        'panel-shop-manager',
        'panel-console',
        'panel-support',
        'panel-ad-manager',
        'panel-banners',
        'panel-marketplace-review',
        'panel-feedback'
    ];
    
    if (panelId === 'hub') {
        document.getElementById('admin-hub-grid').classList.remove('hidden');
        panels.forEach(p => {
            const el = document.getElementById(p);
            if(el) el.classList.add('hidden');
        });
    } else {
        document.getElementById('admin-hub-grid').classList.add('hidden');
        panels.forEach(p => {
            const el = document.getElementById(p);
            if(el) {
                if (p === panelId) {
                    el.classList.remove('hidden');
                    // Add this hook right here:
                    if (panelId === 'panel-users') loadUserDirectory();
                    if (panelId === 'panel-payouts');
                    if (panelId === 'panel-proofs') loadPendingProofs();       
                    if (panelId === 'panel-task-manager') loadAdminTaskList();
                    if (panelId === 'panel-settings') { loadAdminData(); loadAdminSettings(); }
                    if (panelId === 'panel-support') loadAdminTickets('open');
                    if (panelId === 'panel-admins') loadAdminRegistry();
                    if (panelId === 'panel-ad-manager') loadAdminAds();
                    if (panelId === 'panel-feedback') loadAdminFeedback('new');
                    if (panelId === 'panel-shop-manager') loadAdminCourses();
                    if (panelId === 'panel-console') conStartBackendStream();
                    if (panelId === 'panel-broadcast') { document.getElementById('broadcast-msg').value = '';}
                    if (panelId === 'panel-banners') loadAdminBanners();
                    if (panelId === 'panel-marketplace-review') loadMarketplaceReviewQueue();
                } else {
                    el.classList.add('hidden');
                }
            }
        });
    }
    window.scrollTo(0, 0);
    tg.HapticFeedback.selectionChanged();
}

// Accordion Toggle Logic
function toggleAccordion(id) {
    const el = document.getElementById(id);
    el.classList.toggle('hidden');
    tg.HapticFeedback.impactOccurred('light');
}
