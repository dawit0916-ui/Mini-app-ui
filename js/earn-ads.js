function getAdsgramController(blockId) {
    if (!window.Adsgram) return null;
    if (!_adsgramControllers[blockId]) {
        _adsgramControllers[blockId] = window.Adsgram.init({ blockId });
    }
    return _adsgramControllers[blockId];
}


let _adInProgress = false;

async function playAdAndTrack(adId, adNetwork, blockId) {
    if (_adInProgress) return;
    _adInProgress = true;

    try {
        // 1. Create pending session server-side
        const sessionRes = await secureFetch('/api/secure/ads/start-session', {
            method: 'POST',
            body: JSON.stringify({ adId })
        });

        if (!sessionRes || !sessionRes.success) {
            showAppAlert(sessionRes?.error || 'Could not start ad session.', 'warning');
            _adInProgress = false;
            return;
        }

        const sessionId = sessionRes.sessionId;

        // ===== MONETAG ADS =====
        if (adNetwork === 'monetag') {
            const ymid = `monetag_${sessionId}`;  // Unique ID
    
    let adPromise = blockId === 'pop' 
        ? show_11246134('pop', { ymid })
        : show_11246134({ ymid });
                 
            adPromise
                .then(async () => {
                    // Monetag ad completed — claim reward
                    const claimRes = await secureFetch('/api/secure/ads/claim', {
                        method: 'POST',
                        body: JSON.stringify({
                            sessionId,
                            clientDone: true,
                            blurDetected: true  // Monetag auto-confirms
                        })
                    });

                    if (claimRes && claimRes.success) {
                        tg.HapticFeedback.notificationOccurred('success');
                        showNotificationToast(`+${claimRes.reward} DASH earned! 🎉`, 'success');
                        updateHeaderBalances(claimRes.newBalance, claimRes.newPoints, claimRes.newCoins);
                        loadAdsWatchList();
                    } else {
                        showAppAlert(claimRes?.error || 'Claim failed.', 'error');
                    }
                })
                .catch(() => {
                    showAppAlert('No ad available right now.', 'error');
                })
                .finally(() => {
                    _adInProgress = false;
                });

            return;
        }

        // ===== ADSGRAM ADS (existing code) =====
        if (!window.Adsgram) {
            showAppAlert('Ad service is still loading.', 'warning');
            _adInProgress = false;
            return;
        }

        let blurDetected = false;

        function onBlur() { 
            blurDetected = true;
            console.log('[Ad] Blur detected');
        }

        function onFocus() { 
            blurDetected = true;
            console.log('[Ad] Focus regained');
        }

        window.addEventListener('blur', onBlur);
        window.addEventListener('focus', onFocus);

        const controller = window.Adsgram.init({ blockId });

        controller.show()
            .then(async (result) => {
                window.removeEventListener('blur', onBlur);
                window.removeEventListener('focus', onFocus);
      
                if (!result.done) {
                    showAppAlert('Complete the full ad to earn your reward.', 'warning');
                    _adInProgress = false;
                    return;
                }

                if (!blurDetected) {
                    showAppAlert('Tap the button in the ad to earn your reward.', 'warning');
                    _adInProgress = false;
                    return;
                }

                const claimRes = await secureFetch('/api/secure/ads/claim', {
                    method: 'POST',
                    body: JSON.stringify({
                        sessionId,
                        clientDone: true,
                        blurDetected
                    })
                });

                if (claimRes && claimRes.success) {
                    tg.HapticFeedback.notificationOccurred('success');
                    showNotificationToast(`+${claimRes.reward} DASH earned! 🎉`, 'success');
                    updateHeaderBalances(claimRes.newBalance, claimRes.newPoints, claimRes.newCoins);
                    loadAdsWatchList();
                } else {
                    showAppAlert(claimRes?.error || 'Claim failed.', 'error');
                }
            })
            .catch(() => {
                window.removeEventListener('blur', onBlur);
                showAppAlert('No ad available right now.', 'error');
            })
            .finally(() => {
                _adInProgress = false;
            });

    } catch (err) {
        console.error('Ad playback error:', err);
        showAppAlert('No ad available right now.', 'error');
        _adInProgress = false;
    }
}
// Load ads into admin panel
async function loadAdminAds() {
    const container = document.getElementById('admin-ads-list');
    if (!container) return;
    container.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-4">Loading...</p>';

    try {
        const res = await secureFetch('/api/admin/ads');
        const ads = (res && res.success) ? res.ads : [];

        if (ads.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-2xl mb-2">📡</p>
                    <p class="text-[10px] text-slate-500 uppercase font-bold">No ads yet. Click Init above.</p>
                </div>`;
            return;
        }

        container.innerHTML = ads.map(ad => `
            <div class="glass p-5 border-orange-500/15 rounded-2xl space-y-4" id="ad-card-${ad.adId}">

                <!-- Header -->
                <div class="flex justify-between items-center">
                    <div>
                        <p class="text-xs font-black text-white">${ad.adId}</p>
                        <p class="text-[9px] text-slate-500 font-mono">Block ID: ${ad.unitId} · ${ad.network}</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" ${ad.enabled ? 'checked' : ''} 
                            onchange="toggleAdEnabled('${ad.adId}', this.checked)"
                            class="sr-only peer">
                        <div class="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                </div>

                <!-- Reward -->
                <div>
                    <p class="text-[8px] text-slate-500 uppercase font-black mb-1 ml-1">
                        💰 Reward per View (DASH)
                    </p>
                    <input id="ad-reward-${ad.adId}" type="number" step="1" value="${ad.reward}"
                        class="w-full p-3 rounded-xl text-xs glass">
                </div>

                <!-- Reset interval + watches per reset -->
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <p class="text-[8px] text-slate-500 uppercase font-black mb-1 ml-1">
                            ⏱ Reset Every (Hours)
                        </p>
                        <select id="ad-reset-${ad.adId}" class="w-full p-3 rounded-xl text-xs glass text-slate-300">
                            <option value="1"  ${ad.resetIntervalHours===1  ?'selected':''}>Every 1 hr</option>
                            <option value="2"  ${ad.resetIntervalHours===2  ?'selected':''}>Every 2 hrs</option>
                            <option value="3"  ${ad.resetIntervalHours===3  ?'selected':''}>Every 3 hrs</option>
                            <option value="4"  ${ad.resetIntervalHours===4  ?'selected':''}>Every 4 hrs</option>
                            <option value="6"  ${ad.resetIntervalHours===6  ?'selected':''}>Every 6 hrs</option>
                            <option value="8"  ${ad.resetIntervalHours===8  ?'selected':''}>Every 8 hrs</option>
                            <option value="12" ${ad.resetIntervalHours===12 ?'selected':''}>Every 12 hrs</option>
                            <option value="24" ${ad.resetIntervalHours===24 ?'selected':''}>Every 24 hrs</option>
                        </select>
                    </div>
                    <div>
                        <p class="text-[8px] text-slate-500 uppercase font-black mb-1 ml-1">
                            👁 Watches Per Reset
                        </p>
                        <input id="ad-watches-${ad.adId}" type="number" step="1" min="1" value="${ad.watchesPerReset}"
                            class="w-full p-3 rounded-xl text-xs glass">
                    </div>
                </div>

                <!-- Summary pill -->
                <div class="bg-orange-500/8 border border-orange-500/15 rounded-xl px-3 py-2 flex items-center gap-2"
                     id="ad-summary-${ad.adId}">
                    <span class="text-base">📊</span>
                    <p class="text-[10px] text-orange-300 font-bold">
                        ${ad.watchesPerReset} views every ${ad.resetIntervalHours}h 
                        · +${ad.reward} DASH each
                        · up to ${Math.floor(24 / ad.resetIntervalHours) * ad.watchesPerReset} DASH/day
                    </p>
                </div>

                <!-- Save -->
                <button onclick="saveAdSettings('${ad.adId}')"
                    class="w-full bg-orange-600/20 text-orange-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-orange-500/20 active:scale-95 transition-all">
                    💾 Save Changes
                </button>
            </div>
        `).join('');

    } catch (e) {
        container.innerHTML = '<p class="text-center text-[10px] text-red-400 py-4">Failed to load ads.</p>';
    }
}

// Save individual ad settings
async function saveAdSettings(adId) {
    const reward             = document.getElementById(`ad-reward-${adId}`)?.value;
    const resetIntervalHours = document.getElementById(`ad-reset-${adId}`)?.value;
    const watchesPerReset    = document.getElementById(`ad-watches-${adId}`)?.value;

    if (!reward || !resetIntervalHours || !watchesPerReset) {
        return showAppAlert('Please fill all fields.', 'warning');
    }

    try {
        const res = await secureFetch('/api/admin/ads/update', {
            method: 'POST',
            body: JSON.stringify({ adId, reward, resetIntervalHours, watchesPerReset })
        });

        if (res && res.success) {
            tg.HapticFeedback.notificationOccurred('success');

            // Update summary pill live
            const summary = document.getElementById(`ad-summary-${adId}`);
            if (summary) {
                const r = parseFloat(reward);
                const interval = parseInt(resetIntervalHours);
                const watches  = parseInt(watchesPerReset);
                summary.querySelector('p').innerText =
                    `${watches} views every ${interval}h · +${r} DASH each · up to ${Math.floor(24/interval)*watches} DASH/day`;
            }

            showAppAlert('Ad settings saved!', 'success');
        } else {
            showAppAlert(res?.error || 'Failed to save.', 'error');
        }
    } catch (e) {
        showAppAlert('Network error.', 'error');
    }
}

// Toggle ad enabled/disabled
async function toggleAdEnabled(adId, enabled) {
    const res = await secureFetch('/api/admin/ads/update', {
        method: 'POST',
        body: JSON.stringify({ adId, enabled })
    });
    if (!res || !res.success) {
        showAppAlert('Failed to toggle ad.', 'error');
    }
}        

    
let currentLeaderboardType = 'points';

/* ============================================================
   EARN HUB NAVIGATION
   ============================================================ */
// Replace existing openEarnSection(...) with this
function openEarnSection(section, task) {
  // hide the hub view if present
  document.getElementById('earn-hub-view')?.classList.add('hidden');

  // known section -> element id map
  const map = {
    'ads': 'earn-section-ads',
    'daily': 'earn-section-daily',
    'youtube': 'earn-section-youtube',
    'youtube-detail': 'earn-section-youtube-detail'
  };

  // hide all known sections first (defensive)
  Object.values(map).forEach(id => document.getElementById(id)?.classList.add('hidden'));

  const targetId = map[section];
  if (!targetId) {
    console.warn('openEarnSection: unknown section', section);
    return;
  }

  const targetEl = document.getElementById(targetId);
  if (!targetEl) {
    console.warn('openEarnSection: target element not found', targetId);
    return;
  }

  // show the chosen section
  targetEl.classList.remove('hidden');

  // call associated loader functions if they exist
  if (section === 'ads' && typeof loadAdsWatchList === 'function') {
    loadAdsWatchList();
  } else if (section === 'daily' && typeof loadDailyTask === 'function') {
    loadDailyTask();
 
  } else if (section === 'youtube' && typeof loadYoutubeTasks === 'function') {
    loadYoutubeTasks();
  }

  // If a task detail needs opening, call handler if present
  if (task && typeof openTaskDetail === 'function') {
    try { openTaskDetail(task); } catch (e) { console.error('openTaskDetail error', e); }
  }
}
function closeEarnSection() {
  const ids = [
    'earn-section-youtube',
    'earn-section-youtube-detail',
    'earn-section-ads',
    'earn-section-daily'
  ];

  ids.forEach(id => {
    document.getElementById(id)?.classList.add('hidden');
  });

  document.getElementById('earn-hub-view')?.classList.remove('hidden');
}
let todaysTask = null;

async function loadDailyTask() {
    try {
        const res = await secureFetch('/api/secure/daily-tasks/today');
        todaysTask = res;

        document.getElementById('dailyTask-comment').classList.add('hidden');
        document.getElementById('dailyTask-reaction').classList.add('hidden');
        document.getElementById('dailyTaskCompletedMsg').classList.add('hidden');

        if (!res.success) {
            // Either the daily limit is reached for today, or there are no
            // tasks in the pool at all right now — both show the same
            // "come back later" state, just with different wording.
            const msgBox = document.getElementById('dailyTaskCompletedMsg');
            const title = msgBox.querySelector('p:first-child');
            const subtitle = msgBox.querySelector('p:last-child');
            if (typeof res.dailyLimit === 'number') {
                title.textContent = '✅ Daily Limit Reached!';
                subtitle.textContent = `You've completed ${res.completedToday}/${res.dailyLimit} tasks today — come back tomorrow`;
                document.getElementById('dailyTaskLimitLabel').textContent = `${res.completedToday}/${res.dailyLimit} done today`;
            } else {
                title.textContent = '😴 No Tasks Right Now';
                subtitle.textContent = res.message || 'Check back again soon';
            }
            msgBox.classList.remove('hidden');
            document.getElementById('dailyTaskPreview').textContent = 'No task available right now';
            return;
        }

        if (typeof res.dailyLimit === 'number') {
            document.getElementById('dailyTaskLimitLabel').textContent = `${res.completedToday}/${res.dailyLimit} done today`;
        }

        document.getElementById('dailyTaskReward').textContent = `+${res.reward} DASH`;

        if (res.task_type === 'comment') {
            document.getElementById('dailyCommentWord').textContent = res.secret_word;
            document.getElementById('dailyTaskPreview').textContent = `Secret word · +${res.reward} DASH`;
            document.getElementById('dailyTask-comment').classList.remove('hidden');
        } else if (res.task_type === 'reaction') {
            document.getElementById('dailyReactionEmoji').textContent = res.target_emoji;
            document.getElementById('dailyTaskPreview').textContent = `React ${res.target_emoji} · +${res.reward} DASH`;
            document.getElementById('dailyTask-reaction').classList.remove('hidden');
        }

    } catch (err) {
        console.error('Error loading daily task:', err);
    }
}

function copySecretWord() {
    navigator.clipboard.writeText(todaysTask.secret_word).then(() => {
        showAppAlert(`Copied: ${todaysTask.secret_word}`, 'success');
    });
}

function goToGroup() {
    window.open(todaysTask.group_url, '_blank');
}

function goToPost() {
    secureFetch('/api/secure/daily-tasks/mark-pending-reaction', {
        method: 'POST',
        body: JSON.stringify({ taskKey: todaysTask.task_key })
    }).catch(() => {});
    window.open(todaysTask.post_direct_link, '_blank');
}
async function verifyReaction() {
    const btn = document.getElementById('verifyReactionBtn');
    btn.disabled = true;
    btn.textContent = '⏳...';
    try {
        const res = await secureFetch('/api/secure/daily-tasks/verify-reaction', {
            method: 'POST',
            body: JSON.stringify({ taskKey: todaysTask.task_key })
        });
        if (res.success) {
            showAppReward('✅ Verified!', `+${todaysTask.reward} DASH`);
            await updateHeaderBalances();
            // Multiple tasks can be done per day now — load the next one
            // (loadDailyTask itself shows the "limit reached" state if
            // this was the last one they're allowed today).
            await loadDailyTask();
        } else {
            showAppAlert(res.message || 'Not detected yet — react first', 'info');
            btn.disabled = false;
            btn.textContent = '✓ Verify';
        }
    } catch (err) {
        console.error(err);
        btn.disabled = false;
        btn.textContent = '✓ Verify';
    }
}

// Hook: call loadDailyTask() when the daily section opens
const _origOpenEarnSection = window.openEarnSection;
window.openEarnSection = function(section) {
    _origOpenEarnSection(section);
    if (section === 'daily') loadDailyTask();
};
/* ============================================================
   WATCH & EARN (ADS) — moved into its own Earn sub-page.
   Uses your existing /api/secure/available-ads + playAdAndTrack.
   ============================================================ */
async function loadAdsWatchList() {
    const container = document.getElementById('ads-watch-list');
    if (!container) return;
    container.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-6">Loading ads...</p>';

    try {
        const res = await secureFetch('/api/secure/available-ads');
        if (!res || !res.success || !Array.isArray(res.ads)) {
            container.innerHTML = '<p class="text-center text-xs text-red-400 py-6">Error loading ads</p>';
            return;
        }

        if (res.ads.length === 0) {
            container.innerHTML = getEmptyStateHTML('👁️', 'No Ads Available', 'Check back later');
            return;
        }

        container.innerHTML = res.ads.map(ad => {
            const percent = Math.min(100, Math.round(
                (ad.watchedThisPeriod / ad.watchesPerReset) * 100
            ));

            // Countdown to next reset
            const msLeft   = new Date(ad.nextReset) - Date.now();
            const hLeft    = Math.floor(msLeft / 3600000);
            const mLeft    = Math.floor((msLeft % 3600000) / 60000);
            const resetLabel = hLeft > 0 ? `${hLeft}h ${mLeft}m` : `${mLeft}m`;

            const resetsPerDay = Math.floor(24 / ad.resetIntervalHours);
            const maxPerDay    = resetsPerDay * ad.watchesPerReset;

            if (ad.locked) {
                return `
                <div class="glass p-4 flex items-center gap-4 border border-white/5 rounded-2xl">
                    <div class="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl shrink-0">⌛</div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-center mb-1">
                            <p class="text-sm font-black text-slate-400">+${ad.reward} DASH</p>
                            <span class="text-[9px] text-slate-500 font-bold">Resets in ${resetLabel}</span>
                        </div>
                        <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-1">
                            <div class="h-full bg-slate-600 rounded-full" style="width:100%"></div>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-[9px] text-slate-500">
                                ${ad.watchedThisPeriod}/${ad.watchesPerReset} this period
                            </span>
                            
                        </div>
                    </div>
                    <button disabled 
                        class="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-lg shrink-0">🔒</button>
                </div>`;
            }

            return `
            <div class="glass p-4 flex items-center gap-4 border border-orange-500/15 rounded-2xl">
                <img src="/assets/images/icon-ads.png" class="w-14 h-14 object-contain drop-shadow-lg shrink-0">
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-center mb-1">
                        <p class="text-sm font-black text-white">+${ad.reward} DASH</p>
                        <span class="text-[9px] text-orange-400 font-bold">Resets in ${resetLabel}</span>
                    </div>
                    <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-1">
                        <div class="h-full bg-orange-500 rounded-full transition-all" style="width:${percent}%"></div>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-[9px] text-slate-400">
                            ${ad.watchedThisPeriod}/${ad.watchesPerReset} this period
                        </span>
                        
                    </div>
                </div>
                <button onclick="playAdAndTrack('${ad.id}', '${ad.network}', '${ad.unitId}')"
                    class="btn-premium px-4 py-2.5 rounded-xl text-[10px] font-black uppercase shrink-0">
                    ▶ Watch
                </button>
            </div>`;
        }).join('');

    } catch (e) {
        console.error('Ads list error:', e);
        container.innerHTML = '<p class="text-center text-xs text-red-400 py-6">Error</p>';
    }
}
/* ============================================================
   FAST TASK WIDGET - AdsGram task widget, Level 2+, 3 claims/day
   ============================================================ */
let _fastTaskConfigCache = null;

async function loadAndShowAdsgram() {
    const container = document.getElementById('fast-task-widget-container');
    const remainingLabel = document.getElementById('fast-task-remaining');
    if (!container) return;

    try {
        const cfg = await secureFetch('/api/secure/fast-task-config');

        if (!cfg || !cfg.success) {
            if (cfg?.unlocksAtLevel) {
                if (remainingLabel) remainingLabel.innerText = `🔒 Lvl ${cfg.unlocksAtLevel}`;
                container.innerHTML = `
                    <button onclick="showLevelLockedOverlay(${cfg.unlocksAtLevel}, 'Fast Task unlocks at Level ${cfg.unlocksAtLevel}. Upgrade now!')"
                        class="w-full text-center text-[10px] text-yellow-300 py-3 border border-yellow-500/20 rounded-xl bg-yellow-500/5 active:scale-95 transition-all">
                        🔒 Unlocks at Level ${cfg.unlocksAtLevel} — Tap to upgrade
                    </button>`;
            } else {
                container.innerHTML = '<p class="text-center text-[10px] text-red-400 py-3">Failed to load Fast Task.</p>';
            }
            return;
        }

        _fastTaskConfigCache = cfg;

        if (!cfg.enabled || !cfg.blockId) {
            if (remainingLabel) remainingLabel.innerText = '';
            container.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-3">Not available right now.</p>';
            return;
        }

        if (remainingLabel) {
            remainingLabel.innerText = `${cfg.claimsRemainingToday}/${cfg.dailyLimit} left · +${cfg.reward} each`;
        }

        if (cfg.claimsRemainingToday <= 0) {
            container.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-3">✅ Daily limit reached. Come back tomorrow!</p>';
            return;
        }

        // Mount widget
        container.innerHTML = '';
        const widget = document.createElement('adsgram-task');
        widget.setAttribute('data-block-id', cfg.blockId);

        widget.addEventListener('reward', onFastTaskReward);
        widget.addEventListener('onBannerNotFound', () => {
            container.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-3">No tasks available right now. Come back later.</p>';
        });
        container.appendChild(widget);

    } catch (err) {
        console.error('Adsgram load error:', err);
        container.innerHTML = '<p class="text-center text-[10px] text-red-400 py-3">Network error.</p>';
    }
}

// Fires when the AdsGram task widget confirms the user completed the task.
async function onFastTaskReward() {
    try {
        const res = await secureFetch('/api/secure/fast-task-claim', { method: 'POST' });

        if (res.success) {
            tg.HapticFeedback.notificationOccurred('success');
            showAppReward(`⚡ +${res.reward} DASH!`, 'Fast Task complete');
            updateHeaderBalances(res.newBalance);
        } else if (res.unlocksAtLevel) {
            showLevelLockedOverlay(res.unlocksAtLevel, res.error);
        } else {
            showNotificationToast(res.error || 'Could not record reward', 'error');
        }
    } catch (err) {
        console.error('Fast task claim error:', err);
        showNotificationToast('Network error claiming reward', 'error');
    } finally {
        // Refresh remaining count / reload next widget instance either way
        loadAndShowAdsgram();
    }
}
