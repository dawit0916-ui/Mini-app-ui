
// Config JS - Global configuration constants
// 🛑 UPDATE THESE VALUES FOR YOUR SETUP

const CONFIG = {
    RENDER_URL: "https://embt-gateway.onrender.com",
    BOT_USERNAME: "EMBTasks_bot",
    TASKS_REQUIRED_FOR_INVITE: 5,
    REF_BONUS_AMOUNT: 0.50,
    REF_COMMISSION_PERCENT: 10,
    SPIN_COST: 1,
    SPIN_DURATION_MS: 4500,
    SUPPORT_EMAIL: "support@embt.io",
    DEFAULT_AVATAR_FALLBACK: "E"
};

// Current user data (set by initApp)
let currentUser = {
    id: null,
    first_name: "User",
    username: null,
    photo_url: null
};

// Cache variables
let cachedUserProfile = null;
let allTasks = [];
let notifications = [];
let currentFilter = 'All';
let currentNotifTab = 'personal';
