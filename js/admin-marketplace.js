async function loadMarketplaceReviewQueue() {
  const container = document.getElementById('reviewQueue');
  if (!container) return;
  container.innerHTML = '<p class="form-hint">Loading...</p>';

  try {
    const data = await secureFetch('/api/admin/marketplace/pending');
    if (data.error) {
      container.innerHTML = getErrorStateHTML('⚠️', 'Failed to load', escapeHtml(data.error));
      return;
    }
    container.innerHTML = data.submissions.length
      ? data.submissions.map(renderReviewCard).join('')
      : getEmptyStateHTML('📭', 'No pending submissions', 'You\'re all caught up.');
  } catch (err) {
    container.innerHTML = getErrorStateHTML('🛰️', 'Server unreachable', 'Please try again in a moment.');
  }
}

function renderReviewCard(sub) {
  const task = sub.taskId;
  const shot = sub.screenshotViewUrl ? `${RENDER_URL}${sub.screenshotViewUrl}` : '';
  const id = escapeHtml(sub._id);
  const hist = sub.viewerHistory || { approved: 0, rejected: 0 };
  const required = task?.watchDurationSeconds ?? '—';
  return `
    <div class="review-card" data-submission-id="${id}">
      <img class="review-screenshot" src="${escapeHtml(shot)}" alt="proof screenshot (tap to enlarge)" loading="lazy">
      <dl class="review-details">
        <div class="review-row"><dt>Task</dt><dd>${escapeHtml(task?.title || task?.videoId || 'Unknown')}</dd></div>
        <div class="review-row"><dt>Viewer</dt><dd>${escapeHtml(sub.viewerUserId)}</dd></div>
        <div class="review-row"><dt>Viewer history</dt><dd>${escapeHtml(hist.approved)} approved · ${escapeHtml(hist.rejected)} rejected</dd></div>
        <div class="review-row"><dt>Country</dt><dd>${escapeHtml(sub.country || 'Unknown')}</dd></div>
        <div class="review-row"><dt>OCR video ID</dt><dd>${escapeHtml(sub.ocrVideoId || '—')} <span class="review-expected">(expected: ${escapeHtml(task?.videoId || '—')})</span></dd></div>
        <div class="review-row"><dt>OCR time</dt><dd>${escapeHtml(sub.ocrElapsedSeconds ?? '—')}s <span class="review-expected">(required: ${escapeHtml(required)}s)</span></dd></div>
        <div class="review-row"><dt>Start → submit</dt><dd>${escapeHtml(sub.secondsSinceStart ?? '—')}s <span class="review-expected">(min: ${escapeHtml(required)}s)</span></dd></div>
        <div class="review-row"><dt>Why flagged</dt><dd>${escapeHtml((sub.flagReason || 'manual check').replace(/,/g, ', ').replace(/_/g, ' '))}</dd></div>
        <div class="review-row"><dt>Filename app</dt><dd>${escapeHtml(sub.filenameAppMatch)}${sub.filenameAppRaw ? ` (${escapeHtml(sub.filenameAppRaw)})` : ''}</dd></div>
      </dl>
      <div class="review-actions">
        <button class="btn-approve" data-id="${id}">Approve</button>
        <button class="btn-reject" data-id="${id}">Reject</button>
      </div>
    </div>`;
}

// Tap a proof screenshot to view it full size
document.addEventListener('click', (e) => {
  const img = e.target.closest('#reviewQueue .review-screenshot');
  if (!img || !img.src) return;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:12px;';
  overlay.innerHTML = `<img src="${escapeHtml(img.src)}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;">`;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
});

// Tap-friendly reason picker (window.prompt is unreliable in Telegram WebViews)
function pickRejectReason() {
  return new Promise((resolve) => {
    const reasons = [
      ['wrong_video', 'Wrong video'],
      ['not_enough_watch_time', 'Not enough watch time'],
      ['edited_or_fake_proof', 'Edited / fake proof'],
      ['unreadable_screenshot', 'Unreadable screenshot'],
      ['task_problem', "Task problem (not the viewer's fault)"],
    ];
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:24px;';
    overlay.innerHTML = `
      <div style="background:#0f172a;border-radius:16px;padding:16px;width:100%;max-width:320px;display:flex;flex-direction:column;gap:8px;">
        <div style="font-weight:800;font-size:12px;text-transform:uppercase;color:#fb923c;">Reject reason</div>
        ${reasons.map(([id, label]) => `<button data-reason="${id}" style="padding:10px;border-radius:10px;background:#1e293b;color:#e2e8f0;font-size:12px;font-weight:700;">${label}</button>`).join('')}
        <button data-reason="" style="padding:10px;color:#94a3b8;font-size:12px;">Cancel</button>
      </div>`;
    overlay.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button');
      if (!btn && ev.target !== overlay) return;
      overlay.remove();
      resolve(btn ? (btn.dataset.reason || null) : null);
    });
    document.body.appendChild(overlay);
  });
}

// Delegated on document so it works no matter when the admin component is injected
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('#reviewQueue .btn-approve, #reviewQueue .btn-reject');
  if (!btn) return;
  const id = btn.dataset.id;
  if (!id) return;
  const card = btn.closest('.review-card');
  const isApprove = btn.classList.contains('btn-approve');

  let body;
  if (!isApprove) {
    const reason = await pickRejectReason();
    if (!reason) return; // cancelled
    body = JSON.stringify({ reason });
  }

  btn.disabled = true;
  try {
    const res = await secureFetch(
      `/api/admin/marketplace/${encodeURIComponent(id)}/${isApprove ? 'approve' : 'reject'}`,
      { method: 'POST', ...(body ? { body } : {}) }
    );

    if (res.error) {
      showNotificationToast(res.error, 'error');
      // already resolved elsewhere → just drop the card; otherwise keep it for retry
      if (res.reason === 'not_pending' || res.reason === 'task_missing') card?.remove();
      else btn.disabled = false;
      return;
    }

    showNotificationToast(isApprove ? 'Approved and paid.' : 'Rejected.', 'success');
    card?.remove();
  } catch (err) {
    showNotificationToast(`${isApprove ? 'Approve' : 'Reject'} failed — try again.`, 'error');
    btn.disabled = false;
  }
});
