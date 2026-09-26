/* ==========================================================================
   LOADER
   1) Fetches every HTML partial in /components and injects it into its
      mount point (in parallel — order doesn't matter here, each partial
      has its own target div).
   2) Fetches every feature script's source TEXT in parallel, then runs
      them as inline scripts in the original order (same global scope,
      same load order as classic <script src>, just no per-file network
      wait).
   3) Once the last JS file has run, calls initApp() — same as before.
   ========================================================================== */

const COMPONENTS = [
    { url: 'components/loading-screen.html', mount: 'mount-loading-screen' },
    { url: 'components/verify-gate.html',    mount: 'mount-verify-gate' },
    { url: 'components/streak.html',         mount: 'mount-streak' },
    { url: 'components/header.html',         mount: 'mount-header' },
    { url: 'components/tab-home.html',       mount: 'mount-tab-home' },
    { url: 'components/tab-friends.html',    mount: 'mount-tab-friends' },
    { url: 'components/tab-earn.html',       mount: 'mount-tab-earn' },
    { url: 'components/marketplace.html',    mount: 'mount-marketplace' },
    { url: 'components/tab-shop.html',       mount: 'mount-tab-shop' },
    { url: 'components/tab-profile.html',    mount: 'mount-tab-profile' },
    { url: 'components/tab-reminders.html',  mount: 'mount-tab-reminders' },
    { url: 'components/tab-admin.html',      mount: 'mount-tab-admin' },
    { url: 'components/modals.html',         mount: 'mount-modals' },
    { url: 'components/popups.html',         mount: 'mount-popups' },
    { url: 'components/bottom-nav.html',     mount: 'mount-bottom-nav' },
];

// Order matters — this mirrors the original single <script> block's
// top-to-bottom layout, just split by feature.
const SCRIPTS = [
    'js/core.js',
    'js/utils.js',
    'js/streak.js',
    'js/banner.js',
    'js/notifications.js',
    'js/navigation.js',
    'js/verification.js',
    'js/tasks.js',
    'js/marketplace.js',
    'js/youtube-tasks.js',
    'js/earn-ads.js',
    'js/referrals.js',
    'js/leaderboard.js',
    'js/profile.js',
    'js/reminders.js',
    'js/shop.js',
    'js/imagegen.js',
    'js/shop-admin.js',
    'js/video-player.js',
    'js/support.js',
    'js/admin-users.js',
    'js/admin-settings.js',
    'js/admin-tickets.js',
    'js/admin-console.js',
    'js/admin-proofs.js',
    'js/broadcast.js',
    'js/admin-marketplace.js',
    'js/admin-feedback.js',
];

// Status text shown while scripts are downloading/starting (step 2-3 below).
// core.js (and its setLoadingProgress helper) hasn't run yet at that point,
// so this loader updates the bar directly rather than depending on it.
const BOOT_MESSAGES = [
    'Counting your DASH...',
    'Warming up the vault...',
    'Waking the earn engine...',
    'Polishing the coins...',
    'Untangling the wires...',
];

function updateLoadingUI(percent, text) {
    const fill = document.getElementById('loading-progress-fill');
    const status = document.getElementById('loading-status-text');
    if (fill) fill.style.width = percent + '%';
    if (status && text) status.innerText = text;
}

async function injectComponent({ url, mount }) {
    const target = document.getElementById(mount);
    if (!target) {
        console.error(`Loader: mount point #${mount} not found in index.html`);
        return;
    }
    try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        target.innerHTML = await res.text();
    } catch (err) {
        console.error(`Loader: failed to load ${url}`, err);
        target.innerHTML = `<!-- failed to load ${url} -->`;
    }
}

async function fetchScriptText(src) {
    const res = await fetch(src, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Loader: failed to fetch ${src} (${res.status})`);
    return { src, code: await res.text() };
}

// Runs a fetched script's source as an inline <script>. Inline scripts
// execute synchronously in document order and share the same global scope
// as a real <script src="...">, so behavior/order is identical to before —
// the only thing that changes is WHEN the bytes arrived (all at once,
// in parallel, instead of one-by-one over the network).
function runScript(src, code) {
    const s = document.createElement('script');
    s.textContent = `//# sourceURL=${src}\n${code}`;
    document.body.appendChild(s);
}

async function boot() {
    // Step 1 — inject all HTML partials in parallel. This also brings the
    // loading-screen markup (progress bar, status text) into the DOM, so
    // it's the earliest point we can actually move the bar.
    await Promise.all(COMPONENTS.map(injectComponent));
    updateLoadingUI(10, 'Loading interface...');

    // Step 2 — fetch every feature script's SOURCE TEXT in parallel. This
    // used to be 27 sequential network round-trips (each one waiting for
    // the last to finish loading before starting the next) — now it's a
    // single parallel batch, which is the main speed win on slow connections.
    updateLoadingUI(20, BOOT_MESSAGES[0]);
    const fetched = await Promise.all(SCRIPTS.map(fetchScriptText));

    // Step 3 — run them in the original order, synchronously, with no
    // per-file network wait. Order is preserved because Promise.all keeps
    // the SCRIPTS array order in its results.
    let i = 0;
    for (const { src, code } of fetched) {
        runScript(src, code);
        i++;
        const pct = 25 + Math.round((i / fetched.length) * 25); // 25% → 50%
        updateLoadingUI(pct, BOOT_MESSAGES[i % BOOT_MESSAGES.length]);
    }

    // Step 4 — DOM is complete and every function is defined. Boot the app.
    // initApp() takes over progress reporting from here (50% → 100%).
    if (typeof initApp === 'function') {
        initApp();
    } else {
        console.error('Loader: initApp() was not found after loading all scripts.');
        updateLoadingUI(50, 'Something went wrong — reload to try again');
    }
}

boot();
