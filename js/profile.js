
        
async function loadUserProfileMetrics() {
    try {
        let telegramId = 0, firstName = "You", username = "", photoUrl = "";
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
            telegramId = tgUser.id;
            firstName = tgUser.first_name;
            username = tgUser.username || "";
            photoUrl = tgUser.photo_url || "";
        }

        document.getElementById('profile-name').innerText = firstName;
        document.getElementById('profile-username').innerText = username ? '@' + username : '';
        document.getElementById('profile-id').innerText = telegramId;

        const imgElement = document.getElementById('profile-avatar');
        const fallbackElement = document.getElementById('profile-avatar-fallback');
        if (photoUrl) {
            imgElement.src = photoUrl;
            imgElement.classList.remove('hidden');
            fallbackElement.classList.add('hidden');
        } else {
            imgElement.classList.add('hidden');
            fallbackElement.classList.remove('hidden');
            fallbackElement.innerText = firstName.charAt(0).toUpperCase();
        }

        const data = await secureFetch('/api/secure/profile');
        if (data) {

// balance field = DASH
const dash    = parseInt(data.balance   || 0);
const profileDash    = document.getElementById('profile-dash');
if (profileDash)    profileDash.innerText    = dash.toLocaleString();


            if (data.createdAt) {
                document.getElementById('profile-joined').innerText =
                    new Date(data.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }
      // Ban / Strike status block
const banBlock    = document.getElementById('profile-ban-block');
const bannedRow   = document.getElementById('profile-banned-row');
const strikeRow   = document.getElementById('profile-strike-row');
const strikeBadge = document.getElementById('profile-strike-badge');
const strikeBar   = document.getElementById('profile-strike-bar');

// Fetch live strike count from backend
let strikes = 0;
try {
    const strikeRes = await secureFetch(`/api/admin/user-strikes/${data.user_id}`);
    strikes = strikeRes?.strikes || 0;
} catch (e) { /* silent fail */ }

const isBanned = data.is_banned || false;

if (isBanned || strikes > 0) {
    banBlock.classList.remove('hidden');

    if (isBanned) {
        bannedRow.classList.remove('hidden');
        strikeRow.classList.add('hidden');
    } else {
        bannedRow.classList.add('hidden');
        strikeRow.classList.remove('hidden');
        strikeBadge.innerText = `${strikes} / 5 Strikes`;
        strikeBar.style.width = `${(strikes / 5) * 100}%`;
    }
} else {
    banBlock.classList.add('hidden');
    bannedRow.classList.add('hidden');
    strikeRow.classList.add('hidden');
}
            
        }
    } catch (err) {
        console.error("Profile loader error:", err);
    }
}

function copyProfileTgId() {
    const id = document.getElementById('profile-id').innerText;
    navigator.clipboard.writeText(id);
    tg.HapticFeedback.impactOccurred('light');
    showNotificationToast('Telegram ID copied!', 'success');
}

// Frontend data engine balance mapping extraction routine
async function syncWalletBalances() {
    try {
        const networkResponseObject = await secureFetch('/api/secure/profile');
        if (!networkResponseObject || networkResponseObject.error) {
            showNotificationToast(networkResponseObject?.error || "Ecosystem data pipeline sync failed", "error");
            return;
        }
        
        let targetDatasetProfileNode = null;
        if (typeof networkResponseObject.balance === 'number') targetDatasetProfileNode = networkResponseObject;
        else if (networkResponseObject.success && networkResponseObject.profile) targetDatasetProfileNode = networkResponseObject.profile;
        
        if (!targetDatasetProfileNode) return;
        
        const extractedFiatCashUSDT = parseFloat(targetDatasetProfileNode.balance || 0);
        const extractedTokensCoins = parseInt(targetDatasetProfileNode.coins || 0);
        const extractedYieldPoints = parseFloat(targetDatasetProfileNode.points || 0);
        
        // Compute total combined aggregate net asset portfolio metrics layout calculations
        const computedCombinedNetWorthUSDT = extractedFiatCashUSDT + (extractedTokensCoins * 0.10) + (extractedYieldPoints * 0.001);
        
        // Push interpolated mathematical animations metrics updates safely down to DOM visual slots
        animateNumericalValueDisplayUpdate('wallet-total-value', computedCombinedNetWorthUSDT, 2);
        // FIXED ✅
        animateNumericalValueDisplayUpdate('asset-bal-usdt', extractedYieldPoints, 2);    // points = USDT
        animateNumericalValueDisplayUpdate('asset-bal-coins', extractedTokensCoins, 0);   // coins = TICKET
        animateNumericalValueDisplayUpdate('asset-bal-points', extractedFiatCashUSDT, 0); // balance = DASH;
            
        // Sync header pills with new currency mapping
updateHeaderBalances(
    extractedFiatCashUSDT,   // DASH  (balance field)
    extractedYieldPoints,    // USDT  (points field)
    extractedTokensCoins     // TICKET (coins field)
);
        // Extract invite stats and update corresponding unlock milestones
        const activeTeamInvitesCount = parseInt(targetDatasetProfileNode.total_invited || 0);
        processEcosystemReferralMilestonesState(activeTeamInvitesCount);
        
        // Refresh structural ledger transaction card statements layout logs views
        loadWalletStatementLedgerLogs();
        
    } catch (catastrophicInternalAppCrash) {
        console.error("Critical crash tracing balance loops execution routines:", catastrophicInternalAppCrash);
    }
}


        // ==========================================================================
// CUSTOM IN-APP POPUP SYSTEM — REPLACES tg.showAlert & tg.showConfirm
// ==========================================================================
const POPUP_THEMES = {
    info:    { icon: 'ℹ️',  bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)',  btn: 'linear-gradient(135deg,#3b82f6,#2563eb)',  glow: 'rgba(59,130,246,0.15)'  },
    success: { icon: '✅',  bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)',   btn: 'linear-gradient(135deg,#10b981,#059669)',  glow: 'rgba(16,185,129,0.1)'   },
    error:   { icon: '🚨',  bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',    btn: 'linear-gradient(135deg,#ef4444,#dc2626)',  glow: 'rgba(239,68,68,0.1)'    },
    warning: { icon: '⚠️', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)',  btn: 'linear-gradient(135deg,#f59e0b,#d97706)',  glow: 'rgba(245,158,11,0.1)'   }
};

let _popupConfirmCallback = null;
async function updateHeaderBalances(dash, usdt, tickets) {
    // Self-healing: if called with no args, fetch the real current balance instead of defaulting to 0
    if (dash === undefined) {
        try {
            const data = await secureFetch('/api/secure/profile');
            const profile = (typeof data.balance === 'number') ? data : (data.profile || null);
            if (profile) {
                cachedUserProfile = profile;
                dash = profile.balance;
                usdt = profile.points;
                tickets = profile.coins;
            }
        } catch (err) {
            console.error('updateHeaderBalances: failed to fetch fresh profile', err);
            return; // bail out without touching the DOM — leaves last-known-good value on screen
        }
    }

    const dashEl = document.getElementById('header-dash-val');
    if (dashEl) dashEl.innerText = parseInt(dash || 0).toLocaleString();
}
// =====================================================
// SHOP FUNCTIONS
// ======= 
// Current shop state
let shopState = {
    currentSection: 'courses',
    currentFilter: 'all',
    courses: [],
    apks: [],
    myPurchases: [],
    selectedProduct: null,
    adminCourseId: null
};
