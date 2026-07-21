// --- Share Referral ---
function shareInvite() {
    const botUsername = "Dashearn_bot"; // 🚩 CHANGE THIS
    const refLink = `https://t.me/${botUsername}?start=${user.id}`;
    const text = "💰 Join Dash earn Bot and start earning USDT with me! It's free and easy.";
    
    // Telegram's native sharing method
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(text)}`;
    tg.openTelegramLink(shareUrl);
}

// --- Copy Link ---
function copyRefLink() {
    const input = document.getElementById('ref-link-input');
    input.select();
    document.execCommand('copy');
    
    // Telegram native notification
    navigator.clipboard.writeText(input.value);
    showNotificationToast("Referral link copied to clipboard successfully!", "success");
  }
 async function addNewCategory() {
    const input = document.getElementById('new-category-name');
    const name = input.value.trim();
    if(!name) return showAppAlert("Please provide a category name.", 'warning')
    
    // Send it to your backend if you want it persistent, 
    // or push it right directly into the DOM dropdown picker element layout:
    updateCategoryDropdown(name);
    
    // Also build a new filter chip dynamically for the main task navigation bar layout
    const catBar = document.getElementById('category-bar');
    if(catBar) {
        catBar.insertAdjacentHTML('beforeend', `
            <button onclick="filterTasks('${name}', this)" class="category-chip">${name}</button>
        `);
    }
    
    input.value = '';
    showAppAlert(`Category "${name}" added successfully!`, 'success')
    }

// Update referral settings (already exists, enhanced)
async function saveRefSettings() {
    const bonus = parseFloat(document.getElementById('set-ref-bonus').value);
    const percent = parseInt(document.getElementById('set-ref-percent').value);
    const threshold = parseInt(document.getElementById('set-ref-threshold').value);

    if (isNaN(bonus) || isNaN(percent) || isNaN(threshold)) {
        return showAppAlert("Please fill all referral fields.", 'warning');
    }

    try {
        const res = await secureFetch('/api/admin/settings', {
            method: 'POST',
            body: JSON.stringify({
                ref_bonus_amount: bonus,
                ref_commission_percent: percent,
                ref_tasks_required: threshold
            })
        });
        
        if (res.success) {
            tg.HapticFeedback.notificationOccurred('success');
            showAppAlert("Referral rules updated successfully!", 'success');
        }
    } catch (e) {
        showAppAlert("Failed to update referral settings.", 'error');
    }
}
async function saveRefSettings() {
    const bonus = document.getElementById('set-ref-bonus').value;
    const percent = document.getElementById('set-ref-percent').value;

    await secureFetch('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({ 
            ref_bonus_amount: parseFloat(bonus), 
            ref_commission_percent: parseInt(percent) 
        })
    });
    showAppAlert("Referral rules updated!", 'success')
        }


// --- UPDATED REFERRAL LOGIC ---
async function loadReferralData() {
    const linkInput = document.getElementById('ref-link-input');
    if (linkInput) linkInput.value = `https://t.me/Dashearn_bot?start=${user.id}`;
    const listContainer = document.getElementById('friends-list');
    try {
        const data = await secureFetch('/api/secure/referrals');
        const tasksRequired =3; // Match your admin setting
        
        let activeTotal = 0;
        let commTotal = 0;

        if (!data || !data.friends) {
            listContainer.innerHTML = getEmptyStateHTML('👥', 'No Friends', 'Invite friends to grow your team');
            return;
        }

        listContainer.innerHTML = data.friends.map(f => {
            const isReady = f.tasks_done >= tasksRequired;
            const progress = Math.min((f.tasks_done / tasksRequired) * 100, 100);
            const displayName = f.first_name || f.username || "Anonymous User";
            const initial = displayName.charAt(0).toUpperCase();
            
            if(isReady) {
                activeTotal++;
                commTotal += (f.commission_earned || 0);
            }

            return `
    <div class="relative overflow-hidden rounded-2xl p-4 mb-3"
         style="background: ${isReady 
            ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(0,0,0,0.3))' 
            : 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(0,0,0,0.3))'};
         border: 1px solid ${isReady ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'};">

        <!-- Status glow -->
        ${isReady ? '<div class="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>' : ''}

        <div class="flex items-center gap-3">

            <!-- Avatar -->
            <div class="relative flex-shrink-0">
                <div class="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black"
                     style="background: linear-gradient(135deg, ${isReady ? '#065f46, #047857' : '#1e293b, #0f172a'}); border: 1px solid ${isReady ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'};">
                    ${initial}
                </div>
                <!-- Online dot -->
                <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black"
                     style="background: ${isReady ? '#10b981' : '#f59e0b'};"></div>
            </div>

            <!-- Name + status -->
            <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-1">
                    <p class="text-sm font-black text-white truncate">${displayName}</p>
                    <div class="flex items-center gap-1 flex-shrink-0 ml-2">
                        <img src="/assets/images/dash-coin.png" class="w-3.5 h-3.5 object-contain">
                        <span class="text-xs font-black ${isReady ? 'text-orange-300' : 'text-slate-600'}">
                            ${isReady ? '+' + Math.floor(f.commission_earned || 0) : '🔒'}
                        </span>
                    </div>
                </div>

                <!-- Progress bar -->
                <div class="w-full h-1.5 rounded-full overflow-hidden mb-1.5"
                     style="background: rgba(255,255,255,0.05);">
                    <div class="h-full rounded-full transition-all duration-700"
                         style="width: ${progress}%; background: ${isReady 
                            ? 'linear-gradient(90deg, #10b981, #34d399)' 
                            : 'linear-gradient(90deg, #f59e0b, #fbbf24)'};
                         box-shadow: ${isReady ? '0 0 8px rgba(16,185,129,0.4)' : '0 0 8px rgba(245,158,11,0.3)'};"></div>
                </div>

                <!-- Bottom row -->
                <div class="flex items-center justify-between">
                    <span class="text-[9px] font-black uppercase tracking-wider"
                          style="color: ${isReady ? '#10b981' : '#f59e0b'};">
                        ${isReady ? '✓ Active' : '⏳ Pending'}
                    </span>
                    <span class="text-[9px] font-bold text-slate-600">
                        ${f.tasks_done || 0}/${tasksRequired} tasks
                    </span>
                </div>
            </div>

        </div>
    </div>`;
        }).join('');

        document.getElementById('total-invited').innerText = activeTotal;
        document.getElementById('earned-points').innerText = commTotal.toFixed(2);

    } catch (e) {
        console.error(e);
        listContainer.innerHTML = '<p class="text-red-500 text-[10px]">Error syncing team.</p>';
    }
}
