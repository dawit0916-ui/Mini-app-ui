function showNotificationToast(messageText, notificationType = 'info') {
    const parentContainer = document.getElementById('toast-container');
    if (!parentContainer) return console.error("Toast anchor element missing from DOM mapping framework!");
    const THEMES = {
        success: { icon: '🎉', border: 'rgba(16,185,129,0.35)', bg: 'rgba(6,78,59,0.55)', text: '#6ee7b7', iconBg: 'rgba(16,185,129,0.15)', bar: '#10b981' },
        error:   { icon: '🚨', border: 'rgba(239,68,68,0.35)',  bg: 'rgba(69,10,10,0.55)', text: '#fca5a5', iconBg: 'rgba(239,68,68,0.15)',  bar: '#ef4444' },
        warning: { icon: '⚠️', border: 'rgba(245,158,11,0.35)', bg: 'rgba(69,26,3,0.55)',  text: '#fcd34d', iconBg: 'rgba(245,158,11,0.15)', bar: '#f59e0b' },
        info:    { icon: 'ℹ️', border: 'rgba(59,130,246,0.35)', bg: 'rgba(8,15,40,0.6)',   text: '#93c5fd', iconBg: 'rgba(59,130,246,0.15)', bar: '#3b82f6' }
    };
    const theme = THEMES[notificationType] || THEMES.info;
    const DURATION = 3500;
    const toastNode = document.createElement('div');
    toastNode.className = 'toast';
    toastNode.style.cssText = `
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        margin-bottom: 8px;
        border-radius: 16px;
        border: 1px solid ${theme.border};
        background: ${theme.bg};
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        box-shadow: 0 8px 30px rgba(0,0,0,0.35), 0 0 24px ${theme.border};
        animation: slideInTop 0.35s cubic-bezier(0.16,1,0.3,1) forwards;
    `;
    toastNode.innerHTML = `
        <div style="
            width: 34px; height: 34px; border-radius: 12px;
            background: ${theme.iconBg};
            display: flex; align-items: center; justify-content: center;
            font-size: 16px; flex-shrink: 0;
        ">${theme.icon}</div>
        <p style="
            flex: 1; margin: 0; font-size: 12px; font-weight: 700;
            color: #f1f5f9; line-height: 1.4;
        ">${messageText}</p>
        <div style="
            position: absolute; bottom: 0; left: 0; height: 2.5px;
            background: ${theme.bar};
            width: 100%;
            box-shadow: 0 0 8px ${theme.bar};
            animation: toastDrain ${DURATION}ms linear forwards;
        "></div>
    `;
    parentContainer.appendChild(toastNode);
    setTimeout(() => {
        toastNode.style.transition = 'opacity 0.35s ease, transform 0.35s cubic-bezier(0.4,0,0.2,1)';
        toastNode.style.opacity = '0';
        toastNode.style.transform = 'translateY(-12px) scale(0.96)';
        setTimeout(() => toastNode.remove(), 350);
    }, DURATION);
}
// Numerical interpolation counters for smooth value updating animations
function animateNumericalValueDisplayUpdate(domElementId, terminalTargetValue, fixedPrecisionPointsCount = 2) {
    const UIObjectNode = document.getElementById(domElementId);
    if (!UIObjectNode) return;
    
    const foundationalStartingBaseValue = parseFloat(UIObjectNode.innerText.replace(/,/g, '')) || 0;
    const processingDistanceDelta = terminalTargetValue - foundationalStartingBaseValue;
    const absoluteTotalDurationTimeline = 450; // Milliseconds transition speed configuration limit
    let timestampStartReferenceMarker = null;
    
    function executionStepTickFrame(timestampCurrentFrame) {
        if (!timestampStartReferenceMarker) timestampStartReferenceMarker = timestampCurrentFrame;
        const animationTimeElapsedProgress = timestampCurrentFrame - timestampStartReferenceMarker;
        const completeProgressRatioDelta = Math.min(animationTimeElapsedProgress / absoluteTotalDurationTimeline, 1);
        
        // Easing out curve formula calculation
        const mathematicalEasingProgressModifierValue = 1 - Math.pow(1 - completeProgressRatioDelta, 3);
        const ongoingCalculatedValueIteration = foundationalStartingBaseValue + (processingDistanceDelta * mathematicalEasingProgressModifierValue);
        
        UIObjectNode.innerText = ongoingCalculatedValueIteration.toFixed(fixedPrecisionPointsCount);
        
        if (animationTimeElapsedProgress < absoluteTotalDurationTimeline) {
            requestAnimationFrame(executionStepTickFrame);
        } else {
            UIObjectNode.innerText = terminalTargetValue.toFixed(fixedPrecisionPointsCount);
        }
    }
    requestAnimationFrame(executionStepTickFrame);
}

function showAppAlert(message, type = 'info', title = '') {
    const theme = POPUP_THEMES[type] || POPUP_THEMES.info;
    const defaultTitles = { info: 'Notice', success: 'Success', error: 'Error', warning: 'Warning' };

    document.getElementById('app-popup-icon-wrap').innerText = theme.icon;
    document.getElementById('app-popup-icon-wrap').style.cssText = `width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:24px;background:${theme.bg};border:1px solid ${theme.border};`;
    document.getElementById('app-popup-title').innerText = title || defaultTitles[type];
    document.getElementById('app-popup-message').innerText = message;
    document.getElementById('app-popup-card').style.borderColor = theme.border;
    document.getElementById('app-popup-card').style.boxShadow = `0 0 40px ${theme.glow}`;

    const confirmBtn = document.getElementById('app-popup-confirm-btn');
    confirmBtn.innerText = 'Got It';
    confirmBtn.style.background = theme.btn;
    confirmBtn.style.color = '#ffffff';
    confirmBtn.onclick = closeAppPopup;

    document.getElementById('app-popup-cancel-btn').classList.add('hidden');

    _popupConfirmCallback = null;
    document.getElementById('app-popup-backdrop').classList.add('show');
    if (window.Telegram?.WebApp?.HapticFeedback) {
        const hapticMap = { success: 'success', error: 'error', warning: 'warning', info: 'success' };
        try {
            tg.HapticFeedback.notificationOccurred(hapticMap[type] || 'success');
        } catch (hapticErr) {
            console.warn('Haptic feedback skipped:', hapticErr);
        }
    }
}

function showAppConfirm(message, callback, type = 'warning', title = '', confirmText = 'Confirm', cancelText = 'Cancel') {
    const theme = POPUP_THEMES[type] || POPUP_THEMES.warning;
    const defaultTitles = { info: 'Confirm', success: 'Confirm', error: 'Are You Sure?', warning: 'Confirm Action' };

    document.getElementById('app-popup-icon-wrap').innerText = theme.icon;
    document.getElementById('app-popup-icon-wrap').style.cssText = `width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:24px;background:${theme.bg};border:1px solid ${theme.border};`;
    document.getElementById('app-popup-title').innerText = title || defaultTitles[type];
    document.getElementById('app-popup-message').innerText = message;
    document.getElementById('app-popup-card').style.borderColor = theme.border;
    document.getElementById('app-popup-card').style.boxShadow = `0 0 40px ${theme.glow}`;

    const confirmBtn = document.getElementById('app-popup-confirm-btn');
    confirmBtn.innerText = confirmText;
    confirmBtn.style.background = theme.btn;
    confirmBtn.style.color = '#ffffff';
    confirmBtn.onclick = () => {
        closeAppPopup();
        if (typeof callback === 'function') callback(true);
    };

    const cancelBtn = document.getElementById('app-popup-cancel-btn');
    cancelBtn.innerText = cancelText;
    cancelBtn.classList.remove('hidden');
    cancelBtn.onclick = () => {
        closeAppPopup();
        if (typeof callback === 'function') callback(false);
    };

    _popupConfirmCallback = callback;
    document.getElementById('app-popup-backdrop').classList.add('show');
    if (window.Telegram?.WebApp?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
}

function closeAppPopup() {
    const backdrop = document.getElementById('app-popup-backdrop');
    backdrop.classList.remove('show');
    _popupConfirmCallback = null;
}

// Close popup when clicking outside the card
document.getElementById('app-popup-backdrop').addEventListener('click', function(e) {
    if (e.target === this) closeAppPopup();
});
function showAppReward(type, amount) {
    const cfg = {
        label: 'DASH',
        color: '#fb923c',
        bg: 'rgba(249,115,22,0.1)',
        border: 'rgba(249,115,22,0.3)'
    };

    const iconWrap = document.getElementById('app-popup-icon-wrap');
    iconWrap.innerHTML = `<img src="/assets/images/dash-coin.png" style="width:32px;height:32px;object-fit:contain;">`;
    iconWrap.style.cssText = `width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;background:${cfg.bg};border:1px solid ${cfg.border};`;

    document.getElementById('app-popup-title').innerText = 'Reward Earned!';
    document.getElementById('app-popup-message').innerText = `+${amount} ${cfg.label} added to your balance.`;
    document.getElementById('app-popup-card').style.borderColor = cfg.border;
    document.getElementById('app-popup-card').style.boxShadow = `0 0 40px ${cfg.bg}`;

    const confirmBtn = document.getElementById('app-popup-confirm-btn');
    confirmBtn.innerText = 'Awesome!';
    confirmBtn.style.background = `linear-gradient(135deg, ${cfg.color}, ${cfg.color}dd)`;
    confirmBtn.style.color = '#ffffff';
    confirmBtn.onclick = closeAppPopup;

    document.getElementById('app-popup-cancel-btn').classList.add('hidden');

    document.getElementById('app-popup-backdrop').classList.add('show');

    if (window.Telegram?.WebApp?.HapticFeedback) {
        try { tg.HapticFeedback.notificationOccurred('success'); } catch (e) {}
    }
}    
        
        // ==========================================================================
// DEV CONSOLE PANEL ENGINE
// ==========================================================================
const _conHistory = [];
let _conFilter = 'all';
let _conPaused = false;
let _conListeners = [];

(function patchConsole() {
    ['log','info','warn','error','debug'].forEach(level => {
        const orig = console[level].bind(console);
        console[level] = (...args) => {
            orig(...args);
            const entry = {
                id: Date.now() + Math.random(),
                level,
                time: new Date().toLocaleTimeString('en-US', { hour12: false }),
                message: args.map(a => {
                    if (a instanceof Error) return a.stack || `${a.name}: ${a.message}`;
                    if (typeof a === 'object' && a !== null) {
                        try {
                            return JSON.stringify(a, null, 2);
                        } catch (circularErr) {
                            return '[Unserializable Object]';
                        }
                    }
                    return String(a);
                }).join(' ')
            };
            _conHistory.push(entry);
            if (_conHistory.length > 500) _conHistory.shift();
            if (!_conPaused) _conListeners.forEach(fn => fn());
        };
    });
    window.addEventListener('error', e => console.error('Uncaught: ' + e.message));
    window.addEventListener('unhandledrejection', e => console.error('Unhandled Promise: ' + e.reason));
})();
