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

const lbEsc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

function renderWeekBanner(data) {
    const el = document.getElementById('lb-week-banner');
    if (lbCountdownTimer) { clearInterval(lbCountdownTimer); lbCountdownTimer = null; }
    if (data.period !== 'week' || !data.week) { el.classList.add('hidden'); return; }

    const { endsAt, enabled, prizes } = data.week;
    const list = (prizes || []).slice(0, 5);
    const hasPrizes = enabled && list.some(p => Number(p) > 0);
    const endMs = new Date(endsAt).getTime();
    const startMs = endMs - 7 * 86400000;
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    const me = data.myRank;
    const board = data.leaderboard || [];
    const unitWord = data.type === 'invites' ? 'invites' : 'DASH';

    // Personal status line
    let meLine = '';
    if (hasPrizes && me) {
        const myPrize = Number(list[me.rank - 1]) || 0;
        if (me.score > 0 && myPrize > 0) {
            meLine = `<span class="text-green-400">🎉 You're in a prize spot: #${me.rank} wins ${myPrize} DASH</span>`;
        } else if (me.score > 0 && me.rank > 5 && board[4]) {
            const gap = Math.max(0, board[4].score - me.score);
            const gapTxt = data.type === 'invites' ? gap : (Math.round(gap * 100) / 100);
            meLine = `<span class="text-slate-300">You're ${gapTxt} ${unitWord} behind #5. Keep going!</span>`;
        } else if (!me.score) {
            meLine = `<span class="text-slate-400">Start earning this week to enter the ranking</span>`;
        }
    }

    el.classList.remove('hidden');

    const paint = () => {
        const now = Date.now();
        const ms = Math.max(0, endMs - now);
        const d = Math.floor(ms / 86400000);
        const h = Math.floor((ms % 86400000) / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const timeTxt = d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
        const pct = Math.min(100, Math.max(0, ((now - startMs) / (endMs - startMs)) * 100));

        const chips = medals.map((medal, i) => {
            const p = Number(list[i]) || 0;
            const mine = me && me.rank === i + 1 && me.score > 0;
            return `
                <div class="rounded-lg py-1.5 text-center border ${mine ? 'border-yellow-400/60 bg-yellow-400/10' : 'border-white/5 bg-white/5'}">
                    <div class="text-sm leading-none">${medal}</div>
                    <div class="text-[9px] font-black mt-1 ${p > 0 ? 'text-yellow-400' : 'text-slate-600'}">${p > 0 ? p : '—'}</div>
                </div>`;
        }).join('');

        el.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <p class="text-[10px] font-black text-yellow-400 uppercase">🎁 Weekly prizes</p>
                <span class="text-[9px] font-black text-white bg-white/10 px-2 py-1 rounded-full">⏳ ${timeTxt}</span>
            </div>
            <div class="h-1 w-full bg-white/10 rounded-full overflow-hidden mb-3">
                <div class="h-full bg-gradient-to-r from-yellow-400 to-amber-600" style="width:${pct}%"></div>
            </div>
            ${hasPrizes
                ? `<div class="grid grid-cols-5 gap-1.5">${chips}</div>
                   <p class="text-[8px] text-slate-500 text-center mt-1.5 uppercase tracking-wider">DASH per rank · top 5 get paid when the week ends</p>
                   ${meLine ? `<p class="text-[10px] font-bold text-center mt-2">${meLine}</p>` : ''}`
                : `<p class="text-[9px] text-slate-400 text-center">Prizes coming soon</p>`}
        `;
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

        // Prize for a given rank (weekly view only, and only when rewards are on)
        const isWeek = data.period === 'week' && data.week && data.week.enabled;
        const prizeFor = (rank) => isWeek ? (Number(data.week.prizes?.[rank - 1]) || 0) : 0;
        const prizeChip = (rank) => {
            const p = prizeFor(rank);
            return p > 0
                ? `<span class="text-[9px] font-black text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-1.5 py-0.5 rounded-full">🎁 ${p}</span>`
                : '';
        };

        // --- Podium (top 3) ---
        const top3 = board.slice(0, 3);
        const order = [1, 0, 2]; // visual order: 2nd, 1st, 3rd
        const heights = { 0: '130px', 1: '90px', 2: '70px' };
        const colors = { 0: 'from-yellow-400 to-amber-600', 1: 'from-slate-300 to-slate-500', 2: 'from-orange-400 to-orange-700' };

        podiumEl.innerHTML = order.map(i => {
            const entry = top3[i];
            if (!entry) return `<div class="flex-1"></div>`;
            const initial = lbEsc(entry.name.charAt(0).toUpperCase());
            const crown = i === 0 ? `<div class="text-2xl mb-1 animate-bounce">👑</div>` : '';
            const prize = prizeFor(entry.rank);
            return `
                <div class="flex-1 flex flex-col items-center">
                    ${crown}
                    <div class="w-14 h-14 rounded-full bg-gradient-to-br ${colors[i]} flex items-center justify-center text-sm font-black text-slate-900 border-2 border-white/20 mb-2 ${i === 0 ? 'glow-blue' : ''}">${initial}</div>
                    <p class="text-[10px] font-bold text-white truncate max-w-[80px]">${lbEsc(entry.name)}</p>
                    <p class="text-[9px] font-black text-blue-400 ${prize ? 'mb-1' : 'mb-2'}">${entry.score} ${unit}</p>
                    ${prize ? `<p class="mb-2">${prizeChip(entry.rank)}</p>` : ''}
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
                        <p class="text-xs font-bold text-white">${lbEsc(entry.name)}${entry.isYou ? ' (You)' : ''}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        ${prizeChip(entry.rank)}
                        <p class="text-xs font-black text-blue-400">${entry.score} ${unit}</p>
                    </div>
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
