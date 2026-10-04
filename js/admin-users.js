// 1. Enhanced Search Engine Action (Fixed Query Routing Alignment)
async function searchUser() {
    const searchId = document.getElementById('search-user-id').value.trim();
    if (!searchId) return showAppAlert("Please enter a Telegram ID.", 'warning')       
    try {
        // Corrected path from /api/admin/users/${id} to use search query parameters
        const res = await secureFetch(`/api/admin/users?search=${searchId}`);

        // The backend returns an array under "users". Let's check if we got a match
        if (!res.success || !res.users || res.users.length === 0) {
            showAppAlert("User record not found.", 'error')
            return;
        }
        // Isolate the exact matching user document from the payload array
        const foundUser = res.users[0];

        // Cache data payload locally
        currentEditingUserData = foundUser;
        currentEditingUserId = foundUser.user_id;

        openUserEditDrawer(foundUser);
        tg.HapticFeedback.impactOccurred('light');

    } catch (e) {
        console.error("Frontend search routing tracking error:", e);
        showAppAlert("Search engine error.", 'error')
    }
        }

function openUserEditDrawer(u) {
    document.getElementById('edit-user-display-id').innerText = u.user_id;
    document.getElementById('edit-user-name').innerText = u.first_name || 'Member';
    document.getElementById('edit-user-username').innerText = u.username && u.username !== 'N/A' ? '@' + u.username : 'N/A';
    document.getElementById('edit-user-joined').innerText = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Unknown';
    document.getElementById('edit-user-referrals').innerText = u.referralCount || 0;
    document.getElementById('edit-user-total-earned').innerText = (u.total_earned || 0).toLocaleString() + ' DASH';
    document.getElementById('edit-user-tasks-done').innerText = u.tasksCompleted || 0;
    document.getElementById('edit-user-balance-input').value = u.balance || 0;
    
    document.getElementById('edit-user-banned-input').checked = !!u.is_banned;
    document.getElementById('edit-user-redflag-input').checked = !!u.red_flag;
    loadUserReferralMap(u.user_id);
    loadUserAuditHistory(u.user_id);
    document.getElementById('admin-user-edit-drawer').classList.add('active');
}

function closeUserEditDrawer() {
    document.getElementById('admin-user-edit-drawer').classList.remove('active');
}

async function saveUserEdit() {
    if (!currentEditingUserId) return;

    const newBalance = parseFloat(document.getElementById('edit-user-balance-input').value);
    
    const newBanned = document.getElementById('edit-user-banned-input').checked;
    const newRedFlag = document.getElementById('edit-user-redflag-input').checked;

    const btn = document.getElementById('btn-save-user-edit');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        // Balance/red-flag go through the generic update route
        const res = await secureFetch('/api/admin/user/update', {
            method: 'POST',
            body: JSON.stringify({
                target_user_id: currentEditingUserId,
                balance: newBalance,
                red_flag: newRedFlag
            })
        });

        // Ban status goes through its own dedicated route, since that one
        // also notifies the user via Telegram — the generic update route
        // doesn't do that, and losing the notification would be a step back.
        let banRes = { success: true };
        if (newBanned !== !!currentEditingUserData?.is_banned) {
            banRes = await secureFetch('/api/admin/users/ban', {
                method: 'POST',
                body: JSON.stringify({ userId: currentEditingUserId, banned: newBanned })
            });
        }

        

        if (res.success && banRes.success) {
            tg.HapticFeedback.notificationOccurred('success');
            showAppAlert("User updated successfully.", 'success');
            closeUserEditDrawer();
            loadUserReferralMap(u.user_id);
            loadUserAuditHistory(u.user_id);
            if (typeof loadUserDirectory === 'function') loadUserDirectory();
        } else {
            showAppAlert("Failed to update some values.", 'error');
        }
    } catch (e) {
        console.error("User edit save failure:", e);
        showAppAlert("Failed to save changes.", 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Save Changes';
    }
}
// 1. Fixed Directory Views Manager
function filterUserDirectory(filterType) {
    userDirectoryFilter = filterType;
    
       const allBtn = document.getElementById('btn-dir-all');
       const banBtn = document.getElementById('btn-dir-banned');
    
    if(allBtn && banBtn) {
        if(filterType === 'all') {
            allBtn.className = "flex-1 py-2 rounded-lg text-[10px] font-black uppercase bg-blue-600 text-white transition-all";
            banBtn.className = "flex-1 py-2 rounded-lg text-[10px] font-black uppercase text-slate-400 transition-all";
        } else {
            allBtn.className = "flex-1 py-2 rounded-lg text-[10px] font-black uppercase text-slate-400 transition-all";
            banBtn.className = "flex-1 py-2 rounded-lg text-[10px] font-black uppercase bg-red-600 text-white transition-all";
        }
    }
    
    loadUserDirectory();
}

// 2. Fixed Route Isolation Engine
async function loadUserDirectory() {
    const listContainer = document.getElementById('admin-user-directory-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-4">Syncing database records...</p>';

    try {
        // CHANGED: Routing layout modified to point to the correct subdirectory structure
        const res = await secureFetch(`/api/admin/directory?filter=${userDirectoryFilter}`);
        
        // Handle variations in custom wrapper payloads
        const users = Array.isArray(res) ? res : (res.users || []);
        
        if (!users || users.length === 0) {
            listContainer.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-6 uppercase font-bold tracking-wider">No users found inside this view</p>';
            return;
        }

        listContainer.innerHTML = users.map(u => `
    <div onclick="document.getElementById('search-user-id').value='${u.user_id}'; searchUser();" class="glass p-3 flex justify-between items-center border-l-2 ${u.is_banned ? 'border-red-500 bg-red-500/5' : 'border-slate-500/40'} active:scale-[0.99] transition-all cursor-pointer">
        <div>
            <div class="flex items-center gap-1.5">
                <p class="text-xs font-bold text-white">${u.first_name || (u.username ? '@' + u.username : 'ID: ' + u.user_id)}</p>
            </div>
            <p class="text-[9px] font-bold text-slate-400">ID: ${u.user_id}${u.username ? ' · @' + u.username : ''}</p>
        </div>
        <div class="text-right">
            <p class="text-[10px] font-black text-green-400">${(u.balance || 0).toFixed(2)} DASH</p>
        </div>
    </div>
`).join('');

    } catch (e) {
        console.error("Directory Render Crash:", e);
        listContainer.innerHTML = '<p class="text-center text-[10px] text-red-400">Directory loading error.</p>';
    }
}
