



function previewUploadedImage(input) {
    const file = input.files[0];
    const textSpan = document.getElementById('upload-text');
    const previewImg = document.getElementById('new-task-image-preview');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Save the data string straight into the preview element's custom attribute
            previewImg.setAttribute('data-base64', e.target.result);
            previewImg.src = e.target.result;
            previewImg.classList.remove('hidden');
            
            // Shorten filename text for neatness
            textSpan.innerText = file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name;
            textSpan.className = "text-xs font-bold text-green-400";
            tg.HapticFeedback.impactOccurred('light');
        };
        reader.readAsDataURL(file);
    }
}
function filterUserDirectory(filterType) {
    userDirectoryFilter = filterType;
    
    const allBtn = document.getElementById('btn-btn-dir-all') || document.getElementById('btn-dir-all');
    const banBtn = document.getElementById('btn-btn-dir-banned') || document.getElementById('btn-dir-banned');

    if(allBtn && banBtn) {
        if(filterType === 'all') {
            allBtn.className = "flex-1 py-2 rounded-lg text-[10px] font-black uppercase bg-blue-600 text-white transition-all";
            banBtn.className = "flex-1 py-2 rounded-lg text-[10px] font-black uppercase text-slate-400 transition-all";
        } else {
            allBtn.className = "flex-1 py-2 rounded-lg text-[10px] font-black uppercase text-slate-400 transition-all";
            banBtn.className = "flex-1 py-2 rounded-lg text-[10px] font-black uppercase bg-red-600 text-white transition-all";
        }
    }
    
    loadUserDirectory();
}

async function addNewCategory() {
    const input = document.getElementById('new-category-name');
    const name = input.value.trim();
    if(!name) return showAppAlert("Please provide a category name.", 'warning')
    
    // Send it to your backend if you want it persistent, 
    // or push it right directly into the DOM dropdown picker element layout:
    updateCategoryDropdown(name);
    
    // Also build a new filter chip dynamically for the main task navigation bar layout
    const catBar = document.getElementById('category-bar');
    if(catBar) {
        catBar.insertAdjacentHTML('beforeend', `
            <button onclick="filterTasks('${name}', this)" class="category-chip">${name}</button>
        `);
    }
    
    input.value = '';
    showAppAlert(`Category "${name}" added successfully!`, 'success')
    }
// 2. Fixed Route Isolation Engine
async function loadUserDirectory() {
    const listContainer = document.getElementById('admin-user-directory-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-4">Syncing database records...</p>';

    try {
        // CHANGED: Routing layout modified to point to the correct subdirectory structure
        const res = await secureFetch(`/api/admin/directory?filter=${userDirectoryFilter}`);
        
        // Handle variations in custom wrapper payloads
        const users = Array.isArray(res) ? res : (res.users || []);
        
        if (!users || users.length === 0) {
            listContainer.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-6 uppercase font-bold tracking-wider">No users found inside this view</p>';
            return;
        }

        listContainer.innerHTML = users.map(u => `
            <div onclick="document.getElementById('search-user-id').value='${u.user_id}'; searchUser();" class="glass p-3 flex justify-between items-center border-l-2 ${u.is_banned ? 'border-red-500 bg-red-500/5' : 'border-slate-500/40'} active:scale-[0.99] transition-all cursor-pointer">
                <div>
                    <p class="text-xs font-bold text-white">ID: ${u.user_id}</p>
                    <p class="text-[9px] font-bold text-slate-400">${u.username ? '@'+u.username : 'No Username'}</p>
                </div>
                <div class="text-right">
                    <p class="text-[10px] font-black text-green-400">${(u.balance || 0).toFixed(2)} USDT</p>
                    <p class="text-[8px] font-bold text-yellow-500">${(u.points || 0).toFixed(0)} pts</p>
                </div>
            </div>
        `).join('');

    } catch (e) {
        console.error("Directory Render Crash:", e);
        listContainer.innerHTML = '<p class="text-center text-[10px] text-red-400">Directory loading error.</p>';
    }
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
                <p class="text-[9px] text-green-400">${t.reward} USDT</p>
            </div>
            <button onclick="deleteTask('${t.id}')" class="bg-red-600/20 text-red-400 border border-red-500/20 text-[9px] px-3 py-1 rounded-lg font-black uppercase">Delete</button>
        </div>
    `).join('');
}

// 4. Fixed Payout Validation Security Bypass
async function loadPendingWithdrawals() {
    const container = document.getElementById('admin-withdraw-list');
    if (!container) return;

    try {
        const data = await secureFetch('/api/admin/payouts/pending');
        const list = data.payouts || [];

        let html = '';
        list.forEach(w => {
            html += `
            <div class="glass p-4 border-l-4 border-yellow-500 mb-2">
                <p class="text-sm font-bold">${w.amount} ${(w.assetType || 'USDT').toUpperCase()}</p>
                <p class="text-[9px] text-slate-500 mb-1">${w.network || ''}</p>
                <p class="text-[10px] text-slate-400 mb-2 break-all">${w.cryptoAddress || ''}</p>
                <div class="flex gap-2">
                    <button onclick="payoutAction('${w.txId}', 'accepted')" class="bg-green-600 text-[10px] px-3 py-1 rounded">Approve</button>
                    <button onclick="payoutAction('${w.txId}', 'rejected')" class="bg-red-600 text-[10px] px-3 py-1 rounded">Reject</button>
                </div>
            </div>`;
        });
        container.innerHTML = html || '<p class="text-xs text-slate-500 text-center py-4">No pending payouts.</p>';
    } catch(err) {
        container.innerHTML = '<p class="text-xs text-red-400 text-center py-4">Failed to synchronize balance payout stream.</p>';
    }
}
// Admin: Add Task Function
async function addNewTask() {
  try{
    const title = document.getElementById('new-task-title').value;
    const link = document.getElementById('new-task-link').value;
    const desc = document.getElementById('new-task-desc').value;
    
    // <-- GRABS INSTANT IMAGE BASE64 DATA AS STRING
    const previewEl = document.getElementById('new-task-image-preview');
    const imageString = previewEl.getAttribute('data-base64') || ""; 
    
    const reward = document.getElementById('new-task-reward').value;
    const category = document.getElementById('new-task-category').value;
    const type = document.querySelector('input[name="verify-type"]:checked').value;

    if (!title || !link || !reward) return showAppAlert("Title, Link, and Reward are required.", 'warning')
    const taskData = {
        title,
        url: link,
        description: desc,
        image: imageString, // <-- SEND DATA PACKET DIRECTLY TO DATABASE
        reward: parseFloat(reward),
        category,
        type
    };

    const res = await secureFetch('/api/admin/tasks/add', {
        method: 'POST',
        body: JSON.stringify(taskData)
    });

    if (res.success) {
        tg.HapticFeedback.notificationOccurred('success');
        showAppAlert("Task deployed successfully!", 'success')
        
        // Clear basic fields
        ['new-task-title', 'new-task-link', 'new-task-desc', 'new-task-reward'].forEach(id => {
            document.getElementById(id).value = '';
        });
        
        // <-- RESET THE FILE UPLOADER COMPONENT COMPLETELY
        document.getElementById('new-task-image-file').value = '';
        previewEl.removeAttribute('data-base64');
        previewEl.src = '';
        previewEl.classList.add('hidden');
        document.getElementById('upload-text').innerText = "Upload Image File";
        document.getElementById('upload-text').className = "text-xs font-bold text-slate-400";
        
        loadAdminTaskList();
        
        } else {
            showAppAlert("Error: " + res.error, 'error')
        }
    } catch (e) {
        showAppAlert("Failed to connect to server.", 'error')
    }
}

// Logic to dynamically add a new category option to the dropdown
function updateCategoryDropdown(categoryName) {
    const dropdown = document.getElementById('new-task-category');
    const option = document.createElement('option');
    option.value = categoryName;
    option.text = categoryName;
    dropdown.add(option);
}


// Admin: Run Sweep Function
async function runSweep() {
    showAppConfirm("Run Global Sweep? This scans all users for channel departures.", async (ok) => {
        if(ok) {
            tg.MainButton.setText("SWEEPING...").show();
            const res = await secureFetch('/api/admin/run-sweep', { method: 'POST' });
            tg.MainButton.hide();
            showAppAlert(`Sweep finished! Found ${res.flagged || 0} rule breakers.`, 'success');
        }
    });
        }
async function loadPendingProofs() {
    const container = document.getElementById('admin-proof-list');
    container.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-4">Loading...</p>';

    try {
        const data = await secureFetch('/api/admin/proofs/pending');
        const proofs = data.proofs || [];

        if (proofs.length === 0) {
            container.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-4">No proofs pending.</p>';
            return;
        }

        container.innerHTML = proofs.map(p => `
            <div class="glass p-4 border-l-2 border-indigo-500 mb-3">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <p class="text-[10px] font-black text-indigo-300">REF: ${p.proofId}</p>
                        <p class="text-xs font-bold text-white mt-0.5">${p.taskTitle}</p>
                        <p class="text-[9px] text-slate-400">User: ${p.userId}${p.username ? ' @' + p.username : ''}</p>
                    </div>
                    <span class="text-[10px] font-black text-green-400">+${p.reward} USDT</span>
                </div>
                ${p.proofType === 'screenshot' ? `
                    <div class="mb-3">
                        <img id="proof-img-preview-${p.proofId}" src="" class="hidden w-full rounded-xl max-h-40 object-cover border border-white/10 mb-1">
                        <button onclick="loadProofImage('${p.proofId}')" class="text-[9px] text-blue-400 font-bold">📸 View Screenshot</button>
                    </div>
                ` : `
                    <div class="bg-black/30 p-2 rounded-lg text-[10px] text-blue-300 break-all mb-3">${p.proofText || 'No text'}</div>
                `}
                <div class="flex gap-2">
                    <button onclick="processProof('${p.proofId}','approve')" class="flex-1 bg-green-600/20 text-green-400 py-2 rounded-lg text-[9px] font-black uppercase border border-green-500/20">✅ Approve</button>
                    <button onclick="processProof('${p.proofId}','reject')" class="flex-1 bg-red-600/20 text-red-400 py-2 rounded-lg text-[9px] font-black uppercase border border-red-500/20">❌ Reject</button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '<p class="text-red-500 text-[10px] text-center">Error loading proofs.</p>';
    }
}

async function loadProofImage(proofId) {
    try {
        const data = await secureFetch(`/api/admin/proof-image/${proofId}`);
        if (data.url) {
            const img = document.getElementById(`proof-img-preview-${proofId}`);
            img.src = data.url;
            img.classList.remove('hidden');
        }
    } catch (e) {
        showAppAlert("Failed to load image.", 'error');
    }
}

async function processProof(proofId, action) {
    const res = await secureFetch('/api/admin/proof-action', {
        method: 'POST',
        body: JSON.stringify({ proofId, action })
    });

    if (res.success) {
        tg.HapticFeedback.notificationOccurred('success');
        showNotificationToast(`Proof ${action === 'approve' ? 'approved ✅' : 'rejected ❌'}`, action === 'approve' ? 'success' : 'info');
        loadPendingProofs();
        loadAdminData();
    } else {
        showAppAlert(res.error || "Action failed.", 'error');
    }
          }
async function loadAdminData() {
    try {
        const stats = await secureFetch('/api/admin/stats');
        if(stats.error) return showAppAlert("Access Denied.", 'error')

        document.getElementById('stat-users').innerText = stats.users;
        document.getElementById('stat-withdraws').innerText = stats.pending;
        document.getElementById('set-maintenance').checked = stats.maintenance;
        document.getElementById('set-ref-bonus').value = stats.ref_bonus || 0.5;
        document.getElementById('set-ref-percent').value = stats.ref_percent || 10;

        loadAdminTaskList();
        loadPendingWithdrawals();
    } catch (e) { console.error(e); }
}

async function deleteTask(id) {
showAppConfirm("Delete this task permanently?", async (ok) => {
    if(!ok) return;
    await secureFetch(`/api/admin/tasks/delete/${id}`, { method: 'DELETE' });
    loadAdminTaskList();
    showAppAlert("Task removed successfully.", 'success');
    await logAdminAction(db, { adminId, adminName, action: 'task_deleted', description: `Deleted task: ${taskId}` });
});
}
async function sendBroadcast() {
    const msg = document.getElementById('broadcast-msg').value;
    const btn = document.getElementById('btn-broadcast');

    if (!msg) return showAppAlert("Please enter a message first.", 'warning')

    showAppConfirm("Send this broadcast to ALL users?", async (ok) => {
        if (ok) {
            btn.disabled = true;
            btn.innerText = "⌛ SENDING...";
            
            try {
                const res = await secureFetch('/api/admin/broadcast', {
                    method: 'POST',
                    body: JSON.stringify({ message: msg })
                });

                if (res.success) {
                    showAppAlert(`Broadcast started! Sending to ${res.total} users.`, 'success')
                    document.getElementById('broadcast-msg').value = '';
                    await logAdminAction(db, { adminId, adminName, action: 'broadcast_sent', description: `Sent broadcast to ${recipientCount} users` });
                }
            } catch (e) {
                showAppAlert("Broadcast error. Check server logs.", 'error')
            } finally {
                btn.disabled = false;
                btn.innerText = "🚀 Send to All Users";
            }
        }
    });
        }

// --- ADMIN: PAYOUT ACTIONS ---
async function payoutAction(txId, action) {
    const res = await secureFetch('/api/admin/payouts/action', {
        method: 'POST',
        body: JSON.stringify({ txId, status: action })
    });

    if(res.success) {
        tg.HapticFeedback.notificationOccurred('success');
        loadPendingWithdrawals();
        loadAdminData();
    } else {
        showAppAlert(res.error || "Action failed.", 'error');
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
                const lastSeen = a.last_active
                    ? new Date(a.last_active).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Never';
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

// Helper: human-readable time ago
function getTimeAgo(date) {
    const seconds = Math.floor((Date.now() - date) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
                    }
  let currentTicketId = null;
let currentTicketFilter = 'open';

async function loadAdminTickets(filter = 'open') {
    currentTicketFilter = filter;
    const container = document.getElementById('admin-ticket-list');
    container.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-6">Loading...</p>';

    // Update tab styles
    ['open', 'replied', 'resolved'].forEach(f => {
        const btn = document.getElementById(`ticket-tab-${f}`);
        if (!btn) return;
        btn.className = f === filter
            ? 'flex-1 py-2 rounded-lg text-[10px] font-black uppercase bg-teal-600 text-white transition-all'
            : 'flex-1 py-2 rounded-lg text-[10px] font-black uppercase text-slate-400 transition-all';
    });

    try {
        const data = await secureFetch(`/api/admin/tickets?filter=${filter}`);
        
        // Update count badges
        if (data.counts) {
            document.getElementById('ticket-count-open').innerText = data.counts.open || 0;
            document.getElementById('ticket-count-replied').innerText = data.counts.replied || 0;
            document.getElementById('ticket-count-resolved').innerText = data.counts.resolved || 0;
        }

        const tickets = data.tickets || [];

        if (tickets.length === 0) {
            container.innerHTML = getEmptyStateHTML('🎧', 'No Tickets', `No ${filter} tickets found`);
            return;
        }

        const STATUS_CONFIG = {
            open:     { color: 'border-teal-500',   badge: 'bg-teal-500/10 text-teal-400 border-teal-500/20',   label: 'Open'     },
            replied:  { color: 'border-blue-500',    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',   label: 'Replied'  },
            resolved: { color: 'border-slate-500',   badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20', label: 'Resolved' }
        };

        container.innerHTML = tickets.map(t => {
            const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.open;
            const date = new Date(t.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const preview = (t.message || '').substring(0, 80) + ((t.message || '').length > 80 ? '...' : '');

            return `
                <div class="glass p-4 border-l-2 ${cfg.color}">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex-1 min-w-0 mr-3">
                            <div class="flex items-center gap-2 mb-1 flex-wrap">
                                <span class="text-[9px] font-mono text-slate-500">${t.ticket_id || String(t._id).substring(0, 8)}</span>
                                <span class="badge-tx text-[8px] px-2 py-0.5 rounded border ${cfg.badge}">${cfg.label}</span>
                            </div>
                            <p class="text-[10px] font-bold text-slate-300">User: ${t.user_id}${t.username ? ' @' + t.username : ''}</p>
                            <p class="text-[9px] text-slate-500 mt-0.5">${date}</p>
                        </div>
                        <button onclick="openTicketReplyDrawer('${t._id}', \`${(t.message || '').replace(/`/g, "'")}\`, \`${(t.admin_reply || '').replace(/`/g, "'")}\`, '${t.ticket_id || ''}')"
                            class="bg-teal-600/20 text-teal-400 border border-teal-500/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase shrink-0 active:scale-95 transition-all">
                            ${t.status === 'resolved' ? 'View' : 'Reply'}
                        </button>
                    </div>
                    <p class="text-[10px] text-slate-400 leading-relaxed bg-black/20 p-2 rounded-lg">${preview}</p>
                    ${t.admin_reply ? `
                        <div class="mt-2 border-t border-white/5 pt-2">
                            <p class="text-[9px] text-teal-400 font-black uppercase mb-1">Admin Reply</p>
                            <p class="text-[10px] text-slate-300">${(t.admin_reply || '').substring(0, 60)}${(t.admin_reply || '').length > 60 ? '...' : ''}</p>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p class="text-center text-red-400 text-[10px] py-4">Failed to load tickets.</p>';
    }
}

function openTicketReplyDrawer(ticketId, message, prevReply, ticketRef) {
    currentTicketId = ticketId;

    document.getElementById('reply-drawer-ref').innerText = ticketRef ? `REF: ${ticketRef}` : `ID: ${ticketId.substring(0, 8)}`;
    document.getElementById('reply-drawer-msg').innerText = message;
    document.getElementById('ticket-reply-input').value = '';

    const prevWrap = document.getElementById('reply-drawer-prev-wrap');
    const prevEl = document.getElementById('reply-drawer-prev');
    if (prevReply) {
        prevEl.innerText = prevReply;
        prevWrap.classList.remove('hidden');
    } else {
        prevWrap.classList.add('hidden');
    }

    document.getElementById('modal-ticket-reply').classList.add('active');
    tg.HapticFeedback.impactOccurred('light');
}

function closeTicketReplyDrawer() {
    document.getElementById('modal-ticket-reply').classList.remove('active');
    currentTicketId = null;
}

async function submitTicketReply() {
    const reply = document.getElementById('ticket-reply-input').value.trim();
    if (!reply) return showAppAlert("Please type a reply.", 'warning');
    if (!currentTicketId) return;

    const btn = document.querySelector('#modal-ticket-reply button[onclick="submitTicketReply()"]');
    if (btn) { btn.disabled = true; btn.innerText = "SENDING..."; }

    try {
        const res = await secureFetch('/api/admin/reply-ticket', {
            method: 'POST',
            body: JSON.stringify({ ticketId: currentTicketId, reply })
        });

        if (res.success) {
            tg.HapticFeedback.notificationOccurred('success');
            showNotificationToast("Reply sent successfully!", 'success');
            closeTicketReplyDrawer();
            loadAdminTickets(currentTicketFilter);
        } else {
            showAppAlert(res.error || "Failed to send reply.", 'error');
        }
    } catch (e) {
        showAppAlert("Network error.", 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = "📩 Send Reply"; }
    }
}

async function resolveTicket() {
    if (!currentTicketId) return;

    showAppConfirm("Mark this ticket as resolved? The user will be notified.", async (confirmed) => {
        if (!confirmed) return;

        try {
            const res = await secureFetch('/api/admin/tickets/resolve', {
                method: 'POST',
                body: JSON.stringify({ ticketId: currentTicketId })
            });

            if (res.success) {
                tg.HapticFeedback.notificationOccurred('success');
                showNotificationToast("Ticket resolved.", 'success');
                closeTicketReplyDrawer();
                loadAdminTickets(currentTicketFilter);
            } else {
                showAppAlert(res.error || "Failed to resolve.", 'error');
            }
        } catch (e) {
            showAppAlert("Network error.", 'error');
        }
    }, 'info', 'Resolve Ticket', 'Yes, Resolve', 'Cancel');
}
        
        
