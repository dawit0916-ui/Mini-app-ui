// =====================================================
// ADMIN SHOP FUNCTIONS
// =====================================================

// Switch admin shop tab
function switchShopAdminTab(tab) {
    document.querySelectorAll('[id^="admin-shop-tab-"]').forEach(el => {
        el.classList.remove('bg-purple-600', 'text-white');
        el.classList.add('text-slate-400');
    });
    ['courses', 'apk', 'imagegen', 'stats'].forEach(t => {
        document.getElementById(`admin-shop-${t}`).classList.add('hidden');
    });

    document.getElementById(`admin-shop-tab-${tab}`).classList.add('bg-purple-600', 'text-white');
    document.getElementById(`admin-shop-${tab}`).classList.remove('hidden');

    if (tab === 'courses') loadAdminCourses();
    if (tab === 'apk') loadAdminAPKs();
    if (tab === 'imagegen') loadAdminImagegenPanel();
    if (tab === 'stats') loadShopStats();
}
// Load admin courses
async function loadAdminCourses() {
    try {
        const res = await secureFetch('/api/admin/shop/products', { method: 'GET' });
        const courses = res.products.filter(p => p.type === 'course');
        
        let html = courses.map(course => `
            <div class="glass p-3 rounded-xl border border-purple-500/20">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex-1">
                        <h5 class="text-xs font-black text-white">${course.title}${course.active === false ? ' <span class="text-[8px] text-orange-400">(inactive)</span>' : ''}</h5>
                        <p class="text-[8px] text-slate-500">${course.category} • ${course.price} DASH</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="openShopEditDrawer('${course._id}', 'course')" class="text-[10px] text-blue-400 hover:text-blue-300">Edit</button>
                        <button onclick="deleteAdminProduct('${course._id}')" class="text-[10px] text-red-400 hover:text-red-300">✕</button>
                    </div>
                </div>
                <button onclick="openAdminLessonModal('${course._id}')" class="w-full py-2 bg-purple-600/50 text-purple-300 rounded-lg text-[9px] font-black uppercase active:scale-95 transition-all">
                    ➕ Add Lesson
                </button>
            </div>
        `).join('');

        document.getElementById('admin-courses-list').innerHTML = html;
    } catch (err) {
        console.error('Load admin courses error:', err);
    }
}

// Create course
async function createAdminCourse() {
    try {
        const title = document.getElementById('admin-course-title').value.trim();
        const category = document.getElementById('admin-course-category').value.trim();
        const description = document.getElementById('admin-course-description').value.trim();
        const price = parseInt(document.getElementById('admin-course-price').value);
        const thumbnail = document.getElementById('admin-course-thumbnail').value.trim();

        if (!title || !price) {
            showNotificationToast( 'Title and price required', 'Error');
            return;
        }

        const res = await secureFetch('/api/admin/shop/create-course', {
           method: 'POST',
           body: JSON.stringify({ title, category, description, price, thumbnail })
          });
        if (res.success) {
            showNotificationToast( 'Course created', 'Success!');
            document.getElementById('admin-course-title').value = '';
            document.getElementById('admin-course-category').value = '';
            document.getElementById('admin-course-description').value = '';
            document.getElementById('admin-course-price').value = '';
            document.getElementById('admin-course-thumbnail').value = '';
            loadAdminCourses();
        }
    } catch (err) {
        showNotificationToast(err.error || 'Failed to create course', 'Error');
    }
}

// Open lesson modal
async function openAdminLessonModal(courseId) {
    shopState.adminCourseId = courseId;
    document.getElementById('admin-lesson-modal').classList.add('active');
    await loadAdminLessonList(courseId);
}

async function loadAdminLessonList(courseId) {
    const listEl = document.getElementById('admin-lesson-existing-list');
    listEl.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-3">Loading...</p>';
    try {
        const res = await secureFetch(`/api/admin/shop/course/${courseId}`, { method: 'GET' });
        if (!res.success || !res.lessons || res.lessons.length === 0) {
            listEl.innerHTML = '<p class="text-center text-[10px] text-slate-500 py-3">No lessons yet</p>';
            return;
        }
        listEl.innerHTML = res.lessons.map(lesson => `
            <div class="glass p-2.5 rounded-xl border border-white/5 flex justify-between items-center">
                <div class="min-w-0">
                    <p class="text-[9px] text-slate-500 truncate">${lesson.moduleName}</p>
                    <p class="text-xs font-bold text-white truncate">${lesson.lessonName}</p>
                </div>
                <button onclick="deleteAdminLesson('${lesson._id}', '${courseId}')" class="text-[10px] text-red-400 hover:text-red-300 shrink-0 ml-2">✕</button>
            </div>
        `).join('');
    } catch (err) {
        listEl.innerHTML = '<p class="text-center text-[10px] text-red-400 py-3">Failed to load lessons</p>';
    }
}

async function deleteAdminLesson(lessonId, courseId) {
    showAppConfirm('Delete this lesson?', async (confirmed) => {
        if (!confirmed) return;
        try {
            const res = await secureFetch(`/api/admin/shop/lesson/${lessonId}`, { method: 'DELETE' });
            if (res.success) {
                showNotificationToast('Lesson deleted', 'success');
                loadAdminLessonList(courseId);
            } else {
                showNotificationToast(res.error || 'Failed to delete', 'error');
            }
        } catch (err) {
            showNotificationToast('Failed to delete lesson', 'error');
        }
    });
}

function closeAdminLessonModal() {
    document.getElementById('admin-lesson-modal').classList.remove('active');
}

// Add lesson
async function addAdminLesson() {
    try {
        const moduleName = document.getElementById('admin-lesson-module').value.trim();
        const lessonName = document.getElementById('admin-lesson-name').value.trim();
        const telegram_file_id = document.getElementById('admin-lesson-file-id').value.trim();
        const duration = document.getElementById('admin-lesson-duration').value.trim();

        if (!moduleName || !lessonName || !telegram_file_id) {
            showNotificationToast('All fields required', 'error');
            return;
        }

        const res = await secureFetch('/api/admin/shop/lesson/add', {
            method: 'POST',
            body: JSON.stringify({
                courseId: shopState.adminCourseId,
                moduleName,
                lessonName,
                telegram_file_id,
                duration
            })
        });

        if (res.success) {
            showNotificationToast('Lesson added', 'success');
            document.getElementById('admin-lesson-module').value = '';
            document.getElementById('admin-lesson-name').value = '';
            document.getElementById('admin-lesson-file-id').value = '';
            document.getElementById('admin-lesson-duration').value = '';
            loadAdminLessonList(shopState.adminCourseId);
        }
    } catch (err) {
        showNotificationToast(err.error || 'Failed to add lesson', 'error');
    }
}

// Load admin APKs
async function loadAdminAPKs() {
    try {
        const res = await secureFetch('/api/admin/shop/products', { method: 'GET' });
        const apks = res.products.filter(p => p.type === 'apk');
        
        let html = apks.map(apk => `
            <div class="glass p-3 rounded-xl border border-blue-500/20">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h5 class="text-xs font-black text-white">${apk.title}${apk.active === false ? ' <span class="text-[8px] text-orange-400">(inactive)</span>' : ''}</h5>
                        <p class="text-[8px] text-slate-500">${apk.price} DASH</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="openShopEditDrawer('${apk._id}', 'apk')" class="text-[10px] text-blue-400 hover:text-blue-300">Edit</button>
                        <button onclick="deleteAdminProduct('${apk._id}')" class="text-[10px] text-red-400 hover:text-red-300">✕</button>
                    </div>
                </div>
            </div>
        `).join('');

        document.getElementById('admin-apk-list').innerHTML = html;
    } catch (err) {
        console.error('Load admin APKs error:', err);
    }
}

// Create APK
async function createAdminAPK() {
    try {
        const title = document.getElementById('admin-apk-title').value.trim();
        const description = document.getElementById('admin-apk-description').value.trim();
        const price = parseInt(document.getElementById('admin-apk-price').value);
        const thumbnail = document.getElementById('admin-apk-thumbnail').value.trim();
        const telegram_file_id = document.getElementById('admin-apk-telegram-file-id').value.trim();

        if (!title || !price) {
            showNotificationToast('Title and price required', 'error');
            return;
        }

        if (!telegram_file_id) {
            showNotificationToast('Telegram File ID required — upload the APK to the bot first to get one', 'error');

            return;
        }

        const res = await secureFetch('/api/admin/shop/create-course', {
          method: 'POST',
         body: JSON.stringify({ type: 'apk', title, description, price, thumbnail, telegram_file_id })
          });
        if (res.success) {
            showNotificationToast('APK created', 'success');
            document.getElementById('admin-apk-title').value = '';
            document.getElementById('admin-apk-description').value = '';
            document.getElementById('admin-apk-price').value = '';
            document.getElementById('admin-apk-thumbnail').value = '';
            document.getElementById('admin-apk-telegram-file-id').value = '';
            loadAdminAPKs();
        }
    } catch (err) {
        showNotificationToast(err.error || 'Failed to create APK', 'error');
    }
}

// Load shop stats
async function loadShopStats() {
    try {
        const res = await secureFetch('/api/admin/shop/stats', { method: 'GET' });
        const { stats } = res;
        
        document.getElementById('stat-shop-products').textContent = stats.totalProducts;
        document.getElementById('stat-shop-courses').textContent = stats.totalCourses;
        document.getElementById('stat-shop-purchases').textContent = stats.totalPurchases;
        document.getElementById('stat-shop-revenue').textContent = stats.totalRevenue;
    } catch (err) {
        console.error('Load stats error:', err);
    }
}

// Delete product
async function deleteAdminProduct(productId) {
    showAppConfirm('Delete this product? This also removes any lessons attached to it.', async (confirmed) => {
        if (!confirmed) return;
        try {
            const res = await secureFetch(`/api/admin/shop/product/${productId}`, { method: 'DELETE' });
            if (res.success) {
                showNotificationToast('Product deleted', 'success');
                loadAdminCourses();
                loadAdminAPKs();
            }
        } catch (err) {
            showNotificationToast(err.error || 'Failed to delete', 'error');
        }
    });
}

let currentEditingShopProductId = null;

async function openShopEditDrawer(productId, type) {
    try {
        // Works for both courses and APKs — it's just findById under the hood
        const res = await secureFetch(`/api/admin/shop/course/${productId}`, { method: 'GET' });
        if (!res.success) return showNotificationToast('Failed to load product', 'error');

        const product = res.course;
        currentEditingShopProductId = productId;

        document.getElementById('edit-shop-type-label').textContent = type === 'apk' ? 'APK' : 'Course';
        document.getElementById('edit-shop-display-id').textContent = productId;
        document.getElementById('edit-shop-title').value = product.title || '';
        document.getElementById('edit-shop-desc').value = product.description || '';
        document.getElementById('edit-shop-category').value = product.category || '';
        document.getElementById('edit-shop-price').value = product.price || 0;
        document.getElementById('edit-shop-thumbnail').value = product.thumbnail || '';
        document.getElementById('edit-shop-active').checked = product.active !== false;

        const fileIdWrap = document.getElementById('edit-shop-fileid-wrap');
        if (type === 'apk') {
            fileIdWrap.classList.remove('hidden');
            document.getElementById('edit-shop-fileid').value = product.telegram_file_id || '';
        } else {
            fileIdWrap.classList.add('hidden');
        }

        document.getElementById('admin-shop-edit-drawer').classList.add('active');
    } catch (err) {
        console.error('openShopEditDrawer error:', err);
        showNotificationToast('Failed to load product', 'error');
    }
}

function closeShopEditDrawer() {
    document.getElementById('admin-shop-edit-drawer').classList.remove('active');
    currentEditingShopProductId = null;
}

async function saveShopEdit() {
    if (!currentEditingShopProductId) return;

    const fileIdWrap = document.getElementById('edit-shop-fileid-wrap');
    const isApk = !fileIdWrap.classList.contains('hidden');

    const updates = {
        title: document.getElementById('edit-shop-title').value,
        description: document.getElementById('edit-shop-desc').value,
        category: document.getElementById('edit-shop-category').value,
        price: parseFloat(document.getElementById('edit-shop-price').value) || 0,
        thumbnail: document.getElementById('edit-shop-thumbnail').value,
        active: document.getElementById('edit-shop-active').checked
    };
    if (isApk) {
        updates.telegram_file_id = document.getElementById('edit-shop-fileid').value;
    }

    const btn = document.getElementById('btn-save-shop-edit');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const res = await secureFetch(`/api/admin/shop/product/${currentEditingShopProductId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });

        if (res.success) {
            tg.HapticFeedback.notificationOccurred('success');
            showNotificationToast('Product updated', 'success');
            closeShopEditDrawer();
            loadAdminCourses();
            loadAdminAPKs();
        } else {
            showNotificationToast(res.error || 'Failed to update', 'error');
        }
    } catch (err) {
        console.error('saveShopEdit error:', err);
        showNotificationToast('Failed to save changes', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Save Changes';
    }
}
// ===== AI IMAGE GENERATOR ADMIN =====

async function loadAdminImagegenPanel() {
    await loadAdminImagegenStyles();
    await loadAdminImagegenConfig();
}

async function loadAdminImagegenStyles() {
    try {
        const res = await secureFetch('/api/admin/shop/imagegen/styles', { method: 'GET' });
        const styles = res.styles || [];

        let html = styles.map(style => `
            <div class="glass p-3 rounded-xl border border-pink-500/20">
                <div class="flex justify-between items-start">
                    <div class="flex-1 min-w-0">
                        <h5 class="text-xs font-black text-white truncate">${style.name}${style.active === false ? ' <span class="text-[8px] text-orange-400">(inactive)</span>' : ''}</h5>
                        <p class="text-[8px] text-slate-500">${style.styleId} • order ${style.order}</p>
                    </div>
                    <div class="flex gap-2 shrink-0 ml-2">
                        <button onclick="openImagegenEditDrawer('${style.styleId}')" class="text-[10px] text-blue-400 hover:text-blue-300">Edit</button>
                        <button onclick="deleteAdminImagegenStyle('${style.styleId}')" class="text-[10px] text-red-400 hover:text-red-300">✕</button>
                    </div>
                </div>
            </div>
        `).join('');

        document.getElementById('admin-imagegen-list').innerHTML = html || '<p class="text-center text-[10px] text-slate-500 py-3">No styles yet</p>';
    } catch (err) {
        console.error('Load admin imagegen styles error:', err);
    }
}

async function createAdminImagegenStyle() {
    try {
        const styleId = document.getElementById('admin-imagegen-styleid').value.trim();
        const name = document.getElementById('admin-imagegen-name').value.trim();
        const promptTemplate = document.getElementById('admin-imagegen-prompt').value.trim();
        const previewThumbnail = document.getElementById('admin-imagegen-thumbnail').value.trim();
        const order = parseInt(document.getElementById('admin-imagegen-order').value) || 0;

        if (!styleId || !name || !promptTemplate) {
            showNotificationToast('Style ID, name, and prompt required', 'error');
            return;
        }

        const res = await secureFetch('/api/admin/shop/imagegen/style/create', {
            method: 'POST',
            body: JSON.stringify({ styleId, name, promptTemplate, previewThumbnail, order })
        });

        if (res.success) {
            showNotificationToast('Style created', 'success');
            document.getElementById('admin-imagegen-styleid').value = '';
            document.getElementById('admin-imagegen-name').value = '';
            document.getElementById('admin-imagegen-prompt').value = '';
            document.getElementById('admin-imagegen-thumbnail').value = '';
            document.getElementById('admin-imagegen-order').value = '';
            loadAdminImagegenStyles();
        } else {
            showNotificationToast(res.error || 'Failed to create style', 'error');
        }
    } catch (err) {
        showNotificationToast(err.error || 'Failed to create style', 'error');
    }
}

async function deleteAdminImagegenStyle(styleId) {
    showAppConfirm('Delete this style?', async (confirmed) => {
        if (!confirmed) return;
        try {
            const res = await secureFetch(`/api/admin/shop/imagegen/style/${styleId}`, { method: 'DELETE' });
            if (res.success) {
                showNotificationToast('Style deleted', 'success');
                loadAdminImagegenStyles();
            } else {
                showNotificationToast(res.error || 'Failed to delete', 'error');
            }
        } catch (err) {
            showNotificationToast('Failed to delete style', 'error');
        }
    });
}

let currentEditingImagegenStyleId = null;

async function openImagegenEditDrawer(styleId) {
    try {
        const res = await secureFetch('/api/admin/shop/imagegen/styles', { method: 'GET' });
        const style = (res.styles || []).find(s => s.styleId === styleId);
        if (!style) return showNotificationToast('Style not found', 'error');

        currentEditingImagegenStyleId = styleId;

        document.getElementById('edit-imagegen-display-id').textContent = styleId;
        document.getElementById('edit-imagegen-name').value = style.name || '';
        document.getElementById('edit-imagegen-prompt').value = style.promptTemplate || '';
        document.getElementById('edit-imagegen-thumbnail').value = style.previewThumbnail || '';
        document.getElementById('edit-imagegen-order').value = style.order || 0;
        document.getElementById('edit-imagegen-active').checked = style.active !== false;

        document.getElementById('admin-imagegen-edit-drawer').classList.add('active');
    } catch (err) {
        console.error('openImagegenEditDrawer error:', err);
        showNotificationToast('Failed to load style', 'error');
    }
}

function closeImagegenEditDrawer() {
    document.getElementById('admin-imagegen-edit-drawer').classList.remove('active');
    currentEditingImagegenStyleId = null;
}

async function saveImagegenEdit() {
    if (!currentEditingImagegenStyleId) return;

    const updates = {
        name: document.getElementById('edit-imagegen-name').value,
        promptTemplate: document.getElementById('edit-imagegen-prompt').value,
        previewThumbnail: document.getElementById('edit-imagegen-thumbnail').value,
        order: parseInt(document.getElementById('edit-imagegen-order').value) || 0,
        active: document.getElementById('edit-imagegen-active').checked
    };

    const btn = document.getElementById('btn-save-imagegen-edit');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const res = await secureFetch(`/api/admin/shop/imagegen/style/${currentEditingImagegenStyleId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });

        if (res.success) {
            tg.HapticFeedback.notificationOccurred('success');
            showNotificationToast('Style updated', 'success');
            closeImagegenEditDrawer();
            loadAdminImagegenStyles();
        } else {
            showNotificationToast(res.error || 'Failed to update', 'error');
        }
    } catch (err) {
        console.error('saveImagegenEdit error:', err);
        showNotificationToast('Failed to save changes', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Save Changes';
    }
}

// ===== pricing/cap config =====
async function loadAdminImagegenConfig() {
    try {
        const res = await secureFetch('/api/admin/shop/imagegen/config', { method: 'GET' });
        if (res.success) {
            document.getElementById('admin-imagegen-cost').value = res.config.cost;
            document.getElementById('admin-imagegen-cap').value = res.config.dailyCap;
        }
    } catch (err) {
        console.error('Load imagegen config error:', err);
    }
}

async function saveAdminImagegenConfig() {
    try {
        const cost = parseInt(document.getElementById('admin-imagegen-cost').value);
        const dailyCap = parseInt(document.getElementById('admin-imagegen-cap').value);

        const res = await secureFetch('/api/admin/shop/imagegen/config', {
            method: 'PUT',
            body: JSON.stringify({ cost, dailyCap })
        });

        if (res.success) {
            showNotificationToast('Config saved', 'success');
        } else {
            showNotificationToast(res.error || 'Failed to save config', 'error');
        }
    } catch (err) {
        showNotificationToast('Failed to save config', 'error');
    }
}

/*<!-- =====================================================
JAVASCRIPT - SECURE VIDEO PLAYER WITH CUSTOM CONTROLS
===================================================== -->*/


let videoPlayerState = {
    courseId: null,
    lessons: [],
    currentLessonIdx: 0,
    currentLessonId: null,
    isPlaying: false,
    currentSpeed: 1
};
