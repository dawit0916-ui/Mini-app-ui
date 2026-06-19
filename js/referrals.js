
function shareInvite() {
    const botUsername = "EMBTasks_bot"; // 🚩 CHANGE THIS
    const refLink = `https://t.me/${botUsername}?start=${user.id}`;
    const text = "💰 Join EMBT Vault and start earning USDT with me! It's free and easy.";
    
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
    pushNotification("System Alert", "Referral link copied to clipboard successfully!", "system");
        }
async function loadReferralData() {
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
    <div class="glass p-4 mb-3 border-l-2 ${isReady ? 'border-blue-500' : 'border-yellow-500/30'}">
        <div class="flex justify-between items-center mb-3">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold">${initial}</div>
                <div>
                    <p class="text-xs font-bold">${displayName}</p>
                    <p class="text-[8px] font-black uppercase ${isReady ? 'text-blue-400' : 'text-yellow-500'}">${isReady ? 'Active' : 'Pending Verification'}</p>
                </div>
            </div>
            <p class="text-xs font-black">${isReady ? '+' + (f.commission_earned || 0).toFixed(2) : 'Locked'}</p>
        </div>
                    <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div class="h-full bg-blue-500 transition-all duration-700" style="width: ${progress}%"></div>
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
