// ---- sample data (swap for real API calls later) ----
const sampleTasks = [
  {
    id: "task_001",
    videoId: "DQDHW-N317Y",
    title: "Messi and The World Cup 2026!",
    thumbnailUrl: "https://i.ytimg.com/vi/DQDHW-N317Y/hqdefault.jpg",
    pointCost: 20,
    watchDurationSeconds: 660,
    promoted: true,
    allowedCountries: []
  }
];
// add near the top of marketplace.js, alongside sampleTasks
const sampleMyPosts = [
  {
    id: "task_001",
    title: "Messi and The World Cup 2026!",
    thumbnailUrl: "https://i.ytimg.com/vi/DQDHW-N317Y/hqdefault.jpg",
    status: "active",
    dashSpent: 40,
    viewsApproved: 2
  }
];
async function loadMarketplaceTasks() {
  try {
    const [tasksRes, myPostsRes] = await Promise.all([
      secureFetch('/api/marketplace/tasks'),
      secureFetch('/api/marketplace/my-posts'),
    ]);
    const { tasks } = await tasksRes.json();
    const { tasks: myPosts } = await myPostsRes.json();

    renderTaskFeed(tasks);
    renderMyPosts(myPosts);
  } catch (err) {
    console.error('loadMarketplaceTasks failed', err);
    document.getElementById('taskFeed').innerHTML = '<p class="form-hint">Failed to load tasks.</p>';
  }
}
const countryNames = {
  US: '🇺🇸 US', GB: '🇬🇧 UK', CA: '🇨🇦 CA', AU: '🇦🇺 AU',
  DE: '🇩🇪 DE', FR: '🇫🇷 FR', IN: '🇮🇳 IN', NG: '🇳🇬 NG', ET: '🇪🇹 ET'
};

// ---- tab switching ----
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
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
        <button class="btn-start-earning" data-task-id="${task.id}">Start earning</button>
      </div>
    </div>`;
}

// Tasks feed: only show active tasks to viewers
function renderTaskFeed(tasks) {
  const activeTasks = tasks.filter(t => t.status !== 'paused');
  document.getElementById('taskFeed').innerHTML = activeTasks.length
    ? activeTasks.map(renderTaskCard).join('')
    : '<p class="form-hint">No tasks available right now.</p>';
}


document.getElementById('taskFeed').addEventListener('click', (e) => {
  if (e.target.matches('.btn-start-earning')) {
    const task = sampleTasks.find(t => t.id === e.target.dataset.taskId);
    if (task) openTaskDetail(task);
  }
});

// ---- task detail modal ----
function openTaskDetail(task) {
  currentTaskId = task.id;
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
  try {
    const res = await fetch(`/api/marketplace/fetch-meta?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    return await res.json(); // { videoId, title, thumbnailUrl }
  } catch (err) {
    console.error('fetchVideoMeta failed', err);
    return null;
  }
}

let currentVideoMeta = { videoId: null, title: null, thumbnailUrl: null };
let fetchDebounce;

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
        ${isPaused ? `<button class="btn-primary btn-topup" data-task-id="${task.id}">EARN MORE</button>` : ''}
        <button class="btn-delete" data-task-id="${task.id}">Delete</button>
      </div>
    </div>`;
}

function renderMyPosts(tasks) {
  document.getElementById('myPostsList').innerHTML = tasks.length
    ? tasks.map(renderMyPostCard).join('')
    : '<p class="form-hint">You haven\'t posted any tasks yet.</p>';
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
      const res = await secureFetch(`/api/marketplace/task/${taskId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');

      loadMarketplaceTasks(); // re-fetch instead of manually splicing local state
    } catch (err) {
      console.error('Delete failed', err);
      alert('Could not delete task — try again.');
    }
  }
});
// ---- post form submit (placeholder — wire to your API next) ----
document.getElementById('postTaskForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentVideoMeta.videoId) {
    alert('Please paste a valid YouTube link first.');
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
    const res = await secureFetch('/api/marketplace/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await res.json();

    if (!res.ok) throw new Error(result.error || 'Post failed');

    alert('Task posted!');
    e.target.reset();
    document.getElementById('thumbPreview').classList.add('hidden');
    document.querySelectorAll('.country-toggle.selected').forEach(b => b.classList.remove('selected'));
    selectedCountries.clear();
  } catch (err) {
    console.error('Post task failed', err);
    alert(err.message || 'Could not post task — try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Post task';
  }
});
// ---- submit proof (placeholder — wire to your API next) ----
let currentTaskId = null; // set this in openTaskDetail()
let currentTaskStartedAt = null; 
document.getElementById('submitProofBtn').addEventListener('click', async () => {
  const fileInput = document.getElementById('proofScreenshot');
  const statusEl = document.getElementById('proofStatus');
  const submitBtn = document.getElementById('submitProofBtn');

  if (!fileInput.files.length) {
    statusEl.textContent = 'Please choose a screenshot first.';
    statusEl.classList.remove('hidden');
    return;
  }

  // basic client-side size/type check before upload
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

  statusEl.textContent = 'Reviewing... Checking Stats for Nerds and video match.';
  statusEl.classList.remove('hidden');
  submitBtn.disabled = true;

  try {
    const formData = new FormData();
    formData.append('screenshot', file);
    formData.append('taskId', currentTaskId);
    formData.append('taskStartedAt', currentTaskStartedAt);

    const res = await secureFetch('/api/marketplace/submit', {
      method: 'POST',
      body: formData,
    });
    const result = await res.json();

    if (!res.ok) {
      statusEl.textContent = result.error || 'Submission rejected.';
    } else if (result.status === 'approved') {
      statusEl.textContent = '✅ Approved! DASH added to your balance.';
    } else {
      statusEl.textContent = '⏳ Submitted — pending review.';
    }
  } catch (err) {
    console.error('Proof submission failed', err);
    statusEl.textContent = 'Something went wrong — try again.';
  } finally {
    submitBtn.disabled = false;
  }
});
