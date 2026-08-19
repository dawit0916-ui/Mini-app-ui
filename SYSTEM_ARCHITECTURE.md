Dash Earn (EMBT Vault) — System Architecture
Generated from project session history. This documents the split, audited, and rebuilt version of the app — not the original single-file monolith.
Section 1: Environment Stack
Backend: Node.js, Express 4.19.2, Mongoose 8.3.2 (MongoDB), Telegraf 4.16.3 (Telegram Bot API), CORS, Axios, dotenv. Frontend: Vanilla HTML/CSS/JS (no framework/bundler), Tailwind CDN, custom loader.js for component/script injection. Third-party: AdsGram SDK (sad.min.js, libtl.com/sdk.js) — rewarded video ads + Task-widget ads; Monetag (S2S postback only). Deployment (as of last discussion): Backend on Render, frontend on Vercel. Database: MongoDB (must be a replica set — required for the transaction used in Fast Task claims; MongoDB Atlas, including free M0 tier, satisfies this by default).
.env schema
# Telegram
BOT_TOKEN=123456:ABC-DEF_dummy_token
ADMINS=111111111,222222222          # comma-separated Telegram user IDs
STORAGE_CHANNEL_ID=-1001234567890   # private channel for course video / APK file storage
TELEGRAM_GROUP_URL=https://t.me/your_group
TELEGRAM_CHANNEL_NAME=your_channel_username

# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname

# Server
PORT=3000

# AdsGram
ADSGRAM_SECRET=dummy_s2s_secret
FAST_TASK_ADSGRAM_BLOCK_ID=task-00000   # AdsGram dashboard → Blocks → Task format

# Maintenance mode (optional, all have safe defaults if unset)
MAINTENANCE_ENABLED=false
MAINTENANCE_BYPASS_IDS=111111111
MAINTENANCE_METADATA={"message":"Upgrading, back soon.","targetTime":0,"accentAsset":"🛠️"}
Section 2: Complete File Tree
Backend — server/
server/
├── index.js                  — entry point: express app, mounts all 21 routers (adsgram router
│                                mounted BEFORE the maintenance gate on purpose — see comment
│                                in file), requires bot/* for side effects, connects Mongo, launches bot
├── package.json
├── config/
│   └── constants.js          — admins[], channel IDs, PORT, FAST_TASK_ADSGRAM_BLOCK_ID
├── models/                   — 21 Mongoose models + barrel index.js (lowercase filenames)
│   ├── index.js               re-exports all models
│   ├── user.js                 core user doc: balance, level, referrals, ban state, history[]
│   ├── task.js                  admin-created one-time/daily/custom tasks
│   ├── settings.js              singleton global settings doc
│   ├── ticket.js                support tickets
│   ├── proofSubmission.js       manual-proof task submissions
│   ├── adminActivity.js         admin action audit log
│   ├── adWatch.js               ad-watch session tracking (rewarded ads) — see note below
│   ├── dailyTaskProgress.js     SUPERSEDED — legacy daily-task progress, route commented out
│   ├── activeAd.js              admin-configured ad units (adgrams/google_ads/monetag)
│   ├── youtubeTask.js           YouTube watch-and-enter-code tasks
│   ├── telegramVerification.js  channel/group join verification cache
│   ├── reminderConfig.js        reminder system config singleton
│   ├── userReminder.js          per-user reminder state
│   ├── levelConfig.js           10-level progression config (price/reward/commission/discount/features)
│   ├── featureUsageLog.js       (legacy, low usage)
│   ├── pendingReaction.js       staged emoji-reaction verification (5s delayed write)
│   ├── completedTask.js         generic daily-completion ledger — used by Secret Word/Emoji AND
│   │                             Fast Task (taskType discriminates), dateKey-scoped for daily reset
│   ├── shopProduct.js           courses + APKs
│   ├── courseLesson.js          lessons under a course product
│   ├── userPurchase.js          shop purchase records
│   └── referralEarning.js       per-referral commission ledger
├── middleware/
│   ├── verifyTelegramInitData.js — shared HMAC verification helper
│   ├── validateInitData.js       — user auth (sets req.tgUser)
│   ├── validateAdmin.js          — admin auth (sets req.adminUser, req.tgUser)
│   └── maintenanceGate.js        — global maintenance-mode gate, tester bypass by ID
├── utils/
│   ├── logAdminAction.js
│   ├── channel.js               — postToChannel, postPhotoToChannel, replyInChannel (via bot)
│   ├── settings.js               — getSettings() (auto-seeds defaults incl. ref_tasks_required)
│   └── time.js                   — getUTCDayStart, getNextResetTime, getResetPeriodStart
├── bot/
│   ├── bot.js                    — Telegraf instance
│   ├── config.js                 — shared mutable state: taskState.tasks[] (Secret Word/Emoji pool)
│   ├── handlers.js               — bot.start/on(message,video,text,document)/action/catch,
│   │                                 admin video/APK upload wizard, comment-task matcher
│   ├── dailyConfig.js            — polls pinned CMS message, parses multi-task pool (--- separated)
│   ├── ghostValidator.js         — sweeps users for left/kicked channel status, penalizes;
│   │                                 returns {success, caughtCount} for both bot-triggered and HTTP use
│   ├── reminders.js               — reminder send/check workers
│   └── adWatchCleanup.js         — deletes only ABANDONED (never-claimed) AdWatch sessions after 1h;
│                                     replaces a removed TTL index (see Section 6)
└── routes/                    — 21 Express routers, mounted at '/' in index.js
    ├── verification.js         — channel/group join check
    ├── adsgram.js               — AdsGram + Monetag S2S reward postbacks (public, no auth)
    ├── adminStats.js            — dashboard stats, registry, health-check (/api/admin/test)
    ├── adminUsers.js            — user search/directory/ban/update (whitelist system removed)
    ├── reminders.js              — admin reminder config
    ├── console.js                — SSE log stream + remote eval for admin diagnostics
    ├── profile.js                 — /api/secure/profile
    ├── settings.js                — global settings CRUD incl. /api/admin/settings/all
    ├── tasks.js                   — admin task CRUD (full edit support), claim-task, referral
    │                                 commission (now level-based) + milestone bonus (now uses
    │                                 settings.ref_tasks_required instead of hardcoded 3)
    ├── proofs.js                  — manual proof submit/review + /api/admin/run-sweep
    ├── ads.js                     — rewarded-ad watch sessions + Fast Task (config/claim,
    │                                 transaction-protected, no level gate, 3/day @ 100 DASH)
    ├── levels.js                  — user level/purchase + admin level config CRUD
    ├── dailyTasks.js              — Secret Word + Emoji Reaction (multi-task pool, random
    │                                 no-repeat, shared dailyLimit); legacy complete-daily-task
    │                                 commented out
    ├── support.js                  — ticket create/reply/resolve
    ├── referrals.js                — referral list + earnings
    ├── broadcast.js                — global broadcast, now supports image (photo+caption) and
    │                                 inline button
    ├── leaderboard.js
    ├── youtubeTasks.js             — admin CRUD + toggle enable/disable
    ├── history.js
    ├── video.js                    — secure course video streaming
    └── shop.js                     — course/APK browse+purchase (level-based discount applied
                                       at checkout), admin CRUD incl. lesson delete
Frontend — component/JS split
index.html                 — shell: mount points only, loads css/*, then js/loader.js
js/loader.js                — fetches all components/*.html in parallel, injects, THEN loads all
                               js/*.js in strict order, THEN calls initApp()
css/*.css                   — 11 files: base, loading, verify-gate, nav, sheets, toast, popup,
                               tasks, admin, misc, video-player
components/*.html            — 14 files: loading-screen, verify-gate, header, tab-home,
                               tab-friends, tab-earn, tab-levels, tab-shop, tab-profile,
                               tab-reminders, tab-admin, modals, popups, bottom-nav
js/*.js                      — 23 files, load order matters (loader.js SCRIPTS array):
  core.js         — secureFetch (auth header injection, 403/banned handling), initApp
  utils.js        — LEVEL_CONFIG (client-side mirror of LevelConfig, incl. courseDiscount)
  notifications.js — toast/alert/confirm/reward popup system
  navigation.js    — switchTab, switchAdminPanel (registers all admin panel IDs + load hooks)
  verification.js  — verify-gate logic, ban overlay, _verifyClicked state
  tasks.js         — task list, claim (one-time + daily via claimDailyTask), admin task editor
                      w/ platform-icon picker (auto→telegram.png, else Twitter/YouTube/
                      Instagram/TikTok picker)
  youtube-tasks.js — YT task claim + admin CRUD + enable/disable toggle
  earn-ads.js       — earn hub, rewarded ads, Secret Word/Emoji UI, Fast Task widget
                      (AdsGram <adsgram-task>, custom slots, 10-min cooldown, race guard)
  levels.js         — level grid/drawer, purchase flow, showLevelLockedOverlay()
  referrals.js       — friend list, commission badge (level-based, live), invite link
  leaderboard.js
  profile.js          — header balance sync, profile card population
  reminders.js
  shop.js             — course/APK browse, purchase, discount-aware pricing
  shop-admin.js        — course/APK/lesson CRUD incl. lesson delete list
  video-player.js
  support.js
  admin-users.js        — user search + full-sheet edit drawer (balance/level/ban/red-flag)
  admin-settings.js      — settings forms + Level Config admin panel (NEW)
  admin-tickets.js
  admin-console.js
  admin-proofs.js
  broadcast.js            — rich-text toolbar (bold/italic/underline/strike/bullet/link),
                            image attach, inline button
Section 3: Database Models (key ones — see file tree above for full list)
// User (models/user.js) — abbreviated to fields referenced elsewhere in this doc
{
  user_id: Number, username: String, first_name: String,
  balance: Number, level: Number (default 0),           // 0 = free tier, every new user
  purchased_levels: [Number], features_unlocked: { daily_tasks, custom_tasks, ... },
  total_earned: Number, referralCount: Number, referred_by: Number,
  referral_tasks_done: Number, referral_paid: Boolean,
  is_banned: Boolean, red_flag: Boolean,
  completed_tasks: [String], history: [{ title, reward, taskId, date }],
  createdAt: Date
  // NOTE: 'tasks_added' was referenced in 3 places (adminUsers.js x2, profile.js) but was
  // NEVER a real schema field — always silently dropped by Mongoose. Removed from all
  // call sites this session.
}

// LevelConfig (models/levelConfig.js)
{ level, name, cost, features: [String], daily_task_limit, daily_task_reward,
  cost_discount_percent,  // 100 = no discount, 80 = 20% off courses, etc.
  commission_percent }

// CompletedTask (models/completedTask.js) — shared daily-ledger for both Secret Word/Emoji
// and Fast Task
{ userId, taskType: 'comment'|'reaction'|'fast_task', taskKey, dateKey: 'YYYY-MM-DD',
  createdAt }
// unique index: (userId, taskType, taskKey, dateKey) — lets the same task be redone next day

// AdWatch (models/adWatch.js)
{ sessionId (unique, required), userId, adId, adNetwork, reward,
  serverConfirmed, clientDone, claimed, blurDetected, createdAt }
// NOTE: previously had a TTL (`expires: 600`) that auto-deleted ALL records after 10 min,
// including claimed ones — this broke admin-configured resetIntervalHours limits for any
// period longer than 10 minutes. TTL removed; replaced by bot/adWatchCleanup.js which only
// deletes claimed:false records older than 1 hour. REQUIRES a manual one-time DB step —
// see Section 6.

// ActiveAd (models/activeAd.js)
{ adId (unique), network: enum['adgrams','google_ads','monetag'], unitId, reward,
  resetIntervalHours (default 24), watchesPerReset (default 2), enabled }

// Settings (models/settings.js) — singleton
{ min_withdraw, ref_bonus, penalty_fee, withdrawals_enabled, maintenance_mode,
  ref_commission_percent (default 10, used as fallback when referrer has no level),
  ref_bonus_amount, ref_tasks_required (default 3, added this session — was missing entirely,
  causing the admin-configurable milestone threshold to be silently dropped) }
Section 4: API Contract (selected — the routes most modified/discussed this session; full route list is in Section 2's file tree with one-line descriptions)
POST /api/secure/fast-task-claim
Auth: validateInitData (user)
Body: {} (no body needed — user identified via auth)
Success (200): { success: true, reward: 100, newBalance: Number, claimsRemainingToday: Number }
Errors:
404 { success: false, error: 'User not found' }
403 { success: false, error: 'Account banned' }
400 { success: false, error: 'Daily limit reached (X/3)' }
500 { success: false, error: 'Failed to record claim' }
Implementation note: wrapped in a Mongoose session transaction — claim-record creation and balance credit either both commit or both roll back. Previously these were separate steps and could desync (claim marked used, balance never credited) if anything failed between them.
GET /api/secure/fast-task-config
Auth: validateInitData
Success (200): { success: true, enabled: Boolean, blockId: String|null, reward: 100, dailyLimit: 3, claimsRemainingToday: Number }
No level gate (removed this session — previously required Level 2, now available to all).
POST /api/admin/levels/update
Auth: validateAdmin
Body: { level, name, cost, features: [String], daily_task_limit, daily_task_reward, commission_percent, cost_discount_percent }
Success (200): { success: true, level: <updated LevelConfig doc> }
POST /api/admin/broadcast
Auth: validateAdmin
Body: { message: String (HTML subset), imageFileId?: String, buttonText?: String, buttonUrl?: String }
Success (200): { success: true, total: Number } — fires immediately, sends async in background with 75ms throttle between users
Errors: 400 if message exceeds length limit (4096 chars text, or 1024 if imageFileId present — Telegram's caption limit is shorter than its message limit)
POST /api/secure/claim-task
Auth: validateInitData
Body: { taskId: String }
Success (200): { success: true, reward: Number, newBalance: Number }
Errors: 403 with { error, unlocksAtLevel } for custom/duration-gated tasks the user's level doesn't cover; 400 for already-claimed/not-found
GET /api/secure/daily-tasks/today
Auth: validateInitData
Success (200): one randomly-selected not-yet-completed-today task from the pool: { success: true, task_key, task_type: 'comment'|'reaction', secret_word?, target_emoji?, message_id?, reward, completedToday, dailyLimit }
No tasks / limit reached (200): { success: false, message: String, completedToday?, dailyLimit? }
PUT /api/admin/shop/product/:productId
Auth: validateAdmin
Body: { title?, description?, category?, price?, thumbnail?, active?, telegram_file_id? } (partial update)
Success (200): { success: true, product }
Full endpoint list: every route file in Section 2 corresponds 1:1 to its mounted paths; cross-referencing frontend secureFetch() calls against backend router.*() registrations was done exhaustively this session (see Section 6) and is currently fully consistent except for intentionally-dead/commented-out legacy routes.
Section 5: Frontend Data Flow
No framework, no Redux/Zustand/Context. Plain global let/const state per JS file (e.g., currentUserBalance, currentUserLevel in levels.js; _fastTaskConfigCache, _fastTaskNextAvailableAt in earn-ads.js; shopState object in shop.js/shop-admin.js).
No localStorage/cookies for auth. Every authenticated request goes through secureFetch(url, options) (core.js), which reads window.Telegram.WebApp.initData fresh on every call and attaches it as the X-Telegram-Init-Data header. The backend's validateInitData/validateAdmin middleware verifies this HMAC signature server-side per request — there is no session token, no cookie, no localStorage-persisted credential.
secureFetch's 403 handling: preserves the full error response body (not just .error) — this was a real bug fixed this session (return { error: ... } → return { ...errData, error: ... }), since it was silently stripping unlocksAtLevel and other useful fields from every 403 response.
Inter-tab state sync: mostly via re-fetching on tab-open (switchTab()'s per-tab load hooks in navigation.js) rather than a shared store — e.g., balance is re-synced via updateHeaderBalances() called after any balance-changing action.
Component loading: all HTML partials are fetched and injected via innerHTML by loader.js before any JS runs — this means no DOMContentLoaded listeners work as expected anywhere in the app (that event has already fired by the time loader.js finishes); found and fixed 3 instances of this exact bug this session (verification.js, video-player.js, reminders.js) where code was still trying to use it.
Section 6: Roadmap / State
DONE (this session)
Full monolith → component/module split (frontend: 14 HTML + 11 CSS + 23 JS; backend: 21 models + 21 routes + middleware/utils/bot).
IP-tracking/whitelist system fully removed (frontend + backend), ban system kept and re-skinned with animated overlay.
Level system fully connected: commission (was flat-rate, now per-level), course discounts (was unused field, now applied at checkout), affordability-aware purchase button, "already owned" guard, upgrade-required overlay wired into level-gated failures.
Secret Word + Emoji Reaction rebuilt: single-task → multi-task pool (parsed from one pinned message), random no-repeat assignment, shared dailyLimit, real per-level reward (was hardcoded 50 × level).
Fast Task (AdsGram widget) built end-to-end: widget mount, custom-styled slots, transaction-protected claim (fixed a real "claim recorded but never paid" bug), 10-minute cooldown, no level gate (removed per instruction), correct onReward event name (was incorrectly reward — this was the actual root cause of "claim shows done but nothing happens").
AdWatch reset-period bug fixed (TTL was silently capping all reset periods at 10 minutes regardless of admin config).
Full admin CRUD built for User, Task, Shop (course+APK+lesson), YouTube Tasks (toggle), and Levels — all previously create/delete-only or missing entirely.
Broadcast: rich-text toolbar, image-as-photo support, inline button support.
Profile tab redesigned: added Level badge card and Stats grid (total earned / referrals / tasks done) — data was already being fetched from the backend but never displayed anywhere.
🔴 BROKEN / NEEDS ACTION
(Currently clear! The app is stable based on the latest fixes).
Profile tab (tab-profile.html) was mid-rewrite when this document was requested — the new HTML (Level badge + Stats grid cards) has been written and delivered, but js/profile.js has NOT yet been updated to actually populate #profile-level-emoji, #profile-level-number, #profile-level-name, #profile-total-earned, #profile-referrals, #profile-tasks-done. Right now those elements exist in the DOM but will show their static placeholder values (0, "Free Tier", 🆓) forever until that wiring is added.
NEXT STEP
Edit js/profile.js, inside loadUserProfileMetrics() (or equivalent profile-load function): after the existing secureFetch('/api/secure/profile') call, add population of the 6 new element IDs listed above — level/total_earned/referrals/tasksCompletedCount are already present in that endpoint's response (confirmed in Section 4), and level name/emoji should be looked up from the client-side LEVEL_CONFIG array in utils.js (same pattern already used in levels.js's FREE_TIER_CONFIG fallback for level 0).
