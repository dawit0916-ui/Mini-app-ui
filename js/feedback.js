const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const RENDER_URL = "https://embt-gateway.onrender.com";

document.getElementById('fbSubmit').addEventListener('click', async () => {
    const type = document.getElementById('fbType').value;
    const message = document.getElementById('fbMessage').value.trim();
    const statusEl = document.getElementById('fbStatus');
    const btn = document.getElementById('fbSubmit');

    if (!message) {
        statusEl.textContent = 'Please write something first.';
        statusEl.className = 'text-center text-[10px] font-bold text-yellow-400';
        return;
    }

    btn.disabled = true;
    btn.classList.add('opacity-50');
    statusEl.textContent = '';

    try {
        const res = await fetch(`${RENDER_URL}/api/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': tg.initData || ''
            },
            body: JSON.stringify({ type, message })
        });
        const data = await res.json();

        if (data.success) {
            statusEl.textContent = '✅ Thanks! Feedback sent.';
            statusEl.className = 'text-center text-[10px] font-bold text-green-400';
            document.getElementById('fbMessage').value = '';
            tg.HapticFeedback?.notificationOccurred('success');
        } else {
            statusEl.textContent = data.error || '❌ Something went wrong, try again.';
            statusEl.className = 'text-center text-[10px] font-bold text-red-400';
        }
    } catch (err) {
        statusEl.textContent = '❌ Network error.';
        statusEl.className = 'text-center text-[10px] font-bold text-red-400';
    } finally {
        btn.disabled = false;
        btn.classList.remove('opacity-50');
    }
});
