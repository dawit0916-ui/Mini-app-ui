async function loadMarketplaceReviewQueue() {
  const container = document.getElementById('reviewQueue');
  container.innerHTML = '<p class="form-hint">Loading...</p>';

  const data = await secureFetch('/api/admin/marketplace/pending');
  if (data.error) {
    container.innerHTML = '<p class="form-hint">Failed to load queue.</p>';
    return;
  }

  container.innerHTML = data.submissions.length
    ? data.submissions.map(renderReviewCard).join('')
    : '<p class="form-hint">No pending submissions.</p>';
}

function renderReviewCard(sub) {
  const task = sub.taskId;
  return `
    <div class="review-card" data-submission-id="${sub._id}">
      <img class="review-screenshot" src="${sub.screenshotViewUrl || ''}" alt="proof screenshot" loading="lazy">

      <dl class="review-details">
        <div class="review-row"><dt>Task</dt><dd>${task?.title || task?.videoId || 'Unknown'}</dd></div>
        <div class="review-row"><dt>Viewer</dt><dd>${sub.viewerUserId}</dd></div>
        <div class="review-row"><dt>Country</dt><dd>${sub.country || 'Unknown'}</dd></div>
        <div class="review-row"><dt>Fraud score</dt><dd>${sub.fraudScore}</dd></div>
        <div class="review-row"><dt>OCR video ID</dt><dd>${sub.ocrVideoId || '—'} <span class="review-expected">(expected: ${task?.videoId || '—'})</span></dd></div>
        <div class="review-row"><dt>OCR elapsed</dt><dd>${sub.ocrElapsedSeconds ?? '—'}s <span class="review-expected">(required: ${task?.watchDurationSeconds ?? '—'}s)</span></dd></div>
        <div class="review-row"><dt>Reason flagged</dt><dd>${sub.rejectionReason || 'review threshold'}</dd></div>
        <div class="review-row"><dt>Filename timestamp</dt><dd>${sub.filenameTimestampMatch}</dd></div>
        <div class="review-row"><dt>Filename app</dt><dd>${sub.filenameAppMatch}${sub.filenameAppRaw ? ` (${sub.filenameAppRaw})` : ''}</dd></div>
      </dl>

      <div class="review-actions">
        <button class="btn-approve" data-id="${sub._id}">Approve</button>
        <button class="btn-reject" data-id="${sub._id}">Reject</button>
      </div>
    </div>`;
}

document.getElementById('reviewQueue').addEventListener('click', async (e) => {
  const id = e.target.dataset.id;
  if (!id) return;

  if (e.target.matches('.btn-approve')) {
    e.target.disabled = true;
    try {
      await secureFetch(`/api/admin/marketplace/${id}/approve`, { method: 'POST' });
      e.target.closest('.review-card').remove();
    } catch (err) {
      alert('Approve failed — try again.');
      e.target.disabled = false;
    }
  }

  if (e.target.matches('.btn-reject')) {
    const reason = prompt('Rejection reason (optional):') || 'manual_admin_reject';
    e.target.disabled = true;
    try {
      await secureFetch(`/api/admin/marketplace/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      e.target.closest('.review-card').remove();
    } catch (err) {
      alert('Reject failed — try again.');
      e.target.disabled = false;
    }
  }
});
