let _conEntriesView = [];
function conRender() {
    const container = document.getElementById('con-entries');
    const stats = document.getElementById('con-stats');
    const errorCount = document.getElementById('con-error-count');
    if (!container) return;

    const search = (document.getElementById('con-search')?.value || '').toLowerCase();
    const filtered = _conHistory.filter(e =>
        (_conFilter === 'all' || e.level === _conFilter) &&
        (!search || e.message.toLowerCase().includes(search))
    );
    _conEntriesView = filtered; // keeps indexes in sync for copy buttons
    const counts = { log:0, info:0, warn:0, error:0, debug:0 };
    _conHistory.forEach(e => { if (counts[e.level] !== undefined) counts[e.level]++; });

    if (stats) {
        stats.innerHTML = Object.entries(counts)
            .filter(([,v]) => v > 0)
            .map(([k,v]) => {
                const clr = {log:'#cdd6f4',info:'#89b4fa',warn:'#f9e2af',error:'#f38ba8',debug:'#a6e3a1'}[k];
                return `<span style="color:${clr}">${k}: ${v}</span>`;
            }).join(' · ') + `<span class="ml-auto">${filtered.length}/${_conHistory.length} entries</span>`;
    }

    if (errorCount) {
        const ec = counts.error;
        errorCount.innerText = ec > 0 ? `${ec} error${ec > 1 ? 's' : ''}` : '✓ no errors';
        errorCount.style.color = ec > 0 ? '#f38ba8' : '#475569';
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center py-16 text-slate-600"><span class="text-2xl mb-2">◌</span><span class="text-[10px] font-bold">No matching logs</span></div>`;
        return;
    }

    const COLORS = { log:'#cdd6f4', info:'#89b4fa', warn:'#f9e2af', error:'#f38ba8', debug:'#a6e3a1' };
    const BADGES = { log:'#45475a', info:'#1e3a5f', warn:'#5f4a00', error:'#5f1a2a', debug:'#1a3a1a' };

    container.innerHTML = filtered.map((e, i) => `
        <div data-con-idx="${i}" style="display:flex;gap:8px;padding:4px 12px;align-items:flex-start;border-left:2px solid ${COLORS[e.level]}20;" 
             onmouseover="this.style.background='rgba(255,255,255,0.03)'" 
             onmouseout="this.style.background='transparent'">
            <span style="color:#45475a;font-size:9px;min-width:55px;padding-top:3px;flex-shrink:0">${e.time}</span>
            <span style="font-size:9px;padding:1px 5px;border-radius:3px;background:${BADGES[e.level]};color:${COLORS[e.level]};min-width:38px;text-align:center;flex-shrink:0;font-weight:800">${e.level.toUpperCase()}</span>
            <span style="color:${COLORS[e.level]};font-size:11px;flex:1;white-space:pre-wrap;word-break:break-all">${e.message}</span>
            <button onclick="conCopyEntry(this)" title="Copy" style="flex-shrink:0;font-size:11px;padding:0 4px;color:#6c7086;background:transparent;border:none;cursor:pointer;">⧉</button>
        </div>
    `).join('');

    container.scrollTop = container.scrollHeight;
}

function conFilter(level, btn) {
    _conFilter = level;
    document.querySelectorAll('.con-lvl-btn').forEach(b => {
        b.style.background = 'transparent';
        b.style.color = '#64748b';
    });
    btn.style.background = '#3b82f6';
    btn.style.color = '#ffffff';
    conRender();
}

function conTogglePause() {
    _conPaused = !_conPaused;
    const btn = document.getElementById('con-pause-btn');
    if (btn) {
        btn.innerText = _conPaused ? '▶ Resume' : '⏸';
        btn.style.color = _conPaused ? '#f9e2af' : '#64748b';
    }
}

function conClear() {
    _conHistory.length = 0;
    conRender();
}

function conCopyText(text, btn) {
    const done = () => {
        if (!btn) return;
        const old = btn.innerText;
        btn.innerText = '✓';
        setTimeout(() => btn.innerText = old, 1000);
    };
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done).catch(() => fallback());
    } else {
        fallback();
    }
    function fallback() {
        const t = document.createElement('textarea');
        t.value = text;
        t.style.position = 'fixed';
        t.style.opacity = '0';
        document.body.appendChild(t);
        t.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        document.body.removeChild(t);
    }
}

function conCopyEntry(btn) {
    const row = btn.closest('[data-con-idx]');
    if (!row) return;
    const e = _conEntriesView[parseInt(row.dataset.conIdx, 10)];
    if (e) conCopyText(`[${e.time}] ${e.level.toUpperCase()} ${e.message}`, btn);
}

_conListeners.push(conRender);
function conSwitchMainTab(which) {
    document.getElementById('con-view-frontend').classList.toggle('hidden', which !== 'frontend');
    document.getElementById('con-view-backend').classList.toggle('hidden', which !== 'backend');

    document.getElementById('con-tab-frontend').className = which === 'frontend'
        ? 'flex-1 py-2 rounded-lg text-[10px] font-black uppercase bg-green-600 text-white transition-all'
        : 'flex-1 py-2 rounded-lg text-[10px] font-black uppercase text-slate-400 transition-all';

    document.getElementById('con-tab-backend').className = which === 'backend'
        ? 'flex-1 py-2 rounded-lg text-[10px] font-black uppercase bg-red-600 text-white transition-all'
        : 'flex-1 py-2 rounded-lg text-[10px] font-black uppercase text-slate-400 transition-all';
}

async function conRunBackend() {
    const codeInput = document.getElementById('con-backend-code');
    const outputEl = document.getElementById('con-backend-output');
    const runBtn = document.getElementById('con-backend-run-btn');
    const code = codeInput.value.trim();

    if (!code) return showAppAlert("Enter code to run.", 'warning');

    showAppConfirm("This executes arbitrary code on your live server. Continue?", async (ok) => {
        if (!ok) return;

        runBtn.disabled = true;
        runBtn.innerText = "⌛ Running...";
        outputEl.innerHTML = '<p class="text-slate-500 text-[10px]">Executing...</p>';

        try {
            const res = await secureFetch('/api/admin/console/eval', {
                method: 'POST',
                body: JSON.stringify({ code })
            });

            let html = '';

            if (res.logs && res.logs.length > 0) {
                html += res.logs.map(l => {
                    const isError = l.startsWith('[error]');
                    const isWarn = l.startsWith('[warn]');
                    const color = isError ? '#f38ba8' : (isWarn ? '#f9e2af' : '#89b4fa');
                    return `<div style="color:${color};padding:2px 0;white-space:pre-wrap;word-break:break-all;">${l}</div>`;
                }).join('');
            }

            if (res.result !== undefined) {
                html += `<div style="color:#a6e3a1;padding:6px 0;border-top:1px solid rgba(255,255,255,0.05);margin-top:6px;white-space:pre-wrap;word-break:break-all;"><b>Return:</b> ${res.result}</div>`;
            }

            if (res.error) {
                html += `<div style="color:#f38ba8;padding:6px 0;border-top:1px solid rgba(255,255,255,0.05);margin-top:6px;white-space:pre-wrap;word-break:break-all;"><b>Error:</b> ${res.error}</div>`;
            }

            if (!html) html = '<p class="text-slate-500 text-[10px]">No output.</p>';

            outputEl.innerHTML = html;
            tg.HapticFeedback.notificationOccurred(res.error ? 'error' : 'success');

        } catch (e) {
            outputEl.innerHTML = `<div style="color:#f38ba8;">Network error: ${e.message}</div>`;
        } finally {
            runBtn.disabled = false;
            runBtn.innerText = "▶ Execute on Server";
        }
    }, 'error', 'Confirm Execution', 'Run It', 'Cancel');
}    
let _backendStreamActive = false;

async function conStartBackendStream() {
    if (_backendStreamActive) return;
    _backendStreamActive = true;

    try {
        const response = await fetch(`${RENDER_URL}/api/admin/console/stream`, {
            headers: {
                'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || ''
            }
        });

        if (!response.ok || !response.body) {
            console.warn('[Backend Stream] Failed to connect:', response.status);
            _backendStreamActive = false;
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop(); // keep incomplete chunk

            parts.forEach(part => {
                const line = part.replace(/^data:\s*/, '').trim();
                if (!line) return;
                try {
                    const data = JSON.parse(line);
                    _conHistory.push({
                        id: Date.now() + Math.random(),
                        level: data.level,
                        time: new Date(data.time).toLocaleTimeString('en-US', { hour12: false }),
                        message: '[SERVER] ' + data.message
                    });
                    if (_conHistory.length > 500) _conHistory.shift();
                    if (!_conPaused) conRender();
                } catch (e) {}
            });
        }
    } catch (err) {
        console.warn('[Backend Stream] Connection error:', err.message);
    } finally {
        _backendStreamActive = false;
    }
}        
async function conPasteBackend() {
    const ta = document.getElementById('con-backend-code');
    const btn = document.getElementById('con-backend-paste-btn');
    if (!ta) return;
    try {
        const text = await navigator.clipboard.readText();
        if (!text) throw new Error('empty');
        // Insert at cursor position, replacing any selection
        const start = ta.selectionStart ?? ta.value.length;
        const end = ta.selectionEnd ?? ta.value.length;
        ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
        ta.selectionStart = ta.selectionEnd = start + text.length;
        ta.focus();
        if (btn) { btn.innerText = '✓ Pasted'; setTimeout(() => btn.innerText = '📋 Paste', 1200); }
    } catch (err) {
        // Clipboard read is often blocked in Telegram WebViews, so fall back to native paste
        ta.focus();
        if (btn) { btn.innerText = 'Long-press → Paste'; setTimeout(() => btn.innerText = '📋 Paste', 2500); }
    }
}
 async function loadAdminRegistry() {
    const registryList = document.getElementById('admin-registry-list');
    const activityLog = document.getElementById('admin-activity-log');
    if (!registryList) return;

    registryList.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-4">Loading...</p>';

    try {
        const res = await secureFetch('/api/admin/registry');

        const admins = res.admins || [];
        const activity = res.activity || [];

        // Render admin cards
        if (admins.length === 0) {
            registryList.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-4">No admins found</p>';
        } else {
            registryList.innerHTML = admins.map(a => {
                const lastSeen = formatLastActive(a.last_active);
                const isOnline = a.last_active && (Date.now() - new Date(a.last_active)) < 300000; // 5 min

                return `
                    <div class="glass p-4 border-l-2 ${isOnline ? 'border-green-500' : 'border-slate-600'} flex justify-between items-center">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center text-xs font-black">
                                ${(a.first_name || a.username || 'A').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p class="text-xs font-black text-white">${a.first_name || 'Admin'}</p>
                                <p class="text-[9px] text-slate-400">${a.username ? '@' + a.username : 'ID: ' + a.user_id}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="flex items-center gap-1 justify-end mb-1">
                                <span class="w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-600'}"></span>
                                <span class="text-[9px] font-bold ${isOnline ? 'text-green-400' : 'text-slate-500'}">${isOnline ? 'Online' : 'Last: ' + lastSeen}</span>
                            </div>
                            <span class="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                                ${a.user_id === OWNER_ID ? 'Owner' : 'Admin'}
                            </span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Render activity log
        if (activity.length === 0) {
            activityLog.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-4">No activity in last 24 hours</p>';
        } else {
            const ACTION_ICONS = {
                'payout_approved': '✅',
                'payout_rejected': '❌',
                'proof_approved':  '📥',
                'proof_rejected':  '🚫',
                'task_added':      '📋',
                'task_deleted':    '🗑️',
                'user_banned':     '🔨',
                'user_unbanned':   '🔓',
                'broadcast_sent':  '📣',
                'settings_updated':'⚙️'
            };

            activityLog.innerHTML = activity.map(log => {
                const timeAgo = getTimeAgo(new Date(log.timestamp));
                const icon = ACTION_ICONS[log.action] || '🔧';

                return `
                    <div class="flex items-start gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                        <span class="text-base flex-shrink-0">${icon}</span>
                        <div class="flex-1 min-w-0">
                            <p class="text-[10px] font-bold text-white">${log.description || log.action}</p>
                            <p class="text-[9px] text-slate-500 mt-0.5">
                                ${log.admin_name || 'Admin'} · ${timeAgo}
                            </p>
                        </div>
                    </div>
                `;
            }).join('');
        }

    } catch (e) {
        registryList.innerHTML = '<p class="text-center text-[10px] text-red-400 py-4">Failed to load registry.</p>';
    }
}
