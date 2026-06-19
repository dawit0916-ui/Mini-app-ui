

function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const targetTab = document.getElementById('tab-' + tabId);
    if(targetTab) targetTab.classList.add('active');
    window.scrollTo(0,0);

    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.remove('nav-active');
        b.classList.add('text-slate-500');
    });

    if (btn) {
        btn.classList.add('nav-active');
        btn.classList.remove('text-slate-500');
    }

    tg.HapticFeedback.selectionChanged();
    
    // --- ADD THESE TRIGGERS ---
    if(tabId === 'home') loadAvailableTasks();
    if(tabId === 'history') loadUserHistory();
    if(tabId === 'friends') loadReferralData(); // Loads friends when tab opens
    if(tabId === 'admin') loadAdminData();      // Loads admin stats when tab opens
    if(tabId === 'profile') loadUserProfileMetrics();
    if(tabId === 'wallet') syncWalletBalances();
}
// --- ADMIN HUB NAVIGATION ---
function switchAdminPanel(panelId) {
    const panels = [
        'panel-task-manager', 
        'panel-broadcast', 
        'panel-settings', 
        'panel-users', 
        'panel-payouts', 
        'panel-proofs', 
        'panel-admins', 
        'panel-notifications',
        'panel-console',
        'panel-support'
        
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
                    if (panelId === 'panel-settings') loadAdminData();
                    if (panelId === 'panel-support') loadAdminTickets('open');
                    if (panelId === 'panel-admins') loadAdminRegistry();
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


// Example Support Ticket Function
async function submitSupportTicket() {
    const msg = document.getElementById('support-msg').value;
    if(!msg) return showAppAlert("Please enter a message.", 'warning')
    
    const res = await secureFetch('/api/support/create', {
        method: 'POST',
        body: JSON.stringify({ message: msg })
    });
    
    if(res.success) {
        showAppAlert("Ticket sent! We will reply via the bot.", 'success')
        switchTab('home', document.getElementById('nav-home'));
    }
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




// Accordion Toggle Logic




        

// Converts file to Base64 data string instantly on select

function openSpinInfo() {
    const overlay = document.getElementById('spin-info-overlay');
    if (!overlay) return;
    overlay.classList.add('show');
    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
}

function closeSpinInfo() {
    const overlay = document.getElementById('spin-info-overlay');
    if (!overlay) return;
    // Smooth exit
    overlay.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
    overlay.style.opacity    = '0';
    overlay.style.transform  = 'scale(0.97) translateY(6px)';
    setTimeout(() => {
        overlay.classList.remove('show');
        overlay.style.cssText = '';   // reset for next open
    }, 190);
    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.selectionChanged();
    }
        }
// Step 1: Global variable synchronization hooks

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
            // --- ADMIN: LOAD DASHBOARD ---

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
                    <p class="text-xs font-black text-green-400">+${item.reward} USDT</p>
                </div>
            `);
        });
    } catch (e) {
        container.innerHTML = '<p class="text-center text-red-500 text-[10px]">Failed to load history.</p>';
    }
}

function toggleUtilityMenu() {
    const menu = document.getElementById('utility-menu');
    menu.classList.toggle('hidden');
    tg.HapticFeedback.impactOccurred('light');
}
window.addEventListener('click', function(e) {
    const menu = document.getElementById('utility-menu');
    const menuBtn = document.querySelector('button[onclick="toggleUtilityMenu()"]');
    
    if (!menu.contains(e.target) && !menuBtn.contains(e.target)) {
        menu.classList.add('hidden');
    }
});
function showNotificationToast(messageText, notificationType = 'info') {
    const parentContainer = document.getElementById('toast-container');
    if (!parentContainer) return console.error("Toast anchor element missing from DOM mapping framework!");
    
    const toastNode = document.createElement('div');
    toastNode.className = `toast glass p-4 rounded-xl mb-2 text-xs font-bold border flex items-center gap-2 shadow-2xl z-[5000] animate-[slideInTop_0.3s_ease_forwards]`;
    
    if (notificationType === 'success') {
        toastNode.className += " border-emerald-500/30 bg-emerald-950/80 text-emerald-400";
        toastNode.innerHTML = `🎉 ${messageText}`;
    } else if (notificationType === 'error') {
        toastNode.className += " border-red-500/30 bg-red-950/80 text-red-400";
        toastNode.innerHTML = `🚨 ${messageText}`;
    } else {
        toastNode.className += " border-blue-500/30 bg-slate-900/90 text-blue-400";
        toastNode.innerHTML = `ℹ️ ${messageText}`;
    }
    
    parentContainer.appendChild(toastNode);
    setTimeout(() => {
        toastNode.style.opacity = '0';
        toastNode.style.transform = 'translateY(-10px)';
        toastNode.style.transition = 'all 0.4s ease';
        setTimeout(() => toastNode.remove(), 400);
    }, 3500);
}

// Fixed: Only close if clicking outside the menu button AND the menu itself


function toggleAccordion(id) {
    const el = document.getElementById(id);
    el.classList.toggle('hidden');
    tg.HapticFeedback.impactOccurred('light');
}
function showAppReward(type, amount) {
    const config = REWARD_CONFIGS[type] || REWARD_CONFIGS.tryagain;

    // Clear any existing timer
    if (_rewardTimer) clearTimeout(_rewardTimer);

    // Set card styles
    const card = document.getElementById('reward-popup-card');
    card.style.background   = config.bg;
    card.style.borderColor  = config.border;
    card.style.border       = '1px solid ' + config.border;
    card.style.boxShadow    = config.shadow;

    // Inject icon — reset animation by replacing element
    // Inject icon — reset animation by replacing element
const iconWrap = document.getElementById('reward-icon-wrap');
iconWrap.style.animation = 'none';

// 🆕 SHOW CORRECT COIN IMAGE
if (type === 'usdt') {
    iconWrap.innerHTML = `<img src="/assets/images/usdt-coin.png" 
                                alt="USDT" 
                                style="width:72px;height:72px;">`;
} else if (type === 'points') {
    iconWrap.innerHTML = `<img src="/assets/images/point-coin.png" 
                                alt="Points" 
                                style="width:72px;height:72px;">`;
} else if (type === 'coins') {
    iconWrap.innerHTML = `<img src="/assets/images/spin-coin.png" 
                                alt="Coins" 
                                style="width:72px;height:72px;">`;
} else {
    iconWrap.innerHTML = REWARD_SVGS[type] || REWARD_SVGS.tryagain;
}
    void iconWrap.offsetWidth; // force reflow
    iconWrap.style.animation = '';

    // Reset card animation
    card.style.animation = 'none';
    void card.offsetWidth;
    card.style.animation = '';

    // Set text content
    document.getElementById('reward-type-label').innerText  = config.label;
    document.getElementById('reward-type-label').style.color = config.labelClr;

    const amountDisplay = (amount !== undefined && amount !== null)
        ? (type === 'tryagain' ? '' : '+' + amount)
        : '';
    document.getElementById('reward-amount-text').innerText = amountDisplay;
    document.getElementById('reward-amount-text').style.color = config.amtClr;

    document.getElementById('reward-unit-text').innerText = config.unit;
    document.getElementById('reward-unit-text').style.color = config.unitClr;

    document.getElementById('reward-sub-msg').innerText = config.msg;

    // Progress bar
    const fill = document.getElementById('reward-progress-fill');
    fill.style.background  = config.progress;
    fill.style.width       = '100%';
    fill.style.transition  = 'none';
    void fill.offsetWidth;
    fill.style.transition  = `width ${config.duration}ms linear`;
    fill.style.width       = '0%';

    // Haptic
    if (window.Telegram?.WebApp?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }

    // Show backdrop
    document.getElementById('reward-popup-backdrop').classList.add('show');

    // Jackpot confetti
    if (type === 'jackpot') spawnConfetti();

    // Auto close
    _rewardTimer = setTimeout(() => closeRewardPopup(), config.duration);
}

function closeRewardPopup() {
    document.getElementById('reward-popup-backdrop').classList.remove('show');
    if (_rewardTimer) {
        clearTimeout(_rewardTimer);
        _rewardTimer = null;
    }
    // Clean up confetti
    document.querySelectorAll('.confetti-particle').forEach(p => p.remove());
}

function spawnConfetti() {
    const backdrop = document.getElementById('reward-popup-backdrop');
    const colors = ['#fbbf24','#f59e0b','#fde68a','#ffffff','#fb923c','#facc15'];
    for (let i = 0; i < 28; i++) {
        const dot = document.createElement('div');
        dot.className = 'confetti-particle';
        dot.style.left            = Math.random() * 100 + '%';
        dot.style.top             = Math.random() * 40 + '%';
        dot.style.background      = colors[Math.floor(Math.random() * colors.length)];
        dot.style.animationDuration = (0.8 + Math.random() * 1.4) + 's';
        dot.style.animationDelay  = (Math.random() * 0.6) + 's';
        dot.style.width           = (4 + Math.random() * 5) + 'px';
        dot.style.height          = (4 + Math.random() * 5) + 'px';
        backdrop.appendChild(dot);
        setTimeout(() => dot.remove(), 3000);
    }
    }
