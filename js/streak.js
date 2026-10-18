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
        const isLast = day === 7;

        const tile = document.createElement('div');
        tile.className = `sd-tile ${isPast ? 'sd-done' : ''} ${isActive ? 'sd-active' : ''} ${isLast ? 'sd-last' : ''}`;

        const amount = `
            <div>
                <p class="sd-day">DAY ${day}${isLast ? ' · BONUS' : ''}</p>
                <p class="sd-amt">${DAILY_REWARDS[day - 1]}</p>
                <p class="sd-unit">DASH</p>
            </div>`;

        tile.innerHTML = (isLast ? '<span class="sd-icon">🎁</span>' : '') + amount +
            (isPast ? '<span class="sd-check">✓</span>' : '');
        grid.appendChild(tile);
    }
    document.getElementById('streak-claim-day-label').textContent = activeDay;
    document.getElementById('streak-day-chip').textContent = `Day ${activeDay} of 7`;
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
