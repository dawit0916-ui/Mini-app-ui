// ==========================================================================
// FORMATTING TOOLBAR — Telegram bot messages support a real but limited
// HTML subset: <b>, <i>, <u>, <s>, <a href>, <code>, <pre>. There's no
// concept of text alignment in a Telegram message (no centering/right-
// align), so no control for that exists here — it genuinely can't be done,
// not an oversight. Bullets aren't real HTML lists either; Telegram just
// renders a literal "• " character, same as any other text.
// ==========================================================================

function wrapBroadcastText(tag) {
    const el = document.getElementById('broadcast-msg');
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.substring(start, end) || 'text';

    const before = el.value.substring(0, start);
    const after = el.value.substring(end);
    el.value = `${before}<${tag}>${selected}</${tag}>${after}`;

    // Put the cursor right after the inserted closing tag
    const newPos = start + tag.length + 2 + selected.length + tag.length + 3;
    el.focus();
    el.setSelectionRange(newPos, newPos);
    updateBroadcastCharCount();
}

function insertBroadcastBullet() {
    const el = document.getElementById('broadcast-msg');
    const start = el.selectionStart;
    const before = el.value.substring(0, start);
    const after = el.value.substring(start);
    // Start bullet on its own line
    const prefix = (before.length > 0 && !before.endsWith('\n')) ? '\n• ' : '• ';
    el.value = before + prefix + after;
    const newPos = start + prefix.length;
    el.focus();
    el.setSelectionRange(newPos, newPos);
    updateBroadcastCharCount();
}

function insertBroadcastLink() {
    const el = document.getElementById('broadcast-msg');
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.substring(start, end) || 'link text';

    const url = prompt('Link URL:', 'https://');
    if (!url) return;

    const before = el.value.substring(0, start);
    const after = el.value.substring(end);
    const tag = `<a href="${url}">${selected}</a>`;
    el.value = before + tag + after;

    const newPos = start + tag.length;
    el.focus();
    el.setSelectionRange(newPos, newPos);
    updateBroadcastCharCount();
}

function updateBroadcastCharCount() {
    const msgEl = document.getElementById('broadcast-msg');
    const hasImage = document.getElementById('broadcast-image-file-id').value.trim().length > 0;
    // Telegram's caption limit (photo+caption) is 1024 chars, shorter than
    // the ~4096 limit for a plain text message.
    const max = hasImage ? 1024 : 4096;
    const countEl = document.getElementById('broadcast-char-count');
    const maxEl = document.getElementById('broadcast-char-max');
    countEl.textContent = msgEl.value.length;
    maxEl.textContent = max;
    countEl.classList.toggle('text-red-400', msgEl.value.length > max);
}

async function sendBroadcast() {
    const msg = document.getElementById('broadcast-msg').value;
    const btn = document.getElementById('btn-broadcast');
    const imageFileId = document.getElementById('broadcast-image-file-id').value.trim();
    const buttonText = document.getElementById('broadcast-button-text').value.trim();
    const buttonUrl = document.getElementById('broadcast-button-url').value.trim();

    if (!msg) return showAppAlert("Please enter a message first.", 'warning');

    if (buttonText && !buttonUrl) return showAppAlert("Button needs a URL too.", 'warning');
    if (buttonUrl && !buttonText) return showAppAlert("Button needs text too.", 'warning');

    showAppConfirm("Send this broadcast to ALL users?", async (ok) => {
        if (ok) {
            btn.disabled = true;
            btn.innerText = "⌛ SENDING...";

            try {
                const res = await secureFetch('/api/admin/broadcast', {
                    method: 'POST',
                    body: JSON.stringify({
                        message: msg,
                        imageFileId: imageFileId || undefined,
                        buttonText: buttonText || undefined,
                        buttonUrl: buttonUrl || undefined
                    })
                });

                if (res.success) {
                    showAppAlert(`Broadcast started! Sending to ${res.total} users.`, 'success');
                    document.getElementById('broadcast-msg').value = '';
                    document.getElementById('broadcast-image-file-id').value = '';
                    document.getElementById('broadcast-button-text').value = '';
                    document.getElementById('broadcast-button-url').value = '';
                    updateBroadcastCharCount();
                } else {
                    showAppAlert(res.error || "Broadcast failed.", 'error');
                }
            } catch (e) {
                showAppAlert("Broadcast error. Check server logs.", 'error');
            } finally {
                btn.disabled = false;
                btn.innerText = "🚀 Send to All Users";
            }
        }
    });
}
