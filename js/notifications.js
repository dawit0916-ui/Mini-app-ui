
let notifications = [
    { type: 'system', title: 'System Active', msg: 'Welcome to the premium vault.', read: true, date: new Date() }
];
let currentNotifTab = 'personal';

/**
 * Toggles visibility of the modal box interface view wrapper
 */
function toggleNotificationCenter() {
    const el = document.getElementById('notification-center');
    const dot = document.getElementById('unread-dot');
    
    if (!el) return console.error("Notification center view wrapper container missing.");
    
    if (el.style.display === 'none' || el.style.display === '') {
    el.style.display = 'flex';
    el.classList.add('active');
} else {
    el.style.display = 'none';
    el.classList.remove('active');
    }
    
    if (el.classList.contains('active')) {
        if (dot) dot.classList.add('hidden'); // Hide red indicator dot on modal activation
        switchNotifTab(currentNotifTab);
    }
}

/**
 * Fetches secure database announcements from your server and loads them into memory
 */
async function syncUserInbox() {
    try {
        const remoteAlerts = await secureFetch('/api/secure/notifications');
        if (remoteAlerts && Array.isArray(remoteAlerts)) {
          
            // Map payloads to uniform design schemes safely matching backend parameters
            // ==========================================================================
// ✅ REPLACE YOUR MAP MATRIX INSIDE syncUserInbox() WITH THIS:
// ==========================================================================
notifications = remoteAlerts.map(srvNotif => {
    // Read the clean incoming type from our updated backend property
    const incomingType = srvNotif.type || 'system';
    
    return {
        // If it explicitly says 'system', route it to 'system'. Otherwise, it's 'personal'.
        type: (incomingType === 'system') ? 'system' : 'personal',
        title: srvNotif.title || 'Notification',
        msg: srvNotif.message || srvNotif.msg || '',
        read: srvNotif.read || false,
        date: srvNotif.date || srvNotif.createdAt || new Date()
    };
});
            
            // Sync status badge dot context
            const hasUnread = notifications.some(n => !n.read);
            const unreadDot = document.getElementById('unread-dot');
            if (unreadDot) {
                if (hasUnread) unreadDot.classList.remove('hidden');
                else unreadDot.classList.add('hidden');
            }
console.log("Current State Synchronized List Payload Array:", notifications);
            renderFilteredNotifications();
        }
    } catch (e) {
        // This will force your phone to show you exactly why the code is breaking!
        alert("CRITICAL INBOX SYNC ERROR TRACE:\n" + e.message + "\n\nStack: " + e.stack);
        console.error("Failed to sync application user data notifications records:", e);
    }
}

/**
 * Physically renders your active tab array memory straight into the DOM
 */
function renderFilteredNotifications() {
    const notificationsContainer = document.getElementById('notifications-container');
    if (!notificationsContainer) return;

    // Filter list by selected sub-tab view parameters
    const filteredList = notifications.filter(n => n.type === currentNotifTab);

    // Empty state fallback display card template structure
    if (filteredList.length === 0) {
        notificationsContainer.innerHTML = `
            <div class="text-center text-slate-500 py-12 flex flex-col items-center justify-center gap-1">
                <span class="text-2xl">📩</span>
                <p class="text-xs font-black uppercase tracking-wider text-white">Inbox Clear</p>
                <p class="text-[10px] text-slate-400 font-bold">No new messages for you</p>
            </div>`;
        return;
    }

    // Map and inject modern message elements
    notificationsContainer.innerHTML = filteredList.map(notif => {
        const formattedTime = new Date(notif.date).toLocaleTimeString([], {
            hour: '2-digit', 
            minute: '2-digit'
        });

        return `
            <div class="p-4 bg-white/5 border ${!notif.read ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/10'} rounded-2xl flex flex-col gap-1 backdrop-blur-md transition-all duration-300">
                <div class="flex justify-between items-start">
                    <span class="font-black text-white uppercase text-xs tracking-wider">${notif.title}</span>
                    <span class="text-[9px] uppercase font-bold text-slate-500">${formattedTime}</span>
                </div>
                <p class="text-xs text-slate-300 font-medium leading-relaxed">${notif.msg|| notif.message || ''}</p>
            </div>
        `;
    }).join('');

    // Mark current tab items as read after 2 seconds safely
    setTimeout(() => {
        notifications.forEach(n => {
            if (n.type === currentNotifTab) n.read = true;
        });
    }, 2000);
}

/**
 * Tabs visibility controller logic state engine
 */
function switchNotifTab(tabName) {
    currentNotifTab = tabName;
    
    const personalBtn = document.getElementById('btn-notif-personal');
    const systemBtn = document.getElementById('btn-notif-system');
    
    if (personalBtn && systemBtn) {
        if (tabName === 'personal') {
            personalBtn.className = "flex-1 py-2 rounded-xl text-[10px] font-black uppercase bg-blue-600 text-white";
            systemBtn.className = "flex-1 py-2 rounded-xl text-[10px] font-black uppercase bg-white/5 text-slate-400";
        } else {
            personalBtn.className = "flex-1 py-2 rounded-xl text-[10px] font-black uppercase bg-white/5 text-slate-400";
            systemBtn.className = "flex-1 py-2 rounded-xl text-[10px] font-black uppercase bg-blue-600 text-white";
        }
    }
    
    renderFilteredNotifications();
}

/**
 * Creates a real-time floating user overlay card announcement
 */
function pushNotification(title, msg, type = 'system') {
    // Save to unified state array
    notifications.unshift({ type, title, msg, read: false, date: new Date() });
    
    const unreadDot = document.getElementById('unread-dot');
    if (unreadDot) unreadDot.classList.remove('hidden');
    
    // Create UI overlay toast elements dynamically
    const toast = document.createElement('div');
    toast.className = `toast glass p-4 rounded-2xl border-l-4 ${type === 'system' ? 'border-blue-500' : 'border-green-500'} mb-2 shadow-2xl transition-all duration-300`;
    toast.innerHTML = `<h5 class="text-[10px] font-black uppercase text-white">${title}</h5><p class="text-xs text-slate-300">${msg}</p>`;
    
    const toastContainer = document.getElementById('toast-container');
    if (toastContainer) toastContainer.appendChild(toast);
    
    // Automatically fade element down 4 seconds later
    setTimeout(() => toast.remove(), 4000);

    // Live update the list elements if center layout is open
    renderFilteredNotifications();
}
