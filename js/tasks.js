

let activeTasks = {};
        
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
    const newBal = parseFloat(result.newBalance || 0).toFixed(2);
    const balMain = document.getElementById('balance-main');
    if (balMain) balMain.innerText = newBal;

    showNotificationToast(`+${result.reward || ''} USDT earned! 🎉`, 'success');
}
     else {
            showAppAlert(result.error || "Verification failed.", 'error', 'Not Joined Yet')
            btn.disabled = false;
            btn.innerText = "Claim Reward";
        }
    } catch (err) {
        showAppAlert("Connection error. Check your internet.", 'error')
        btn.disabled = false;
    }
        }
let currentFilter = 'All';

function filterTasks(category, btn) {
    currentFilter = category;
    
    // UI: Update active chip
    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    
    loadAvailableTasks(); // Refresh list based on filter
}
let cachedUserProfile = null;
let allTasks = [];

async function loadAvailableTasks() {
    const taskContainer = document.getElementById('task-list');
    if (!taskContainer) return;
    
    // 1. Skeleton Placeholder View Setup
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
        // 2. Query your secure, server-filtered available-tasks route directly
        const availableTasks = await secureFetch('/api/secure/available-tasks');

        // Safety Gate: Ensure the payload packet is a valid array map execution sequence
        if (!availableTasks || !Array.isArray(availableTasks)) {
            console.error("Could not load tasks payload packet safely. Payload received:", availableTasks);
            taskContainer.innerHTML = '<p class="text-center text-xs text-red-400 py-6">Error rendering catalog lists</p>';
            return;
        }

        // Synchronize state down into your global variables registry tracking cache
        allTasks = availableTasks;

        // 3. Handle Category Filtering on the safe array set returned by MongoDB
        const filteredTasks = allTasks.filter(task => {
            if (!currentFilter || currentFilter === 'All') return true;
            
            const taskCatClean = String(task.category || '').toLowerCase().trim();
            const filterCatClean = String(currentFilter).toLowerCase().trim();
            
            return taskCatClean === filterCatClean || 
                   (filterCatClean === 'edu' && taskCatClean.startsWith('edu'));
        });

        if (filteredTasks.length === 0) {
            taskContainer.innerHTML = `
                <div class="text-center py-10 select-none">
                    <p class="text-2xl mb-1">🏜️</p>
                    <p class="text-[10px] text-slate-400 uppercase font-black tracking-widest">No tasks available</p>
                </div>`;
            return;
        }

        // 4. Build HTML strings dynamically via buffer execution allocation arrays
        let htmlBuffer = ''; 
        
        filteredTasks.forEach(task => {
            // Standardizing properties strings safety checks
            const taskId = task.id || task._id || '';
            const taskUrl = task.url || '';
            const taskTitle = task.title || 'Untitled Task';
            const taskReward = parseFloat(task.reward || 0);
            
            const isManual = task.type === 'manual' || !taskUrl || !taskUrl.includes('t.me');
            
            htmlBuffer += `
                <div id="task-card-${taskId}" class="glass mb-4 overflow-hidden border border-white/5 rounded-2xl transition-all">
                    <div class="p-4 flex justify-between items-center gap-3">
                        <div class="flex items-center gap-4 min-w-0">
                            ${task.image ? `
                                <img src="${task.image}" class="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0" onerror="this.src=''; this.style.display='none'">
                            ` : `
                                <div class="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-xl shrink-0 border border-blue-500/10">
                                    ${isManual ? '📢' : '🔗'}
                                </div>
                            `}

                            <div class="min-w-0">
                                <h4 class="text-sm font-bold text-white truncate pr-1">${taskTitle}</h4>
                                <span class="text-[10px] text-green-400 font-black tracking-wide block mt-0.5">+${taskReward.toFixed(2)} USDT</span>
                            </div>
                        </div>
                        <button id="btn-task-${taskId}" 
                            onclick="${isManual ? `toggleProofSection('${taskId}', '${taskUrl}')` : `startTask('${taskUrl}', '${taskId}', ${taskReward}, 30)`}"
                            class="btn-premium px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 shadow-lg active:scale-95 transition-transform">
                            ${isManual ? 'Submit' : 'Start'}
                        </button>
                    </div>
                    ${isManual ? `
<div id="proof-${taskId}" class="proof-section px-4 pb-4 border-t border-white/[0.02] pt-3 bg-black/10">
    <div class="flex gap-2 mb-3 bg-black/20 p-1 rounded-xl">
        <button onclick="switchProofMode('${taskId}','text',this)" class="proof-mode-btn flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase bg-blue-600 text-white">✏️ Text</button>
        <button onclick="switchProofMode('${taskId}','img',this)" class="proof-mode-btn flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase text-slate-400">📸 Screenshot</button>
    </div>
    <div id="proof-text-${taskId}">
        <input id="input-proof-${taskId}" type="text" class="w-full p-3 rounded-xl text-xs mb-2.5 bg-black/40 text-white border border-white/5 focus:border-blue-500/40 outline-none" placeholder="Username / Proof link...">
    </div>
    <div id="proof-img-${taskId}" class="hidden">
        <div class="relative flex items-center justify-center w-full p-4 border border-dashed border-white/20 rounded-xl bg-black/20 mb-2.5">
            <input id="proof-file-${taskId}" type="file" accept="image/*" onchange="previewProofImage(this,'${taskId}')" class="absolute inset-0 opacity-0 cursor-pointer z-10">
            <div id="proof-upload-label-${taskId}" class="text-center">
                <span class="text-[10px] font-bold text-slate-400">📷 Tap to upload screenshot</span>
            </div>
        </div>
        <img id="proof-preview-${taskId}" src="" class="hidden w-full rounded-xl object-cover border border-white/10 mb-2.5 max-h-40">
    </div>
    <button onclick="submitManualProof('${taskId}')" class="w-full bg-green-600/20 text-green-400 border border-green-500/20 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-[0.99] transition-all">Send Proof</button>
</div>` : ''}
                </div>`;
        });
        
        taskContainer.innerHTML = htmlBuffer;
        
    } catch (e) {
        console.error("Task Load Error Handled Exception Trace Engine:", e);
        taskContainer.innerHTML = '<p class="text-center text-xs text-red-400 py-6">Error rendering catalog lists</p>';
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
