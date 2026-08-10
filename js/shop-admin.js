// =====================================================
// ADMIN SHOP FUNCTIONS
// =====================================================

// Switch admin shop tab
function switchShopAdminTab(tab) {
    document.querySelectorAll('[id^="admin-shop-tab-"]').forEach(el => {
        el.classList.remove('bg-purple-600', 'text-white');
        el.classList.add('text-slate-400');
    });
    // Only hide content panels, not the tab bar buttons
    ['courses', 'apk', 'stats'].forEach(t => {
        document.getElementById(`admin-shop-${t}`).classList.add('hidden');
    });

    document.getElementById(`admin-shop-tab-${tab}`).classList.add('bg-purple-600', 'text-white');
    document.getElementById(`admin-shop-${tab}`).classList.remove('hidden');

    if (tab === 'courses') loadAdminCourses();
    if (tab === 'apk') loadAdminAPKs();
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
