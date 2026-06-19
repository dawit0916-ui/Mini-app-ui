
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();
// Also add this — prevents Telegram from collapsing on vertical swipe
if (tg.disableVerticalSwipes) {
    tg.disableVerticalSwipes();
}

// 🛑 IMPORTANT: REPLACE THIS WITH YOUR RENDER URL
  const RENDER_URL = "https://embt-gateway.onrender.com";
let OWNER_ID = null;
let isCurrentUserAdmin = false;
let allAdmins = [];
// Current User Data
const user = tg.initDataUnsafe?.user || { id: OWNER_ID, username: "TestUser", first_name: "Test" }; 
let currentEditingUserId = null;
let tasksRequired = 5;
