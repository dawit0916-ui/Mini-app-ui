// ===== Admin: referral connection diagram + edit-history audit =====

function _raEsc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function _raName(u) {
    if (u.missing) return 'Unknown user';
    return _raEsc(u.first_name || (u.username ? '@' + u.username : 'Member'));
}

function _raNode(u, opts = {}) {
    const border = u.missing ? 'border-slate-600' : u.is_banned ? 'border-red-500' : u.red_flag ? 'border-orange-400' : 'border-cyan-400/60';
    const dot = u.missing ? '' : u.activated ? '<span class="text-green-400">●</span> ' : '<span class="text-slate-500">○</span> ';
    const tap = u.missing ? '' : `onclick="openUserFromRefMap(${u.user_id})"`;
    const glow = opts.me ? 'bg-cyan-500/10 shadow-[0_0_14px_rgba(34,211,238,.35)]' : 'bg-white/5';
    return `
    <div ${tap} class="rounded-lg border ${border} ${glow} px-3 py-2 ${u.missing ? '' : 'cursor-pointer active:scale-[0.98]'} transition-all">
        <p class="text-[11px] font-bold text-white">${dot}${_raName(u)}${opts.me ? ' <span class="text-[8px] text-cyan-300 font-black">(THIS USER)</span>' : ''}</p>
        <p class="text-[9px] text-slate-400">ID: ${u.user_id}${u.username ? ' · @' + _raEsc(u.username) : ''}${opts.extra || ''}</p>
    </div>`;
}

const _raArrow = '<div class="flex justify-center text-cyan-400/70 text-xs leading-none py-0.5">▼</div>';

async function loadUserReferralMap(userId) {
    const box = document.getElementById('edit-user-ref-map');
    if (!box) return;
    box.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-3">Loading...</p>';
    try {
        const res = await secureFetch(`/api/admin/user/${userId}/referrals`);
        if (!res.success) throw new Error(res.error || 'failed');

        // Upline is returned nearest-first; draw top-down (oldest ancestor first)
        const uplineTopDown = [...res.upline].reverse();
        let html = '';

        if (uplineTopDown.length === 0) {
            html += `<p class="text-[9px] text-slate-500 text-center mb-2">Joined directly (no inviter)</p>`;
        } else {
            html += `<p class="text-[8px] text-slate-500 uppercase font-black mb-1">Invited by</p>`;
            uplineTopDown.forEach(u => { html += _raNode(u) + _raArrow; });
        }

        html += _raNode(res.me, { me: true });

        if (res.downline.length === 0) {
            html += `<p class="text-[9px] text-slate-500 text-center mt-3">Hasn't invited anyone yet</p>`;
        } else {
            html += `
            ${_raArrow}
            <p class="text-[8px] text-slate-500 uppercase font-black mb-1">
                Invited ${res.totals.friends} · ${res.totals.activated} active · earned ${res.totals.commission.toFixed(2)} DASH commission
            </p>
            <div class="space-y-1.5 pl-3 border-l-2 border-cyan-400/30 max-h-64 overflow-y-auto">
                ${res.downline.map(f => _raNode(f, {
                    extra: ` · +${f.earned_for_referrer.toFixed(2)} DASH${f.their_referrals ? ' · invited ' + f.their_referrals : ''}`
                })).join('')}
            </div>`;
        }

        html += `<p class="text-[8px] text-slate-600 mt-3">● activated &nbsp; ○ not yet &nbsp; | red border = banned, orange = red-flagged &nbsp;| tap a node to open that user</p>`;
        box.innerHTML = html;
    } catch (e) {
        console.error('Referral map load error:', e);
        box.innerHTML = '<p class="text-center text-[10px] text-red-400 py-3">Failed to load referral map.</p>';
    }
}

function openUserFromRefMap(userId) {
    document.getElementById('search-user-id').value = userId;
    searchUser();
}

const _raFieldLabel = { balance: 'Balance', is_banned: 'Banned', red_flag: 'Red flag' };

function _raFmt(v) {
    if (v === true) return 'ON';
    if (v === false) return 'OFF';
    return _raEsc(v);
}

async function loadUserAuditHistory(userId) {
    const box = document.getElementById('edit-user-audit-list');
    if (!box) return;
    box.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-3">Loading...</p>';
    try {
        const res = await secureFetch(`/api/admin/user/${userId}/audit`);
        if (!res.success) throw new Error(res.error || 'failed');

        if (!res.logs.length) {
            box.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-3">No admin edits recorded for this user</p>';
            return;
        }

        box.innerHTML = res.logs.map(l => {
            const when = new Date(l.timestamp).toLocaleString();
            const rows = (l.changes || []).map(c => `
                <div class="flex justify-between text-[10px]">
                    <span class="text-slate-400">${_raFieldLabel[c.field] || _raEsc(c.field)}</span>
                    <span class="font-bold"><span class="text-red-300">${_raFmt(c.from)}</span> <span class="text-slate-500">→</span> <span class="text-green-300">${_raFmt(c.to)}</span></span>
                </div>`).join('');
            return `
            <div class="glass p-3 rounded-xl border-l-2 border-purple-500/60">
                <div class="flex justify-between items-center mb-1">
                    <p class="text-[10px] font-black text-white">${_raEsc(l.admin_name || 'Admin')} <span class="text-slate-500 font-normal">(${l.admin_id})</span></p>
                    <p class="text-[8px] text-slate-500">${_raEsc(when)}</p>
                </div>
                ${rows || `<p class="text-[10px] text-slate-400">${_raEsc(l.description || l.action)}</p>`}
            </div>`;
        }).join('');
    } catch (e) {
        console.error('Audit history load error:', e);
        box.innerHTML = '<p class="text-center text-[10px] text-red-400 py-3">Failed to load edit history.</p>';
    }
}
