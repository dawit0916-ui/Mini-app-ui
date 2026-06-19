
async function loadUserProfileMetrics() {
    try {
        let telegramId = 0; // Default pipeline backup variable
        let firstName = "You";
        let photoUrl = "";

        // Read real-time parameters directly out of Telegram WebApp Mini App context
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) {
            const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
            telegramId = tgUser.id;
            firstName = tgUser.first_name;
            photoUrl = tgUser.photo_url || "";
        }

        // Initialize display configuration properties for Name/ID text nodes
        document.getElementById('profile-name').innerText = firstName;
        document.getElementById('profile-id').innerText = telegramId;

        // Process Profile Avatar Render Priority Structure
        const imgElement = document.getElementById('profile-avatar');
        const fallbackElement = document.getElementById('profile-avatar-fallback');

        if (photoUrl) {
            imgElement.src = photoUrl;
            imgElement.classList.remove('hidden');
            fallbackElement.style.display = 'none';
        } else {
            imgElement.classList.add('hidden');
            fallbackElement.style.display = 'flex';
            fallbackElement.innerText = firstName.charAt(0).toUpperCase();
        }

        // Fetch remaining payload values dynamically from database endpoints
           const data = await secureFetch('/api/secure/profile');

        if (data) {
            // Update wealth badges metrics rows
            document.getElementById('profile-coins').innerText = (data.coins || 0).toFixed(4);
            document.getElementById('profile-points').innerText = (data.points || 0).toFixed(2);
            document.getElementById('profile-balance').innerText = (data.balance || 0).toFixed(2);

            // Populate data matrix elements counters
            document.getElementById('profile-stat-tasks').innerText = data.tasksCompletedCount || 0;
            document.getElementById('profile-stat-earned').innerText = (data.total_earned || 0).toFixed(2);
            document.getElementById('profile-stat-invites').innerText = data.referrals || 0;
            document.getElementById('profile-stat-added').innerText = data.tasks_added || 0;

            // Process Administrative Enforcement Clearance Restrictions
            const banner = document.getElementById('profile-restriction-banner');
            const bannerText = document.getElementById('profile-restriction-text');
            const dotIndicator = document.getElementById('profile-status-dot');

            if (data.is_banned || data.red_flag) {
                banner.classList.remove('hidden');
                banner.classList.add('flex');
                dotIndicator.className = "absolute bottom-0 right-1 w-4 h-4 rounded-full border-2 border-slate-900 bg-red-500";
                
                bannerText.innerText = data.is_banned 
                    ? "🚨 ACCOUNT BANNED: Backend payment transactions fully halted." 
                    : "🚩 ACCOUNT FLAGGED: Review channels configuration verification.";
            } else {
                banner.classList.add('hidden');
                banner.classList.remove('flex');
                dotIndicator.className = "absolute bottom-0 right-1 w-4 h-4 rounded-full border-2 border-slate-900 bg-emerald-500";
            }
        }
    } catch (err) {
        console.error("DOM controller profile loader script trace engine error:", err);
    }
        }
