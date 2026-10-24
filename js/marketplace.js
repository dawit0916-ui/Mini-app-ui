let currentVideoMeta = { videoId: null, title: null, thumbnailUrl: null };
let fetchDebounce;
let currentTaskId = null; // set this in openTaskDetail()
let currentTaskList = [];   // populated by loadMarketplaceTasks()
let currentMyPosts = [];    // same, for My Posts


async function loadMarketplaceTasks() {
    try {
        const tasksData = await secureFetch('/api/marketplace/tasks');
        const myPostsData = await secureFetch('/api/marketplace/my-posts');
        const mySubmissionsData = await secureFetch('/api/marketplace/my-submissions');

        if (tasksData.error) {
            console.error('loadMarketplaceTasks failed', tasksData.error);
            document.getElementById('taskFeed').innerHTML =
                getErrorStateHTML('⚠️', 'Failed to load', tasksData.error);
        } else {
            renderTaskFeed(tasksData.tasks || []);
        }

        if (myPostsData.error) {
            console.error('loadMarketplaceTasks (my-posts) failed', myPostsData.error);
            document.getElementById('myPostsList').innerHTML =
                getErrorStateHTML('⚠️', 'Failed to load', myPostsData.error);
        } else {
            renderMyPosts(myPostsData.tasks || []);
        }

        if (mySubmissionsData.error) {
            console.error('loadMarketplaceTasks (my-submissions) failed', mySubmissionsData.error);
            document.getElementById('submissionsList').innerHTML =
                getErrorStateHTML('⚠️', 'Failed to load', mySubmissionsData.error);
        } else {
            renderSubmissions(mySubmissionsData.submissions || []);
        }

    } catch (err) {
        console.error('loadMarketplaceTasks network failure', err.message);
        const offline = navigator.onLine === false;
        const errorHTML = offline
            ? getErrorStateHTML('📡', 'No connection', 'Check your internet and try again.')
            : getErrorStateHTML('🛰️', 'Server unreachable', 'Please try again in a moment.');

        document.getElementById('taskFeed').innerHTML = errorHTML;
        document.getElementById('myPostsList').innerHTML = errorHTML;
        document.getElementById('submissionsList').innerHTML = errorHTML;
    }
}
const countryNames = {
  US: '🇺🇸 US', GB: '🇬🇧 UK', CA: '🇨🇦 CA', AU: '🇦🇺 AU',
  DE: '🇩🇪 DE', FR: '🇫🇷 FR'
};

// ---- tab switching ----
document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(`tab-${btn.dataset.tab}`);
    if (!target) return;
    document.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    target.classList.add('active');
  });
});
document.getElementById('gotoPostBtn')?.addEventListener('click', () => {
  document.querySelector('[data-tab="post"]').click();
});

// ---- render task feed ----
function renderTaskCard(task) {
  return `
    <div class="task-card">
      <img class="task-thumbnail" src="${escapeHtml(safeYtThumb(task.thumbnailUrl))}" alt="">
      <div class="task-body">
        <h3 class="task-title">${escapeHtml(task.title || task.videoId)}</h3>
        <div class="task-badges">
          ${task.promoted ? '<span class="badge badge-promoted">Promoted</span>' : ''}
          <span class="badge badge-dash"><img src="/assets/images/dash-coin.webp" alt="" class="dash-coin-sm">${Number(task.pointCost)} DASH</span>
          <span class="badge badge-time">${Number(task.watchDurationSeconds) / 60} minutes</span>
        </div>
        <button class="btn-start-earning" data-task-id="${escapeHtml(task._id)}">Start earning</button>
      </div>
    </div>`;
}

function renderTaskFeed(tasks) {
  currentTaskList = tasks;
  document.getElementById('taskFeed').innerHTML = tasks.length
    ? tasks.map(renderTaskCard).join('')
    : getEmptyStateHTML('📭', 'No Tasks', 'Check back soon for new tasks');
}
document.getElementById('taskFeed').addEventListener('click', async (e) => {
  if (!e.target.matches('.btn-start-earning')) return;

  const btn = e.target;
  if (btn.disabled) return; // already checking, ignore extra taps

  const task = currentTaskList.find(t => t._id === btn.dataset.taskId);
  if (!task) return;

  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Checking...';
  try {
    await openTaskDetail(task);
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
});

// ---- task detail modal ----
async function openTaskDetail(task) {
  currentTaskId = task._id;

  try {
    const started = await secureFetch('/api/marketplace/start', {
      method: 'POST',
      body: JSON.stringify({ taskId: task._id }),
    });
    if (started.error) {
      showNotificationToast(started.error, 'error');
      return;
    }
  } catch (err) {
    showNotificationToast('Could not start task — try again.', 'error');
    return;
  }

  document.getElementById('detailThumb').src = safeYtThumb(task.thumbnailUrl);
  document.getElementById('detailTitle').textContent = task.title || task.videoId;
  document.getElementById('detailVideoId').textContent = task.videoId;
  document.getElementById('detailPoints').textContent = `${task.pointCost} DASH`;
  document.getElementById('detailDuration').textContent = `${task.watchDurationSeconds / 60} minutes`;
  document.getElementById('watchOnYoutubeBtn').href = `https://www.youtube.com/watch?v=${encodeURIComponent(task.videoId)}`;

  const countriesEl = document.getElementById('detailCountries');
  countriesEl.innerHTML = (!task.allowedCountries || task.allowedCountries.length === 0)
    ? `<span class="badge badge-country">🌍 All countries</span>`
    : task.allowedCountries.map(c => `<span class="badge badge-country">${escapeHtml(countryNames[c] || c)}</span>`).join('');
  resetProofForm();
  document.getElementById('taskDetailModal').classList.remove('hidden');
}

// ---- post form: country chip toggles ----
const selectedCountries = new Set();
document.getElementById('countryChipGrid').addEventListener('click', (e) => {
  const btn = e.target.closest('.country-toggle');
  if (!btn) return;
  const code = btn.dataset.code;
  selectedCountries.has(code) ? selectedCountries.delete(code) : selectedCountries.add(code);
  btn.classList.toggle('selected');
  document.getElementById('allowedCountries').value = Array.from(selectedCountries).join(',');
  const hint = document.getElementById('countryHint');
  hint.textContent = selectedCountries.size === 0
    ? 'No countries selected — all countries allowed'
    : `${selectedCountries.size} countr${selectedCountries.size === 1 ? 'y' : 'ies'} selected`;
});

// ---- post form: fetch title + video ID + thumbnail from pasted link ----
async function fetchVideoMeta(url) {
  const result = await secureFetch(`/api/marketplace/fetch-meta?url=${encodeURIComponent(url)}`);
  if (result.error) {
    console.error('fetchVideoMeta failed', result.error);
    return null;
  }
  return result; // { videoId, title, thumbnailUrl }
}

document.getElementById('youtubeLink').addEventListener('input', (e) => {
  clearTimeout(fetchDebounce);
  const url = e.target.value.trim();
  const preview = document.getElementById('thumbPreview');

  if (!url) {
    preview.classList.add('hidden');
    currentVideoMeta = { videoId: null, title: null, thumbnailUrl: null };
    return;
  }

  fetchDebounce = setTimeout(async () => {
    document.getElementById('previewTitle').textContent = 'Loading...';
    preview.classList.remove('hidden');

    const meta = await fetchVideoMeta(url);
    if (!meta) {
      preview.classList.add('hidden');
      return;
    }

    currentVideoMeta = meta;
    document.getElementById('previewImg').src = meta.thumbnailUrl;
    document.getElementById('previewTitle').textContent = meta.title || `Video ID: ${meta.videoId} (title unavailable)`;
  }, 500);
});
// My Posts: creator needs to see paused tasks clearly, with a way to fix it
function renderMyPostCard(task) {
  const isPaused = task.status === 'paused';
  const tooShort = isPaused && task.pauseReason === 'video_too_short';
  const tid = escapeHtml(task._id);
  const pausedText = tooShort
    ? 'Paused — video is shorter than the watch time'
    : 'Paused — insufficient balance';
  return `
    <div class="mypost-card">
      <img class="mypost-thumb" src="${escapeHtml(safeYtThumb(task.thumbnailUrl))}" alt="">
      <div class="mypost-body">
        <h3>${escapeHtml(task.title || task.videoId)}</h3>
        <span class="badge ${isPaused ? 'badge-paused' : 'badge-active'}">
          ${isPaused ? pausedText : 'Active'}
        </span>
        <p class="mypost-stats">DASH spent: ${Number(task.dashSpent) || 0} · Approved: ${Number(task.viewsApproved) || 0}</p>
        ${isPaused && !tooShort ? `<button class="btn-primary btn-topup" data-task-id="${tid}">Earn more</button>
                      <button class="btn-primary btn-resume" data-task-id="${tid}">Resume</button>` : ''}
        <button class="btn-delete" data-task-id="${tid}">Delete</button>
      </div>
    </div>`;
}
function renderMyPosts(tasks) {
  currentMyPosts = tasks;
  document.getElementById('myPostsList').innerHTML = tasks.length
    ? tasks.map(renderMyPostCard).join('')
    : getEmptyStateHTML('📝', 'No Posts Yet', 'Post your first task to get started');
}
// merged version — use this one
document.getElementById('myPostsList').addEventListener('click', async (e) => {
  if (e.target.matches('.btn-topup')) {
    const earnBtn = document.getElementById('nav-earn');
    switchTab('earn', earnBtn);
    return;
  }
     if (e.target.matches('.btn-resume')) {
    try {
      const result = await secureFetch(`/api/marketplace/task/${e.target.dataset.taskId}/resume`, { method: 'POST' });
      if (result.error) { showNotificationToast(result.error, 'error'); return; }
      showNotificationToast('Task resumed.', 'success');
      loadMarketplaceTasks();
    } catch (err) {
      showNotificationToast('Could not resume task — try again.', 'error');
    }
    return;
     }

  if (e.target.matches('.btn-delete')) {
    const taskId = e.target.dataset.taskId;
    if (!confirm('Delete this task? This cannot be undone.')) return;

    try {
      const result = await secureFetch(`/api/marketplace/task/${taskId}`, { method: 'DELETE' });
        if (result.error) throw new Error(result.error);
           loadMarketplaceTasks();    
    } catch (err) {
      console.error('Delete failed', err);
      showNotificationToast('Could not delete task — try again.', 'error');
    }
  }
});
function renderSubmissionCard(sub) {
  const task = sub.taskId;
  const statusMap = {
    approved: { label: 'Passed', cls: 'status-passed' },
    pending_review: { label: 'Reviewing...', cls: 'status-pending' },
    rejected: { label: 'Failed', cls: 'status-failed' },
  };
  const status = statusMap[sub.status] || statusMap.pending_review;

  return `
    <div class="submission-card">
      <img class="submission-thumb" src="${escapeHtml(safeYtThumb(task?.thumbnailUrl))}" alt="">
      <div class="submission-body">
        <h3>${escapeHtml(task?.title || task?.videoId || 'Unknown task')}</h3>
        <span class="badge ${status.cls}">${status.label}</span>
        ${sub.status === 'rejected' && sub.rejectionReason
          ? `<p class="submission-reason">Reason: ${escapeHtml(sub.rejectionReason.replace(/_/g, ' '))}</p>`
          : ''}
        ${sub.status === 'approved'
          ? `<p class="submission-reason">+${Number(task?.pointCost) || ''} DASH earned</p>`
          : ''}
      </div>
    </div>`;
}

function renderSubmissions(submissions) {
  document.getElementById('submissionsList').innerHTML = submissions.length
    ? submissions.map(renderSubmissionCard).join('')
    : getEmptyStateHTML('🕵️', 'No Submissions', 'Submit proof for a task to see it here');
}
// ---- post form submit (placeholder — wire to your API next) ----
document.getElementById('postTaskForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentVideoMeta.videoId) {
    showNotificationToast('Please paste a valid YouTube link first.', 'error');
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Posting...';

  const payload = {
    videoId: currentVideoMeta.videoId,
    title: currentVideoMeta.title,
    thumbnailUrl: currentVideoMeta.thumbnailUrl,
    watchDuration: document.getElementById('watchDuration').value,
    pointCost: document.getElementById('pointCost').value,
    allowedCountries: document.getElementById('allowedCountries').value,
  };

  try {
    const result = await secureFetch('/api/marketplace/post', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
if (result.error) throw new Error(result.error);

    showNotificationToast('Task posted!', 'success');
    e.target.reset();
    document.getElementById('thumbPreview').classList.add('hidden');
    document.querySelectorAll('.country-toggle.selected').forEach(b => b.classList.remove('selected'));
    selectedCountries.clear();
  } catch (err) {
    console.error('Post task failed', err);
    showNotificationToast(err.message || 'Could not post task — try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Post task';
  }
});
// ---- submit proof (placeholder — wire to your API next) ----
 
document.getElementById('submitProofBtn').addEventListener('click', async () => {
  const fileInput = document.getElementById('proofScreenshot');
  const statusEl = document.getElementById('proofStatus');
  const submitBtn = document.getElementById('submitProofBtn');

  if (!fileInput.files.length) {
    statusEl.textContent = 'Please choose a screenshot first.';
    statusEl.classList.remove('hidden');
    return;
  }
  const file = fileInput.files[0];
  if (!file.type.startsWith('image/')) {
    statusEl.textContent = 'Please upload an image file.';
    statusEl.classList.remove('hidden');
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    statusEl.textContent = 'File too large — max 8MB.';
    statusEl.classList.remove('hidden');
    return;
  }

  statusEl.classList.add('hidden');
  resetChecklist();
  submitBtn.disabled = true;

  const formData = new FormData();
  formData.append('screenshot', file);
  formData.append('taskId', currentTaskId);

  const [result] = await Promise.all([
    secureFetch('/api/marketplace/submit', { method: 'POST', body: formData }),
    animateChecklist(), // run the visual pacing alongside the real request
  ]);

    if (result.error) {
    // a message (too early, region, duplicate...) is not a failed check: hide the checklist
    document.getElementById('reviewChecklist').classList.add('hidden');
    statusEl.textContent = result.error;
    statusEl.classList.remove('hidden');
  } else if (result.status === 'rejected') {
    applyChecklistResult(result);
    statusEl.textContent = result.message || 'Your proof was rejected. Please try again.';
    statusEl.classList.remove('hidden');
    fileInput.value = ''; // force a fresh screenshot
  } else {
    applyChecklistResult(result);
    document.getElementById('taskDetailModal').classList.add('hidden');
    document.querySelector('[data-tab="mysubmissions"]').click();
    await loadMarketplaceTasks();
  }

  submitBtn.disabled = false;
});

function setCheckState(id, state) {
  document.getElementById(id).dataset.state = state;
}

function resetChecklist() {
  ['check-screenshot', 'check-vpn', 'check-country', 'check-time'].forEach(id => setCheckState(id, 'pending'));
  document.getElementById('reviewChecklist').classList.remove('hidden');
}

async function animateChecklist() {
  const steps = ['check-screenshot', 'check-vpn', 'check-country', 'check-time'];
  for (const id of steps) {
    setCheckState(id, 'checking');
    await new Promise(r => setTimeout(r, 400)); // brief visual pacing, purely cosmetic
  }
}

function applyChecklistResult(result) {
  setCheckState('check-screenshot', result.screenshotOk ? 'pass' : 'fail');
  setCheckState('check-vpn', result.duplicateFlag ? 'fail' : 'pass');
  setCheckState('check-country', result.countryBlocked ? 'fail' : 'pass');
  setCheckState('check-time', result.timeOk ? 'pass' : 'fail');
}

// ---- task detail modal: close + copy ----
function resetProofForm() {
  const file = document.getElementById('proofScreenshot');
  if (file) file.value = '';
  const list = document.getElementById('reviewChecklist');
  if (list) list.classList.add('hidden');
  ['check-screenshot', 'check-vpn', 'check-country', 'check-time'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.dataset.state = 'pending';
  });
  const status = document.getElementById('proofStatus');
  if (status) { status.textContent = ''; status.classList.add('hidden'); }
}

function closeTaskDetail() {
  document.getElementById('taskDetailModal').classList.add('hidden');
  resetProofForm();
}

document.addEventListener('click', async (e) => {
  if (e.target.closest('#closeDetailBtn')) {
    closeTaskDetail();
    return;
  }

  if (e.target.closest('#copyVideoIdBtn')) {
    const id = document.getElementById('detailVideoId').textContent.trim();
    try {
      await navigator.clipboard.writeText(id);
    } catch (_) {
      const ta = document.createElement('textarea'); // fallback for Telegram WebViews
      ta.value = id;
      ta.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    showNotificationToast('Video ID copied', 'success');
  }
});
