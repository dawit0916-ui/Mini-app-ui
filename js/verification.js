/* ============================================================
   VERIFICATION GATE SYSTEM
   ============================================================ */

const verificationState = {
    verified: false,
    inChannel: false,
    inGroup: false,
    verifying: false,
    retryCount: 0,
    maxRetries: 5
};

/**
 * Mark verification step as complete
 */
function verifyMarkClicked(which) {
    const row = document.getElementById(`verify-row-${which}`);
    if (row) {
        row.classList.add('joined');
    }
    
    if (which === 'channel') {
        verificationState.inChannel = true;
    } else if (which === 'group') {
        verificationState.inGroup = true;
    }
}

/**
 * Run membership verification check
 */
async function verifyRunCheck() {
    const gate = document.getElementById('verify-gate');
    const btn = document.getElementById('verify-btn');

    if (!gate || !btn || verificationState.verifying) return;

    verificationState.verifying = true;
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const res = await secureFetch('/api/verify-membership', {
            method: 'POST',
            body: JSON.stringify({})
        });

        if (res && res.verified) {
            verificationState.verified = true;
            verificationState.verifyCount = 0;
            gate.classList.add('hidden');
            notifications.success('Verification successful!');
        } else {
            verificationState.verified = false;
            
            // Update UI with current status
            if (res?.inChannel) {
                verifyMarkClicked('channel');
                verificationState.inChannel = true;
            }
            if (res?.inGroup) {
                verifyMarkClicked('group');
                verificationState.inGroup = true;
            }

            notifications.warning(
                'You must join both the channel and group before verifying.',
                4000
            );
        }
    } catch (error) {
        console.error('Gate check error:', error);
        
        // Retry logic
        if (verificationState.retryCount < verificationState.maxRetries) {
            verificationState.retryCount++;
            setTimeout(() => verifyRunCheck(), 3000);
        } else {
            notifications.error(
                'Could not connect to server. Please try again later.',
                5000
            );
        }
    } finally {
        verificationState.verifying = false;
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

/**
 * Check membership status
 */
function verifyCheckMembership() {
    verifyRunCheck();
}

/**
 * Open channel in external link
 */
function openChannel() {
    const channelHandle = APP_CONFIG.verification.channelHandle;
    const url = `https://t.me/${channelHandle.replace('@', '')}`;
    
    if (window.Telegram?.WebApp?.openLink) {
        window.Telegram.WebApp.openLink(url);
    } else {
        window.open(url, '_blank');
    }
}

/**
 * Open group in external link
 */
function openGroup() {
    const groupHandle = APP_CONFIG.verification.groupHandle;
    const url = `https://t.me/${groupHandle.replace('@', '')}`;
    
    if (window.Telegram?.WebApp?.openLink) {
        window.Telegram.WebApp.openLink(url);
    } else {
        window.open(url, '_blank');
    }
}

/**
 * Initialize verification gate on page load
 */
function initVerificationGate() {
    const gate = document.getElementById('verify-gate');
    if (!gate) return;

    // Show gate if verification is required
    if (APP_CONFIG.features.verificationGate) {
        gate.classList.remove('hidden');
        
        // Run check after a delay (allows other UI to render)
        setTimeout(() => {
            verifyRunCheck();
        }, 1500);
    }
}

/**
 * Skip verification (for testing/demo)
 */
function skipVerification() {
    const gate = document.getElementById('verify-gate');
    if (gate) {
        gate.classList.add('hidden');
        verificationState.verified = true;
    }
}

/**
 * Reset verification state
 */
function resetVerification() {
    verificationState.verified = false;
    verificationState.inChannel = false;
    verificationState.inGroup = false;
    verificationState.verifying = false;
    verificationState.retryCount = 0;

    const gate = document.getElementById('verify-gate');
    if (gate) {
        gate.classList.remove('hidden');
    }

    document.querySelectorAll('[id^="verify-row-"]').forEach(row => {
        row.classList.remove('joined');
    });
}

/**
 * Get verification status
 */
function getVerificationStatus() {
    return {
        verified: verificationState.verified,
        inChannel: verificationState.inChannel,
        inGroup: verificationState.inGroup
    };
}

/**
 * Styles for verification gate
 */
const verificationStyles = `
    #verify-gate {
        position: fixed;
        inset: 0;
        background: rgba(4, 2, 18, 0.98);
        backdrop-filter: blur(10px);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    }

    #verify-gate.hidden {
        display: none;
    }

    .verify-container {
        max-width: 400px;
        width: 100%;
        text-align: center;
    }

    .verify-title {
        font-size: 24px;
        font-weight: 800;
        margin-bottom: 12px;
        color: #f8fafc;
    }

    .verify-subtitle {
        font-size: 14px;
        color: #cbd5e1;
        margin-bottom: 32px;
        line-height: 1.6;
    }

    .verify-rows {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 24px;
    }

    .verify-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: rgba(28, 14, 52, 0.6);
        border: 1px solid rgba(139, 92, 246, 0.2);
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .verify-row:hover {
        background: rgba(28, 14, 52, 0.8);
        border-color: rgba(139, 92, 246, 0.4);
    }

    .verify-row.joined {
        background: rgba(16, 185, 129, 0.1);
        border-color: rgba(16, 185, 129, 0.3);
    }

    .verify-row-icon {
        font-size: 24px;
    }

    .verify-row.joined .verify-row-icon {
        opacity: 1;
    }

    .verify-row-content {
        flex: 1;
        text-align: left;
    }

    .verify-row-title {
        font-weight: 600;
        color: #f8fafc;
        font-size: 14px;
    }

    .verify-row-subtitle {
        font-size: 12px;
        color: #64748b;
        margin-top: 4px;
    }

    .verify-row-check {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: rgba(139, 92, 246, 0.2);
        border: 2px solid rgba(139, 92, 246, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--neon-purple);
        font-size: 12px;
        flex-shrink: 0;
    }

    .verify-row.joined .verify-row-check {
        background: var(--neon-green);
        border-color: var(--neon-green);
        color: #ffffff;
    }

    .verify-actions {
        display: flex;
        gap: 12px;
    }

    #verify-btn {
        flex: 1;
    }
`;

// Inject verification styles
function injectVerificationStyles() {
    if (!document.getElementById('verification-styles')) {
        const style = document.createElement('style');
        style.id = 'verification-styles';
        style.textContent = verificationStyles;
        document.head.appendChild(style);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        injectVerificationStyles();
        initVerificationGate();
    });
} else {
    injectVerificationStyles();
    initVerificationGate();
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        verificationState,
        verifyRunCheck,
        verifyCheckMembership,
        openChannel,
        openGroup,
        skipVerification,
        resetVerification,
        getVerificationStatus
    };
}
