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
          <span class="badge badge-points">${task.pointCost} Points</span>
          <span class="badge badge-time">${task.watchDurationSeconds / 60} minutes</span>
        </div>
        <button class="btn-start-earning" data-task-id="${task.id}">Start earning</button>
      </div>
    </div>`;
}

function renderTaskFeed(tasks) {
  document.getElementById('taskFeed').innerHTML = tasks.map(renderTaskCard).join('');
}
renderTaskFeed(sampleTasks);

document.getElementById('taskFeed').addEventListener('click', (e) => {
  if (e.target.matches('.btn-start-earning')) {
    const task = sampleTasks.find(t => t.id === e.target.dataset.taskId);
    if (task) openTaskDetail(task);
  }
});

// ---- task detail modal ----
function openTaskDetail(task) {
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

// ---- post form: thumbnail preview (regex extract video ID from link) ----
function extractVideoId(url) {
  const match = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{6,})/);
  return match ? match[1] : null;
}
document.getElementById('youtubeLink').addEventListener('input', (e) => {
  const id = extractVideoId(e.target.value);
  const preview = document.getElementById('thumbPreview');
  if (id) {
    document.getElementById('previewImg').src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    document.getElementById('previewTitle').textContent = id;
    preview.classList.remove('hidden');
  } else {
    preview.classList.add('hidden');
  }
});

// ---- post form submit (placeholder — wire to your API next) ----
document.getElementById('postTaskForm').addEventListener('submit', (e) => {
  e.preventDefault();
  console.log('TODO: POST /marketplace/post', {
    youtubeLink: document.getElementById('youtubeLink').value,
    watchDuration: document.getElementById('watchDuration').value,
    pointCost: document.getElementById('pointCost').value,
    allowedCountries: document.getElementById('allowedCountries').value
  });
});

// ---- submit proof (placeholder — wire to your API next) ----
document.getElementById('submitProofBtn').addEventListener('click', () => {
  console.log('TODO: POST /marketplace/submit with screenshot file');
});
