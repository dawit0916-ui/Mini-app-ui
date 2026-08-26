// =====================================================
// AI IMAGE GENERATOR (Shop tab)
// =====================================================

let imagegenState = {
    styles: [],
    selectedStyle: null,
    selectedFile: null,
    cost: 0,
    dailyCap: 0,
    usesToday: 0
};

// ===== drag-enabled 3D carousel state =====
let igRotation = 0;
let igStartRotation = 0;
let igStartX = 0;
let igIsPointerDown = false;
let igDragMoved = 0;
const igDragThreshold = 6;
let igJustDragged = false;
let igAutoRotating = true;
let igAutoRotateTimeout = null;
const igAutoRotateSpeed = 0.05;
let igAnglePerCard = 36;

const igCarouselEl = document.getElementById('imagegenStyleCarousel');

function igApplyRotation(){
    igCarouselEl.style.transform = `perspective(800px) rotateY(${igRotation}deg)`;
}

function igOnPointerDown(e){
    igIsPointerDown = true;
    igAutoRotating = false;
    if (igAutoRotateTimeout) clearTimeout(igAutoRotateTimeout);
    igStartX = e.clientX;
    igStartRotation = igRotation;
    igDragMoved = 0;
    igCarouselEl.style.transition = 'none';
}

function igOnPointerMove(e){
    if (!igIsPointerDown) return;
    const delta = e.clientX - igStartX;
    igDragMoved += Math.abs(e.movementX || 0);
    igRotation = igStartRotation + delta * 0.4;
    igApplyRotation();
}

function igOnPointerUp(){
    if (!igIsPointerDown) return;
    igIsPointerDown = false;
    igCarouselEl.style.transition = 'transform 200ms';

    if (igDragMoved > igDragThreshold){
        igJustDragged = true;
        setTimeout(() => { igJustDragged = false; }, 50);
    }
    if (!imagegenState.selectedStyle){
        igAutoRotateTimeout = setTimeout(() => { igAutoRotating = true; }, 2500);
    }
}

igCarouselEl.addEventListener('pointerdown', igOnPointerDown);
window.addEventListener('pointermove', igOnPointerMove);
window.addEventListener('pointerup', igOnPointerUp);
window.addEventListener('pointercancel', igOnPointerUp);

function igAutoRotateLoop(){
    if (igAutoRotating && !igIsPointerDown){
        igRotation -= igAutoRotateSpeed;
        igApplyRotation();
    }
    requestAnimationFrame(igAutoRotateLoop);
}
igAutoRotateLoop();

// ===== Modal open/close =====
function openImageGenModal(){
    document.getElementById('imagegenOverlay').classList.add('active');
    igShowStep('select');
    loadImageStyles();
}
function closeImageGenModal(){
    document.getElementById('imagegenOverlay').classList.remove('active');
}

function igShowStep(step){
    document.getElementById('imagegenStepSelect').classList.toggle('hidden', step !== 'select');
    document.getElementById('imagegenStepLoading').classList.toggle('active', step === 'loading');
    document.getElementById('imagegenStepResult').classList.toggle('active', step === 'result');
}

// ===== Load styles + cost + daily cap from backend =====
async function loadImageStyles(){
    try {
        const res = await secureFetch('/api/secure/shop/imagegen/config', { method: 'GET' });
        imagegenState.styles = res.styles || [];
        imagegenState.cost = res.cost || 0;
        imagegenState.dailyCap = res.dailyCap || 0;
        imagegenState.usesToday = res.usesToday || 0;
        renderImagegenStyleCards();
        igUpdateMetaDisplay();
    } catch (err) {
        console.error('Load image styles error:', err);
        showNotificationToast('Failed to load styles', 'error');
    }
}

function igUpdateMetaDisplay(){
    const remaining = Math.max(0, imagegenState.dailyCap - imagegenState.usesToday);
    document.getElementById('imagegenUsesLeft').textContent = `${remaining}/${imagegenState.dailyCap}`;
    document.getElementById('imagegenCostValue').textContent = `${imagegenState.cost} DASH`;
}

function renderImagegenStyleCards(){
    const count = imagegenState.styles.length;
    if (count === 0){
        igCarouselEl.innerHTML = '<p style="color:var(--ig-text-dim);font-size:12px;">No styles available</p>';
        return;
    }
    igAnglePerCard = 360 / count;

    igCarouselEl.innerHTML = imagegenState.styles.map((style, i) => {
        const angle = i * igAnglePerCard;
        return `
        <div class="imagegen-style-card" data-style-id="${style.styleId}" data-name="${style.name}"
             style="transform: translate(-50%, -50%) rotateY(${angle}deg) translateZ(150px);"
             onclick="selectImagegenStyle(this)">
            <img src="${style.previewImageUrl}" alt="${style.name}">
            <div class="imagegen-name-tag">${style.name}</div>
        </div>`;
    }).join('');
}

// ===== Style selection =====
function selectImagegenStyle(el){
    if (igJustDragged) return;

    igAutoRotating = false;
    if (igAutoRotateTimeout) clearTimeout(igAutoRotateTimeout);

    document.querySelectorAll('#imagegenStyleCarousel .imagegen-style-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');

    imagegenState.selectedStyle = el.dataset.styleId;
    const displayName = el.dataset.name;
    const imgSrc = el.querySelector('img').src;

    const index = Array.from(el.parentNode.children).indexOf(el);
    let targetAngle = -(index * igAnglePerCard);
    const current = igRotation % 360;
    let diff = ((targetAngle - current + 540) % 360) - 180;
    igCarouselEl.style.transition = 'transform 450ms cubic-bezier(0.25, 1, 0.5, 1)';
    igRotation = igRotation + diff;
    igApplyRotation();

    document.getElementById('imagegenSelectedStyleImg').src = imgSrc;
    document.getElementById('imagegenSelectedStyleName').textContent = displayName;
    document.getElementById('imagegenSelectedStyleRow').classList.add('active');

    checkImagegenReadyState();

    setTimeout(() => {
        document.getElementById('imagegenUploadBox').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 400);
}

// ===== File upload =====
function handleImagegenFileSelect(e){
    const file = e.target.files[0];
    if (!file) return;
    imagegenState.selectedFile = file;

    const reader = new FileReader();
    reader.onload = function(ev){
        document.getElementById('imagegenPreviewImg').src = ev.target.result;
        document.getElementById('imagegenPreviewName').textContent = file.name;
        document.getElementById('imagegenPreviewSize').textContent = (file.size/1024).toFixed(0) + ' KB';
        document.getElementById('imagegenPreviewWrap').classList.add('active');
        document.getElementById('imagegenUploadBox').classList.add('hidden');
        checkImagegenReadyState();
    };
    reader.readAsDataURL(file);
}

function resetImagegenUpload(){
    imagegenState.selectedFile = null;
    document.getElementById('imagegenRefFile').value = '';
    document.getElementById('imagegenPreviewWrap').classList.remove('active');
    document.getElementById('imagegenUploadBox').classList.remove('hidden');
    checkImagegenReadyState();
}

function checkImagegenReadyState(){
    const remaining = imagegenState.dailyCap - imagegenState.usesToday;
    document.getElementById('imagegenGenerateBtn').disabled =
        !(imagegenState.selectedStyle && imagegenState.selectedFile && remaining > 0);
}

// ===== Generate (real backend call — bypasses secureFetch for multipart, matches downloadAPK() pattern) =====
async function startImagegenGeneration(){
    igShowStep('loading');
    try {
        const fd = new FormData();
        fd.append('styleId', imagegenState.selectedStyle);
        fd.append('referenceImage', imagegenState.selectedFile);

        const res = await secureFetch('/api/secure/shop/imagegen/generate', {
            method: 'POST',
            body: fd
        });

        if (res.error) {
            throw new Error(res.error);
        }

        document.getElementById('imagegenResultImg').src = res.imageBase64;
        if (cachedUserProfile) cachedUserProfile.balance = res.newBalance;
        imagegenState.usesToday = imagegenState.dailyCap - res.usesRemaining;
        if (typeof updateHeaderBalances === 'function') updateHeaderBalances(res.newBalance);

        igShowStep('result');
    } catch (err) {
        console.error('Image generation error:', err);
        showNotificationToast(err.message || 'Generation failed — DASH refunded', 'error');
        igShowStep('select');
    }
}

function tryAnotherImagegenStyle(){
    resetImagegenUpload();
    document.querySelectorAll('#imagegenStyleCarousel .imagegen-style-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('imagegenSelectedStyleRow').classList.remove('active');
    imagegenState.selectedStyle = null;
    igAutoRotateTimeout && clearTimeout(igAutoRotateTimeout);
    igAutoRotateTimeout = setTimeout(() => { igAutoRotating = true; }, 1000);
    igUpdateMetaDisplay();
    igShowStep('select');
    document.getElementById('imagegenModalCard').scrollTo({ top: 0, behavior: 'smooth' });
}

function downloadImagegenResult(){
    const img = document.getElementById('imagegenResultImg');
    const a = document.createElement('a');
    a.href = img.src; // data URI — works directly, no proxy needed
    a.download = 'dash-earn-ai-image.png';
    a.click();
}
