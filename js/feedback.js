const tg = window.Telegram.WebApp;
tg.ready();

document.getElementById('fbSubmit').addEventListener('click', async () => {
  const type = document.getElementById('fbType').value;
  const message = document.getElementById('fbMessage').value.trim();
  const statusEl = document.getElementById('fbStatus');

  if (!message) {
    statusEl.textContent = 'Please write something first.';
    return;
  }

  try {
    const res = await fetch('https://embt-gateway.onrender.com/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: tg.initData, type, message })
    });
    const data = await res.json();
    if (data.success) {
      statusEl.textContent = '✅ Thanks! Feedback sent.';
      document.getElementById('fbMessage').value = '';
    } else {
      statusEl.textContent = '❌ Something went wrong, try again.';
    }
  } catch (err) {
    statusEl.textContent = '❌ Network error.';
  }
});
