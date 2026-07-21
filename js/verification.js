function showBanOverlay(reason) {
    // Remove any existing overlay
    document.getElementById('ban-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'ban-overlay';
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 9999;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0,0,0,0.92); padding: 24px;
    `;

    overlay.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #1a0a0a, #2d0f0f);
            border: 1px solid #7f1d1d;
            border-radius: 20px;
            padding: 32px 24px;
            text-align: center;
            max-width: 320px;
            width: 100%;
        ">
            <div style="font-size: 48px; margin-bottom: 16px;">🚫</div>
            <h2 style="color: #ef4444; font-size: 18px; font-weight: 900; margin-bottom: 8px;">
                Account Suspended
            </h2>
            <p style="color: #fca5a5; font-size: 13px; margin-bottom: 24px; line-height: 1.5;">
                ${reason || 'Your account has been suspended for violating our terms.'}
            </p>
            <a href="https://t.me/DashearnSupport" target="_blank" style="
                display: block;
                background: #7f1d1d;
                color: #fca5a5;
                padding: 12px;
                border-radius: 12px;
                font-size: 13px;
                font-weight: 700;
                text-decoration: none;
            ">Contact Support</a>
        </div>
    `;

    document.body.appendChild(overlay);

    // Hide everything else
    document.getElementById('loading-screen')?.style && 
        (document.getElementById('loading-screen').style.display = 'none');
    document.getElementById('verify-gate') && 
        (document.getElementById('verify-gate').style.display = 'none');
    document.querySelector('main') && 
        (document.querySelector('main').style.display = 'none');
    document.querySelector('nav') && 
        (document.querySelector('nav').style.display = 'none');
}

function verifyMarkClicked(which) {
    _verifyClicked[which] = true;
    setTimeout(() => {
        document.getElementById(`verify-row-${which}`).classList.add('joined');
    }, 700);
}

async function verifyRunCheck() {
    const gate = document.getElementById('verify-gate');
    const btn  = document.getElementById('verify-btn');

    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const res = await secureFetch('/api/verify-membership', {
            method: 'POST',
            body: JSON.stringify({})
        });

        if (res && res.verified) {
            gate.classList.add('hidden');
        } else {
            showAppAlert("You must join both the channel and group before verifying.", 'warning', 'Not Verified Yet');
            if (res?.inChannel) document.getElementById('verify-row-channel').classList.add('joined');
            if (res?.inGroup)   document.getElementById('verify-row-group').classList.add('joined');
        }
    } catch (e) {
        console.error('Gate check error:', e);
        showAppAlert("Could not connect to server. Please try again.", 'error', 'Connection Error');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

function verifyCheckMembership() {
    
    verifyRunCheck();
}

// ── Show gate as soon as DOM is ready, before initApp runs ──
document.addEventListener('DOMContentLoaded', () => {
    const gate = document.getElementById('verify-gate');
    gate.classList.remove('hidden');
    // Wait for loading screen to finish then check
    setTimeout(verifyRunCheck, 1500);
});
