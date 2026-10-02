const DAILY_REWARDS = [50, 75, 100, 150, 200, 300, 500];

async function checkStreakOnAppStart() {
    try {
        const data = await secureFetch('/api/secure/streak/status');
        if (!data.success) return;

        renderStreakDays(data.streakDay, data.claimedToday);

        if (!data.claimedToday) {
            document.getElementById('streak-modal-overlay').classList.remove('hidden');
        }
    } catch (err) {
        console.error('Streak status fetch failed:', err);
    }
}

function renderStreakDays(activeDay, claimedToday) {
    const grid = document.getElementById('streak-days-grid');
    grid.innerHTML = '';
    for (let day = 1; day <= 7; day++) {
        const isPast = day < activeDay || (day === activeDay && claimedToday);
        const isActive = day === activeDay && !claimedToday;
        const pill = document.createElement('div');
        pill.className = `rounded-xl p-1.5 text-center border ${
            isActive ? 'bg-amber-500/20 border-amber-400/50' :
            isPast ? 'bg-emerald-500/10 border-emerald-500/20' :
            'bg-white/5 border-white/10'
        }`;
        pill.innerHTML = `
            <p class="text-[8px] text-slate-400 font-black">D${day}</p>
            <p class="text-[9px] font-black ${isActive ? 'text-amber-300' : isPast ? 'text-emerald-300' : 'text-slate-500'}">${DAILY_REWARDS[day - 1]}</p>
            ${isPast ? '<p class="text-[8px]">✓</p>' : ''}
        `;
        grid.appendChild(pill);
    }
    document.getElementById('streak-claim-day-label').textContent = activeDay;
}

async function claimStreakReward() {
    try {
        const data = await secureFetch('/api/secure/streak/claim', { method: 'POST' });
        if (!data.success) {
            showNotificationToast(data.error || 'Could not claim reward');
            return;
        }
        showNotificationToast(`+${data.reward} DASH claimed! 🔥 ${data.currentStreak}-day streak`, 'success');
        document.getElementById('profile-dash').textContent = data.newBalance;
        closeStreakModal();
    } catch (err) {
        console.error('Claim failed:', err);
        showNotificationToast('Something went wrong claiming your reward');
    }
}
function closeStreakModal() {
    document.getElementById('streak-modal-overlay').classList.add('hidden');
}
