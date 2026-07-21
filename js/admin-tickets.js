
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

let _adsgramControllers = {}; // cache one controller per blockId
