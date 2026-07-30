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
        <div class="glass p-3 flex justify-between items-center border-white/5">
            <div>
                <p class="text-xs font-bold">${t.title}</p>
                <p class="text-[9px] text-green-400">${t.reward} DASH</p>
            </div>
            <button onclick="deleteTask('${t.id}')" class="bg-red-600/20 text-red-400 border border-red-500/20 text-[9px] px-3 py-1 rounded-lg font-black uppercase">Delete</button>
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

// Admin: Add Task Function
async function addNewTask() {
  try {
    const titleEl = document.getElementById('task-add-title');
    const linkEl = document.getElementById('task-add-link');
    const descEl = document.getElementById('task-add-desc');
    const previewEl = document.getElementById('task-add-image-preview');
    const rewardEl = document.getElementById('task-add-reward');
    const categoryEl = document.getElementById('task-add-category');
    const typeEl = document.querySelector('input[name="task-add-verify-type"]:checked');

    if (!titleEl || !linkEl || !descEl || !previewEl || !rewardEl || !categoryEl || !typeEl) {
        console.error('addNewTask: missing expected form element', {
            titleEl, linkEl, descEl, previewEl, rewardEl, categoryEl, typeEl
        });
        return showAppAlert("Form is not fully loaded. Please reload the page.", 'error');
    }

    const title = titleEl.value;
    const link = linkEl.value;
    const desc = descEl.value;
    const imageString = previewEl.getAttribute('data-base64') || "";
    const reward = rewardEl.value;
    const category = categoryEl.value;
    const type = typeEl.value;

    if (!title || !link || !reward) return showAppAlert("Title, Link, and Reward are required.", 'warning');

    const taskData = { title, url: link, description: desc, image: imageString, reward: parseFloat(reward), category, type };

    const res = await secureFetch('/api/admin/tasks/add', {
        method: 'POST',
        body: JSON.stringify(taskData)
    });
    console.log(res);

    if (res.success) {
        tg.HapticFeedback.notificationOccurred('success');
        showAppAlert("Task deployed successfully!", 'success');

        ['task-add-title', 'task-add-link', 'task-add-desc', 'task-add-reward'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        const fileEl = document.getElementById('task-add-image-file');
        if (fileEl) fileEl.value = '';
        previewEl.removeAttribute('data-base64');
        previewEl.src = '';
        previewEl.classList.add('hidden');

        const uploadTextEl = document.getElementById('task-add-upload-text');
        if (uploadTextEl) {
            uploadTextEl.innerText = "Upload Image File";
            uploadTextEl.className = "text-xs font-bold text-slate-400";
        }

        loadAdminTaskList();
    } else {
        showAppAlert("Error: " + res.error, 'error');
    }
  } catch (e) {
    console.error(e);
    showAppAlert(e.message || "Failed to connect to server.", "error");
  }
}
function previewUploadedImage(input) {
    const file = input.files[0];
    const textSpan = document.getElementById('task-add-upload-text');
    const previewImg = document.getElementById('task-add-image-preview');
    if (!file || !textSpan || !previewImg) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        previewImg.setAttribute('data-base64', e.target.result);
        previewImg.src = e.target.result;
        previewImg.classList.remove('hidden');
        textSpan.innerText = file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name;
        textSpan.className = "text-xs font-bold text-green-400";
        tg.HapticFeedback.impactOccurred('light');
    };
    reader.readAsDataURL(file);
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
                                <img src="${task.image}" class="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0">
                            ` : `
                                <div class="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-xl shrink-0">
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
                            onclick="${isManual ? `toggleProofSection('${taskId}', '${task.url || ''}')` : `startTask('${task.url || ''}', '${taskId}', ${task.reward}, 10)`}"
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


async function deleteTask(id) {
showAppConfirm("Delete this task permanently?", async (ok) => {
    if(!ok) return;
    await secureFetch(`/api/admin/tasks/delete/${id}`, { method: 'DELETE' });
    loadAdminTaskList();
    showAppAlert("Task removed successfully.", 'success');
});
}
