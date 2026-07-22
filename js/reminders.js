

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

function handleDragOver(e) {
    e.preventDefault();
    document.getElementById('imageUpload').classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    document.getElementById('imageUpload').classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    document.getElementById('imageUpload').classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        document.getElementById('imageInput').files = files;
        handleImageSelect({ target: { files } });
    }
}

function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showAppAlert('Image too large. Maximum 5MB allowed.', 'error', '❌ File Too Large');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const preview = document.getElementById('imagePreview');
        const img = document.getElementById('previewImg');
        
        img.src = event.target.result;
        preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}
async function uploadReminderImage() {
    const file = document.getElementById('imageInput').files[0];
    if (!file) {
        showAppAlert('❌ Please select an image', 'error');
        return;
    }

    // ✅ FIX 1: Validate file size before reading
    if (file.size > 5 * 1024 * 1024) {
        showAppAlert('❌ Image too large. Maximum 5MB allowed.', 'error');
        return;
    }

    const btnText = document.getElementById('uploadBtnText');
    const btnLoader = document.getElementById('uploadBtnLoader');
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            // ✅ FIX 2: Use secureFetch() instead of fetch()
            const response = await secureFetch('/api/admin/reminder-config', {
                method: 'POST',
                body: JSON.stringify({ imageBase64: e.target.result })
            });

            // ✅ FIX 3: Add response validation
            if (!response) {
                throw new Error('No response from server');
            }

            if (response.success) {
                showAppAlert('✅ Reminder image uploaded successfully!', 'success');
                document.getElementById('imageInput').value = '';
                document.getElementById('imagePreview').style.display = 'none';
                // ✅ FIX 4: Reload stats to show new image
                loadReminderConfig();
            } else {
                throw new Error(response.error || 'Failed to upload image');
            }
        } catch (err) {
            showAppAlert('❌ Upload error: ' + err.message, 'error');
} finally {
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
    };
    reader.readAsDataURL(file);
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
        showAppAlert('❌ Error loading reminder stats: ' + err.message, 'error');
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
        showAppAlert('❌ Error loading reminder config: ' + err.message, 'error');
        
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
