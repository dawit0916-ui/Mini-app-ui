const _verifyClicked = { channel: false, group: false };

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

// Reveal the gate with the dramatic blur/spring transition. Safe to call
// even if it's already visible.
function showVerifyGate() {
    const gate = document.getElementById('verify-gate');
    if (!gate) return;
    gate.classList.remove('hidden');
    // Force a reflow so the browser registers display:flex before we add
    // the animation class — otherwise the transition gets skipped and it
    // just snaps open instead of animating in.
    void gate.offsetWidth;
    gate.classList.add('gate-visible');
}

// Animate the gate closed, then remove it from layout once the transition
// finishes so it doesn't sit on top of the app invisibly.
function hideVerifyGate() {
    const gate = document.getElementById('verify-gate');
    if (!gate) return;
    gate.classList.remove('gate-visible');
    setTimeout(() => gate.classList.add('hidden'), 450); // matches CSS transition duration
}

// silent=true suppresses the "Not Verified Yet" popup — used for the
// automatic background check so already-joined users get zero interruption
// and not-yet-joined users just see the gate itself, without a redundant
// alert stacked on top of it. The button click passes silent=false so an
// explicit user action still gets clear feedback.
async function verifyRunCheck(silent = false) {
    const btn = document.getElementById('verify-btn');

    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const res = await secureFetch('/api/verify-membership', {
            method: 'POST',
            body: JSON.stringify({})
        });

        if (res && res.verified) {
            hideVerifyGate();
        } else {
            showVerifyGate();
            if (res?.inChannel) document.getElementById('verify-row-channel').classList.add('joined');
            if (res?.inGroup)   document.getElementById('verify-row-group').classList.add('joined');
            if (!silent) {
                showAppAlert("You must join both the channel and group before verifying.", 'warning', 'Not Verified Yet');
            }
        }
    } catch (e) {
        console.error('Gate check error:', e);
        // Fail safe: if we can't confirm membership, show the gate rather
        // than silently letting an unverified user through.
        showVerifyGate();
        if (!silent) {
            showAppAlert("Could not connect to server. Please try again.", 'error', 'Connection Error');
        }
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

function verifyCheckMembership() {
    verifyRunCheck(false);
}

// ── Run the membership check as soon as this script loads (this file only
//    executes after the loader has already injected every component, so the
//    DOM is ready by definition — no need to wait on DOMContentLoaded, which
//    would already have fired by now and never call back). The gate stays
//    hidden the entire time; it only animates in if the check fails, so
//    already-verified users never see it pop up at all. ──
verifyRunCheck(true);
