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

// ==========================================================================
// LEVEL CONFIG ADMIN — price, rewards, commission, discount, features per
// level. Backend routes (/api/admin/levels/config, /update) already
// existed and worked correctly; there was just no UI ever built for them.
// ==========================================================================
let _adminLevelsCache = [];

async function loadAdminLevelsConfig() {
    const listEl = document.getElementById('admin-levels-list');
    listEl.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-4">Loading...</p>';
    try {
        const res = await secureFetch('/api/admin/levels/config', { method: 'GET' });
        if (!res.success || !res.levels) {
            listEl.innerHTML = '<p class="text-center text-[10px] text-red-400 py-4">Failed to load levels.</p>';
            return;
        }
        _adminLevelsCache = res.levels;

        listEl.innerHTML = res.levels.map(lvl => `
            <div class="glass p-3 rounded-xl border border-white/5 flex justify-between items-center">
                <div class="min-w-0">
                    <p class="text-xs font-bold text-white">Lvl ${lvl.level} — ${lvl.name}</p>
                    <p class="text-[9px] text-slate-500">${lvl.cost.toLocaleString()} DASH · +${lvl.daily_task_reward}/day · ${lvl.commission_percent}% commission</p>
                </div>
                <button onclick="openLevelConfigDrawer(${lvl.level})" class="text-[10px] text-cyan-400 hover:text-cyan-300 shrink-0 ml-2">Edit</button>
            </div>
        `).join('');
    } catch (err) {
        listEl.innerHTML = '<p class="text-center text-[10px] text-red-400 py-4">Failed to load levels.</p>';
    }
}

let _currentEditingLevel = null;

function openLevelConfigDrawer(levelNumber) {
    const lvl = _adminLevelsCache.find(l => l.level === levelNumber);
    if (!lvl) return;

    _currentEditingLevel = levelNumber;

    document.getElementById('edit-level-number').textContent = lvl.level;
    document.getElementById('edit-level-name').value = lvl.name || '';
    document.getElementById('edit-level-cost').value = lvl.cost || 0;
    document.getElementById('edit-level-daily-reward').value = lvl.daily_task_reward || 0;
    document.getElementById('edit-level-daily-limit').value = lvl.daily_task_limit || 1;
    document.getElementById('edit-level-commission').value = lvl.commission_percent || 0;
    document.getElementById('edit-level-discount').value = lvl.cost_discount_percent ?? 100;

    const features = lvl.features || [];
    document.querySelectorAll('.edit-level-feature-cb').forEach(cb => {
        cb.checked = features.includes(cb.value);
    });

    document.getElementById('admin-level-edit-drawer').classList.add('active');
}

function closeLevelConfigDrawer() {
    document.getElementById('admin-level-edit-drawer').classList.remove('active');
    _currentEditingLevel = null;
}

async function saveLevelConfig() {
    if (!_currentEditingLevel) return;

    const features = Array.from(document.querySelectorAll('.edit-level-feature-cb:checked')).map(cb => cb.value);

    const payload = {
        level: _currentEditingLevel,
        name: document.getElementById('edit-level-name').value,
        cost: parseFloat(document.getElementById('edit-level-cost').value) || 0,
        daily_task_reward: parseFloat(document.getElementById('edit-level-daily-reward').value) || 0,
        daily_task_limit: parseInt(document.getElementById('edit-level-daily-limit').value) || 1,
        commission_percent: parseFloat(document.getElementById('edit-level-commission').value) || 0,
        cost_discount_percent: parseFloat(document.getElementById('edit-level-discount').value),
        features
    };

    const btn = document.getElementById('btn-save-level-config');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const res = await secureFetch('/api/admin/levels/update', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (res.success) {
            tg.HapticFeedback.notificationOccurred('success');
            showNotificationToast('Level updated', 'success');
            closeLevelConfigDrawer();
            loadAdminLevelsConfig();
        } else {
            showNotificationToast(res.error || 'Failed to update level', 'error');
        }
    } catch (err) {
        console.error('saveLevelConfig error:', err);
        showNotificationToast('Failed to save changes', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Save Changes';
    }
}
