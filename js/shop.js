// Switch between shop sections
// Switch between shop sections (now includes 'menu' as the hub view)
function switchShopSection(section) {
    shopState.currentSection = section;
    document.querySelectorAll('.shop-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(`shop-section-${section}`).classList.remove('hidden');

    if (section === 'courses') loadShopCourses();
    if (section === 'apk') loadShopAPKs();
    if (section === 'my-purchases') loadMyPurchases();
}
// Load courses from backend
async function loadShopCourses() {
    try {
        const res = await secureFetch('/api/shop/products?type=course', { method: 'GET' });
        shopState.courses = res.products || [];
        renderCourses();
        loadMyPurchases();
    } catch (err) {
        console.error('Load courses error:', err);
    }
}
// Load APKs from backend
async function loadShopAPKs() {
    try {
        const res = await secureFetch('/api/shop/products?type=apk', { method: 'GET' });
        shopState.apks = res.products || [];
        renderAPKs();
        loadMyPurchases();
    } catch (err) {
        console.error('Load APKs error:', err);
    }
}
// Load user's purchases
async function loadMyPurchases() {
    try {
        const res = await secureFetch('/api/secure/my-shop-purchases', { method: 'GET' });
        shopState.myPurchases = res.purchases || [];
        renderMyPurchases();
    } catch (err) {
        console.error('Load purchases error:', err);
    }
}
// Filter courses by category
function filterCourses(category) {
    shopState.currentFilter = category;
    document.querySelectorAll('.course-filter-btn').forEach(el => el.classList.remove('active', 'bg-blue-600/30'));
    event.target.classList.add('active', 'bg-blue-600/30');
    renderCourses();
}
// Render courses grid
function renderCourses() {
    const grid = document.getElementById('shop-courses-grid');
    let filtered = shopState.courses;

    if (shopState.currentFilter !== 'all') {
        filtered = shopState.courses.filter(c =>
            c.category?.toLowerCase().includes(shopState.currentFilter.toLowerCase())
        );
    }

    if (filtered.length === 0) {
        grid.innerHTML = '<p class="text-center text-slate-500 text-xs py-10 col-span-2">No courses available</p>';
        return;
    }

    grid.innerHTML = filtered.map(course => {

        const thumbnail = course.thumbnail
            ? `assets/thumbnails/${course.thumbnail}`
            : "assets/thumbnails/default.png";

        return `
        <div onclick="openCourseDetail('${course._id}')" class="glass p-3 rounded-2xl border border-purple-500/20 cursor-pointer hover:bg-white/10 active:scale-95 transition-all">

            <div class="w-full h-24 rounded-xl overflow-hidden mb-2">
                <img
                    src="${thumbnail}"
                    alt="${course.title}"
                    class="w-full h-full object-cover"
                    onerror="this.src='assets/thumbnails/default.png'">
            </div>

            <h4 class="text-xs font-black text-white mb-1 line-clamp-2">
                ${course.title}
            </h4>

            <p class="text-[9px] text-slate-500 mb-2">
                ${course.category || 'Course'}
            </p>

            <div class="flex justify-between items-end">
                <span class="text-[10px] font-black text-yellow-400">
                    ${course.price} DASH
                </span>

                <span class="text-[8px] text-slate-400">
                    ⭐ ${course.rating || 4.5}
                </span>
            </div>

        </div>
        `;
    }).join('');
}
                                               
// Render APKs
function renderAPKs() {
    const grid = document.getElementById('shop-apk-grid');
    
    if (shopState.apks.length === 0) {
        grid.innerHTML = '<p class="text-center text-slate-500 text-xs py-10 col-span-2">No APKs available</p>';
        return;
    }

    grid.innerHTML = shopState.apks.map(apk => `
        <div onclick="openAPKDetail('${apk._id}')" class="glass p-3 rounded-2xl border border-blue-500/20 cursor-pointer hover:bg-white/10 active:scale-95 transition-all">
            <div class="w-full h-24 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl mb-2 flex items-center justify-center">
                <span class="text-3xl">📱</span>
            </div>
            <h4 class="text-xs font-black text-white mb-1 line-clamp-2">${apk.title}</h4>
            <p class="text-[9px] text-slate-500 mb-2">Application</p>
            <div class="flex justify-between items-end">
                <span class="text-[10px] font-black text-yellow-400">${apk.price} DASH</span>
                <span class="text-[8px] text-slate-400">v1.0</span>
            </div>
        </div>
    `).join('');
}
async function openAPKDetail(productId) {
    try {
        const res = await secureFetch(`/api/shop/product/${productId}`, { method: 'GET' });
        const { product } = res;

        shopState.selectedProduct = product;

        const modal = document.getElementById('shop-course-detail-modal');
        document.getElementById('course-detail-title').textContent = product.title;
        document.getElementById('course-detail-price').textContent = `${product.price} DASH`;

        const purchased = shopState.myPurchases.some(p => p.productId._id === productId);

        let contentHTML = `
            <div class="glass p-3 rounded-xl border border-white/5">
                <p class="text-[9px] text-slate-500 uppercase font-black mb-3">${product.description}</p>
            </div>
        `;

        contentHTML += purchased
            ? `<button onclick="downloadAPK('${productId}')" class="w-full py-3 bg-blue-600 text-white rounded-xl font-black uppercase active:scale-95 transition-all">📥 Download APK</button>`
            : `<button onclick="purchaseProduct('${productId}')" class="w-full py-3 bg-purple-600 text-white rounded-xl font-black uppercase active:scale-95 transition-all">💰 Buy Now (${product.price} DASH)</button>`;

        document.getElementById('course-detail-content').innerHTML = contentHTML;
        modal.classList.add('active');
    } catch (err) {
        console.error('Open APK detail error:', err);
        showNotificationToast('Failed to load APK details', 'error');
    }
}
// Render my purchases
function renderMyPurchases() {
    const list = document.getElementById('shop-my-purchases-list');

    if (shopState.myPurchases.length === 0) {
        list.innerHTML = '<p class="text-center text-slate-500 text-xs py-10">You haven\'t purchased anything yet!</p>';
        return;
    }

    list.innerHTML = shopState.myPurchases.map(purchase => {
        const thumbnail = purchase.productId.thumbnail
            ? `assets/thumbnails/${purchase.productId.thumbnail}`
            : "assets/thumbnails/default.png";

        return `
        <div class="glass p-4 rounded-2xl border border-green-500/20">

            <div class="flex gap-3 items-start mb-3">
                <img
                    src="${thumbnail}"
                    alt="${purchase.productId.title}"
                    class="w-16 h-16 rounded-xl object-cover"
                    onerror="this.src='assets/thumbnails/default.png'">

                <div class="flex-1">
                    <div class="flex justify-between items-start">
                        <h4 class="text-xs font-black text-white">${purchase.productId.title}</h4>
                        <span class="text-[8px] px-2 py-1 bg-green-500/20 text-green-400 rounded font-black">Owned</span>
                    </div>

                    <p class="text-[9px] text-slate-500 mt-1">
                        ${purchase.productId.category || 'Product'}
                    </p>
                </div>
            </div>

            ${purchase.productId.type === 'course' ? `
                <button onclick="openCoursePlayer('${purchase.productId._id}')" class="w-full py-2 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all">
                    📚 Open Course
                </button>
            ` : `
                <button onclick="downloadAPK('${purchase.productId._id}')" class="w-full py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all">
                    📥 Download
                </button>
            `}
        </div>
        `;
    }).join('');
}
// Open course detail
async function openCourseDetail(productId) {
    try {
        const res = await secureFetch(`/api/shop/product/${productId}`, { method: 'GET' });
        const { product, lessons } = res;

        shopState.selectedProduct = product;

        const thumbnail = product.thumbnail
            ? `assets/thumbnails/${product.thumbnail}`
            : "assets/thumbnails/default.png";

        const modal = document.getElementById('shop-course-detail-modal');
        document.getElementById('course-detail-title').textContent = product.title;
        document.getElementById('course-detail-price').textContent = `${product.price} DASH`;

        let lessonsHTML = `
            <div class="glass p-3 rounded-xl border border-white/5">

                <div class="w-full h-44 rounded-xl overflow-hidden mb-3">
                    <img
                        src="${thumbnail}"
                        alt="${product.title}"
                        class="w-full h-full object-cover"
                        onerror="this.src='assets/thumbnails/default.png'">
                </div>

                <p class="text-[9px] text-slate-500 uppercase font-black mb-3">
                    ${product.description}
                </p>

            </div>

            <div>
                <h4 class="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                    Lessons (${lessons.length})
                </h4>

                <div class="space-y-2">
        `;

        lessons.forEach((lesson, idx) => {
            lessonsHTML += `
                <div class="glass p-3 rounded-xl border border-white/5">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <p class="text-[9px] text-slate-500 font-black">${lesson.moduleName}</p>
                            <p class="text-xs font-black text-white mt-1">${lesson.lessonName}</p>
                        </div>
                        <span class="text-[8px] text-slate-400">${lesson.duration || '--:--'}</span>
                    </div>
                </div>
            `;
        });

        lessonsHTML += `
                </div>
            </div>
        `;

        // Check if already purchased
        const purchased = shopState.myPurchases.some(p => p.productId._id === productId);

        if (purchased) {
            lessonsHTML += `
                <button onclick="openCoursePlayer('${productId}')" class="w-full py-3 bg-green-600 text-white rounded-xl font-black uppercase active:scale-95 transition-all">
                    ▶ Play Course
                </button>
            `;
        } else {
            lessonsHTML += `
                <button onclick="purchaseProduct('${productId}')" class="w-full py-3 bg-purple-600 text-white rounded-xl font-black uppercase active:scale-95 transition-all">
                    💰 Buy Now (${product.price} DASH)
                </button>
            `;
        }

        document.getElementById('course-detail-content').innerHTML = lessonsHTML;
        modal.classList.add('active');

    } catch (err) {
        console.error('Open course error:', err);
        showNotificationToast('Failed to load course details', 'error');
    }
}
// Purchase product
let purchaseInProgress = false;
async function purchaseProduct(productId) {
    if (purchaseInProgress) return;
    purchaseInProgress = true;

    try {
        const res = await secureFetch('/api/secure/purchase-course', {
            method: 'POST',
            body: JSON.stringify({ productId })
        });
        if (res.success) {
            showNotificationToast(res.message, 'success');
            closeCourseDetail();
            loadMyPurchases();
            if (cachedUserProfile) cachedUserProfile.balance = res.newBalance;
            }
    } catch (err) {
        console.error('Purchase error:', err);
        showNotificationToast(err.error || 'Purchase failed', 'error');
    } finally {
        purchaseInProgress = false;
    }
}
// Close modals
function closeShopDetail() {
    document.getElementById('shop-detail-modal').classList.remove('active');
}
function closeCourseDetail() {
    document.getElementById('shop-course-detail-modal').classList.remove('active');
}
async function downloadAPK(productId) {
    try {
        showNotificationToast('Preparing download...', 'info');
        const response = await fetch(`${RENDER_URL}/api/download-apk?productId=${productId}`, {
            headers: { 'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '' }
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Download failed');
        }
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = 'app.apk';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
    } catch (err) {
        console.error('Download APK error:', err);
        showNotificationToast(err.message || 'Failed to download APK', 'error');
    }
}
