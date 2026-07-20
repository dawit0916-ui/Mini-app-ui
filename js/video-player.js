/* ============================================================
   VIDEO PLAYER MODULE
   ============================================================ */

const videoPlayerState = {
    currentSpeed: 1,
    isPlaying: false,
    currentLessonIdx: 0,
    lessons: [],
    currentVideoId: null
};

/**
 * Initialize video player
 */
function initVideoPlayer() {
    const video = document.getElementById('secure-video');
    if (!video) return;

    // Prevent right-click
    video.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });

    // Prevent drag and drop
    video.addEventListener('dragstart', (e) => {
        e.preventDefault();
        return false;
    });

    // Initialize controls
    initializeVideoControls();
    startVideoWatermark();
}

/**
 * Load video from URL
 */
async function playLesson(lessonIdx, lessonId) {
    try {
        const video = document.getElementById('secure-video');
        const overlay = document.getElementById('video-loading-overlay');
        
        if (!video) return;

        // Show loading
        overlay.classList.remove('hidden');
        videoPlayerState.isPlaying = false;

        // Fetch video URL from API
        const response = await secureFetch(`/api/lessons/${lessonId}/video`);
        
        if (response && response.url) {
            video.src = response.url;
            videoPlayerState.currentLessonIdx = lessonIdx;
            videoPlayerState.currentVideoId = lessonId;

            // Auto-play
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        videoPlayerState.isPlaying = true;
                        document.getElementById('play-pause-btn').textContent = '⏸';
                    })
                    .catch(err => {
                        if (err.name !== 'NotAllowedError') {
                            console.error('Play error:', err);
                        }
                    });
            }

            updateNavButtons();
            overlay.classList.add('hidden');
        } else {
            throw new Error('No video URL in response');
        }
    } catch (error) {
        console.error('Failed to load lesson:', error);
        document.getElementById('video-loading-overlay').classList.add('hidden');
        notifications.error('Failed to play video', 4000);
    }
}

/**
 * Setup watermark system
 */
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
    watermarkInterval = setInterval(applyPosition, 8000);
}

function stopVideoWatermark() {
    clearInterval(watermarkInterval);
    watermarkInterval = null;
}

/**
 * Initialize custom video controls
 */
function initializeVideoControls() {
    const video = document.getElementById('secure-video');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const progressSlider = document.getElementById('video-progress');
    const volumeBtn = document.getElementById('volume-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const speedBtn = document.getElementById('playback-speed-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');

    if (!video) return;

    // Play/Pause Control
    playPauseBtn?.addEventListener('click', () => {
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
    progressSlider?.addEventListener('input', (e) => {
        if (!isFinite(video.duration) || video.duration <= 0) return;
        video.currentTime = parseFloat(e.target.value);
    });

    video.addEventListener('timeupdate', () => {
        if (progressSlider) {
            progressSlider.value = video.currentTime;
        }
        const currentTimeEl = document.getElementById('current-time');
        if (currentTimeEl) {
            currentTimeEl.textContent = formatTime(video.currentTime);
        }
    });

    video.addEventListener('loadedmetadata', () => {
        if (progressSlider) {
            progressSlider.max = video.duration;
        }
        const durationEl = document.getElementById('duration-time');
        if (durationEl) {
            durationEl.textContent = formatTime(video.duration);
        }
    });

    video.addEventListener('ended', () => {
        playPauseBtn.textContent = '▶';
        videoPlayerState.isPlaying = false;
        if (progressSlider) {
            progressSlider.value = progressSlider.max;
        }
    });

    // Volume Control
    volumeBtn?.addEventListener('click', () => {
        if (video.muted) {
            video.muted = false;
            if (volumeSlider) volumeSlider.value = video.volume * 100;
            volumeBtn.textContent = '🔊';
        } else {
            video.muted = true;
            if (volumeSlider) volumeSlider.value = 0;
            volumeBtn.textContent = '🔇';
        }
    });

    volumeSlider?.addEventListener('input', (e) => {
        const vol = parseFloat(e.target.value) / 100;
        video.volume = vol;
        video.muted = vol === 0;
        volumeBtn.textContent = vol === 0 ? '🔇' : '🔊';
    });

    // Playback Speed Control
    speedBtn?.addEventListener('click', () => {
        const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
        const currentIdx = speeds.indexOf(videoPlayerState.currentSpeed);
        const nextIdx = (currentIdx + 1) % speeds.length;
        videoPlayerState.currentSpeed = speeds[nextIdx];
        video.playbackRate = videoPlayerState.currentSpeed;
        speedBtn.textContent = videoPlayerState.currentSpeed + 'x';
    });

    // Fullscreen Control (CSS rotation only)
    fullscreenBtn?.addEventListener('click', () => {
        if (document.body.classList.contains('fs-mode')) {
            exitFakeFullscreen();
        } else {
            enterFakeFullscreen();
        }
    });

    // Prevent touch interactions
    const touchBarrier = document.querySelector('.touch-barrier');
    touchBarrier?.addEventListener('touchstart', (e) => {
        e.preventDefault();
        return false;
    });
}

/**
 * Fullscreen mode handlers
 */
function enterFakeFullscreen() {
    document.body.classList.add('fs-mode');
    document.body.style.overflow = 'hidden';
}

function exitFakeFullscreen() {
    document.body.classList.remove('fs-mode');
    document.body.style.overflow = '';
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) fullscreenBtn.textContent = '⛶';
}

/**
 * Lesson navigation
 */
function updateNavButtons() {
    const prevBtn = document.getElementById('prev-lesson-btn');
    const nextBtn = document.getElementById('next-lesson-btn');
    
    if (prevBtn) prevBtn.disabled = videoPlayerState.currentLessonIdx === 0;
    if (nextBtn) nextBtn.disabled = videoPlayerState.currentLessonIdx === videoPlayerState.lessons.length - 1;
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
    if (video) {
        video.pause();
        video.src = '';
    }
    stopVideoWatermark();
    
    const modal = document.getElementById('video-player-modal');
    if (modal) modal.classList.remove('active');
}

/**
 * Time formatting utility
 */
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Prevent keyboard shortcuts for download
 */
document.addEventListener('keydown', (e) => {
    const video = document.getElementById('secure-video');
    if (document.activeElement === video) {
        // Disable Ctrl+S (Save)
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            return false;
        }
        // Disable Ctrl+C (Copy)
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault();
            return false;
        }
    }
});

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        videoPlayerState,
        initVideoPlayer,
        playLesson,
        closeVideoPlayer,
        nextLesson,
        prevLesson
    };
}
