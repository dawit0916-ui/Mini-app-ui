const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();
// Also add this — prevents Telegram from collapsing on vertical swipe
if (tg.disableVerticalSwipes) {
    tg.disableVerticalSwipes();
}
function setLoadingProgress(percent, statusText) {
    const fill = document.getElementById('loading-progress-fill');
    const status = document.getElementById('loading-status-text');

    if (fill) fill.style.width = percent + '%';
    if (status && statusText) status.innerText = statusText;
}

function hideLoadingScreen() {
    const loader = document.getElementById('loading-screen');
    if (loader) {
        setLoadingProgress(100, 'Ready!');
        setTimeout(() => {
            loader.classList.add('hidden');
            setTimeout(() => loader.remove(), 500);
        }, 300);
    }
        }
// 🛑 IMPORTANT: REPLACE THIS WITH YOUR RENDER URL
  const RENDER_URL = "https://embt-gateway.onrender.com";
let OWNER_ID = null;
let isCurrentUserAdmin = false;
let allAdmins = [];
// ==========================================================================
// FETCH ADMIN STATUS FROM BACKEND
// ==========================================================================
async function fetchAdminStatus() {
    try {
        const data = await secureFetch('/api/admin/check');
        
        if (data && data.success) {
            isCurrentUserAdmin = data.isAdmin;
            allAdmins = data.adminList || [];
            
            // Set primary admin ID (first in list)
            OWNER_ID = allAdmins.length > 0 ? allAdmins[0] : null;
            
            console.log("✅ Admin Status Fetched:", {
                isAdmin: isCurrentUserAdmin,
                totalAdmins: allAdmins.length,
                adminIds: allAdmins
            });
            
            return isCurrentUserAdmin;
        }
    } catch (err) {
        console.error("Failed to fetch admin status:", err);
    }
    return false;
}

// Current User Data
const user = tg.initDataUnsafe?.user || { id: OWNER_ID, username: "TestUser", first_name: "Test" }; 
let currentEditingUserId = null;
let tasksRequired = 5;

// ==========================================================================
// UPGRADED REWORKED ECOSYSTEM SECURE FETCH ROUTER WITH MAINTENANCE CODES DETECT
// ==========================================================================
async function secureFetch(url, options = {}) {
    // 1. Automatically inject authorization header configurations natively
    const absoluteUrl = url.startsWith('http') ? url : `${RENDER_URL}${url}`;
    const isFormData = options.body instanceof FormData;
    const headers = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
    };

    const config = {
        ...options,
        headers: {
            ...headers,
            ...options.headers
        }
    };

    try {
        const response = await fetch(absoluteUrl, config);

        
        // 2. INTERCEPT ARCHITECTURAL MAINTENANCE PIPELINE CODES (HTTP 503)
if (response.status === 503) {
    let maintenanceData = { maintenance: true };
    try {
        maintenanceData = await response.json();
    } catch (parseFallback) {
        // Fallback context values if response isn't programmatic JSON
        maintenanceData.message = "The server is currently undergoing infrastructure updates or experiencing high load.";
        maintenanceData.accentAsset = "⚠️";
    }

    if (maintenanceData.maintenance) {
        renderGlobalMaintenanceViewportScreen(maintenanceData);
        throw new Error("System operation halted: Infrastructure upgrading.");
    }
}
// After the 503 maintenance check, add:
if (response.status === 403) {
    const errData = await response.json().catch(() => ({}));
    if (errData.banned) {
        const reason = errData.message || 'Your account has been suspended by an administrator.';
        showBanOverlay(reason);
        throw new Error('Account banned: ' + reason);
    }
    return { ...errData, error: errData.error || 'Access denied' };
}

        // Return standard raw object maps out to calling layers if structural clearance passes
        if (!response.ok) {
            const errorPayload = await response.json().catch(() => ({}));
            return { error: errorPayload.error || `HTTP Error: ${response.status}` };
        }

        return await response.json();

    } catch (networkException) {
        console.error(`[Gateway Network Fault] Path: ${absoluteUrl} Trace:`, networkException.message);
        throw networkException;
    }
}
// ==========================================================================
// STRUCTURAL MAINTENANCE VIEWPORT LAYOUT RENDERING COMPONENT
// ==========================================================================
function renderGlobalMaintenanceViewportScreen(meta) {
    // Triggers soft alerts inside Telegram client framework
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
    }

    const accentAsset = meta.accentAsset || "🛠️";
    const customMessage = meta.message || "System under active scheduled maintenance updates.";
    const terminalTargetTime = meta.targetTime ? new Date(meta.targetTime) : null;

    // Direct injection into root body node context guarantees total bypass defense locks
    document.body.innerHTML = `
        <div class="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden font-sans z-[999999]">
            <div class="absolute w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[80px] -top-10 -left-10 pointer-events-none"></div>
            <div class="absolute w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[80px] -bottom-10 -right-10 pointer-events-none"></div>
            
            <div class="glass border-white/5 max-w-sm w-full p-8 rounded-3xl flex flex-col items-center relative shadow-2xl">
                <div class="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center text-4xl mb-6 border border-blue-500/20 animate-pulse">
                    ${accentAsset}
                </div>
                
                <h1 class="text-xl font-black text-white uppercase tracking-wider mb-2">Upgrading Vault</h1>
                <p class="text-xs text-slate-400 leading-relaxed px-2 mb-6">${customMessage}</p>
                
                ${terminalTargetTime ? `
                    <div class="w-full bg-black/20 border border-white/5 rounded-2xl p-4 mb-2">
                        <p class="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Estimated Complete Window</p>
                        <div id="maintenance-countdown-clock" class="text-lg font-mono font-black text-blue-400 tracking-widest">
                            --:--:--
                        </div>
                    </div>
                ` : ''}
                
                <div class="mt-4 flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                    <span class="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-ping"></span>
                    Network Interface Offline
                </div>
            </div>
        </div>
    `;

    // Operational live client-side reactive countdown ticker worker loop setup
    if (terminalTargetTime) {
        function updateMaintenanceClockTicker() {
            const timeDifferenceDelta = terminalTargetTime - Date.now();
            const clockContainerNode = document.getElementById('maintenance-countdown-clock');
            if (!clockContainerNode) return;

            if (timeDifferenceDelta <= 0) {
                clockContainerNode.innerText = "PROCESSING REBOOT...";
                setTimeout(() => window.location.reload(), 5000); // Forces reload to re-verify gate state
                return;
            }

            const totalSeconds = Math.floor(timeDifferenceDelta / 1000);
            const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
            const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
            const seconds = String(totalSeconds % 60).padStart(2, '0');

            clockContainerNode.innerText = `${hours}:${minutes}:${seconds}`;
            requestAnimationFrame(updateMaintenanceClockTicker);
        }
        updateMaintenanceClockTicker();
    }
}

        
async function initApp() {
    try {
        setLoadingProgress(10, 'Connecting...');
        await fetchAdminStatus();

        setLoadingProgress(20, 'Verifying account...');
        cachedUserProfile = null;

        const user = window.Telegram?.WebApp?.initDataUnsafe?.user || {
            first_name: "Gamer",
            username: "User",
            id: 0,
            photo_url: ""
        };

        const userNameEl = document.getElementById('user-name');
        if (userNameEl) {
            userNameEl.innerText = user.first_name || user.username || "User";
        }

        const headerImg = document.getElementById('header-avatar');
        const headerFallback = document.getElementById('header-avatar-fallback');
        if (headerImg && headerFallback) {
            if (user.photo_url) {
                headerImg.src = user.photo_url;
                headerImg.classList.remove('hidden');
                headerFallback.classList.add('hidden');
            } else {
                headerImg.classList.add('hidden');
                headerFallback.classList.remove('hidden');
                headerFallback.innerText = user.first_name ? user.first_name.charAt(0).toUpperCase() : "E";
            }
        }

        if (isCurrentUserAdmin) {
            document.getElementById('admin-badge')?.classList.remove('hidden');
            document.getElementById('nav-admin')?.classList.remove('hidden');
            const alertsBtn = document.querySelector('button[onclick="switchAdminPanel(\'panel-notifications\')"]');
            if (alertsBtn) alertsBtn.classList.remove('opacity-50');
        }

        // 3. Fetch profile
        setLoadingProgress(30, 'Loading profile...');
        const data = await secureFetch('/api/secure/profile');

        if (data && !data.error) {
            let activeProfile = null;
            if (typeof data.balance === 'number') {
                activeProfile = data;
            } else if (data.success && data.profile) {
                activeProfile = data.profile;
            }

            if (activeProfile) {
                if (activeProfile.is_banned) {
                    showBanOverlay('Your account has been suspended by an administrator.');
                    return;
                }

                cachedUserProfile = activeProfile;

                const balanceMainEl = document.getElementById('balance-main');
                if (balanceMainEl) balanceMainEl.innerText = parseInt(activeProfile.balance || 0).toLocaleString();

                updateHeaderBalances(activeProfile.balance);
            }
        } else {
            console.warn("Profile structure unexpected or unauthenticated:", data);
        }
        setLoadingProgress(45, 'Loading level...');
        await loadLevels();

        setLoadingProgress(50, 'Loading ...');
        await initBannerCarousel();
        // 4. Load everything the app needs, in parallel where safe
        setLoadingProgress(60, 'Loading tasks...');
        await loadAvailableTasks();

        setLoadingProgress(70, 'Loading team...');
        await loadReferralData();

        setLoadingProgress(85, 'Loading stats...');
        await loadUserProfileMetrics();

        // Admin-only data — only fetched if the user is actually an admin
        if (isCurrentUserAdmin) {
            setLoadingProgress(92, 'Loading Ad...');
            await loadAdminData().catch(e => console.warn('Admin data load failed:', e.message));
        }

        setLoadingProgress(100, 'Ready!');

    } catch (err) {
        console.error("Initialization pipeline caught an execution error:", err.message);
    } finally {
        hideLoadingScreen();
        checkStreakOnAppStart();
    }
        }
    // pull-to-refresh setup continues below, unchanged
let _pullStartY = 0;
let _pullRefreshing = false;
const mainEl = document.querySelector('main');
const pullIndicator = document.getElementById('pull-indicator');

const PULL_THRESHOLD = 72;

mainEl.addEventListener('touchstart', (e) => {
    if (mainEl.scrollTop === 0) {
        _pullStartY = e.touches[0].clientY;
    }
}, { passive: true });

mainEl.addEventListener('touchmove', (e) => {
    if (_pullRefreshing) return;
    const delta = e.touches[0].clientY - _pullStartY;
    if (delta <= 0 || mainEl.scrollTop > 0) return;

    const clamped = Math.min(delta, 120);
    const progress = Math.min(clamped / PULL_THRESHOLD, 1);
    const translateY = -60 + (clamped * 0.65);
    const scale = 0.8 + (progress * 0.25);

    pullIndicator.style.transition = 'none';
    pullIndicator.style.opacity = Math.min(progress * 1.5, 1);
    pullIndicator.style.transform = `translateX(-50%) translateY(${translateY}px) scale(${scale})`;

    pullIndicator.classList.toggle('threshold', progress >= 1);
}, { passive: true });

mainEl.addEventListener('touchend', async (e) => {
    if (_pullRefreshing) return;
    const delta = e.changedTouches[0].clientY - _pullStartY;

    if (delta < PULL_THRESHOLD || mainEl.scrollTop > 0) {
        pullIndicator.style.transition = 'opacity 0.25s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)';
        pullIndicator.style.opacity = '0';
        pullIndicator.style.transform = 'translateX(-50%) translateY(-60px) scale(0.8)';
        pullIndicator.classList.remove('threshold');
        return;
    }

    _pullRefreshing = true;
    tg.HapticFeedback.impactOccurred('medium');

    pullIndicator.style.transition = 'transform 0.2s ease';
    pullIndicator.style.transform = 'translateX(-50%) translateY(6px) scale(1)';
    pullIndicator.style.opacity = '1';
    pullIndicator.classList.add('refreshing');

    const activeTab = document.querySelector('.tab-content.active')?.id.replace('tab-', '') || 'home';

    if (activeTab === 'home')    await loadAvailableTasks();
    if (activeTab === 'friends') await loadReferralData();
    if (activeTab === 'profile') await loadUserProfileMetrics();
    if (activeTab === 'earn')    await loadAdsWatchList();

    try {
        const data = await secureFetch('/api/secure/profile');
        const profile = (typeof data.balance === 'number') ? data : (data.profile || null);
        if (profile) {
            cachedUserProfile = profile;
            updateHeaderBalances(profile.balance, profile.points, profile.coins);

            const balMain = document.getElementById('balance-main');
            if (balMain) balMain.innerText = parseInt(profile.balance || 0).toLocaleString();

            const homeDash = document.getElementById('home-usdt-val');
            if (homeDash) homeDash.innerText = parseFloat(profile.points || 0).toFixed(2);
        }
    } catch (e) {
        console.error('Pull refresh error:', e);
    }

    // Done — CSS class swap handles the checkmark morph
    pullIndicator.classList.remove('refreshing');
    pullIndicator.classList.add('done');

    await new Promise(r => setTimeout(r, 350));

    pullIndicator.style.transition = 'opacity 0.3s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
    pullIndicator.style.opacity = '0';
    pullIndicator.style.transform = 'translateX(-50%) translateY(-60px) scale(0.8)';

    setTimeout(() => {
        pullIndicator.classList.remove('done', 'threshold');
        _pullRefreshing = false;
    }, 400);
});

document.addEventListener('contextmenu', (e) => {
    const tag = e.target.tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
    }
});

let longPressTimer;
document.addEventListener('touchstart', (e) => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return; // allow normal text selection/copy there

    longPressTimer = setTimeout(() => {
        e.preventDefault();
    }, 300);
}, { passive: false });

document.addEventListener('touchend', () => clearTimeout(longPressTimer));
document.addEventListener('touchmove', () => clearTimeout(longPressTimer));


            
            
let currentEditingUserData = null; // Cache active user model locally
let userDirectoryFilter = 'all';
