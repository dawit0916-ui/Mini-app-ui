async function loadAdminFeedback() {
  const status = document.getElementById('fbFilterStatus').value;
  const type = document.getElementById('fbFilterType').value;
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (type) params.set('type', type);

  try {
    const data = await secureFetch(`/api/admin/feedback?${params}`);
    renderFeedbackList(data.feedback);
  } catch (err) {
    showNotificationToast('Failed to load feedback', 'error');
  }
}

function renderFeedbackList(items) {
  const container = document.getElementById('feedbackList');
  if (!items.length) {
    container.innerHTML = '<p class="empty-state">No feedback found.</p>';
    return;
  }

  container.innerHTML = items.map(f => `
    <div class="feedback-card" data-id="${f._id}">
      <div class="feedback-header">
        <span class="fb-type fb-${f.type}">${f.type}</span>
        <span class="fb-status fb-status-${f.status}">${f.status}</span>
      </div>
      <p class="fb-message">${f.message}</p>
      <div class="fb-meta">
        <span>User: ${f.username ? '@' + f.username : f.user_id}</span>
        <span>${new Date(f.createdAt).toLocaleString()}</span>
      </div>
      <div class="fb-actions">
        <button onclick="updateFeedbackStatus('${f._id}', 'reviewed')">Mark Reviewed</button>
        <button onclick="updateFeedbackStatus('${f._id}', 'resolved')">Mark Resolved</button>
        <button onclick="deleteFeedback('${f._id}')" class="danger">Delete</button>
      </div>
    </div>
  `).join('');
}

async function updateFeedbackStatus(id, status) {
  try {
    await secureFetch(`/api/admin/feedback/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    showNotificationToast('Updated', 'success');
    loadAdminFeedback();
  } catch (err) {
    showNotificationToast('Update failed', 'error');
  }
}

async function deleteFeedback(id) {
  if (!confirm('Delete this feedback?')) return;
  try {
    await secureFetch(`/api/admin/feedback/${id}`, { method: 'DELETE' });
    showNotificationToast('Deleted', 'success');
    loadAdminFeedback();
  } catch (err) {
    showNotificationToast('Delete failed', 'error');
  }
}

document.getElementById('fbFilterStatus')?.addEventListener('change', loadAdminFeedback);
document.getElementById('fbFilterType')?.addEventListener('change', loadAdminFeedback);
