
// ─────────────────────────────────────────────────────
// CORE PLAYER FUNCTIONS
// ─────────────────────────────────────────────────────

async function openCoursePlayer(courseId) {
    try {
        const res = await secureFetch(`/api/shop/product/${courseId}`, { method: 'GET' });
        const { product, lessons } = res;

        videoPlayerState.courseId = courseId;
        videoPlayerState.lessons = lessons;
        videoPlayerState.currentLessonIdx = 0;

        // Update modal
        document.getElementById('video-player-title').textContent = product.title;
        document.getElementById('fs-course-title').textContent = product.title;
        document.getElementById('video-course-desc').textContent = product.description;

        // Render lessons navigation
        renderLessonsNavigation();

        // Open modal and play first lesson
        document.getElementById('video-player-modal').classList.add('active');
        playLesson(0, lessons[0]._id);

    } catch (err) {
        console.error('Open player error:', err);
        showNotificationToast('Failed to load course', 'error');
    }
}

function renderLessonsNavigation() {
    const lessons = videoPlayerState.lessons;
    let lessonsHTML = lessons.map((lesson, idx) => `
        <div 
            onclick="playLesson(${idx}, '${lesson._id}')" 
            class="lesson-nav-item glass p-2.5 rounded-lg border transition-all cursor-pointer ${idx === 0 ? 'border-purple-500/40 bg-purple-500/10' : 'border-white/5 hover:border-white/10'}">
            <div class="flex items-start gap-2">
                <span class="text-[10px] font-black text-purple-400 flex-shrink-0">L${idx + 1}</span>
                <div class="flex-1 min-w-0">
                    <p class="text-[8px] text-slate-500 uppercase font-black truncate">${lesson.moduleName}</p>
                    <p class="text-[9px] font-black text-white mt-0.5 line-clamp-2">${lesson.lessonName}</p>
                </div>
            </div>
        </div>
    `).join('');

    document.getElementById('video-lessons-list').innerHTML = lessonsHTML;
}

async function playLesson(idx, lessonId) {
    try {
        // Update navigation highlight
        document.querySelectorAll('.lesson-nav-item').forEach((el, i) => {
            if (i === idx) {
                el.classList.add('border-purple-500/40', 'bg-purple-500/10');
                el.classList.remove('border-white/5');
            } else {
                el.classList.remove('border-purple-500/40', 'bg-purple-500/10');
                el.classList.add('border-white/5');
            }
        });

        videoPlayerState.currentLessonIdx = idx;
        videoPlayerState.currentLessonId = lessonId;

        // Update title
        const lesson = videoPlayerState.lessons[idx];
        document.getElementById('video-player-title').textContent = lesson.lessonName;
        document.getElementById('fs-lesson-name').textContent = lesson.lessonName;
        document.getElementById('video-player-duration').textContent = lesson.duration || '--:--';
        document.getElementById('duration-time').textContent = lesson.duration || '--:--';
        document.getElementById('current-time').textContent = '0:00';

        // Show loading
        document.getElementById('video-loading-overlay').classList.remove('hidden');
        
        const video = document.getElementById('secure-video');
        // Reset video before loading new lesson
       video.onerror = null;
       video.onloadedmetadata = null;
       video.src = '';
       video.pause();

        // Build stream URL
        const initData = window.Telegram?.WebApp?.initData || '';
        const streamUrl = `${RENDER_URL}/api/stream-video?courseId=${videoPlayerState.courseId}&lessonId=${lessonId}&initData=${encodeURIComponent(initData)}`;

        // Set video source
        video.src = streamUrl;
        startVideoWatermark();
        // Update nav buttons
        updateNavButtons();

        // Handle loading
        video.onloadedmetadata = () => {
            document.getElementById('video-loading-overlay').classList.add('hidden');
            document.getElementById('video-progress').max = Math.floor(video.duration) || 100;
        };

        video.onerror = (err) => {
            console.error('Video load error:', err);
            document.getElementById('video-loading-overlay').classList.add('hidden');
            showNotificationToast('Failed to load video', 'error');
        };

    } catch (err) {
        console.error('Play lesson error:', err);
        document.getElementById('video-loading-overlay').classList.add('hidden');
        showNotificationToast('Failed to play video', 'error');
    }
}
let watermarkInterval = null;

function startVideoWatermark() {
    const wm = document.getElementById('video-watermark');
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;

    if (!wm || !user) return;

    const label = user.username ? `@${user.username} · ${user.id}` : `ID ${user.id}`;
    wm.textContent = label;

    const positions = [
        { top: '8%', left: '6%' },
        { top: '8%', left: '55%' },
        { top: '85%', left: '6%' },
        { top: '85%', left: '55%' },
        { top: '46%', left: '30%' }
    ];

    let i = 0;
    const applyPosition = () => {
        wm.style.top = positions[i].top;
        wm.style.left = positions[i].left;
        i = (i + 1) % positions.length;
    };

    applyPosition();
    clearInterval(watermarkInterval);
    watermarkInterval = setInterval(applyPosition, 8000); // drift every 8s
}

function stopVideoWatermark() {
    clearInterval(watermarkInterval);
    watermarkInterval = null;
}
// ─────────────────────────────────────────────────────
// CUSTOM CONTROL HANDLERS
// ─────────────────────────────────────────────────────

function initializeVideoControls() {
    const video = document.getElementById('secure-video');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const progressSlider = document.getElementById('video-progress');
    const volumeBtn = document.getElementById('volume-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const speedBtn = document.getElementById('playback-speed-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');

    // Play/Pause Control
    playPauseBtn.addEventListener('click', () => {
    if (video.paused || video.ended) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch(err => {
                if (err.name !== 'AbortError') console.error('Play error:', err);
            });
        }
        playPauseBtn.textContent = '⏸';
        videoPlayerState.isPlaying = true;
    } else {
        video.pause();
        playPauseBtn.textContent = '▶';
        videoPlayerState.isPlaying = false;
    }
});
    // Progress Bar Control
    progressSlider.addEventListener('input', (e) => {
    if (!isFinite(video.duration) || video.duration <= 0) return;
    video.currentTime = parseFloat(e.target.value); // already seconds, since max = duration
});

video.addEventListener('timeupdate', () => {
    progressSlider.value = video.currentTime; // seconds now, matches max
    document.getElementById('current-time').textContent = formatTime(video.currentTime);
});

video.addEventListener('ended', () => {
    playPauseBtn.textContent = '▶';
    videoPlayerState.isPlaying = false;
    progressSlider.value = progressSlider.max; // snap thumb fully to the end
});

    // Volume Control
    volumeBtn.addEventListener('click', () => {
        if (video.muted) {
            video.muted = false;
            volumeSlider.value = video.volume * 100;
            volumeBtn.textContent = '🔊';
        } else {
            video.muted = true;
            volumeSlider.value = 0;
            volumeBtn.textContent = '🔇';
        }
    });

    volumeSlider.addEventListener('input', (e) => {
        const vol = parseFloat(e.target.value) / 100;
        video.volume = vol;
        video.muted = vol === 0;
        volumeBtn.textContent = vol === 0 ? '🔇' : '🔊';
    });

    // Playback Speed Control
    speedBtn.addEventListener('click', () => {
        const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
        const currentIdx = speeds.indexOf(videoPlayerState.currentSpeed);
        const nextIdx = (currentIdx + 1) % speeds.length;
        videoPlayerState.currentSpeed = speeds[nextIdx];
        video.playbackRate = videoPlayerState.currentSpeed;
        speedBtn.textContent = videoPlayerState.currentSpeed + 'x';
    });

// Fullscreen Control (CSS-rotate only — real Fullscreen API is unsupported in Telegram's WebView)
    fullscreenBtn.addEventListener('click', () => {
        if (document.body.classList.contains('fs-mode')) {
            exitFakeFullscreen();
        } else {
            enterFakeFullscreen();
        }
    });

function enterFakeFullscreen() {
    document.body.classList.add('fs-mode');
    document.body.style.overflow = 'hidden';
}

function exitFakeFullscreen() {
    document.body.classList.remove('fs-mode');
    document.body.style.overflow = '';
    document.getElementById('fullscreen-btn').textContent = '⛶';
}
    // Prevent context menu on video
    video.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });

    // Prevent touch barrier interaction
    const touchBarrier = document.querySelector('.touch-barrier');
    touchBarrier.addEventListener('touchstart', (e) => {
        e.preventDefault();
        return false;
    });
    touchBarrier.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });
}

// ─────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

function updateNavButtons() {
    const prevBtn = document.getElementById('prev-lesson-btn');
    const nextBtn = document.getElementById('next-lesson-btn');
    
    prevBtn.disabled = videoPlayerState.currentLessonIdx === 0;
    nextBtn.disabled = videoPlayerState.currentLessonIdx === videoPlayerState.lessons.length - 1;
}

function nextLesson() {
    if (videoPlayerState.currentLessonIdx < videoPlayerState.lessons.length - 1) {
        const nextIdx = videoPlayerState.currentLessonIdx + 1;
        const nextLessonId = videoPlayerState.lessons[nextIdx]._id;
        playLesson(nextIdx, nextLessonId);
    }
}

function prevLesson() {
    if (videoPlayerState.currentLessonIdx > 0) {
        const prevIdx = videoPlayerState.currentLessonIdx - 1;
        const prevLessonId = videoPlayerState.lessons[prevIdx]._id;
        playLesson(prevIdx, prevLessonId);
    }
}

function closeVideoPlayer() {
    const video = document.getElementById('secure-video');
    video.onerror = null;
    video.onloadedmetadata = null;
    video.pause();
    video.src = '';
    stopVideoWatermark();
    document.getElementById('video-player-modal').classList.remove('active');
}

// Initialize controls — this file only executes after the loader has
// already injected every component (including this modal's markup), so
// the DOM is ready by definition. Waiting on DOMContentLoaded here would
// never fire (it already fired before this script was loaded), which is
// why the play/pause/volume/speed/fullscreen buttons were dead.
initializeVideoControls();

// Prevent keyboard shortcuts for download
document.addEventListener('keydown', (e) => {
    const video = document.getElementById('secure-video');
    if (document.activeElement === video || document.querySelector('.touch-barrier:hover')) {
        // Disable Ctrl+S (Save)
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            return false;
        }
        // Disable Ctrl+C (Copy) on video
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault();
            return false;
        }
    }
});