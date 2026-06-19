const _conHistory = [];
let _conFilter = 'all';
let _conPaused = false;
let _conListeners = [];

(function patchConsole() {
    ['log','info','warn','error','debug'].forEach(level => {
        const orig = console[level].bind(console);
        console[level] = (...args) => {
            orig(...args);
            const entry = {
                id: Date.now() + Math.random(),
                level,
                time: new Date().toLocaleTimeString('en-US', { hour12: false }),
                message: args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')
            };
            _conHistory.push(entry);
            if (_conHistory.length > 500) _conHistory.shift();
            if (!_conPaused) _conListeners.forEach(fn => fn());
        };
    });
    window.addEventListener('error', e => console.error('Uncaught: ' + e.message));
    window.addEventListener('unhandledrejection', e => console.error('Unhandled Promise: ' + e.reason));
})();

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

    container.innerHTML = filtered.map(e => `
        <div style="display:flex;gap:8px;padding:4px 12px;align-items:flex-start;border-left:2px solid ${COLORS[e.level]}20;" 
             onmouseover="this.style.background='rgba(255,255,255,0.03)'" 
             onmouseout="this.style.background='transparent'">
            <span style="color:#45475a;font-size:9px;min-width:55px;padding-top:3px;flex-shrink:0">${e.time}</span>
            <span style="font-size:9px;padding:1px 5px;border-radius:3px;background:${BADGES[e.level]};color:${COLORS[e.level]};min-width:38px;text-align:center;flex-shrink:0;font-weight:800">${e.level.toUpperCase()}</span>
            <span style="color:${COLORS[e.level]};font-size:11px;flex:1;white-space:pre-wrap;word-break:break-all">${e.message}</span>
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

_conListeners.push(conRender);
