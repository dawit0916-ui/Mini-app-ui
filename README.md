# Mini-app-ui
# Dash Earn (EMBT Vault) — System Architecture

_Generated from a live pull of both repos (frontend: `dawit0916-ui/Mini-app-ui`, backend: `dawit0916-ui/embt-hub-v2`), not from memory. Supersedes the previous version, which still documented the level system and Secret Word/Emoji Reaction feature — both fully removed._

---

## Section 1: Environment Stack

**Backend:** Node.js, Express 4.19.2, Mongoose 8.3.2 (MongoDB), Telegraf 4.16.3 (Telegram Bot API), CORS, Axios, dotenv, node-cron.
**Anti-fraud / media stack (new — marketplace feature):** `sharp` (image processing for perceptual hashing), `blockhash-core` (pHash generation), `tesseract.js` (OCR for "Stats for Nerds" screenshot verification), `multer` (memory-storage file uploads, used by marketplace submissions, banner uploads, and shop APK/course uploads), IPQualityScore API (VPN/proxy/Tor + fraud-score lookups).
**Frontend:** Vanilla HTML/CSS/JS (no framework/bundler), Tailwind CDN, custom `loader.js` for component/script injection.
**Third-party:** AdsGram SDK (`sad.min.js`, `libtl.com/sdk.js`) — rewarded video ads + Fast Task widget ads; Monetag (S2S postback only).
**Deployment:** Backend on Render, frontend on Vercel.
**Database:** MongoDB (must be a replica set — required for the transaction used in Fast Task claims; MongoDB Atlas, including free M0 tier, satisfies this by default).

### `.env` schema

```env
# Telegram
BOT_TOKEN=123456:ABC-DEF_dummy_token
BOT_USERNAME=Dashearn_bot
ADMINS=111111111,222222222          # comma-separated Telegram user IDs
STORAGE_CHANNEL_ID=-1001234567890   # private channel for course video / APK / screenshot storage

# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname

# Server
PORT=3000

# AdsGram
FAST_TASK_ADSGRAM_BLOCK_ID=task-00000   # AdsGram dashboard → Blocks → Task format

# Marketplace anti-fraud (new)
IPQS_API_KEY=dummy_ipqualityscore_key
VPN_BLOCK_THRESHOLD=85    # fraud score (0-100) at/above which a submission is auto-rejected
VPN_REVIEW_THRESHOLD=60   # fraud score at/above which a submission is queued for manual review

# Maintenance mode (optional, all have safe defaults if unset)
MAINTENANCE_ENABLED=false
MAINTENANCE_BYPASS_IDS=111111111
MAINTENANCE_METADATA={"message":"Upgrading, back soon.","targetTime":0,"accentAsset":"🛠️"}
```

> `CONFIG_CHANNEL_ID`, `PUBLIC_GROUP_ID`, `PUBLIC_CHANNEL_ID` are now hardcoded numeric literals directly in `config/constants.js` rather than env vars — update them there, not in `.env`, if they ever change. `TELEGRAM_GROUP_URL`/`TELEGRAM_CHANNEL_NAME` from the old schema are no longer referenced anywhere in the codebase.

---

## Section 2: Complete File Tree

### Backend — `server/`

```
server/
├── index.js                    — entry point: express app, mounts 23 routers, requires bot/* for
│                                  side effects, connects Mongo, self-pings every 10 min, launches bot
├── package.json
├── config/
│   └── constants.js            — admins[], channel IDs, PORT, FAST_TASK_ADSGRAM_BLOCK_ID,
│                                  VPN_BLOCK_THRESHOLD, VPN_REVIEW_THRESHOLD
├── models/                     — 26 Mongoose models + barrel index.js
│   ├── index.js                  re-exports all 26 models
│   ├── user.js                    core user doc: balance, total_earned, referrals, ban state,
│   │                               history[], streak fields (currentStreak/longestStreak/
│   │                               lastStreakDate/streakDay/lastClaimDate) — NO level fields
│   ├── task.js                    admin-created one-time/daily/custom tasks
│   ├── settings.js                singleton global settings (withdraw min, ref commission %, etc.)
│   ├── ticket.js                  support tickets
│   ├── proofSubmission.js         manual-proof task submissions
│   ├── adminActivity.js           admin action audit log
│   ├── adWatch.js                 ad-watch session tracking — TTL index removed (see note below)
│   ├── dailyTaskProgress.js       SUPERSEDED — legacy, model file remains but its route is gone
│   ├── activeAd.js                admin-configured ad units (adgrams/google_ads/monetag)
│   ├── youtubeTask.js             YouTube watch-and-enter-code tasks
│   ├── telegramVerification.js    channel/group join verification cache
│   ├── reminderConfig.js          reminder system config singleton
│   ├── userReminder.js            per-user reminder state
│   ├── featureUsageLog.js         (legacy, low usage)
│   ├── completedTask.js           generic daily-completion ledger, dateKey-scoped
│   ├── shopProduct.js             courses + APKs
│   ├── courseLesson.js            lessons under a course product
│   ├── userPurchase.js            shop purchase records
│   ├── referralEarning.js         per-referral commission ledger
│   ├── bannerSlide.js             NEW — home-screen promo carousel slides
│   ├── marketplaceTask.js         NEW — creator-posted watch jobs (Tasks/Post marketplace)
│   ├── marketplaceSubmission.js   NEW — viewer proof-of-watch submissions + fraud review state
│   ├── screenshotFingerprint.js   NEW — global sha256+pHash registry, dedup across all users
│   ├── imageStylePreset.js        NEW — AI Image Generator style presets (prompt templates)
│   ├── imageGenLog.js             NEW — per-generation usage/cost log
│   └── imageGenConfig.js          NEW — singleton: cost per generation, daily cap
├── middleware/
│   ├── verifyTelegramInitData.js — shared HMAC verification helper
│   ├── validateInitData.js       — user auth (sets req.tgUser)
│   ├── validateAdmin.js          — admin auth (sets req.adminUser, req.tgUser)
│   ├── maintenanceGate.js        — global maintenance-mode gate, tester bypass by ID
│   ├── checkVpn.js               — NEW: IPQualityScore lookup, sets req.vpnCheck.action
│   │                                (allow/review/block), 30-min in-memory cache per IP
│   ├── fingerprintCheck.js       — NEW: sha256 exact-match + pHash Hamming-distance dedup
│   │                                (scans latest 5000 records), sets req.fingerprintCheck
│   └── ocrStatsForNerds.js       — NEW: tesseract.js OCR of YouTube "Stats for Nerds" overlay,
│                                    parses video ID + elapsed/total time, sets req.ocrResult
├── utils/
│   ├── logAdminAction.js
│   ├── channel.js                — postToChannel, postPhotoToChannel, replyInChannel (via bot)
│   ├── settings.js                — getSettings() (auto-seeds defaults)
│   ├── time.js                    — getUTCDayStart, getNextResetTime, getResetPeriodStart
│   ├── filenameCheck.js           — NEW: parses Android Screenshot_YYYYMMDD-HHMMSS_App filenames,
│   │                                 flags known photo-editor app names as a soft "likely edited" signal
│   └── telegramStorage.js         — NEW: uploadScreenshotToStorage / getStorageFileUrl — stores
│                                     marketplace proof screenshots as Telegram-hosted files
├── bot/
│   ├── bot.js                     — 5-line Telegraf instance export, nothing else
│   ├── handlers.js                — bot.start / action(start_bot_reminder) / on(video, text,
│   │                                 document) / catch-all; admin video/APK upload wizard,
│   │                                 comment-task matcher
│   ├── ghostValidator.js          — runGhostValidator(): daily sweep (setInterval, 24h) that
│   │                                 checks users are still in required Telegram channels for
│   │                                 completed 'telegram'-type tasks, penalizes + flags leavers
│   ├── reminders.js               — getReminderConfig / sendReminderMessage / checkAndSendReminders
│   └── adWatchCleanup.js          — cleanupAbandonedAdWatches(): every 30 min + once on startup,
│                                     deletes never-claimed AdWatch sessions older than 1 hour
└── routes/                        — 23 files, one per feature area (full endpoint list in Section 4)
    adminMarketplace.js  adminStats.js   adminUsers.js  ads.js         adsgram.js
    banners.js           broadcast.js    console.js     history.js     leaderboard.js
    marketplace.js       profile.js      proofs.js      referrals.js   reminders.js
    settings.js          shop.js         streak.js      support.js     tasks.js
    verification.js      video.js        youtubeTasks.js
```

> **Removed since the last version of this doc:** `models/levelConfig.js`, `models/pendingReaction.js`, `routes/levels.js`, `routes/dailyTasks.js`, `bot/config.js` (taskState), `bot/dailyConfig.js` (pinned-CMS-message parser) — the entire level system and Secret Word + Emoji Reaction daily-task system. **Also fixed this session:** `index.js` still had `require('./routes/levels')` and `require('./routes/dailyTasks')` left in — two files that no longer exist, which would throw `Cannot find module` and crash the server on boot before it binds the port. Removed both require lines.

### Frontend — `Mini-app-ui/`

```
Mini-app-ui/
├── index.html                — shell only: mount-point <div>s for every component, loads loader.js
├── css/ — 11 files (loading.css, plus one per major feature area)
├── components/ — 15 HTML partials, fetched + injected by loader.js:
│   loading-screen.html   verify-gate.html   streak.html        header.html
│   tab-home.html         tab-friends.html   tab-earn.html      marketplace.html
│   tab-shop.html         tab-profile.html   tab-reminders.html tab-admin.html
│   modals.html           popups.html        bottom-nav.html
└── js/ — 27 files, loaded in this exact order by loader.js's SCRIPTS array:
    core.js            utils.js           streak.js          banner.js
    notifications.js   navigation.js      verification.js    tasks.js
    marketplace.js     youtube-tasks.js   earn-ads.js        referrals.js
    leaderboard.js      profile.js         reminders.js       shop.js
    imagegen.js         shop-admin.js      video-player.js    support.js
    admin-users.js      admin-settings.js  admin-tickets.js   admin-console.js
    admin-proofs.js     broadcast.js       admin-marketplace.js
```

> **Removed since the last version of this doc:** `js/levels.js`, `components/tab-levels.html`, the admin level-config panel, and all Secret Word/Emoji Reaction UI. Confirmed via a fresh pull — only a stray unused image asset (`assets/images/nav-levels.png`) remains from the old feature; no dead code references to it.
> **New today:** `js/loader.js` rewritten — see Section 7.

---

## Section 3: New Feature — Tasks/Post Marketplace

A two-sided watch-to-earn marketplace, separate from the older YouTube Task feature. Funded directly by DASH (no separate points currency, no escrow — creator pays per approval).

- **Creator side** (`marketplace.html` → Post/My Posts tabs, `js/marketplace.js`, `routes/marketplace.js`): posts a YouTube link (`/fetch-meta` auto-pulls video ID/title/thumbnail), sets watch duration + point cost, optional `allowedCountries` allow-list. `MarketplaceTask` tracks `viewsApproved`/`dashSpent`; auto-pauses (`pauseReason: 'insufficient_balance'`) if the creator's balance runs out.
- **Viewer side:** scrollable feed of active tasks (`GET /api/marketplace/tasks`), taps "Start earning" (records `taskStartedAt`), watches, then submits a screenshot of YouTube's "Stats for Nerds" overlay as proof.
- **Verification pipeline** on `POST /api/marketplace/submit` (order matters — each is Express middleware, see `routes/marketplace.js` line ~186):
  1. `checkVpn` — IPQualityScore lookup on the submitter's IP → `req.vpnCheck.action` (`allow`/`review`/`block`), based on fraud score vs. `VPN_BLOCK_THRESHOLD`/`VPN_REVIEW_THRESHOLD` plus raw VPN/proxy/Tor flags.
  2. `fingerprintCheck` — sha256 exact match + pHash perceptual match (Hamming distance ≤ 6) against the global `ScreenshotFingerprint` registry, scanning the latest 5000 records. Catches re-uploading the same screenshot under a different account.
  3. `ocrStatsForNerds` — tesseract.js OCR reads the video ID and elapsed/total time off the screenshot itself.
  4. Route logic combines all three: `vpnCheck.action === 'block'` → auto-reject; a filename/timestamp mismatch, OCR mismatch, or `vpnCheck.action === 'review'` → `pending_review`; otherwise auto-`approved` and the creator's DASH balance is debited atomically (Mongo transaction).
- **Admin review** (`tab-admin.html` marketplace panel, `js/admin-marketplace.js`, `routes/adminMarketplace.js`): `GET /pending` lists queued submissions, `POST /:id/approve` / `/:id/reject` resolve them manually.
- `utils/filenameCheck.js` additionally parses the Android `Screenshot_YYYYMMDD-HHMMSS_AppName` filename pattern as a soft signal — flags known photo-editor app names (Snapseed, InShot, Picsart, etc.) as "likely edited," and flags a missing pattern entirely as `present: false` (renamed file, iOS, or not a real screenshot).

---

## Section 4: Other Features Added Since Last Doc Version

- **Home banner carousel** (`js/banner.js`, `routes/banners.js`, `BannerSlide` model): admin-managed image slides with drag/swipe navigation, auto-advance, per-slide click tracking (`clickCount`, resettable), and an `actionType` (`tab` / `shop-section` / `earn-section` / `url` / `none`) that drives what tapping a slide does.
- **Daily streak system** (`js/streak.js`, `routes/streak.js`, fields on `User`: `currentStreak`, `longestStreak`, `lastStreakDate`, `streakDay` 1–7, `lastClaimDate`): a 7-day calendar popup with an escalating bonus, checked via `checkStreakOnAppStart()` every time the mini app opens.
- **AI Image Generator** (`js/imagegen.js`, `routes/shop.js` imagegen endpoints, `ImageStylePreset`/`ImageGenLog`/`ImageGenConfig` models): built into the Shop tab. Per-style prompt templates, a flat daily generation cap and per-generation cost (both admin-configurable via `ImageGenConfig`, not level-tiered), uploaded reference photo discarded after each generation (no reuse across styles).

---

## Section 5: API Contract — Full Endpoint List

Grouped by route file; `validateInitData` = user auth, `validateAdmin` = admin auth, no tag = public.

**adminMarketplace.js:** `GET /pending`, `POST /:id/approve`, `POST /:id/reject` — all `validateAdmin`
**adminStats.js:** `GET /api/admin/stats`, `GET /api/admin/registry`, `GET /api/admin/test` — all `validateAdmin`
**adminUsers.js:** `GET /api/admin/directory`, `GET /api/admin/users`, `POST /api/admin/user/update`, `POST /api/admin/users/ban` — all `validateAdmin`
**ads.js:** `POST /api/secure/ads/start-session`, `POST /api/secure/ads/claim`, `GET /api/admin/ads`, `POST /api/admin/ads/update`, `GET /api/secure/available-ads`, `POST /api/secure/watch-ad`, `GET /api/secure/fast-task-config`, `POST /api/secure/fast-task-claim`
**adsgram.js:** `GET /api/adsgram/reward-callback`, `GET /api/ads/monetag-reward-callback` — public (S2S callbacks; mounted before the maintenance gate on purpose)
**banners.js:** `GET /api/banners` (public), `GET/POST /api/admin/banners`, `PUT/DELETE /api/admin/banners/:id`, `POST /api/admin/banners/upload` (multer), `GET /api/image/:fileId` (public), `POST /api/banners/:id/click` (public), `POST /api/admin/banners/:id/reset-clicks`
**broadcast.js:** `POST /api/admin/broadcast`
**console.js:** `GET /api/admin/console/stream`, `POST /api/admin/console/eval`
**history.js:** `GET /api/secure/history`
**leaderboard.js:** `GET /api/secure/leaderboard`
**marketplace.js** (mounted at `/api/marketplace`): `GET /fetch-meta` (public), `POST /post`, `GET /tasks`, `GET /my-posts`, `DELETE /task/:id`, `POST /submit` (multer + checkVpn + fingerprintCheck + ocrStatsForNerds chain), `GET /my-submissions`
**profile.js:** `GET /api/secure/profile`
**proofs.js:** `POST /api/admin/run-sweep`, `POST /api/secure/submit-proof`, `GET /api/admin/proofs/pending`, `GET /api/admin/proof-image/:proofId`, `POST /api/admin/proof-action`
**referrals.js:** `GET /api/secure/referrals`
**reminders.js:** `POST/GET /api/admin/reminder-config`, `POST /api/admin/reminder-config/toggle`, `GET /api/admin/reminder-stats`
**settings.js:** `POST /api/admin/settings`, `GET /api/settings` (public), `GET /api/admin/settings/all`, `POST /api/settings/update`
**shop.js:** `GET /api/shop/products` (public), `GET /api/shop/product/:productId` (public), `GET /api/secure/my-shop-purchases`, `POST /api/secure/purchase-course`, `GET /api/download-apk`, `POST /api/admin/shop/create-course`, `POST /api/admin/shop/lesson/add`, `GET /api/admin/shop/products`, `GET /api/admin/shop/course/:courseId`, `PUT /api/admin/shop/product/:productId`, `DELETE /api/admin/shop/lesson/:lessonId`, `DELETE /api/admin/shop/product/:productId`, `GET /api/admin/shop/stats`, `GET /api/secure/shop/imagegen/config`, `POST /api/secure/shop/imagegen/generate` (multer), `GET /api/admin/shop/imagegen/styles`, `POST /api/admin/shop/imagegen/style/create`, `PUT /api/admin/shop/imagegen/style/:styleId`, `DELETE /api/admin/shop/imagegen/style/:styleId`, `GET/PUT /api/admin/shop/imagegen/config`
**streak.js:** `GET /api/secure/streak/status`, `POST /api/secure/streak/claim`
**support.js:** `POST /api/support/create`, `POST /api/admin/reply-ticket`, `POST /api/admin/tickets/resolve`, `GET /api/admin/tickets`
**tasks.js:** `GET /api/admin/tasks`, `POST /api/admin/tasks/add`, `GET /api/secure/available-tasks`, `POST /api/secure/claim-task`, `DELETE /api/admin/tasks/delete/:id`, `PUT /api/admin/tasks/update/:id`, `GET /api/secure/tasks-with-progress`
**verification.js:** `GET /api/admin/check`, `POST /api/verify-membership`
**video.js:** `GET /api/stream-video` (Range-header support)
**youtubeTasks.js:** `GET/POST/DELETE /api/admin/youtube-tasks*`, `GET /api/secure/youtube-tasks`, `POST /api/secure/youtube-tasks/claim`

**Route mount order in `index.js`:** `adsgram` (before the maintenance gate — deliberate, so ad-network S2S callbacks keep working during maintenance) → `enforceGlobalMaintenanceGate` on `/api` → `verification` → `adminStats` → `reminders` → `banners` → `console` → `profile` → `settings` → `tasks` → `adminUsers` → `proofs` → `marketplace` (at `/api/marketplace`) → `adminMarketplace` (at `/api/admin/marketplace`) → `ads` → `streak` → `support` → `referrals` → `broadcast` → `leaderboard` → `youtubeTasks` → `history` → `video` → `shop`; bot handlers required after routes for side effects (`bot.js`, `handlers.js`, `ghostValidator.js`, `reminders.js`, `adWatchCleanup.js`).

---

## Section 6: Frontend Data Flow

- **No framework, no Redux/Zustand/Context.** Plain global `let`/`const` state per file.
- **No localStorage/cookies for auth.** Every authenticated request goes through `secureFetch(url, options)` (`core.js`), which reads `window.Telegram.WebApp.initData` fresh on every call and attaches it as the `X-Telegram-Init-Data` header. Backend's `validateInitData`/`validateAdmin` verifies the HMAC signature server-side per request — no session token, no persisted credential.
- **Component loading:** all HTML partials are fetched and injected via `innerHTML` by `loader.js` before any JS runs — meaning no `DOMContentLoaded` listener anywhere in the app will ever fire (that event has already passed by the time loader.js finishes). Previously fixed in `verification.js`, `video-player.js`, `reminders.js`.
- **Inter-tab state sync:** mostly re-fetch-on-tab-open (`switchTab()`'s per-tab load hooks in `navigation.js`), e.g. balance is re-synced via `updateHeaderBalances()` after any balance-changing action.
- **Key cross-file calls:** `tasks.js` and `earn-ads.js` call into `notifications.js`'s `showNotificationToast()`/`showAppReward()`/`showAppConfirm()` throughout; `admin-marketplace.js`'s `loadMarketplaceReviewQueue()` and `marketplace.js`'s own loaders call `secureFetch()` from `core.js`; `core.js`'s `initApp()` calls `checkStreakOnAppStart()` (`streak.js`) and `initBannerCarousel()` (`banner.js`) on every app open, and `showBanOverlay()` (`verification.js`, loaded 7th) on a 403-banned response, despite `core.js` itself loading first — safe only because that call happens inside an async handler triggered later, not at load time.

---

## Section 7: Today's Change — Loader Speed + Progress Bar

**Problem reported:** app felt stuck on the loading screen — progress bar sat at 0% ("INITIALIZING...") for the whole load, then jumped to 100%, making it look broken even though it was just slow.

**Root cause:** `loader.js`'s old `boot()` loaded all 27 feature scripts **sequentially** — each `<script src>` waited for the previous one's `onload` before the next even started downloading (27 back-to-back network round-trips). And `setLoadingProgress()` — the function that moves the bar — lives inside `core.js`, which is itself the *first* of those 27 sequentially-loaded scripts, so the bar couldn't move at all until the slow part was already almost over.

**Fix:**
1. `js/loader.js` now fetches all 27 scripts' source **in parallel** (`Promise.all`), then executes them as inline `<script>` tags in the original order (same global scope, same load order, just no per-file network wait). This is the main speed win, especially on mobile data.
2. The loader now updates the progress bar **directly** (`updateLoadingUI()`), independent of `core.js`, so it can move during the fetch/execute phase instead of sitting frozen: 0→10% after HTML partials inject, →20-50% as scripts land, with rotating status text ("Counting your DASH...", "Warming up the vault...", etc.) instead of a static "Initializing...".
3. `core.js`'s existing `initApp()` progress calls were rescaled from 10–100 down to 50–100, so the two phases hand off smoothly (asset loading owns 0–50%, app-data loading owns 50–100%) instead of the bar resetting.

---

### DONE (this session + carried forward)
- Loader rewritten for parallel script loading + real progress reporting (Section 7).
- **Fixed a server-crashing bug:** `index.js` was still requiring two deleted route files (`./routes/levels`, `./routes/dailyTasks`) — `Cannot find module` at boot, crash before the port binds. Removed both lines.
- **Fixed a silent fraud-gate bug:** `VPN_BLOCK_THRESHOLD`/`VPN_REVIEW_THRESHOLD` were referenced by `middleware/checkVpn.js` but never defined in `config/constants.js`, so the fraud-score-based block/review gate on marketplace submissions never actually fired (raw VPN/Tor flags still worked). Added both constants with env-var overrides and sane defaults.
- Level system and Secret Word/Emoji Reaction fully removed, frontend and backend, confirmed via live repo pull (no dead references found).
- Tasks/Post marketplace, banner carousel, daily streak, and AI Image Generator all fully built and live — documented in this version for the first time.

### BROKEN / NEEDS ACTION
- **Both fixes above are only applied to the local working copy fetched this session** — need to be committed/pushed to `dawit0916-ui/embt-hub-v2` and redeployed on Render, or the crash bug is still live in production.
- **AdWatch TTL fix requires a manual one-time step** (carried forward, unconfirmed whether ever applied): removing `expires: 600` from the schema does NOT drop the index from an already-live collection — run `db.adwatches.dropIndex("createdAt_1")` (confirm exact name via `getIndexes()`) once against production.
- **`VPN_BLOCK_THRESHOLD`/`VPN_REVIEW_THRESHOLD` default values (85/60) are placeholders** — not yet tuned against real submission data. Watch the `pending_review` queue after deploy and adjust if too many/few submissions land there.
- **`dailyTaskProgress.js` model is still present** despite its only route (`routes/dailyTasks.js`) being deleted — harmless (nothing requires it except the barrel file), but worth deleting outright next cleanup pass since it's dead weight.

### NEXT STEP
Commit and deploy the two backend fixes from this session (`index.js`, `config/constants.js`) — the crash-on-boot one especially shouldn't wait. After that, decide on real `VPN_BLOCK_THRESHOLD`/`VPN_REVIEW_THRESHOLD` values once there's submission volume to look at.
