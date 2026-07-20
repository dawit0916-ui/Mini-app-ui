/* ============================================================
   API CLIENT & REQUEST HANDLER
   ============================================================ */

/**
 * Main API request handler
 * Handles auth, retries, and error management
 */
class APIClient {
    constructor(config) {
        this.baseUrl = config.api.baseUrl;
        this.timeout = config.api.timeout;
        this.retryAttempts = config.api.retryAttempts;
        this.retryDelay = config.api.retryDelay;
    }

    /**
     * Fetch wrapper with error handling and retries
     */
    async request(endpoint, options = {}, retryCount = 0) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add auth token if available
        if (APP_CONFIG.user.token) {
            headers['Authorization'] = `Bearer ${APP_CONFIG.user.token}`;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(url, {
                ...options,
                headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                // Handle 401 Unauthorized
                if (response.status === 401) {
                    this.handleUnauthorized();
                    throw new Error('Unauthorized - Please login again');
                }

                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            // Handle empty response
            if (response.status === 204) {
                return { success: true };
            }

            return await response.json();

        } catch (error) {
            // Retry on network errors
            if (retryCount < this.retryAttempts && error.name !== 'AbortError') {
                await this.delay(this.retryDelay);
                return this.request(endpoint, options, retryCount + 1);
            }

            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    /**
     * GET request
     */
    async get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    /**
     * POST request
     */
    async post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT request
     */
    async put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE request
     */
    async delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }

    /**
     * Handle unauthorized errors
     */
    handleUnauthorized() {
        APP_CONFIG.user.token = null;
        APP_CONFIG.user.id = null;
        // Redirect to login or show auth modal
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize API client
const api = new APIClient(APP_CONFIG);

/**
 * Secure fetch wrapper (alias for API client)
 * Maintains backward compatibility
 */
async function secureFetch(endpoint, options = {}) {
    return api.request(endpoint, options);
}

/**
 * Specific API endpoint handlers
 */
const apiEndpoints = {
    // Auth
    login: (data) => api.post('/login', data),
    logout: () => api.post('/logout', {}),
    verify: () => api.post('/verify-membership', {}),
    
    // User Profile
    getProfile: () => api.get('/user/profile'),
    updateProfile: (data) => api.put('/user/profile', data),
    
    // Wallet
    getWallet: () => api.get('/wallet'),
    transfer: (data) => api.post('/wallet/transfer', data),
    withdraw: (data) => api.post('/wallet/withdraw', data),
    
    // Referrals
    getReferrals: () => api.get('/referrals'),
    getReferralLink: () => api.get('/referrals/link'),
    
    // Tasks
    getTasks: () => api.get('/tasks'),
    completeTask: (taskId) => api.post(`/tasks/${taskId}/complete`, {}),
    
    // Games
    getGames: () => api.get('/games'),
    playGame: (gameId, data) => api.post(`/games/${gameId}/play`, data),
    
    // Video/Lessons
    getLessons: () => api.get('/lessons'),
    getLesson: (lessonId) => api.get(`/lessons/${lessonId}`),
    getVideoUrl: (lessonId) => api.get(`/lessons/${lessonId}/video`),
    markLessonComplete: (lessonId) => api.post(`/lessons/${lessonId}/complete`, {}),
    
    // Wheel/Spin
    spinWheel: () => api.post('/wheel/spin', {}),
    getWheelRewards: () => api.get('/wheel/rewards'),
    
    // Admin
    getAdminStats: () => api.get('/admin/stats'),
    getUsers: () => api.get('/admin/users'),
    getUserDetails: (userId) => api.get(`/admin/users/${userId}`)
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { api, secureFetch, apiEndpoints };
}
