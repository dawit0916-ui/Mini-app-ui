const _verifyClicked = { channel: false, group: false };

function showBanOverlay(reason) {
    // Remove any existing overlay
    document.getElementById('ban-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'ban-overlay';
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 9999;
        display: flex; align-items: center; justify-content: center;
        padding: 24px;
        background: rgba(0,0,0,0);
        backdrop-filter: blur(0px);
        -webkit-backdrop-filter: blur(0px);
        opacity: 0;
        transition: background 0.45s ease, backdrop-filter 0.45s ease,
                    -webkit-backdrop-filter 0.45s ease, opacity 0.35s ease;
    `;

    overlay.innerHTML = `
        <div id="ban-overlay-card" style="
            background: linear-gradient(160deg, #1a0a0a 0%, #2d0f0f 100%);
            border: 1px solid rgba(239,68,68,0.35);
            border-radius: 22px;
            padding: 36px 24px 28px;
            text-align: center;
            max-width: 320px;
            width: 100%;
            box-shadow: 0 8px 40px rgba(0,0,0,0.6);
            transform: scale(0.82) translateY(36px);
            opacity: 0;
            transition: transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease;
        ">
            <div style="
                width:64px;height:64px;
                background:rgba(239,68,68,0.15);
                border:1px solid rgba(239,68,68,0.35);
                border-radius:20px;
                display:flex;align-items:center;justify-content:center;
                margin:0 auto 16px;font-size:28px;
            ">🚫</div>
            <h2 style="color: #ef4444; font-size: 18px; font-weight: 900; margin-bottom: 8px;">
                Account Suspended
            </h2>
            <p style="color: #fca5a5; font-size: 13px; margin-bottom: 24px; line-height: 1.5;">
                ${reason || 'Your account has been suspended by an administrator.'}
            </p>
            <a href="https://t.me/DashearnSupport" target="_blank" style="
                display: block;
                background: rgba(239,68,68,0.15);
                border: 1px solid rgba(239,68,68,0.3);
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

    // Force a reflow so the browser registers the initial state before we
    // trigger the transition — otherwise it just snaps open instead of
    // animating in.
    void overlay.offsetWidth;
    overlay.style.background = 'rgba(0,0,0,0.85)';
    overlay.style.backdropFilter = 'blur(10px)';
    overlay.style.webkitBackdropFilter = 'blur(10px)';
    overlay.style.opacity = '1';
    const card = overlay.querySelector('#ban-overlay-card');
    if (card) {
        card.style.transform = 'scale(1) translateY(0)';
        card.style.opacity = '1';
    }

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
