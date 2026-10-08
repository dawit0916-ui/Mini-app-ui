let currentLeaderboardPeriod = 'all';
let lbCountdownTimer = null;

function openLeaderboardDrawer(defaultType = 'points') {
    document.getElementById('modal-leaderboard').classList.add('active');
    switchLeaderboardTab(defaultType);
    tg.HapticFeedback.impactOccurred('light');
}

function closeLeaderboardDrawer() {
    document.getElementById('modal-leaderboard').classList.remove('active');
    if (lbCountdownTimer) { clearInterval(lbCountdownTimer); lbCountdownTimer = null; }
}

function switchLeaderboardPeriod(period) {
    currentLeaderboardPeriod = period;
    switchLeaderboardTab(currentLeaderboardType);
}

function switchLeaderboardTab(type) {
    currentLeaderboardType = type;
    document.getElementById('lb-tab-points').classList.toggle('active', type === 'points');
    document.getElementById('lb-tab-invites').classList.toggle('active', type === 'invites');
    document.getElementById('lb-period-all').classList.toggle('active', currentLeaderboardPeriod === 'all');
    document.getElementById('lb-period-week').classList.toggle('active', currentLeaderboardPeriod === 'week');
    loadLeaderboardData(type);
}

function renderWeekBanner(data) {
    const el = document.getElementById('lb-week-banner');
    if (lbCountdownTimer) { clearInterval(lbCountdownTimer); lbCountdownTimer = null; }
    if (data.period !== 'week' || !data.week) { el.classList.add('hidden'); return; }

    const { endsAt, enabled, prizes } = data.week;
    const prizeText = (prizes || []).map((p, i) => p > 0 ? `#${i + 1}: ${p}` : null).filter(Boolean).join(' · ');
    el.classList.remove('hidden');

    const paint = () => {
        const ms = Math.max(0, new Date(endsAt) - Date.now());
        const d = Math.floor(ms / 86400000);
        const h = Math.floor((ms % 86400000) / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        el.innerHTML = `
            <p class="text-[10px] font-black text-yellow-400 uppercase">🎁 Weekly prizes · resets in ${d}d ${h}h ${m}m</p>
            <p class="text-[9px] text-slate-400 mt-1">${enabled && prizeText ? prizeText + ' DASH' : 'Prizes coming soon'}</p>`;
    };
    paint();
    lbCountdownTimer = setInterval(paint, 30000);
}

async function loadLeaderboardData(type) {
    const podiumEl = document.getElementById('lb-podium');
    const listEl = document.getElementById('lb-list');
    const rankBadge = document.getElementById('lb-your-rank');

    listEl.innerHTML = Array(5).fill(0).map(() => `<div class="skeleton h-14 w-full mb-2 rounded-xl"></div>`).join('');
    podiumEl.innerHTML = '';

    try {
        const data = await secureFetch(`/api/secure/leaderboard?type=${type}&period=${currentLeaderboardPeriod}`);
        if (!data || !data.success) {
            listEl.innerHTML = '<p class="text-center text-xs text-red-400 py-6">Failed to load leaderboard.</p>';
            return;
        }

        const board = data.leaderboard || [];
        renderWeekBanner(data);
        const unit = type === 'points' ? 'DASH' : 'active';
        rankBadge.innerText = type === 'points'
            ? `Your Rank #${data.myRank.rank} · ${parseInt(data.myRank.score || 0).toLocaleString()} DASH`
            : `Your Rank #${data.myRank.rank} · ${data.myRank.score || 0} Active Friends`;
        // --- Podium (top 3) ---
        const top3 = board.slice(0, 3);
        const order = [1, 0, 2]; // visual order: 2nd, 1st, 3rd
        const heights = { 0: '130px', 1: '90px', 2: '70px' };
        const colors = { 0: 'from-yellow-400 to-amber-600', 1: 'from-slate-300 to-slate-500', 2: 'from-orange-400 to-orange-700' };

        podiumEl.innerHTML = order.map(i => {
            const entry = top3[i];
            if (!entry) return `<div class="flex-1"></div>`;
            const initial = entry.name.charAt(0).toUpperCase();
            const crown = i === 0 ? `<div class="text-2xl mb-1 animate-bounce">👑</div>` : '';
            return `
                <div class="flex-1 flex flex-col items-center">
                    ${crown}
                    <div class="w-14 h-14 rounded-full bg-gradient-to-br ${colors[i]} flex items-center justify-center text-sm font-black text-slate-900 border-2 border-white/20 mb-2 ${i === 0 ? 'glow-blue' : ''}">${initial}</div>
                    <p class="text-[10px] font-bold text-white truncate max-w-[80px]">${entry.name}</p>
                    <p class="text-[9px] font-black text-blue-400 mb-2">${entry.score} ${unit}</p>
                    <div class="w-full bg-gradient-to-t ${colors[i]} rounded-t-xl flex items-end justify-center pb-2" style="height:${heights[i]}">
                        <span class="text-xl font-black text-slate-900">${entry.rank}</span>
                    </div>
                </div>
            `;
        }).join('');

        // --- List (rank 4+) ---
        const rest = board.slice(3);
        listEl.innerHTML = rest.length === 0
            ? '<p class="text-center text-[10px] text-slate-500 py-6">No more entries.</p>'
            : rest.map(entry => `
                <div class="glass p-3 flex justify-between items-center mb-2 ${entry.isYou ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/5'}">
                    <div class="flex items-center gap-3">
                        <div class="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black text-slate-400">${entry.rank}</div>
                        <p class="text-xs font-bold text-white">${entry.name}${entry.isYou ? ' (You)' : ''}</p>
                    </div>
                    <p class="text-xs font-black text-blue-400">${entry.score} ${unit}</p>
                </div>
            `).join('');

        // Pin "you" if outside top 25
        if (data.myRank.outsideTop) {
            listEl.insertAdjacentHTML('beforeend', `
                <div class="glass p-3 flex justify-between items-center mt-3 border-blue-500/50 bg-blue-500/5">
                    <div class="flex items-center gap-3">
                        <div class="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-black text-blue-400">${data.myRank.rank}</div>
                        <p class="text-xs font-bold text-white">You</p>
                    </div>
                    <p class="text-xs font-black text-blue-400">${data.myRank.score} ${unit}</p>
                </div>
            `);
        }
    } catch (e) {
        console.error("Leaderboard load error:", e);
        listEl.innerHTML = '<p class="text-center text-xs text-red-400 py-6">Error loading leaderboard.</p>';
    }
}
/* ==========================================================================
   EARN TAB JAVASCRIPT
   Paste this anywhere inside your existing <script> tag, after secureFetch
   is defined. No existing functions are removed — a few are extended below
   (clearly marked) instead of overwritten blindly.
   ========================================================================== */

// ---- Track current banner section state ----
let currentEarnSection = null;     // 'youtube' | 'ads' | 'normal' | null (hub)
let currentYoutubeTask = null;     // the task object currently open in detail view
