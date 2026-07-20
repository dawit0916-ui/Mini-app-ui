/* ============================================================
   APPLICATION CONFIGURATION
   ============================================================ */

const APP_CONFIG = {
    // API Configuration
    api: {
        baseUrl: '/api',
        timeout: 10000,
        retryAttempts: 3,
        retryDelay: 1000
    },

    // Telegram WebApp
    telegram: {
        webAppReady: false,
        userId: null,
        username: null,
        firstName: null,
        lastName: null
    },

    // App State
    user: {
        id: null,
        profile: null,
        balance: 0,
        token: null
    },

    // UI Configuration
    ui: {
        animationDuration: 300,
        toastDuration: 3000,
        modalZIndex: 8000,
        dateFormat: 'MMM DD, YYYY',
        timeFormat: '12h'
    },

    // Video Player
    videoPlayer: {
        defaultQuality: 'auto',
        autoplay: false,
        muted: false,
        volume: 1
    },

    // Feature Flags
    features: {
        videoProtection: true,
        watermarking: true,
        verificationGate: true,
        referrals: true,
        wheelSpin: true,
        wallet: true
    },

    // Verification
    verification: {
        channelHandle: '@dashpremiumbeta',
        groupHandle: '@dashpremiumgroup',
        retryInterval: 5000
    }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APP_CONFIG;
}
