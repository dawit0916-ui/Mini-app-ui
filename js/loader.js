// Loader JS - App initialization and setup
// Contains: Main initialization code for the app

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

if (tg.disableVerticalSwipes) {
    tg.disableVerticalSwipes();
}

// Initialize the app
async function initApp() {
    try {
        // Fetch admin status
        await fetchAdminStatus();
        
        // Get Telegram user
        const user = window.Telegram?.WebApp?.initDataUnsafe?.user || {
            first_name: "Gamer",
            username: "User",
            id: 0,
            photo_url: ""
        };
        
        currentUser = user;
        
        // Update header
        const userNameEl = document.getElementById('user-name');
        if (userNameEl) userNameEl.innerText = user.first_name || user.username || "User";
        
        // Update avatar
        const headerImg = document.getElementById('header-avatar');
        const headerFallback = document.getElementById('header-avatar-fallback');
        
        if (user.photo_url) {
            headerImg.src = user.photo_url;
            headerImg.classList.remove('hidden');
            headerFallback.classList.add('hidden');
        } else {
            headerImg.classList.add('hidden');
            headerFallback.classList.remove('hidden');
            headerFallback.innerText = user.first_name ? user.first_name.charAt(0).toUpperCase() : "E";
        }
        
        // Show admin features if applicable
        if (isCurrentUserAdmin) {
            document.getElementById('admin-badge').classList.remove('hidden');
            document.getElementById('nav-admin').classList.remove('hidden');
        }
        
        // Load profile data
        const data = await secureFetch('/api/secure/profile');
        
        if (data && !data.error) {
            let activeProfile = null;
            if (typeof data.balance === 'number') {
                activeProfile = data;
            } else if (data.success && data.profile) {
                activeProfile = data.profile;
            }
            
            if (activeProfile) {
                cachedUserProfile = activeProfile;
                const balanceMainEl = document.getElementById('balance-main');
                if (balanceMainEl) balanceMainEl.innerText = activeProfile.balance.toFixed(2);
            }
        }
        
        // Load tasks and notifications
        try {
            await loadAvailableTasks();
        } catch (e) {
            console.warn("Tasks loading failed:", e.message);
        }
        
        try {
            await syncUserInbox();
        } catch (e) {
            console.warn("Inbox sync failed:", e.message);
        }
        
        // Hide loader
        const loader = document.getElementById('loading-screen');
        if (loader) {
            loader.classList.add('hidden');
            loader.style.display = 'none';
        }
        
        console.log("✅ App initialized successfully");
        
    } catch (err) {
        console.error("App initialization error:", err.message);
    }
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
