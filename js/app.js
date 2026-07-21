/* ============================================================
   MAIN APPLICATION INITIALIZATION
   ============================================================ */

/**
 * Initialize Telegram WebApp
 */
function initTelegramWebApp() {
    try {
        if (window.Telegram?.WebApp) {
            const webapp = window.Telegram.WebApp;
            
            // Expand to full height
            webapp.expand();
            
            // Get user data
            const user = webapp.initDataUnsafe?.user;
            if (user) {
                APP_CONFIG.user.id = user.id;
                APP_CONFIG.telegram.userId = user.id;
                APP_CONFIG.telegram.username = user.username;
                APP_CONFIG.telegram.firstName = user.first_name;
                APP_CONFIG.telegram.lastName = user.last_name;
                APP_CONFIG.telegram.webAppReady = true;

                console.log('Telegram WebApp initialized:', {
                    userId: user.id,
                    username: user.username
                });
            }

            // Set up header color
            webapp.setHeaderColor('#0a041c');
            webapp.setBackgroundColor('#0a041c');
            
            // Make webapp ready
            if (webapp.ready) {
                webapp.ready();
            }
        }
    } catch (error) {
        console.error('Telegram WebApp initialization error:', error);
    }
}

/**
 * Load user profile
 */
async function loadUserProfile() {
    try {
        ui.showLoading();
        const profile = await apiEndpoints.getProfile();
        
        if (profile) {
            APP_CONFIG.user.profile = profile;
            APP_CONFIG.user.balance = profile.balance || 0;
            
            // Update UI with user data
            updateUserUI(profile);
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
        notifications.error('Failed to load profile');
    } finally {
        ui.hideLoading();
    }
}

/**
 * Update UI with user information
 */
function updateUserUI(profile) {
    // Update username
    const usernameEl = document.querySelector('[data-user-username]');
    if (usernameEl && profile.username) {
        usernameEl.textContent = `@${profile.username}`;
    }

    // Update balance
    const balanceEl = document.querySelector('[data-user-balance]');
    if (balanceEl && profile.balance !== undefined) {
        balanceEl.textContent = ui.formatCurrency(profile.balance);
    }

    // Update avatar
    const avatarEl = document.querySelector('[data-user-avatar]');
    if (avatarEl) {
        if (profile.avatar_url) {
            avatarEl.src = profile.avatar_url;
        } else {
            const initials = (profile.first_name?.[0] || '') + (profile.last_name?.[0] || '');
            avatarEl.textContent = initials || 'U';
        }
    }

    // Update level/rank
    const levelEl = document.querySelector('[data-user-level]');
    if (levelEl && profile.level) {
        levelEl.textContent = `Level ${profile.level}`;
    }
}

/**
 * Initialize navigation
 */
function initNavigation() {
    const navItems = document.querySelectorAll('[data-nav-item]');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            const target = item.dataset.navItem;
            const tabId = `tab-${target}`;
            
            // Remove active from all items
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Hide all tabs
            document.querySelectorAll('[data-tab]').forEach(tab => {
                tab.classList.remove('active', 'visible');
                tab.classList.add('hidden');
            });
            
            // Show target tab
            const tab = document.getElementById(tabId);
            if (tab) {
                tab.classList.remove('hidden');
                tab.classList.add('active', 'visible');
                
                // Trigger tab-specific initialization
                if (window[`init${ui.toPascalCase(target)}Tab`]) {
                    window[`init${ui.toPascalCase(target)}Tab`]();
                }
            }
        });
    });
}

/**
 * Setup global error handler
 */
function setupErrorHandler() {
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        notifications.error('An unexpected error occurred');
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        notifications.error('An unexpected error occurred');
    });
}

/**
 * Setup connection status listener
 */
function setupConnectionStatus() {
    window.addEventListener('online', () => {
        notifications.success('Connection restored');
    });

    window.addEventListener('offline', () => {
        notifications.warning('No internet connection');
    });
}

/**
 * Initialize app state persistence
 */
function setupStatePersistence() {
    // Save app state to localStorage
    setInterval(() => {
        try {
            const state = {
                userId: APP_CONFIG.user.id,
                balance: APP_CONFIG.user.balance,
                lastUpdated: Date.now()
            };
            localStorage.setItem('appState', JSON.stringify(state));
        } catch (error) {
            console.error('Failed to save app state:', error);
        }
    }, 5000); // Save every 5 seconds

    // Restore app state from localStorage
    try {
        const savedState = localStorage.getItem('appState');
        if (savedState) {
            const state = JSON.parse(savedState);
            if (state.userId) {
                APP_CONFIG.user.id = state.userId;
            }
            if (state.balance) {
                APP_CONFIG.user.balance = state.balance;
            }
        }
    } catch (error) {
        console.error('Failed to restore app state:', error);
    }
}

/**
 * Refresh user balance
 */
async function refreshUserBalance() {
    try {
        const wallet = await apiEndpoints.getWallet();
        if (wallet && wallet.balance !== undefined) {
            APP_CONFIG.user.balance = wallet.balance;
            
            const balanceEl = document.querySelector('[data-user-balance]');
            if (balanceEl) {
                balanceEl.textContent = ui.formatCurrency(wallet.balance);
            }
        }
    } catch (error) {
        console.error('Failed to refresh balance:', error);
    }
}

/**
 * Main initialization function
 */
async function initApp() {
    try {
        console.log('Starting app initialization...');

        // Step 1: Initialize Telegram WebApp
        initTelegramWebApp();

        // Step 2: Setup error handlers
        setupErrorHandler();
        setupConnectionStatus();
        setupStatePersistence();

        // Step 3: Load user profile
        await loadUserProfile();

        // Step 4: Initialize UI components
        initNavigation();
        initVideoPlayer();

        // Step 5: Make app interactive
        ui.hideLoading();

        // Step 6: Run any pending verification
        if (APP_CONFIG.features.verificationGate) {
            // Verification gate will auto-initialize
        }

        console.log('App initialization complete');
        
        // Emit custom event for other modules
        window.dispatchEvent(new CustomEvent('appReady', {
            detail: { config: APP_CONFIG }
        }));

    } catch (error) {
        console.error('App initialization failed:', error);
        notifications.error('Failed to initialize app');
        ui.hideLoading();
    }
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K to open command palette (if implemented)
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            // Open command palette
        }

        // Esc to close modals
        if (e.key === 'Escape') {
            modalsManager.closeTopModal();
        }

        // Ctrl/Cmd + / for help
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            // Open help
        }
    });
}

/**
 * Cleanup function for when user leaves
 */
window.addEventListener('beforeunload', () => {
    // Save any pending data
    try {
        const state = {
            userId: APP_CONFIG.user.id,
            balance: APP_CONFIG.user.balance,
            lastUpdated: Date.now()
        };
        sessionStorage.setItem('appStateExit', JSON.stringify(state));
    } catch (error) {
        console.error('Failed to save exit state:', error);
    }
});

/**
 * Setup page visibility listener
 */
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('App backgrounded');
        // Pause videos, animations, etc.
        const videos = document.querySelectorAll('video');
        videos.forEach(v => v.pause());
    } else {
        console.log('App foregrounded');
        // Resume if needed
    }
});

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupKeyboardShortcuts();
        initApp();
    });
} else {
    setupKeyboardShortcuts();
    initApp();
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initApp,
        initTelegramWebApp,
        loadUserProfile,
        refreshUserBalance,
        updateUserUI
    };
}
