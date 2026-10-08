let currentVideoMeta = { videoId: null, title: null, thumbnailUrl: null };
let fetchDebounce;
let currentTaskId = null; // set this in openTaskDetail()
let currentTaskStartedAt = null;
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
      <img class="task-thumbnail" src="${task.thumbnailUrl}" alt="">
      <div class="task-body">
        <h3 class="task-title">${task.title}</h3>
        <div class="task-badges">
          ${task.promoted ? '<span class="badge badge-promoted">Promoted</span>' : ''}
          <span class="badge badge-points">${task.pointCost} DASH</span>
          <span class="badge badge-time">${task.watchDurationSeconds / 60} minutes</span>
        </div>
        <button class="btn-start-earning" data-task-id="${task._id}">Start earning</button>
      </div>
    </div>`;
}

function renderTaskFeed(tasks) {
  currentTaskList = tasks;
  document.getElementById('taskFeed').innerHTML = tasks.length
    ? tasks.map(renderTaskCard).join('')
    : getEmptyStateHTML('📭', 'No Tasks', 'Check back soon for new tasks');
}
document.getElementById('taskFeed').addEventListener('click', (e) => {
  if (e.target.matches('.btn-start-earning')) {
    const task = currentTaskList.find(t => t._id === e.target.dataset.taskId);
    if (task) openTaskDetail(task);
  }
})

// ---- task detail modal ----
function openTaskDetail(task) {
  currentTaskId = task._id;
  currentTaskStartedAt = new Date().toISOString();
  document.getElementById('detailThumb').src = task.thumbnailUrl;
  document.getElementById('detailTitle').textContent = task.title;
  document.getElementById('detailVideoId').textContent = task.videoId;
  document.getElementById('detailPoints').textContent = `${task.pointCost} Points`;
  document.getElementById('detailDuration').textContent = `${task.watchDurationSeconds / 60} minutes`;
  document.getElementById('watchOnYoutubeBtn').href = `https://www.youtube.com/watch?v=${task.videoId}`;

  const countriesEl = document.getElementById('detailCountries');
  countriesEl.innerHTML = (!task.allowedCountries || task.allowedCountries.length === 0)
    ? `<span class="badge badge-country">🌍 All countries</span>`
    : task.allowedCountries.map(c => `<span class="badge badge-country">${countryNames[c] || c}</span>`).join('');

  document.getElementById('taskDetailModal').classList.remove('hidden');
}
document.getElementById('closeDetailBtn').addEventListener('click', () => {
  document.getElementById('taskDetailModal').classList.add('hidden');
});
document.getElementById('copyVideoIdBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(document.getElementById('detailVideoId').textContent);
});

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
  return `
    <div class="mypost-card">
      <img class="mypost-thumb" src="${task.thumbnailUrl}" alt="">
      <div class="mypost-body">
        <h3>${task.title}</h3>
        <span class="badge ${isPaused ? 'badge-paused' : 'badge-active'}">
          ${isPaused ? 'Paused — insufficient balance' : 'Active'}
        </span>
        <p class="mypost-stats">DASH spent: ${task.dashSpent || 0} · Approved: ${task.viewsApproved || 0}</p>
        ${isPaused ? `<button class="btn-primary btn-topup" data-task-id="${task._id}">Earn more</button>` : ''}
        <button class="btn-delete" data-task-id="${task._id}">Delete</button>
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
      <img class="submission-thumb" src="${task?.thumbnailUrl || ''}" alt="">
      <div class="submission-body">
        <h3>${task?.title || task?.videoId || 'Unknown task'}</h3>
        <span class="badge ${status.cls}">${status.label}</span>
        ${sub.status === 'rejected' && sub.rejectionReason
          ? `<p class="submission-reason">Reason: ${sub.rejectionReason.replace(/_/g, ' ')}</p>`
          : ''}
        ${sub.status === 'approved'
          ? `<p class="submission-reason">+${task?.pointCost ?? ''} DASH earned</p>`
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
  formData.append('taskStartedAt', currentTaskStartedAt);

  const [result] = await Promise.all([
    secureFetch('/api/marketplace/submit', { method: 'POST', body: formData }),
    animateChecklist(), // run the visual pacing alongside the real request
  ]);

  if (result.error) {
    ['check-screenshot', 'check-vpn', 'check-country', 'check-time'].forEach(id => setCheckState(id, 'fail'));
    statusEl.textContent = result.error;
    statusEl.classList.remove('hidden');
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
  // screenshot: fingerprint + OCR video ID match
  const screenshotOk = !result.duplicateFlag && result.ocrVideoId === result.expectedVideoId;
  setCheckState('check-screenshot', screenshotOk ? 'pass' : 'fail');

  // vpn/network: based on fraud action
  setCheckState('check-vpn', result.vpnAction === 'block' ? 'fail' : 'pass');

  // country
  setCheckState('check-country', result.countryBlocked ? 'fail' : 'pass');

  // watch time
  const timeOk = result.ocrElapsedSeconds !== null && result.ocrElapsedSeconds >= result.requiredSeconds;
  setCheckState('check-time', timeOk ? 'pass' : 'fail');
}
