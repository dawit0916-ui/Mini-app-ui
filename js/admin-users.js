
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
            document.getElementById('admin-user-editor').classList.add('hidden');
            return;
        }
        // Isolate the exact matching user document from the payload array
        const foundUser = res.users[0];

        // Cache data payload locally
        currentEditingUserData = foundUser;
        currentEditingUserId = foundUser.user_id;

        // Sync editor text display fields
        document.getElementById('edit-user-display-id').innerText = foundUser.user_id;
        document.getElementById('edit-user-balance').innerText = parseFloat(foundUser.balance).toFixed(4);
        
        // Populate editable input value fields
        document.getElementById('new-user-balance').value = foundUser.balance;
        
        // Set state of Ban Button dynamically
        const banBtn = document.getElementById('btn-ban-toggle');
        if (foundUser.is_banned) {
            banBtn.innerHTML = "🔴 Unban User";
            banBtn.className = "flex-1 bg-yellow-600/20 text-yellow-400 py-3 rounded-xl text-[10px] font-black uppercase";
        } else {
            banBtn.innerHTML = "🪓 Ban User";
            banBtn.className = "flex-1 bg-red-600/20 text-red-400 py-3 rounded-xl text-[10px] font-black uppercase";
        }
        const wlBtn = document.getElementById('btn-whitelist-toggle');
if (foundUser.whitelisted) {
    wlBtn.innerHTML = "⭐ Whitelisted";
    wlBtn.className = "flex-1 bg-purple-600 text-white py-3 rounded-xl text-[10px] font-black uppercase";
} else {
    wlBtn.innerHTML = "☆ Whitelist";
    wlBtn.className = "flex-1 bg-purple-600/20 text-purple-400 py-3 rounded-xl text-[10px] font-black uppercase border border-purple-500/30";
}
          // Show strike count if inviter has any
const strikeRes = await secureFetch(`/api/admin/user-strikes/${foundUser.user_id}`);
const strikeDisplay = document.getElementById('inviter-strike-display');
const strikeCount = document.getElementById('inviter-strike-count');
if (strikeRes && strikeRes.strikes > 0) {
    strikeDisplay.classList.remove('hidden');
    strikeCount.innerText = `${strikeRes.strikes} / 5`;
} else {
    strikeDisplay.classList.add('hidden');
}
        document.getElementById('admin-user-editor').classList.remove('hidden');
        tg.HapticFeedback.impactOccurred('light');

    } catch (e) {
        console.error("Frontend search routing tracking error:", e);
        showAppAlert("Search engine error.", 'error')
    }
        }
async function updateUserMetrics() {
    const newBalance = document.getElementById('new-user-balance').value;

    if (!currentEditingUserId || newBalance === '') return;

    try {
        const res = await secureFetch('/api/admin/user/update', {
            method: 'POST',
            body: JSON.stringify({
                target_user_id: currentEditingUserId,
                balance: parseFloat(newBalance)
            })
        });

        if (res.success) {
            tg.HapticFeedback.notificationOccurred('success');
            showAppAlert("User metrics synchronized successfully.", 'success');

            document.getElementById('edit-user-balance').innerText = parseFloat(newBalance).toFixed(4);

            if (typeof loadUserDirectory === 'function') loadUserDirectory();
        } else {
            showAppAlert("Failed to update profile values.", 'error');
        }
    } catch (e) {
        console.error("Data tracking writing failure:", e);
        showAppAlert("Network communications failed.", 'error');
    }
}

// 3. Toggle Ban State Engine Action
async function toggleUserBanStatus() {
    if(!currentEditingUserId || !currentEditingUserData) return;
    
    const targetState = !currentEditingUserData.is_banned;
    const actionLabel = targetState ? "BAN" : "UNBAN";

    showAppConfirm(`Are you sure you want to ${actionLabel} this user?`, async (confirmed) => {
        if(!confirmed) return;

        try {
            const res = await secureFetch('/api/admin/users/ban', {
                method: 'POST',
                body: JSON.stringify({ 
                    userId: currentEditingUserId,
                    banned: targetState
                })
            });

            if(res.success) {
                tg.HapticFeedback.notificationOccurred('success');
                showAppAlert(`User successfully ${targetState ? 'banned' : 'unbanned'}!`, 'success');
                searchUser(); // Refresh data to load current layout state  
            } else {
                showAppAlert("Action denied by server.", 'error')
            }
        } catch(e) {
            showAppAlert("Failed to run ban assignment.", 'error')
        }
    });
}
async function toggleUserWhitelistStatus() {
    if (!currentEditingUserId || !currentEditingUserData) return;

    const targetState = !currentEditingUserData.whitelisted;
    const actionLabel = targetState ? "WHITELIST (allow multi-account/IP bypass)" : "REMOVE from whitelist";

    showAppConfirm(`Are you sure you want to ${actionLabel} this user?`, async (confirmed) => {
        if (!confirmed) return;

        try {
            const res = await secureFetch('/api/admin/user/whitelist', {
                method: 'POST',
                body: JSON.stringify({ userId: currentEditingUserId, whitelisted: targetState })
            });

            if (res.success) {
                tg.HapticFeedback.notificationOccurred('success');
                showAppAlert(`User ${targetState ? 'whitelisted' : 'removed from whitelist'}!`, 'success');
                searchUser();
            } else {
                showAppAlert("Action denied by server.", 'error');
            }
        } catch (e) {
            showAppAlert("Failed to update whitelist status.", 'error');
        }
    });
        }
  async function loadWhitelist() {
    const container = document.getElementById('whitelist-list');
    if (!container) return;
    container.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-4">Loading...</p>';

    try {
        const res = await secureFetch('/api/admin/whitelist');
        const users = res?.users || [];

        if (users.length === 0) {
            container.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-4">No whitelisted users yet</p>';
            return;
        }

        container.innerHTML = users.map(u => `
            <div class="glass p-3 flex justify-between items-center border-purple-500/15">
                <div>
                    <p class="text-xs font-bold text-white">${u.first_name || 'User'} ${u.username ? '@' + u.username : ''}</p>
                    <p class="text-[9px] text-slate-500">ID: ${u.user_id}</p>
                </div>
                <button onclick="quickRemoveWhitelist(${u.user_id})" class="bg-red-600/20 text-red-400 border border-red-500/20 text-[9px] px-3 py-1 rounded-lg font-black uppercase">Remove</button>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '<p class="text-center text-[10px] text-red-400 py-4">Failed to load.</p>';
    }
}

async function quickRemoveWhitelist(userId) {
    showAppConfirm("Remove this user from the whitelist?", async (ok) => {
        if (!ok) return;
        const res = await secureFetch('/api/admin/user/whitelist', {
            method: 'POST',
            body: JSON.stringify({ userId, whitelisted: false })
        });
        if (res.success) {
            showAppAlert("Removed from whitelist.", 'success');
            loadWhitelist();
        } else {
            showAppAlert("Failed to remove.", 'error');
        }
    });
}      

// 1. Fixed Directory Views Manager
function filterUserDirectory(filterType) {
    userDirectoryFilter = filterType;
    
    const allBtn = document.getElementById('btn-btn-dir-all') || document.getElementById('btn-dir-all');
    const banBtn = document.getElementById('btn-btn-dir-banned') || document.getElementById('btn-dir-banned');

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
                ${u.whitelisted ? '<span class="text-[10px]" title="Whitelisted">✅</span>' : ''}
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
