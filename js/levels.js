// Synthetic display config for level 0 — brand new users start here, and
// LEVEL_CONFIG only defines levels 1-10, so this fills the gap instead of
// crashing on LEVEL_CONFIG[-1].
const FREE_TIER_CONFIG = {
    level: 0,
    name: 'Free Tier',
    emoji: '🆓',
    price: 0,
    dailyReward: 0,
    dailyLimit: 0,
    commission: 0,
    courseDiscount: 0,
    description: 'Buy Level 1 to start earning daily rewards and unlock the task platform.',
    features: []
};

// Load and display all levels
let currentUserBalance = 0;
let currentUserLevel = 0;

async function loadLevels() {
    try {
        // Fetch current user level
        const userRes = await secureFetch('/api/secure/user/level');
        const currentLevel = userRes?.level || 0;
        const userBalance = userRes?.balance || 0;
        currentUserBalance = userBalance;
        currentUserLevel = currentLevel;

        // Update hero card — level 0 (every new user) uses the free-tier
        // fallback since LEVEL_CONFIG only covers levels 1-10.
        const currentConfig = currentLevel > 0 ? LEVEL_CONFIG[currentLevel - 1] : FREE_TIER_CONFIG;
        document.getElementById('currentLevelDisplay').textContent = currentLevel;
        document.getElementById('currentLevelName').textContent = currentConfig.name;
        document.getElementById('currentLevelEmoji').textContent = currentConfig.emoji;
        document.getElementById('dailyLimitDisplay').textContent = currentLevel > 0 ? `${currentConfig.dailyLimit}/day` : 'Locked';

        // Render levels grid
        const levelsGrid = document.getElementById('levelsGrid');
        levelsGrid.innerHTML = '';

        LEVEL_CONFIG.forEach((level, idx) => {
            const isUnlocked = currentLevel > level.level;
            const isCurrent = currentLevel === level.level;
            const canAfford = userBalance >= level.price;
            const isNextLevel = level.level === currentLevel + 1;
            const isAffordableNext = isNextLevel && canAfford;
            const isUnaffordableNext = isNextLevel && !canAfford;
            // Only the current level, already-owned levels, and the single
            // next purchasable level are interactive. Levels further out
            // than "next" can't be bought yet (must buy sequentially), so
            // tapping them shouldn't open a purchase drawer at all.
            const isTappable = isCurrent || isUnlocked || isNextLevel;

            const levelCard = document.createElement('button');
            if (isTappable) {
                levelCard.onclick = () => showLevelDetails(level);
            } else {
                levelCard.disabled = true;
            }
            levelCard.className = `glass p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${
                isTappable ? 'active:scale-95' : 'opacity-40 cursor-not-allowed'
            } ${
                isCurrent ? 'border-purple-500/50 bg-purple-500/10' :
                isUnlocked ? 'border-green-500/30 bg-green-500/5' :
                isAffordableNext ? 'border-blue-500/30 bg-blue-500/5' :
                isUnaffordableNext ? 'border-orange-500/20 bg-orange-500/5' :
                'border-white/5'
            }`;

            const badgeHTML = isCurrent ? '✅ CURRENT' : 
                             isUnlocked ? '✓ UNLOCKED' :
                             isAffordableNext ? '→ NEXT' :
                             isUnaffordableNext ? '💰 NEED MORE' : '🔒 LOCKED';

            levelCard.innerHTML = `
                <p class="text-2xl">${level.emoji}</p>
                <h4 class="text-[10px] font-black uppercase text-white tracking-wider">${level.name}</h4>
                <p class="text-[8px] text-slate-400 font-bold">${level.price.toLocaleString()} DASH</p>
                ${level.courseDiscount > 0 ? `<span class="text-[7px] font-black text-pink-400">🏷️ ${level.courseDiscount}% OFF courses</span>` : ''}
                <span class="text-[7px] font-black uppercase tracking-widest ${
                    isCurrent ? 'text-purple-400' :
                    isUnlocked ? 'text-green-400' :
                    isAffordableNext ? 'text-blue-400' :
                    isUnaffordableNext ? 'text-orange-400' : 'text-slate-500'
                }">${badgeHTML}</span>
            `;
            levelsGrid.appendChild(levelCard);
        });

    } catch (error) {
        console.error('Error loading levels:', error);
        showAppAlert('Failed to load levels', 'error');
    }
}

// Show level detail drawer
function showLevelDetails(levelConfig) {
    const drawer = document.getElementById('levelDetailDrawer');
    const nextLevel = levelConfig.level < 10 ? LEVEL_CONFIG[levelConfig.level] : levelConfig;

    // Update drawer content
    document.getElementById('drawerLevelName').textContent = levelConfig.name;
    document.getElementById('drawerLevelPrice').textContent = levelConfig.price.toLocaleString();
    document.getElementById('drawerLevelEmoji').textContent = levelConfig.emoji;
    document.getElementById('drawerLevelTitle').textContent = levelConfig.name;
    document.getElementById('drawerLevelDesc').textContent = levelConfig.description;
    document.getElementById('drawerDailyReward').textContent = levelConfig.dailyReward.toLocaleString() + ' DASH';
    document.getElementById('drawerDailyLimit').textContent = levelConfig.dailyLimit + '/day';
    document.getElementById('drawerCommission').textContent = levelConfig.commission + '%';
    document.getElementById('drawerNextPrice').textContent = nextLevel.price.toLocaleString() + ' DASH';

    // Course discount banner
    const discountBanner = document.getElementById('drawerDiscountBanner');
    if (levelConfig.courseDiscount > 0) {
        document.getElementById('drawerDiscountValue').textContent = levelConfig.courseDiscount;
        discountBanner.classList.remove('hidden');
    } else {
        discountBanner.classList.add('hidden');
    }

    // Update features grid
    const featuresGrid = document.getElementById('drawerFeaturesGrid');
    featuresGrid.innerHTML = levelConfig.features.map(feature => `
        <div class="glass p-3 rounded-xl border border-white/5 flex items-center gap-2">
            <span class="text-sm">✨</span>
            <span class="text-xs text-slate-300">${feature}</span>
        </div>
    `).join('');

    // Reflect real affordability on the purchase button instead of always
    // showing it as ready to buy — and disable it entirely if this level
    // is already owned (tapping "Upgrade" on your current/past level made
    // no sense before this check existed).
    const purchaseBtn = document.getElementById('drawerPurchaseBtn');
    const alreadyOwned = levelConfig.level <= currentUserLevel;
    const canAfford = currentUserBalance >= levelConfig.price;

    if (alreadyOwned) {
        purchaseBtn.disabled = true;
        purchaseBtn.classList.add('opacity-50');
        purchaseBtn.textContent = '✓ Already Owned';
    } else {
        purchaseBtn.disabled = !canAfford;
        purchaseBtn.classList.toggle('opacity-50', !canAfford);
        purchaseBtn.textContent = canAfford
            ? `Upgrade for ${levelConfig.price.toLocaleString()} DASH`
            : `Need ${(levelConfig.price - currentUserBalance).toLocaleString()} more DASH`;
    }

    // Store current level for purchase
    window.selectedLevelForPurchase = levelConfig;

    // Show drawer (sheet pattern — opened via .active, matching every
    // other drawer/modal in the app)
    drawer.classList.add('active');
}

// Toggle level detail drawer
function toggleLevelDetail() {
    const drawer = document.getElementById('levelDetailDrawer');
    drawer.classList.toggle('active');
}

// Show an "upgrade required" prompt when a level-gated feature blocks the
// user, with a direct path to the level that unlocks it. Call this with
// the unlocksAtLevel value from any 403 response that includes one.
function showLevelLockedOverlay(unlocksAtLevel, featureMessage) {
    if (!unlocksAtLevel) return false;
    const targetLevel = LEVEL_CONFIG.find(l => l.level === unlocksAtLevel);
    if (!targetLevel) return false;

    showAppConfirm(
        featureMessage || `This requires Level ${unlocksAtLevel}: ${targetLevel.name}. Upgrade now to unlock it!`,
        async (confirmed) => {
            if (!confirmed) return;
            switchTab('levels', document.getElementById('nav-item'));
            await new Promise(r => setTimeout(r, 300));
            await loadLevels();
            showLevelDetails(targetLevel);
        },
        'warning',
        `🔒 Level ${unlocksAtLevel} Required`,
        `🚀 View Level ${unlocksAtLevel}`,
        'Not Now'
    );
    return true;
}

// Process level purchase
async function processPurchaseLevel() {
    if (!window.selectedLevelForPurchase) return;

    const level = window.selectedLevelForPurchase;

    if (level.level <= currentUserLevel) {
        showAppAlert('You already own this level.', 'info');
        return;
    }

    if (currentUserBalance < level.price) {
        showAppAlert(`You need ${(level.price - currentUserBalance).toLocaleString()} more DASH to upgrade.`, 'warning');
        return;
    }

    const btn = document.getElementById('drawerPurchaseBtn');
    const originalText = btn.textContent;

    try {
        btn.disabled = true;
        btn.textContent = '⏳ Processing...';

        const response = await secureFetch('/api/secure/level/purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level: level.level })
        });

        if (!response.success) {
            showAppAlert(response.message || 'Purchase failed', 'error');
            return;
        }

        showAppReward(`🎉 Upgraded to ${level.name}!`, `+${level.dailyReward} DASH/day reward unlocked for Daily Task!`);
        toggleLevelDetail();
        await new Promise(r => setTimeout(r, 500));
        await loadLevels();

        const profile = await secureFetch('/api/secure/profile');
        updateHeaderBalances(profile.balance);

    } catch (error) {
        console.error('Purchase error:', error);
        showAppAlert('Error processing purchase', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// Initialize levels on tab switch
function initializeLevelsTab() {
    loadLevels();
}
// Upgrade to next level - called from Profile tab
async function upgradeToNextLevel() {
    try {
        // Fetch current user level
        const userRes = await secureFetch('/api/secure/user/level');
        const currentLevel = userRes?.level || 0;
        const nextLevelNumber = Math.min(currentLevel + 1, 10); // Cap at level 10
        
        // Find the next level config
        const nextLevelConfig = LEVEL_CONFIG.find(l => l.level === nextLevelNumber);
        
        if (!nextLevelConfig) {
            showAppAlert('Max level reached!', 'info');
            return;
        }
        
        // Switch to levels tab
        switchTab('levels', document.getElementById('nav-item'));
        
        // Wait for tab transition, then load and show details
        await new Promise(r => setTimeout(r, 300));
        await loadLevels();
        showLevelDetails(nextLevelConfig);
        
    } catch (error) {
        console.error('Error upgrading to next level:', error);
        showAppAlert('Failed to load level info', 'error');
    }
}
// Track tasks currently in progress
let activeTasks = {};
