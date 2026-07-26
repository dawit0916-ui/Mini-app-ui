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
    }

    // Telegram haptic feedback
    tg.HapticFeedback.selectionChanged();

    // Load tab data
    if (tabId === 'home') loadAvailableTasks();
    if (tabId === 'history') loadUserHistory();
    if (tabId === 'friends') loadReferralData();
    if (tabId === 'admin') loadAdminData();
    if (tabId === 'profile') loadUserProfileMetrics();
    if (tabId === 'levels') loadLevels();
    if (tabId === 'shop' && shopState.courses.length === 0) loadShopCourses();

    if (tabId === 'reminders') {
        loadReminderConfig();
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
                    // Add this hook right here:
                    if (panelId === 'panel-users') loadUserDirectory();
                    if (panelId === 'panel-payouts') loadPendingWithdrawals();
                    if (panelId === 'panel-proofs') loadPendingProofs();       
                    if (panelId === 'panel-task-manager') loadAdminTaskList();
                    if (panelId === 'panel-settings') { loadAdminData(); loadAdminSettings(); loadFastTaskAdminPanel(); }
                    if (panelId === 'panel-support') loadAdminTickets('open');
                    if (panelId === 'panel-admins') loadAdminRegistry();
                    if (panelId === 'panel-ad-manager') loadAdminAds();
                    if (panelId === 'panel-shop-manager') loadAdminCourses();
                    if (panelId === 'panel-console') conStartBackendStream();
                    if (panelId === 'panel-broadcast') { document.getElementById('broadcast-msg').value = '';}
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
