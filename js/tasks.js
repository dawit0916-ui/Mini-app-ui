function startTask(url, taskId, reward, duration) {
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
            btn.onclick = () => claimTask(taskId);
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
                    ${t.type === 'manual' ? `<span class="text-[8px] text-indigo-400 uppercase font-black">${t.proof_type || 'either'}</span>` : ''}
                    <span class="text-[8px] text-slate-500 font-black">${t.completions || 0}${t.max_users ? '/' + t.max_users : ''} done</span>
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
            showAppAlert(result.error || "Verification failed.", 'error', 'Not Joined Yet');
            btn.disabled = false;
            btn.innerText = "Claim Reward";
        }
    } catch (err) {
        showAppAlert("Connection error. Check your internet.", 'error')
        btn.disabled = false;
    }
}

// Shows/hides the proof selector, swaps the link hint, and updates the icon area
function updateTaskTypeFields(prefix) {
    const radioName = prefix === 'add' ? 'task-add-verify-type' : 'edit-task-type';
    const idBase = prefix === 'add' ? 'task-add' : 'edit-task';
    const type = document.querySelector(`input[name="${radioName}"]:checked`)?.value || 'auto';

    document.getElementById(`${idBase}-proof-wrap`)?.classList.toggle('hidden', type !== 'manual');
    const link = document.getElementById(`${idBase}-link`);
    if (link) link.placeholder = type === 'auto' ? 'https://t.me/channelname' : 'URL (https://...)';

    updateTaskIconVisibility(prefix);
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
    const maxUsers = maxUsersEl && maxUsersEl.value ? parseInt(maxUsersEl.value) : undefined;

    if (!title || !link || !reward) return showAppAlert("Title, Link, and Reward are required.", 'warning');
    if (type === 'auto' && !/^https:\/\/t\.me\/[A-Za-z0-9_]{4,}/.test(link.trim())) {
        return showAppAlert("Auto tasks need a public Telegram link like https://t.me/channelname", 'warning');
    }

    const proofType = document.getElementById('task-add-proof-type')?.value || 'either';
    const taskData = { title, url: link, description: desc, image: imageString, reward: parseFloat(reward), category, type, proof_type: proofType, max_users: maxUsers };

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
        updateTaskTypeFields('add');

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
    telegram: 'assets/images/icon-tele.png',
    twitter: 'assets/icons/twitter.png',
    youtube: 'assets/images/icon-youtube.png',
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
            const isManual = task.type === 'manual';
            const isCompleted = !!task.completed;
            const isPending = !!task.pending;
            const isFull = !!task.full && !isCompleted;
            const locked = isCompleted || isPending || isFull;
            const label = isCompleted ? '✓ Done' : isPending ? '⏳ Pending' : isFull ? 'Full' : (isManual ? 'Submit' : 'Start');
            const action = isManual
                ? `toggleProofSection('${taskId}', '${task.url || ''}')`
                : `startTask('${task.url || ''}', '${taskId}', ${task.reward}, 10)`;
            const showText = task.proof_type !== 'screenshot';
            const showShot = task.proof_type !== 'text';

            htmlBuffer += `
                <div id="task-card-${taskId}" class="glass mb-4 overflow-hidden border border-white/5 rounded-2xl transition-all">
                    <div class="p-4 flex justify-between items-center gap-3">
                        <div class="flex items-center gap-4 min-w-0">
                            ${task.image ? `
                                <img src="${task.image}" class="w-12 h-12 rounded-full object-cover border border-white/10 shrink-0">
                            ` : `
                                <div class="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-xl shrink-0">${isManual ? '📢' : '🔗'}</div>
                            `}
                            <div class="min-w-0">
                                <h4 class="text-sm font-bold text-white truncate">${task.title}</h4>
                                <span class="text-[10px] text-amber-400 font-black tracking-wide block mt-0.5">+${task.reward.toFixed(2)} DASH</span>
                            </div>
                        </div>
                        <button id="btn-task-${taskId}" onclick="${action}"
                            class="btn-premium px-5 py-2 rounded-xl text-[10px] font-black uppercase shrink-0 ${locked ? 'opacity-50 cursor-default' : ''}"
                            ${locked ? 'disabled' : ''}>${label}</button>
                    </div>

                    ${isManual && !locked ? `
                        <div id="proof-${taskId}" class="hidden px-4 pb-4 border-t border-white/[0.02] pt-3 bg-black/10">
                            ${task.description ? `<p class="text-[10px] text-slate-400 mb-3">${task.description}</p>` : ''}
                            ${showText ? `<input id="input-proof-${taskId}" type="text" class="w-full p-3 rounded-xl text-xs mb-2.5 bg-black/40 text-white border border-white/5" placeholder="Username / proof link...">` : ''}
                            ${showShot ? `
                                <label for="proof-file-${taskId}" id="proof-upload-label-${taskId}" class="block w-full p-3 rounded-xl text-center bg-black/40 border border-dashed border-white/10 mb-2.5 cursor-pointer">
                                    <span class="text-[10px] font-bold text-slate-400">📸 Upload screenshot</span>
                                </label>
                                <input id="proof-file-${taskId}" type="file" accept="image/*" class="hidden" onchange="previewProofImage(this, '${taskId}')">
                                <img id="proof-preview-${taskId}" class="hidden w-full max-h-48 object-contain rounded-xl mb-2.5">
                            ` : ''}
                            <button id="btn-send-proof-${taskId}" onclick="submitManualProof('${taskId}')" class="w-full bg-green-600/20 text-green-400 py-2.5 rounded-xl text-[10px] font-black uppercase active:scale-[0.99]">Send Proof</button>
                        </div>
                    ` : ''}
                </div>`;
        });
        taskContainer.innerHTML = htmlBuffer;
        
    } catch (e) {
    console.error("Task Load Error:", e);
    const offline = navigator.onLine === false;
    taskContainer.innerHTML = offline
        ? getErrorStateHTML('📡', 'No connection', 'Check your internet and try again.')
        : getErrorStateHTML('🛰️', 'Server unreachable', 'Please try again.');
}
}
function toggleProofSection(taskId, url) {
    const section = document.getElementById(`proof-${taskId}`);
    if (!section) return;
    const opening = section.classList.contains('hidden');
    section.classList.toggle('hidden');
    if (opening && url) tg.openLink(url);
    tg.HapticFeedback.impactOccurred('light');
}

// Shrinks screenshots before upload (keeps requests well under the 5 MB limit)
function compressProofImage(file, maxSide = 1280, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objUrl = URL.createObjectURL(file);
        img.onload = () => {
            const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(objUrl);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error('Could not read image')); };
        img.src = objUrl;
    });
}

async function submitManualProof(taskId) {
    const btn = document.getElementById(`btn-send-proof-${taskId}`);
    const proof = document.getElementById(`input-proof-${taskId}`)?.value?.trim() || '';
    const file = document.getElementById(`proof-file-${taskId}`)?.files?.[0];
    if (!proof && !file) return showAppAlert("Add your proof first.", 'warning');

    if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
    try {
        const payload = { taskId };
        if (proof) payload.proof = proof;
        if (file) payload.screenshot = await compressProofImage(file);

        const res = await secureFetch('/api/secure/submit-proof', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (res.success) {
            tg.HapticFeedback.notificationOccurred('success');
            showAppAlert(`Proof submitted! REF: ${res.proofId}`, 'success');
            loadAvailableTasks();
        } else {
            showAppAlert(res.error || "Submission failed.", 'error');
        }
    } catch (e) {
        console.error('submitManualProof error:', e);
        showAppAlert("Could not send your proof. Try again.", 'error');
    } finally {
        if (btn && document.body.contains(btn)) { btn.disabled = false; btn.textContent = 'Send Proof'; }
    }
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
        document.getElementById('edit-task-max-users').value = task.max_users || '';
        document.getElementById('edit-task-enabled').checked = task.enabled !== false;

        const typeRadio = document.querySelector(`input[name="edit-task-type"][value="${task.type || 'auto'}"]`);
        if (typeRadio) typeRadio.checked = true;
         document.getElementById('edit-task-proof-type').value = task.proof_type || 'either';
        updateTaskTypeFields('edit');
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
            proof_type: document.getElementById('edit-task-proof-type').value,
            max_users: document.getElementById('edit-task-max-users').value ? parseInt(document.getElementById('edit-task-max-users').value) : null,
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
