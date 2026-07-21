
// Optional: load preview text on Earn tab open too, so banner shows live info
/* ============================================================
   YOUTUBE TASKS — LIST VIEW
   ============================================================ */
async function loadYoutubeTasks() {
    const container = document.getElementById('youtube-task-list');
    if (!container) return;

    container.innerHTML = Array(3).fill(0).map(() => `
        <div class="glass mb-4 p-4 flex justify-between items-center opacity-50">
            <div class="flex items-center gap-4 w-full">
                <div class="w-10 h-10 skeleton rounded-xl"></div>
                <div class="flex-1">
                    <div class="skeleton skeleton-text mb-2 w-3/4"></div>
                    <div class="skeleton skeleton-text w-1/3"></div>
                </div>
            </div>
            <div class="skeleton skeleton-btn w-16 h-8 rounded-xl"></div>
        </div>
    `).join('');

    try {
        const res = await secureFetch('/api/secure/youtube-tasks');
        if (!res || !res.success || !Array.isArray(res.tasks)) {
            container.innerHTML = '<p class="text-center text-xs text-red-400 py-6">Error loading tasks</p>';
            return;
        }

        if (res.tasks.length === 0) {
            container.innerHTML = getEmptyStateHTML('📺', 'No Tasks Yet', 'Check back soon for new videos');
            return;
        }

        container.innerHTML = res.tasks.map(t => `
            <div class="glass p-4 flex justify-between items-center gap-3 border border-white/5 rounded-2xl">
                <div class="flex items-center gap-4 min-w-0">
                    ${t.thumbnail ? `
                        <img src="${t.thumbnail}" class="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0">
                    ` : `
                        <img src="/assets/images/icon-youtube.png" class="w-12 h-12 object-contain drop-shadow-lg shrink-0">
                    `}
                    <div class="min-w-0">
                        <h4 class="text-sm font-bold text-white truncate">${t.title}</h4>
                        <span class="text-[10px] text-green-400 font-black tracking-wide block mt-0.5">+${t.reward.toFixed(2)} DASH</span>
                    </div>
                </div>
                <button onclick='openYoutubeTaskDetail(${JSON.stringify(t).replace(/'/g, "&#39;")})'
                    class="btn-premium px-5 py-2 rounded-xl text-[10px] font-black uppercase shrink-0 ${t.claimed ? 'opacity-50 cursor-default' : ''}"
                    ${t.claimed ? 'disabled' : ''}>
                    ${t.claimed ? '✓ Done' : 'Open'}
                </button>
            </div>
        `).join('');

    } catch (e) {
        console.error("YouTube task list error:", e);
        container.innerHTML = '<p class="text-center text-xs text-red-400 py-6">Error</p>';
    }
}

/* ============================================================
   YOUTUBE TASKS — DETAIL VIEW
   ============================================================ */
function openYoutubeTaskDetail(task) {
    currentYoutubeTask = task;

    document.getElementById('earn-section-youtube').classList.add('hidden');
    document.getElementById('earn-section-youtube-detail').classList.remove('hidden');

    document.getElementById('yt-detail-title').innerText = task.title;
    document.getElementById('yt-detail-reward').innerText = task.reward.toFixed(2);
    document.getElementById('yt-detail-instructions').innerText = task.instructions || 'Watch the full video carefully — the code is shown or mentioned somewhere inside it.';
    document.getElementById('yt-code-input').value = '';

    const claimBtn = document.getElementById('yt-claim-btn');
    claimBtn.disabled = false;
    claimBtn.innerText = '🎉 Submit & Claim';

    tg.HapticFeedback.impactOccurred('light');
}

function backToYoutubeList() {
    document.getElementById('earn-section-youtube-detail').classList.add('hidden');
    document.getElementById('earn-section-youtube').classList.remove('hidden');
    currentYoutubeTask = null;
    loadYoutubeTasks();
}

function watchYoutubeTaskVideo() {
    if (!currentYoutubeTask) return;
    tg.openLink(currentYoutubeTask.youtubeUrl);
    tg.HapticFeedback.impactOccurred('light');
}

async function submitYoutubeTaskCode() {
    if (!currentYoutubeTask) return;

    const codeInput = document.getElementById('yt-code-input');
    const code = codeInput.value.trim();
    if (!code) return showAppAlert("Please enter the code from the video.", 'warning');

    const btn = document.getElementById('yt-claim-btn');
    btn.disabled = true;
    btn.innerText = "Verifying...";

    try {
        const result = await secureFetch('/api/secure/youtube-tasks/claim', {
            method: 'POST',
            body: JSON.stringify({ taskId: currentYoutubeTask.id, code })
        });

        if (result && result.success) {
            tg.HapticFeedback.notificationOccurred('success');

            const balMain = document.getElementById('balance-main');
            if (balMain) balMain.innerText = parseFloat(result.newBalance || 0).toFixed(2);

            showAppReward('usdt', result.reward.toFixed(2));
            backToYoutubeList();
        } else {
            showAppAlert(result?.error || "Incorrect code. Please try again.", 'error');
            btn.disabled = false;
            btn.innerText = "🎉 Submit & Claim";
        }
    } catch (err) {
        showAppAlert("Connection error. Check your internet.", 'error');
        btn.disabled = false;
        btn.innerText = "🎉 Submit & Claim";
    }
        }
/* ============================================================
   ADMIN: YOUTUBE TASK MANAGER
   ============================================================ */
async function addNewYoutubeTask() {
    try {
        const title = document.getElementById('new-yt-title').value.trim();
        const youtubeUrl = document.getElementById('new-yt-url').value.trim();
        const instructions = document.getElementById('new-yt-instructions').value.trim();
        const code = document.getElementById('new-yt-code').value.trim();
        const reward = document.getElementById('new-yt-reward').value;

        if (!title || !youtubeUrl || !code || !reward) {
            return showAppAlert("Title, URL, Code, and Reward are required.", 'warning');
        }

        const res = await secureFetch('/api/admin/youtube-tasks/add', {
            method: 'POST',
            body: JSON.stringify({
                title, youtubeUrl, instructions, code,
                reward: parseFloat(reward)
            })
        });

        if (res && res.success) {
            tg.HapticFeedback.notificationOccurred('success');
            showAppAlert("YouTube task deployed successfully!", 'success');

            ['new-yt-title', 'new-yt-url', 'new-yt-instructions', 'new-yt-code', 'new-yt-reward'].forEach(id => {
                document.getElementById(id).value = '';
            });

            loadAdminYoutubeTaskList();
        } else {
            showAppAlert("Error: " + (res?.error || "Unknown error"), 'error');
        }
    } catch (e) {
        showAppAlert("Failed to connect to server.", 'error');
    }
}
async function loadAdminYoutubeTaskList() {
    const container = document.getElementById('admin-youtube-tasks-list');
    if (!container) return;
    container.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-4">Loading...</p>';

    try {
        const res = await secureFetch('/api/admin/youtube-tasks');
        const tasks = (res && res.success && Array.isArray(res.tasks)) ? res.tasks : [];

        if (tasks.length === 0) {
            container.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-4">No YouTube tasks yet</p>';
            return;
        }

        container.innerHTML = tasks.map(t => `
            <div class="glass p-3 flex justify-between items-center border-white/5">
                <div class="min-w-0">
                    <p class="text-xs font-bold truncate">${t.title}</p>
                    <p class="text-[9px] text-green-400">+${t.reward} DASH · ${(t.claimedBy || []).length} claimed</p>
                    <p class="text-[9px] text-slate-500 font-mono">Code: ${t.code}</p>
                </div>
                <button onclick="deleteYoutubeTask('${t.id}')" class="bg-red-600/20 text-red-400 border border-red-500/20 text-[9px] px-3 py-1 rounded-lg font-black uppercase shrink-0">Delete</button>
            </div>
        `).join('');

    } catch (e) {
        container.innerHTML = '<p class="text-center text-[10px] text-red-400 py-4">Failed to load.</p>';
    }
}
async function deleteYoutubeTask(id) {
    showAppConfirm("Delete this YouTube task permanently?", async (ok) => {
        if (!ok) return;
        const res = await secureFetch(`/api/admin/youtube-tasks/delete/${id}`, { method: 'DELETE' });
        if (res && res.success) {
            showAppAlert("Task removed successfully.", 'success');
            loadAdminYoutubeTaskList();
        } else {
            showAppAlert(res?.error || "Failed to delete.", 'error');
        }
    });
}
/* ============================================================
   WIRING: extend switchTab and switchAdminPanel without
   removing your existing logic (they're already wrapped once
   for the wallet tab — this just chains another wrapper).
   ============================================================ */
const _earnTabPrevSwitchTab = window.switchTab;
window.switchTab = function(tabId, btn) {
    if (typeof _earnTabPrevSwitchTab === "function") {
        _earnTabPrevSwitchTab(tabId, btn);
    }
    if (tabId === 'earn') {
        // Always return to the hub view when the tab is opened fresh
        closeEarnSection();
    }
};
const _earnPanelPrevSwitchAdminPanel = window.switchAdminPanel;
window.switchAdminPanel = function(panelId) {
    if (typeof _earnPanelPrevSwitchAdminPanel === "function") {
        _earnPanelPrevSwitchAdminPanel(panelId);
    }
    if (panelId === 'panel-youtube-tasks') {
        loadAdminYoutubeTaskList();
    }
};
