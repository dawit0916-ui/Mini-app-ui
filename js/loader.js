/* ==========================================================================
   LOADER
   1) Fetches every HTML partial in /components and injects it into its
      mount point (in parallel — order doesn't matter here, each partial
      has its own target div).
   2) Once ALL partials are in the DOM, loads every feature JS file in
      /js as a classic <script> tag, STRICTLY IN ORDER (each waits for
      the previous one's onload), so global functions/vars are defined
      before anything that depends on them runs.
   3) Once the last JS file has loaded, calls initApp() — exactly like
      the old single-file version did at the bottom of its <script>
      block, except now it's guaranteed the full DOM already exists.
   ========================================================================== */

const COMPONENTS = [
    { url: 'components/loading-screen.html', mount: 'mount-loading-screen' },
    { url: 'components/verify-gate.html',    mount: 'mount-verify-gate' },
    { url: 'components/streak.html',         mount: 'mount-streak' },
    { url: 'components/header.html',         mount: 'mount-header' },
    { url: 'components/tab-home.html',       mount: 'mount-tab-home' },
    { url: 'components/tab-friends.html',    mount: 'mount-tab-friends' },
    { url: 'components/tab-earn.html',       mount: 'mount-tab-earn' },
    { url: 'components/tab-levels.html',     mount: 'mount-tab-levels' },
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
    'js/levels.js',
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
];

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

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => reject(new Error(`Loader: failed to load ${src}`));
        document.body.appendChild(s);
    });
}

async function boot() {
    // Step 1 — inject all HTML partials in parallel.
    await Promise.all(COMPONENTS.map(injectComponent));

    // Step 2 — load feature JS files one at a time, in order.
    for (const src of SCRIPTS) {
        await loadScript(src);
    }

    // Step 3 — DOM is complete and every function is defined. Boot the app.
    if (typeof initApp === 'function') {
        initApp();
    } else {
        console.error('Loader: initApp() was not found after loading all scripts.');
    }
}

boot();
