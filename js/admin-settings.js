async function saveSystemSettings() {
    const isMaint = document.getElementById('set-maintenance').checked;
    try {
        const res = await secureFetch('/api/admin/settings', {
            method: 'POST',
            body: JSON.stringify({ maintenance_mode: isMaint })
        });
        
        if(res.success) {
            tg.HapticFeedback.impactOccurred('medium');
            showAppAlert(`Maintenance mode ${isMaint ? 'enabled 🔴' : 'disabled 🟢'}.`, isMaint ? 'warning' : 'success');
        }
    } catch (e) {
        showAppAlert("Failed to update settings.", 'error');
    }
}

// Load initial settings on panel open (add to switchAdminPanel function)
function loadAdminSettings() {
    secureFetch('/api/admin/settings/all').then(data => {
        if (data && data.success) {
            document.getElementById('set-maintenance').checked = data.settings?.maintenance_mode || false;
            document.getElementById('set-ref-bonus').value = data.settings?.ref_bonus_amount || 0.5;
            document.getElementById('set-ref-percent').value = data.settings?.ref_commission_percent || 10;
            document.getElementById('set-ref-threshold').value = data.settings?.ref_tasks_required || 3;
            
        }
    }).catch(err => console.error('Failed to load settings:', err));
}
            // --- ADMIN: LOAD DASHBOARD ---
async function loadAdminData() {
    try {
        const stats = await secureFetch('/api/admin/stats');
        if (stats.error) return showAppAlert(stats.error, 'error', 'Stats Load Failed');

        document.getElementById('stat-users').innerText = stats.users;
        document.getElementById('stat-tasks').innerText = stats.tasks || 0;
        document.getElementById('set-maintenance').checked = stats.maintenance;
        document.getElementById('set-ref-bonus').value = stats.ref_bonus || 0.5;
        document.getElementById('set-ref-percent').value = stats.ref_percent || 10;

        loadAdminTaskList();
        
    } catch (e) { console.error('loadAdminData error:', e.message || e); }
}

// --- ADMIN: MANAGE TASKS ---

        async function loadUserHistory() {
    const container = document.getElementById('history-list');
    container.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-10">Loading history...</p>';
    
    try {
        const data = await secureFetch('/api/secure/history');
              
        if (!data.history || data.history.length === 0) {
    container.innerHTML = getEmptyStateHTML('🏜️', 'No History', 'Complete tasks to fill your vault');
    return;
}

        container.innerHTML = '';
        data.history.forEach(item => {
            container.insertAdjacentHTML('beforeend', `
                <div class="glass p-4 border-l-2 border-green-500/50 flex justify-between items-center">
                    <div>
                        <p class="text-xs font-bold">${item.title}</p>
                        <p class="text-[9px] text-slate-500">${new Date(item.date).toLocaleDateString()}</p>
                    </div>
                    <p class="text-xs font-black text-green-400">+${item.reward} DASH</p>
                </div>
            `);
        });
    } catch (e) {
        container.innerHTML = '<p class="text-center text-red-500 text-[10px]">Failed to load history.</p>';
    }
}

