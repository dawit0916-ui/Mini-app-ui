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

// Save new user bonus
async function saveNewUserBonus() {
    const bonus = parseFloat(document.getElementById('set-new-user-bonus').value);
    if (isNaN(bonus) || bonus < 0) {
        return showAppAlert("Please enter a valid bonus amount.", 'warning');
    }
    
    try {
        const res = await secureFetch('/api/admin/settings', {
            method: 'POST',
            body: JSON.stringify({ new_user_bonus: bonus })
        });
        
        if (res.success) {
            showAppAlert("New user bonus updated!", 'success');
        }
    } catch (e) {
        showAppAlert("Failed to save bonus.", 'error');
    }
}

// Save bot configuration
async function saveBotConfig() {
    const botUsername = document.getElementById('set-bot-username').value.trim();
    const supportChannel = document.getElementById('set-support-channel').value.trim();
    
    if (!botUsername) return showAppAlert("Bot username is required.", 'warning');
    
    try {
        const res = await secureFetch('/api/admin/settings', {
            method: 'POST',
            body: JSON.stringify({ bot_username: botUsername, support_channel: supportChannel })
        });
        
        if (res.success) {
            showAppAlert("Bot configuration saved!", 'success');
        }
    } catch (e) {
        showAppAlert("Failed to save bot config.", 'error');
    }
}

// Save IP Guard settings
async function saveIPGuardSettings() {
    const threshold = parseInt(document.getElementById('set-autoban-threshold').value);
    const resetDays = parseInt(document.getElementById('set-strike-reset-days').value);
    
    if (isNaN(threshold) || threshold < 1 || isNaN(resetDays) || resetDays < 1) {
        return showAppAlert("Please enter valid numbers for all fields.", 'warning');
    }
    
    try {
        const res = await secureFetch('/api/admin/settings', {
            method: 'POST',
            body: JSON.stringify({
                ip_guard_autoban_threshold: threshold,
                strike_reset_days: resetDays
            })
        });
        
        if (res.success) {
            showAppAlert("IP Guard settings updated!", 'success');
        }
    } catch (e) {
        showAppAlert("Failed to save IP Guard settings.", 'error');
    }
}

// Load initial settings on panel open (add to switchAdminPanel function)
function loadAdminSettings() {
    secureFetch('/api/admin/settings/all').then(data => {
        if (data && data.success) {
            document.getElementById('set-maintenance').checked = data.settings?.maintenance_mode || false;
            document.getElementById('set-new-user-bonus').value = data.settings?.new_user_bonus || 0;
            document.getElementById('set-bot-username').value = data.settings?.bot_username || 'Dashearn_bot';
            document.getElementById('set-support-channel').value = data.settings?.support_channel || '';
            document.getElementById('set-ref-bonus').value = data.settings?.ref_bonus_amount || 0.5;
            document.getElementById('set-ref-percent').value = data.settings?.ref_commission_percent || 10;
            document.getElementById('set-ref-threshold').value = data.settings?.ref_tasks_required || 3;
            document.getElementById('set-autoban-threshold').value = data.settings?.ip_guard_autoban_threshold || 5;
            document.getElementById('set-strike-reset-days').value = data.settings?.strike_reset_days || 30;
            
        }
    }).catch(err => console.error('Failed to load settings:', err));
}
async function saveSettings() {
    const isMaint = document.getElementById('set-maintenance').checked;

    try {
        const res = await secureFetch('/api/admin/settings', {
            method: 'POST',
            body: JSON.stringify({ maintenance_mode: isMaint })
        });
        
        if(res.success) {
            tg.HapticFeedback.impactOccurred('medium');
            showAppAlert(`Maintenance mode is now ${isMaint ? 'ON 🔴' : 'OFF 🟢'}.`, isMaint ? 'warning' : 'success');
        }
    } catch (e) {
        showAppAlert("Failed to update settings.", 'error');
    }
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
