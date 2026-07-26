/**
 * UPDATED SWITCHTAB FUNCTION
 * Integrated with premium navigation layout engine
 * Preserves all original functionality while adding layout animations
 */

function switchTab(tabId, btn) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab
    const targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) targetTab.classList.add('active');

    window.scrollTo(0, 0);

    // Reset all nav buttons
    document.querySelectorAll('.nav-btn').forEach(button => {
        button.classList.remove('nav-active');

        const img = button.querySelector('img');
        if (img) {
            img.classList.add('opacity-40');
            img.classList.remove('opacity-100');
        }

        const span = button.querySelector('span');
        if (span) {
            span.className =
                'text-[8px] font-black uppercase tracking-wider text-slate-600';
        }
    });

    // Activate selected button
    if (btn) {
        btn.classList.add('nav-active');

        const img = btn.querySelector('img');
        if (img) {
            img.classList.remove('opacity-40');
            img.classList.add('opacity-100');
        }

        const span = btn.querySelector('span');
        if (span) {
            span.className =
                'text-[8px] font-black uppercase tracking-wider text-yellow-300/80';
        }

        // NEW: Trigger premium navigation layout animation
        if (window.premiumNav && window.premiumNav.switchTo) {
            window.premiumNav.switchTo(tabId);
        }
    }

    // Telegram haptic feedback
    if (window.tg && window.tg.HapticFeedback) {
        tg.HapticFeedback.selectionChanged();
    }

    // Load tab data
    if (tabId === 'home') loadAvailableTasks();
    if (tabId === 'history') loadUserHistory();
    if (tabId === 'friends') loadReferralData();
    if (tabId === 'admin') loadAdminData();
    if (tabId === 'profile') loadUserProfileMetrics();
    if (tabId === 'levels') loadLevels();
    if (tabId === 'shop' && shopState && shopState.courses && shopState.courses.length === 0) loadShopCourses();
    if (tabId === 'reminders') loadReminderConfig();
}

// ===== ADMIN HUB NAVIGATION (UNCHANGED) =====

/**
 * Switch admin panel
 * No changes needed - premium nav only affects main tab navigation
 */
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
        'panel-ad-manager'
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
                    // Data loading hooks
                    if (panelId === 'panel-users') loadUserDirectory();
                    if (panelId === 'panel-payouts') loadPendingWithdrawals();
                    if (panelId === 'panel-proofs') loadPendingProofs();       
                    if (panelId === 'panel-task-manager') loadAdminTaskList();
                    if (panelId === 'panel-settings') { 
                        loadAdminData(); 
                        loadAdminSettings(); 
                        loadFastTaskAdminPanel(); 
                    }
                    if (panelId === 'panel-support') loadAdminTickets('open');
                    if (panelId === 'panel-admins') loadAdminRegistry();
                    if (panelId === 'panel-ad-manager') loadAdminAds();
                    if (panelId === 'panel-shop-manager') loadAdminCourses();
                    if (panelId === 'panel-console') conStartBackendStream();
                    if (panelId === 'panel-broadcast') { 
                        const broadcastMsg = document.getElementById('broadcast-msg');
                        if (broadcastMsg) broadcastMsg.value = '';
                    }
                } else {
                    el.classList.add('hidden');
                }
            }
        });
    }
    window.scrollTo(0, 0);
    
    if (window.tg && window.tg.HapticFeedback) {
        tg.HapticFeedback.selectionChanged();
    }
}

/**
 * Toggle accordion
 * No changes needed
 */
function toggleAccordion(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.toggle('hidden');
        if (window.tg && window.tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    }
}

/**
 * Show/toggle admin button based on user role
 * Call this when user auth changes or after login
 */
function updateAdminNavVisibility(isAdmin) {
    const adminBtn = document.getElementById('nav-admin');
    if (adminBtn) {
        if (isAdmin) {
            adminBtn.classList.remove('hidden');
        } else {
            adminBtn.classList.add('hidden');
        }
        // Recalculate layout after visibility change
        if (window.premiumNav && window.premiumNav.recalculate) {
            window.premiumNav.recalculate();
        }
    }
}

/**
 * Utility: Get current active tab
 */
function getActiveTab() {
    const active = document.querySelector('.nav-btn.nav-active');
    return active ? active.getAttribute('data-tab') : 'home';
}
