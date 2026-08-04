function startTask(url, taskId, reward, duration, isDaily = false) {
    tg.openLink(url);
    
    const btn = document.getElementById(`btn-task-${taskId}`);
    if (!btn) return;
    
    btn.disabled = true;
    btn.innerText = `Wait (${duration}s)`;
    activeTasks[taskId] = Date.now();

    let secondsLeft = duration;
    const interval = setInterval(() => {
        secondsLeft--;
        btn.innerText = `Wait (${secondsLeft}s)`;
        
        if (secondsLeft <= 0) {
            clearInterval(interval);
            btn.innerText = "✅ Claim";
            btn.disabled = false;
            btn.classList.remove('btn-premium');
            btn.classList.add('bg-green-600', 'px-5', 'py-2', 'rounded-xl', 'text-[10px]', 'font-black');
            // Daily-type tasks reset every day and are level-gated — they
            // need the dedicated daily-task endpoint, not the one-time
            // claim-task endpoint (which would permanently mark them done
            // and never let them reset).
            btn.onclick = () => isDaily ? claimDailyTask(taskId) : claimTask(taskId);
        }
    }, 1000);
}

// 3. Fixed Task List UI Container Clash
async function loadAdminTaskList() {
    const tasks = await secureFetch('/api/admin/tasks');
    const container = document.getElementById('admin-active-tasks-list'); // Fixed pointer assignment target
    if (!container) return;
    
    const taskArray = Array.isArray(tasks) ? tasks : [];
    if(taskArray.length === 0) {
        container.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-4">No active tasks loaded</p>';
        return;
    }
    
    container.innerHTML = taskArray.map(t => `
        <div class="glass p-3 flex justify-between items-center border-white/5 ${t.enabled === false ? 'opacity-50' : ''}">
            <div>
                <p class="text-xs font-bold">${t.title}</p>
                <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span class="text-[9px] text-green-400">${t.reward} DASH</span>
                    <span class="text-[8px] text-slate-500 uppercase font-black">${t.type || 'auto'}</span>
                    ${t.duration ? `<span class="text-[8px] text-purple-400 uppercase font-black">${t.duration}</span>` : ''}
                    ${t.enabled === false ? '<span class="text-[8px] text-red-400 uppercase font-black">Disabled</span>' : ''}
                </div>
            </div>
            <div class="flex gap-1.5">
                <button onclick="openTaskEditDrawer('${t.id}')" class="bg-blue-600/20 text-blue-400 border border-blue-500/20 text-[9px] px-3 py-1 rounded-lg font-black uppercase">Edit</button>
                <button onclick="deleteTask('${t.id}')" class="bg-red-600/20 text-red-400 border border-red-500/20 text-[9px] px-3 py-1 rounded-lg font-black uppercase">Delete</button>
            </div>
        </div>
    `).join('');
}


async function claimTask(taskId) {
    const btn = document.getElementById(`btn-task-${taskId}`);
    btn.disabled = true;
    btn.innerText = "Verifying...";

    try {
        // Using the secure wrapper
        const result = await secureFetch('/api/secure/claim-task', {
            method: 'POST',
            body: JSON.stringify({ taskId: taskId })
        });
if (result.success) {
    tg.HapticFeedback.notificationOccurred('success');
    
    const card = document.getElementById(`task-card-${taskId}`);
    if (card) {
        card.classList.add('fade-out');
        setTimeout(() => card.remove(), 500);
    }

    // Update all balance display points safely
    // newBalance = balance field = DASH
const newDash = parseInt(result.newBalance || 0);
const balMain = document.getElementById('balance-main');
if (balMain) balMain.innerText = newDash.toLocaleString();

// Pull fresh balances into header
updateHeaderBalances(
    result.newBalance || 0
    
);

    showNotificationToast(`+${result.reward || ''} DASH earned! 🎉`, 'success');
}
     else {
            if (result.unlocksAtLevel && typeof showLevelLockedOverlay === 'function' && showLevelLockedOverlay(result.unlocksAtLevel, result.error)) {
                // upgrade-required overlay shown instead of the generic alert
            } else {
                showAppAlert(result.error || "Verification failed.", 'error', 'Not Joined Yet')
            }
            btn.disabled = false;
            btn.innerText = "Claim Reward";
        }
    } catch (err) {
        showAppAlert("Connection error. Check your internet.", 'error')
        btn.disabled = false;
    }
        }

// Daily-type tasks reset every day and are level-gated, so they need their
// own dedicated endpoint instead of the one-time claim-task used above.
async function claimDailyTask(taskId) {
    const btn = document.getElementById(`btn-task-${taskId}`);
    if (btn) { btn.disabled = true; btn.innerText = "Verifying..."; }

    try {
        const result = await secureFetch('/api/secure/complete-daily-task', {
            method: 'POST',
            body: JSON.stringify({ taskId: taskId })
        });

        if (result.success) {
            tg.HapticFeedback.notificationOccurred('success');

            const newDash = parseInt(result.newBalance || 0);
            const balMain = document.getElementById('balance-main');
            if (balMain) balMain.innerText = newDash.toLocaleString();
            updateHeaderBalances(result.newBalance || 0);

            showNotificationToast(`+${result.reward || ''} DASH earned! 🎉`, 'success');

            // Unlike a one-time task, this card shouldn't disappear — reload
            // so it re-renders in its "completed today, resets at midnight"
            // state instead.
            await loadAvailableTasks();
        } else {
            if (result.unlocksAtLevel && typeof showLevelLockedOverlay === 'function' && showLevelLockedOverlay(result.unlocksAtLevel, result.error)) {
                // upgrade-required overlay shown instead of the generic alert
            } else {
                showAppAlert(result.error || "Couldn't complete task.", 'error', 'Daily Task');
            }
            if (btn) { btn.disabled = false; btn.innerText = "✅ Claim"; }
        }
    } catch (err) {
        console.error('Claim daily task error:', err);
        showAppAlert("Connection error. Check your internet.", 'error');
        if (btn) { btn.disabled = false; btn.innerText = "✅ Claim"; }
    }
}

// Admin: Add Task Function
function updateTaskAddDurationVisibility() {
    const type = document.querySelector('input[name="task-add-verify-type"]:checked')?.value;
    const wrap = document.getElementById('task-add-duration-wrap');
    if (!wrap) return;
    wrap.classList.toggle('hidden', type === 'daily');
}

async function addNewTask() {
  try {
    const titleEl = document.getElementById('task-add-title');
    const linkEl = document.getElementById('task-add-link');
    const descEl = document.getElementById('task-add-desc');
    const iconValueEl = document.getElementById('task-add-icon-value');
    const rewardEl = document.getElementById('task-add-reward');
    const categoryEl = document.getElementById('task-add-category');
    const typeEl = document.querySelector('input[name="task-add-verify-type"]:checked');
    const durationEl = document.getElementById('task-add-duration');
    const maxUsersEl = document.getElementById('task-add-max-users');

    if (!titleEl || !linkEl || !descEl || !iconValueEl || !rewardEl || !categoryEl || !typeEl) {
        console.error('addNewTask: missing expected form element', {
            titleEl, linkEl, descEl, iconValueEl, rewardEl, categoryEl, typeEl
        });
        return showAppAlert("Form is not fully loaded. Please reload the page.", 'error');
    }

    const title = titleEl.value;
    const link = linkEl.value;
    const desc = descEl.value;
    const imageString = iconValueEl.value || TASK_ICON_PATHS.telegram;
    const reward = rewardEl.value;
    const category = categoryEl.value;
    const type = typeEl.value;
    const duration = (durationEl && type !== 'daily') ? durationEl.value : '';
    const maxUsers = maxUsersEl && maxUsersEl.value ? parseInt(maxUsersEl.value) : undefined;

    if (!title || !link || !reward) return showAppAlert("Title, Link, and Reward are required.", 'warning');

    const taskData = { title, url: link, description: desc, image: imageString, reward: parseFloat(reward), category, type, duration, max_users: maxUsers };

    const res = await secureFetch('/api/admin/tasks/add', {
        method: 'POST',
        body: JSON.stringify(taskData)
    });
    console.log(res);

    if (res.success) {
        tg.HapticFeedback.notificationOccurred('success');
        showAppAlert("Task deployed successfully!", 'success');

        ['task-add-title', 'task-add-link', 'task-add-desc', 'task-add-reward', 'task-add-max-users'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        // Reset icon picker back to default (auto/Telegram)
        iconValueEl.value = '';
        document.querySelectorAll('.task-add-icon-btn').forEach(btn => {
            btn.classList.remove('border-blue-500', 'bg-blue-500/10');
            btn.classList.add('border-white/10');
        });
        const autoTypeRadio = document.querySelector('input[name="task-add-verify-type"][value="auto"]');
        if (autoTypeRadio) autoTypeRadio.checked = true;
        updateTaskIconVisibility('add');
        updateTaskAddDurationVisibility();

        loadAdminTaskList();
    } else {
        showAppAlert("Error: " + res.error, 'error');
    }
  } catch (e) {
    console.error(e);
    showAppAlert(e.message || "Failed to connect to server.", "error");
  }
}
// Task icon is a fixed asset path, not an uploaded file: 'auto' tasks
// always use the Telegram icon (Telegram verifies them, so it's the only
// sensible icon), everything else picks from a small set of platform icons.
const TASK_ICON_PATHS = {
    telegram: 'assets/icons/telegram.png',
    twitter: 'assets/icons/twitter.png',
    youtube: 'assets/icons/youtube.png',
    instagram: 'assets/icons/instagram.png',
    tiktok: 'assets/icons/tiktok.png'
};

function selectTaskIcon(prefix, platform) {
    document.getElementById(`${prefix}-task-icon-value`).value = TASK_ICON_PATHS[platform];
    document.querySelectorAll(`.task-${prefix}-icon-btn`).forEach(btn => {
        const isSelected = btn.getAttribute('data-icon') === platform;
        btn.classList.toggle('border-blue-500', isSelected);
        btn.classList.toggle('bg-blue-500/10', isSelected);
        btn.classList.toggle('border-white/10', !isSelected);
    });
}

function updateTaskIconVisibility(prefix) {
    const type = document.querySelector(`input[name="${prefix === 'add' ? 'task-add-verify-type' : 'edit-task-type'}"]:checked`)?.value;
    const autoNote = document.getElementById(`${prefix}-task-icon-auto-note`);
    const picker = document.getElementById(`${prefix}-task-icon-picker`);
    if (!autoNote || !picker) return;

    if (type === 'auto') {
        autoNote.classList.remove('hidden');
        picker.classList.add('hidden');
        document.getElementById(`${prefix}-task-icon-value`).value = TASK_ICON_PATHS.telegram;
    } else {
        autoNote.classList.add('hidden');
        picker.classList.remove('hidden');
    }
}

// Sets the icon picker's selected state to match an existing task's image
// path when opening the edit drawer.
function setTaskEditIconFromPath(imagePath) {
    const match = Object.entries(TASK_ICON_PATHS).find(([, path]) => path === imagePath);
    const platform = match ? match[0] : null;
    document.getElementById('edit-task-icon-value').value = imagePath || '';
    document.querySelectorAll('.task-edit-icon-btn').forEach(btn => {
        const isSelected = platform && btn.getAttribute('data-icon') === platform;
        btn.classList.toggle('border-blue-500', isSelected);
        btn.classList.toggle('bg-blue-500/10', isSelected);
        btn.classList.toggle('border-white/10', !isSelected);
    });
}
// Logic to dynamically add a new category option to the dropdown
function updateCategoryDropdown(categoryName) {
    const dropdown = document.getElementById('new-task-category');
    const option = document.createElement('option');
    option.value = categoryName;
    option.text = categoryName;
    dropdown.add(option);
}

function filterTasks(category, btn) {
    currentFilter = category;
    
    // UI: Update active chip
    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    
    loadAvailableTasks(); // Refresh list based on filter
}

async function loadAvailableTasks() {
    const taskContainer = document.getElementById('task-list');
    if (!taskContainer) return;
    
    taskContainer.innerHTML = Array(3).fill(0).map(() => `
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
        const availableTasks = await secureFetch('/api/secure/tasks-with-progress');

        if (!availableTasks || !Array.isArray(availableTasks.tasks)) {
            taskContainer.innerHTML = '<p class="text-center text-xs text-red-400 py-6">Error loading tasks</p>';
            return;
        }

        allTasks = availableTasks.tasks;

        const filteredTasks = allTasks.filter(task => {
            if (!currentFilter || currentFilter === 'All') return true;
            const taskCat = String(task.category || '').toLowerCase().trim();
            const filterCat = String(currentFilter).toLowerCase().trim();
            return taskCat === filterCat;
        });

        if (filteredTasks.length === 0) {
            taskContainer.innerHTML = `<div class="text-center py-10"><p class="text-2xl mb-1">🏜️</p><p class="text-[10px] text-slate-400 uppercase">No tasks available</p></div>`;
            return;
        }

        let htmlBuffer = '';
        
        filteredTasks.forEach(task => {
            const taskId = task.id || task._id;
            const isDaily = task.type === 'daily';
            const isManual = task.type === 'manual' || !task.url;
            const isCompleted = task.completed;
            const progressPercent = (task.progress / task.requirementCount) * 100;

            htmlBuffer += `
                <div id="task-card-${taskId}" class="glass mb-4 overflow-hidden border border-white/5 rounded-2xl transition-all ${isDaily ? 'border-l-4 border-green-500' : ''}">
                    <div class="p-4 flex justify-between items-center gap-3">
                        <div class="flex items-center gap-4 min-w-0">
                            ${task.image ? `
                                <img src="${task.image}" class="w-12 h-12 rounded-full object-cover border border-white/10 shrink-0">
                            ` : `
                                <div class="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-xl shrink-0">
                                    ${isDaily ? '📅' : (isManual ? '📢' : '🔗')}
                                </div>
                            `}
                            <div class="min-w-0">
                                <h4 class="text-sm font-bold text-white truncate">${task.title}</h4>
                                ${isDaily ? `<span class="text-[9px] text-green-400 font-black">Daily Task</span>` : ''}
                                <span class="text-[10px] text-green-400 font-black tracking-wide block mt-0.5">+${task.reward.toFixed(2)} DASH</span>
                            </div>
                        </div>
                        <button id="btn-task-${taskId}" 
                            onclick="${isManual ? `toggleProofSection('${taskId}', '${task.url || ''}')` : `startTask('${task.url || ''}', '${taskId}', ${task.reward}, 10, ${isDaily})`}"
                            class="btn-premium px-5 py-2 rounded-xl text-[10px] font-black uppercase shrink-0 ${isCompleted ? 'opacity-50 cursor-default' : ''}"
                            ${isCompleted ? 'disabled' : ''}>
                            ${isCompleted ? '✓ Done' : (isManual ? 'Submit' : 'Start')}
                        </button>
                    </div>

                    ${isDaily && !isCompleted ? `
                        <div class="px-4 pb-3 border-t border-white/5 pt-2">
                            <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div class="h-full bg-green-500 transition-all" style="width: ${progressPercent}%"></div>
                            </div>
                            <span class="text-[9px] text-slate-400 mt-1 block">Resets at midnight UTC</span>
                        </div>
                    ` : ''}

                    ${isManual && !isCompleted ? `
                        <div id="proof-${taskId}" class="proof-section px-4 pb-4 border-t border-white/[0.02] pt-3 bg-black/10">
                            <div class="flex gap-2 mb-3 bg-black/20 p-1 rounded-xl">
                                <button onclick="switchProofMode('${taskId}','text',this)" class="proof-mode-btn flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase bg-blue-600 text-white">✏️ Text</button>
                                <button onclick="switchProofMode('${taskId}','img',this)" class="proof-mode-btn flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase text-slate-400">📸 Screenshot</button>
                            </div>
                            <div id="proof-text-${taskId}">
                                <input id="input-proof-${taskId}" type="text" class="w-full p-3 rounded-xl text-xs mb-2.5 bg-black/40 text-white border border-white/5" placeholder="Username / Proof link...">
                            </div>
                            <button onclick="submitManualProof('${taskId}')" class="w-full bg-green-600/20 text-green-400 py-2.5 rounded-xl text-[10px] font-black uppercase active:scale-[0.99]">Send Proof</button>
                        </div>
                    ` : ''}
                </div>`;
        });
        
        taskContainer.innerHTML = htmlBuffer;
        
    } catch (e) {
        console.error("Task Load Error:", e);
        taskContainer.innerHTML = '<p class="text-center text-xs text-red-400 py-6">Error</p>';
    }
}

// Helper to open manual proof area
function toggleProofSection(taskId, url) {
    tg.openLink(url); // Open the link first
    const section = document.getElementById(`proof-${taskId}`);
    section.classList.remove('hidden');
    section.classList.toggle('open');
    tg.HapticFeedback.impactOccurred('light');
}
async function submitManualProof(taskId) {
    const textInput = document.getElementById(`input-proof-${taskId}`);
    const fileInput = document.getElementById(`proof-file-${taskId}`);
    const previewImg = document.getElementById(`proof-preview-${taskId}`);
    const isImageMode = !document.getElementById(`proof-img-${taskId}`).classList.contains('hidden');

    let payload = { taskId };

    if (isImageMode) {
        const file = fileInput?.files[0];
        if (!file) return showAppAlert("Please upload a screenshot.", 'warning');
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        payload.screenshot = base64;
    } else {
        const proof = textInput?.value?.trim();
        if (!proof) return showAppAlert("Please enter your proof.", 'warning');
        payload.proof = proof;
    }

    const res = await secureFetch('/api/secure/submit-proof', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (res.success) {
        showAppAlert(`Proof submitted! REF: ${res.proofId}`, 'success');
        loadAvailableTasks();
    } else {
        showAppAlert(res.error || "Submission failed.", 'error');
    }
}
        function switchProofMode(taskId, mode, btn) {
    document.querySelectorAll(`#proof-${taskId} .proof-mode-btn`).forEach(b => {
        b.className = 'proof-mode-btn flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase text-slate-400';
    });
    btn.className = 'proof-mode-btn flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase bg-blue-600 text-white';
    document.getElementById(`proof-text-${taskId}`).classList.toggle('hidden', mode !== 'text');
    document.getElementById(`proof-img-${taskId}`).classList.toggle('hidden', mode !== 'img');
}

function previewProofImage(input, taskId) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const preview = document.getElementById(`proof-preview-${taskId}`);
        const label = document.getElementById(`proof-upload-label-${taskId}`);
        preview.src = e.target.result;
        preview.classList.remove('hidden');
        label.innerHTML = `<span class="text-[10px] font-bold text-green-400">✅ ${file.name.substring(0, 20)}</span>`;
    };
    reader.readAsDataURL(file);
            }


function updateTaskEditDurationVisibility() {
    const type = document.querySelector('input[name="edit-task-type"]:checked')?.value;
    const wrap = document.getElementById('edit-task-duration-wrap');
    if (!wrap) return;
    wrap.classList.toggle('hidden', type === 'daily');
}

let currentEditingTaskId = null;

async function openTaskEditDrawer(taskId) {
    try {
        const tasks = await secureFetch('/api/admin/tasks');
        const task = (Array.isArray(tasks) ? tasks : []).find(t => t.id === taskId);
        if (!task) return showAppAlert("Task not found.", 'error');

        currentEditingTaskId = taskId;

        document.getElementById('edit-task-id-display').innerText = `ID: ${task.id}`;
        document.getElementById('edit-task-title').value = task.title || '';
        document.getElementById('edit-task-link').value = task.url || '';
        document.getElementById('edit-task-desc').value = task.description || '';
        document.getElementById('edit-task-category').value = task.category || 'Crypto';
        document.getElementById('edit-task-reward').value = task.reward || '';
        document.getElementById('edit-task-duration').value = task.duration || '';
        document.getElementById('edit-task-max-users').value = task.max_users || '';
        document.getElementById('edit-task-enabled').checked = task.enabled !== false;

        const typeRadio = document.querySelector(`input[name="edit-task-type"][value="${task.type || 'auto'}"]`);
        if (typeRadio) typeRadio.checked = true;
        updateTaskEditDurationVisibility();
        updateTaskIconVisibility('edit');
        setTaskEditIconFromPath(task.image);

        document.getElementById('admin-task-edit-drawer').classList.add('active');
    } catch (e) {
        console.error('openTaskEditDrawer error:', e);
        showAppAlert("Failed to load task.", 'error');
    }
}

function closeTaskEditDrawer() {
    document.getElementById('admin-task-edit-drawer').classList.remove('active');
}

async function saveTaskEdit() {
    if (!currentEditingTaskId) return;

    const btn = document.getElementById('btn-save-task-edit');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const type = document.querySelector('input[name="edit-task-type"]:checked')?.value || 'auto';
        const iconValue = document.getElementById('edit-task-icon-value').value;
        const updates = {
            title: document.getElementById('edit-task-title').value,
            url: document.getElementById('edit-task-link').value,
            description: document.getElementById('edit-task-desc').value,
            image: type === 'auto' ? TASK_ICON_PATHS.telegram : (iconValue || ''),
            category: document.getElementById('edit-task-category').value,
            reward: parseFloat(document.getElementById('edit-task-reward').value) || 0,
            type,
            duration: type !== 'daily' ? document.getElementById('edit-task-duration').value : '',
            max_users: document.getElementById('edit-task-max-users').value ? parseInt(document.getElementById('edit-task-max-users').value) : undefined,
            enabled: document.getElementById('edit-task-enabled').checked
        };

        const res = await secureFetch(`/api/admin/tasks/update/${currentEditingTaskId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });

        if (res.success) {
            tg.HapticFeedback.notificationOccurred('success');
            showAppAlert("Task updated!", 'success');
            closeTaskEditDrawer();
            loadAdminTaskList();
        } else {
            showAppAlert(res.error || "Failed to update task.", 'error');
        }
    } catch (e) {
        console.error('saveTaskEdit error:', e);
        showAppAlert("Failed to save task.", 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Save Changes';
    }
}


async function deleteTask(id) {
showAppConfirm("Delete this task permanently?", async (ok) => {
    if(!ok) return;
    await secureFetch(`/api/admin/tasks/delete/${id}`, { method: 'DELETE' });
    loadAdminTaskList();
    showAppAlert("Task removed successfully.", 'success');
});
}
