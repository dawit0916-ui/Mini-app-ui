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
  const task = sub.taskId; // populated
  return `
    <div class="review-card" data-submission-id="${sub._id}">
      <img class="review-screenshot" src="${sub.screenshotViewUrl || ''}" alt="proof screenshot" loading="lazy">
      <div class="review-details">
        <p><strong>Task:</strong> ${task?.title || task?.videoId || 'Unknown'}</p>
        <p><strong>Viewer:</strong> ${sub.viewerUserId}</p>
        <p><strong>Country:</strong> ${sub.country || 'Unknown'} · <strong>Fraud score:</strong> ${sub.fraudScore}</p>
        <p><strong>OCR video ID:</strong> ${sub.ocrVideoId || '—'} (expected: ${task?.videoId || '—'})</p>
        <p><strong>OCR elapsed:</strong> ${sub.ocrElapsedSeconds ?? '—'}s (required: ${task?.watchDurationSeconds ?? '—'}s)</p>
        <p><strong>Reason flagged:</strong> ${sub.rejectionReason || 'review threshold'}</p>
        <p><strong>Filename timestamp:</strong> ${sub.filenameTimestampMatch}</p>
        <p><strong>Filename app:</strong> ${sub.filenameAppMatch}</p>
        <p><strong>Filename app:</strong> ${sub.filenameAppMatch}${sub.filenameAppRaw ? ` (${sub.filenameAppRaw})` : ''}</p>
      </div>
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
