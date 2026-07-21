

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

        
let currentFilter = 'All';
