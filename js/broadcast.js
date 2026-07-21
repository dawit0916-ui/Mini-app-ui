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
