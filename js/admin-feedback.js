let currentFeedbackFilter = 'new';

async function loadAdminFeedback(filter) {
    if (filter) currentFeedbackFilter = filter;
    const status = currentFeedbackFilter;
    const type = document.getElementById('fbFilterType')?.value || '';

    const container = document.getElementById('feedbackList');
    container.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-6">Loading...</p>';

    // Update tab styles
    ['new', 'reviewed', 'resolved'].forEach(f => {
        const btn = document.getElementById(`fb-tab-${f}`);
        if (!btn) return;
        btn.className = f === status
            ? 'flex-1 py-2 rounded-lg text-[10px] font-black uppercase bg-yellow-500 text-black transition-all'
            : 'flex-1 py-2 rounded-lg text-[10px] font-black uppercase text-slate-400 transition-all';
    });

    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (type) params.set('type', type);

    try {
        const data = await secureFetch(`/api/admin/feedback?${params}`);
        const items = data.feedback || [];

        if (items.length === 0) {
            container.innerHTML = getEmptyStateHTML('💬', 'No Feedback', `No ${status} feedback found`);
            return;
        }

        const TYPE_CONFIG = {
            bug:        { icon: '🐞', badge: 'bg-red-500/10 text-red-400 border-red-500/20' },
            suggestion: { icon: '💡', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
            complaint:  { icon: '😠', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
            other:      { icon: '💬', badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20' }
        };

        container.innerHTML = items.map(f => {
            const cfg = TYPE_CONFIG[f.type] || TYPE_CONFIG.other;
            const date = new Date(f.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            return `
                <div class="glass p-4 border-l-2 border-yellow-500/40">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex-1 min-w-0 mr-3">
                            <div class="flex items-center gap-2 mb-1 flex-wrap">
                                <span class="badge-tx text-[8px] px-2 py-0.5 rounded border ${cfg.badge}">${cfg.icon} ${f.type}</span>
                            </div>
                            <p class="text-[10px] font-bold text-slate-300">User: ${f.user_id}${f.username ? ' @' + f.username : ''}</p>
                            <p class="text-[9px] text-slate-500 mt-0.5">${date}</p>
                        </div>
                    </div>
                    <p class="text-[10px] text-slate-400 leading-relaxed bg-black/20 p-2 rounded-lg">${f.message}</p>
                    <div class="flex gap-2 mt-3">
                        ${f.status !== 'reviewed' ? `<button onclick="updateFeedbackStatus('${f._id}', 'reviewed')" class="flex-1 bg-blue-600/20 text-blue-400 border border-blue-500/20 py-1.5 rounded-lg text-[9px] font-black uppercase active:scale-95 transition-all">Mark Reviewed</button>` : ''}
                        ${f.status !== 'resolved' ? `<button onclick="updateFeedbackStatus('${f._id}', 'resolved')" class="flex-1 bg-green-600/20 text-green-400 border border-green-500/20 py-1.5 rounded-lg text-[9px] font-black uppercase active:scale-95 transition-all">Mark Resolved</button>` : ''}
                        <button onclick="deleteFeedback('${f._id}')" class="bg-red-600/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase active:scale-95 transition-all">Delete</button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p class="text-center text-red-400 text-[10px] py-4">Failed to load feedback.</p>';
    }
}

async function updateFeedbackStatus(id, status) {
    try {
        const data = await secureFetch(`/api/admin/feedback/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        if (data.success) {
            showNotificationToast('Updated', 'success');
            loadAdminFeedback();
        } else {
            showNotificationToast(data.error || 'Update failed', 'error');
        }
    } catch (err) {
        showNotificationToast('Update failed', 'error');
    }
}

async function deleteFeedback(id) {
    showAppConfirm('Delete this feedback?', async (confirmed) => {
        if (!confirmed) return;
        try {
            const data = await secureFetch(`/api/admin/feedback/${id}`, { method: 'DELETE' });
            if (data.success) {
                showNotificationToast('Deleted', 'success');
                loadAdminFeedback();
            } else {
                showNotificationToast(data.error || 'Delete failed', 'error');
            }
        } catch (err) {
            showNotificationToast('Delete failed', 'error');
        }
    }, 'error');
}
