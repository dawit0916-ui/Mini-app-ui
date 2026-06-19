
const POPUP_THEMES = {
    info:    { icon: 'ℹ️',  bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)',  btn: 'linear-gradient(135deg,#3b82f6,#2563eb)',  glow: 'rgba(59,130,246,0.15)'  },
    success: { icon: '✅',  bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)',   btn: 'linear-gradient(135deg,#10b981,#059669)',  glow: 'rgba(16,185,129,0.1)'   },
    error:   { icon: '🚨',  bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',    btn: 'linear-gradient(135deg,#ef4444,#dc2626)',  glow: 'rgba(239,68,68,0.1)'    },
    warning: { icon: '⚠️', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)',  btn: 'linear-gradient(135deg,#f59e0b,#d97706)',  glow: 'rgba(245,158,11,0.1)'   }
};

let _popupConfirmCallback = null;

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
        const hapticMap = { success: 'success', error: 'error', warning: 'warning', info: 'light' };
        tg.HapticFeedback.notificationOccurred(hapticMap[type] || 'light');
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
