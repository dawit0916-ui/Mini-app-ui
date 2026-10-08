

// ============ REMINDERS FUNCTIONS ============
async function toggleReminders() {
    const isEnabled = document.getElementById('remindersToggle').checked;
    try {
        // ✅ FIX 1: Use secureFetch() instead of fetch()
        const response = await secureFetch('/api/admin/reminder-config/toggle', {
            method: 'POST',
            body: JSON.stringify({ enabled: isEnabled })
        });

        // ✅ FIX 2: Add response validation
        if (!response) {
            throw new Error('No response from server');
        }

        if (response.success) {
            showAppAlert(`✅ Reminders ${isEnabled ? 'enabled' : 'disabled'}`, 'success');
            updateReminderStatus(isEnabled);
        } else {
            throw new Error(response.error || 'Failed to toggle reminders');
        }
    } catch (err) {
        // ✅ FIX 3: Revert checkbox on error
        document.getElementById('remindersToggle').checked = !isEnabled;
        showAppAlert('❌ Error: ' + err.message, 'error');
    }
}

// ============ REMINDER IMAGE UPLOAD ============
const RM_MAX_BYTES = 5 * 1024 * 1024;
let rmSelectedFile = null;

function goBackFromReminders() {
    switchTab('admin');
    // Reminders button lives in the Settings panel, so reopen it
    if (typeof switchAdminPanel === 'function') switchAdminPanel('panel-settings');
}

function rmHandleDragOver(e) {
    e.preventDefault();
    document.getElementById('rmDropZone').classList.add('border-purple-400', 'bg-white/5');
}

function rmHandleDragLeave(e) {
    e.preventDefault();
    document.getElementById('rmDropZone').classList.remove('border-purple-400', 'bg-white/5');
}

function rmHandleDrop(e) {
    e.preventDefault();
    rmHandleDragLeave(e);
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) rmSetFile(file);
}

function rmHandleImageSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (file) rmSetFile(file);
}

function rmSetFile(file) {
    if (!file.type.startsWith('image/')) {
        showAppAlert('Please choose an image file.', 'error', '❌ Invalid File');
        return;
    }
    if (file.size > RM_MAX_BYTES) {
        showAppAlert('Image too large. Maximum 5MB allowed.', 'error', '❌ File Too Large');
        return;
    }

    rmSelectedFile = file;

    const reader = new FileReader();
    reader.onload = (ev) => {
        document.getElementById('rmPreviewImg').src = ev.target.result;
        document.getElementById('rmPreviewText').textContent =
            `${file.name} • ${(file.size / 1024).toFixed(0)} KB`;
        document.getElementById('rmPreviewBox').classList.remove('hidden');
    };
    reader.onerror = () => showAppAlert('Could not read this image.', 'error');
    reader.readAsDataURL(file);
}

function rmClearImage() {
    rmSelectedFile = null;
    document.getElementById('rmImageInput').value = '';
    document.getElementById('rmPreviewImg').src = '';
    document.getElementById('rmPreviewText').textContent = '';
    document.getElementById('rmPreviewBox').classList.add('hidden');
}

function rmSetUploading(isUploading, pct) {
    const btn = document.getElementById('rmUploadBtn');
    const spinner = document.getElementById('rmUploadSpinner');
    const text = document.getElementById('rmUploadBtnText');
    const box = document.getElementById('rmProgressBox');
    const bar = document.getElementById('rmProgressBar');
    const pctEl = document.getElementById('rmProgressPct');

    btn.disabled = isUploading;
    spinner.classList.toggle('hidden', !isUploading);
    text.textContent = isUploading ? 'Uploading...' : '⬆️ Upload Image';
    box.classList.toggle('hidden', !isUploading);

    if (typeof pct === 'number') {
        bar.style.width = pct + '%';
        pctEl.textContent = pct + '%';
    }
}

async function uploadReminderImage() {
    const file = rmSelectedFile;
    if (!file) {
        showAppAlert('❌ Please select an image', 'error');
        return;
    }
    if (file.size > RM_MAX_BYTES) {
        showAppAlert('❌ Image too large. Maximum 5MB allowed.', 'error');
        return;
    }

    rmSetUploading(true, 10);

    try {
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Could not read file'));
            reader.readAsDataURL(file);
        });

        rmSetUploading(true, 40);

        const response = await secureFetch('/api/admin/reminder-config', {
            method: 'POST',
            body: JSON.stringify({ imageBase64: base64 })
        });

        rmSetUploading(true, 90);

        if (!response) throw new Error('No response from server');
        if (!response.success) throw new Error(response.error || 'Failed to upload image');

        rmSetUploading(true, 100);
        showAppAlert('✅ Reminder image uploaded successfully!', 'success');
        rmClearImage();
        loadReminderConfig();
    } catch (err) {
        showAppAlert('❌ Upload error: ' + err.message, 'error');
    } finally {
        rmSetUploading(false, 0);
    }
}
async function loadReminderStats() {
    try {
        // ✅ FIX 1: Use secureFetch() instead of fetch()
        const response = await secureFetch('/api/admin/reminder-stats', {});

        // ✅ FIX 2: Add response validation
        if (!response) {
            throw new Error('No response from server');
        }

        if (!response.success) {
            throw new Error(response.error || 'Failed to load reminder statistics');
        }

        // ✅ FIX 3: Update stats with proper defaults
        const awaitingCount = response.usersAwaitingReminder || 0;
        const recentReminders = response.recentReminders || [];
        
        document.getElementById('awaitingCount').textContent = awaitingCount;
        document.getElementById('recentCount').textContent = recentReminders.length;

        // ✅ FIX 4: Better table rendering with error handling
        const html = recentReminders.length > 0
            ? `<table class="table">
                <thead>
                    <tr>
                        <th>User ID</th>
                        <th>Last Sent</th>
                        <th>Count</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentReminders.map(r => {
                        try {
                            return `
                                <tr>
                                    <td><code>${r.user_id || 'Unknown'}</code></td>
                                    <td>${r.last_sent ? new Date(r.last_sent).toLocaleString() : 'Never'}</td>
                                    <td><span class="badge badge-success">${r.count || 0}</span></td>
                                </tr>
                            `;
                        } catch (e) {
                            console.error('Error rendering reminder row:', e);
                            return '';
                        }
                    }).join('')}
                </tbody>
            </table>`
            : `<div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <p>No recent reminders sent yet</p>
              </div>`;

        document.getElementById('recentRemindersContainer').innerHTML = html;
    } catch (err) {
        // ✅ FIX 5: Show error to user
        console.error('Error loading reminder stats:', err);
        document.getElementById('recentRemindersContainer').innerHTML = 
            `<div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <p>Failed to load reminders: ${err.message}</p>
              </div>`;
    }
}

async function loadReminderConfig() {
    try {
        // ✅ FIX 1: Use secureFetch() instead of fetch()
        const response = await secureFetch('/api/admin/reminder-config', {});

        // ✅ FIX 2: Add response validation
        if (!response) {
            throw new Error('No response from server');
        }

        if (!response.success) {
            throw new Error(response.error || 'Failed to load reminder configuration');
        }

        // ✅ FIX 3: Update UI with toggle status
        const toggleElement = document.getElementById('remindersToggle');
        if (toggleElement) {
            toggleElement.checked = response.enabled || false;
            updateReminderStatus(response.enabled || false);
        }

        // ✅ FIX 4: Load stats after config
        await loadReminderStats();
    } catch (err) {
        // ✅ FIX 5: Show error to user
        console.error('Error loading reminder config:', err);
        
        
        // ✅ FIX 6: Reset UI to safe state
        const toggleElement = document.getElementById('remindersToggle');
        if (toggleElement) {
            toggleElement.checked = false;
            updateReminderStatus(false);
        }
    }
}

function updateReminderStatus(enabled) {
    const status = document.getElementById('reminderStatus');
    const systemStatus = document.getElementById('systemStatus');
    
    if (enabled) {
        status.textContent = '✅ Active';
        status.style.color = '#4caf50';
        systemStatus.textContent = '🟢';
    } else {
        status.textContent = '❌ Disabled';
        status.style.color = '#f44336';
        systemStatus.textContent = '🔴';
    }
}




// Load reminder config — runs directly since this file only executes
// after the loader has already injected every component (DOMContentLoaded
// would already have fired and never call back here).
if (document.getElementById('remindersToggle')) {
    loadReminderConfig();
}
// Step 1: Global variable synchronization hooks
let cachedUserProfile = null;
let allTasks = [];
