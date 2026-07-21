
function openHistoryDrawer() { document.getElementById('modal-history').classList.add('active'); loadUserHistory(); tg.HapticFeedback.impactOccurred('light'); }
function closeHistoryDrawer() { document.getElementById('modal-history').classList.remove('active'); }
// Example Support Ticket Function
async function submitSupportTicket() {
    const msg = document.getElementById('support-msg').value;
    if(!msg) return showAppAlert("Please enter a message.", 'warning')
    
    const res = await secureFetch('/api/support/create', {
        method: 'POST',
        body: JSON.stringify({ message: msg })
    });
    if(res.success) {
    showAppAlert("Ticket sent! We will reply via the bot.", 'success');
    switchTab('home', document.getElementById('nav-home'));
}
        }

function openSupportDrawer() {
    document.getElementById('modal-support').classList.add('active');
    tg.HapticFeedback.impactOccurred('light');
}
function closeSupportDrawer() {
    document.getElementById('modal-support').classList.remove('active');
}
async function submitSupportTicketFromDrawer() {
    const msg = document.getElementById('support-msg-drawer').value.trim();
    if (!msg) return showAppAlert("Please enter a message.", 'warning');
    const res = await secureFetch('/api/support/create', {
        method: 'POST',
        body: JSON.stringify({ message: msg })
    });
    if (res.success) {
        showAppAlert(`Ticket sent! REF: ${res.ticketId}`, 'success');
        document.getElementById('support-msg-drawer').value = '';
        closeSupportDrawer();
    } else {
        showAppAlert(res.error || "Failed to send ticket.", 'error');
    }
}
