async function secureFetch(url, options = {}) {
    // 1. Automatically inject authorization header configurations natively
    const absoluteUrl = url.startsWith('http') ? url : `${RENDER_URL}${url}`;
    const headers = {
        'Content-Type': 'application/json',
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
