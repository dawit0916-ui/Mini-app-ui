/* ============================================================
   UI MANAGER - DOM & STATE MANAGEMENT
   ============================================================ */

class UIManager {
    constructor() {
        this.modals = new Map();
        this.toasts = [];
        this.isLoading = false;
    }

    /**
     * Show loading overlay
     */
    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            this.isLoading = true;
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            this.isLoading = false;
        }
    }

    /**
     * Open modal/sheet
     */
    openModal(modalId, data = {}) {
        const backdrop = document.getElementById(`${modalId}-backdrop`);
        if (backdrop) {
            backdrop.classList.add('active');
            // Trigger any modal-specific initialization
            if (window[`init${this.toPascalCase(modalId)}`]) {
                window[`init${this.toPascalCase(modalId)}`](data);
            }
        }
    }

    /**
     * Close modal/sheet
     */
    closeModal(modalId) {
        const backdrop = document.getElementById(`${modalId}-backdrop`);
        if (backdrop) {
            backdrop.classList.remove('active');
        }
    }

    /**
     * Close all modals
     */
    closeAllModals() {
        document.querySelectorAll('.modal-backdrop.active').forEach(backdrop => {
            backdrop.classList.remove('active');
        });
    }

    /**
     * Show notification toast
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `notification notification-${type} fade-in`;
        toast.innerHTML = `
            <div class="notification-content">
                <span>${this.escapeHtml(message)}</span>
            </div>
        `;

        const container = document.querySelector('.notification-container') || 
                          this.createNotificationContainer();
        container.appendChild(toast);

        this.toasts.push(toast);

        // Auto-remove after duration
        setTimeout(() => {
            toast.classList.remove('fade-in');
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
            this.toasts = this.toasts.filter(t => t !== toast);
        }, duration);

        return toast;
    }

    /**
     * Show alert dialog
     */
    async showAlert(title, message, buttons = ['OK']) {
        return new Promise(resolve => {
            const dialog = document.createElement('div');
            dialog.className = 'custom-alert modal-backdrop active';
            dialog.innerHTML = `
                <div class="alert-content card">
                    <h2>${this.escapeHtml(title)}</h2>
                    <p>${this.escapeHtml(message)}</p>
                    <div class="alert-buttons">
                        ${buttons.map((btn, i) => `
                            <button class="btn btn-primary" data-index="${i}">
                                ${this.escapeHtml(btn)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);

            dialog.querySelectorAll('.alert-buttons button').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.index);
                    dialog.remove();
                    resolve(index);
                });
            });
        });
    }

    /**
     * Update element content safely
     */
    updateElement(selector, content) {
        const el = document.querySelector(selector);
        if (el) {
            if (typeof content === 'string') {
                el.textContent = content;
            } else if (content instanceof HTMLElement) {
                el.replaceChildren(content);
            }
        }
    }

    /**
     * Show/hide element
     */
    toggle(selector, show = true) {
        const el = document.querySelector(selector);
        if (el) {
            if (show) {
                el.classList.remove('hidden');
                el.classList.add('visible');
            } else {
                el.classList.add('hidden');
                el.classList.remove('visible');
            }
        }
    }

    /**
     * Add CSS class
     */
    addClass(selector, className) {
        document.querySelectorAll(selector).forEach(el => {
            el.classList.add(className);
        });
    }

    /**
     * Remove CSS class
     */
    removeClass(selector, className) {
        document.querySelectorAll(selector).forEach(el => {
            el.classList.remove(className);
        });
    }

    /**
     * Enable/disable button
     */
    setButtonState(selector, enabled = true) {
        document.querySelectorAll(selector).forEach(btn => {
            btn.disabled = !enabled;
            if (enabled) {
                btn.classList.remove('loading');
            }
        });
    }

    /**
     * Set button loading state
     */
    setButtonLoading(selector, loading = true) {
        document.querySelectorAll(selector).forEach(btn => {
            if (loading) {
                btn.classList.add('loading');
                btn.disabled = true;
            } else {
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        });
    }

    /**
     * Escape HTML special characters
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Format currency
     */
    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(amount);
    }

    /**
     * Format number
     */
    formatNumber(num) {
        return new Intl.NumberFormat('en-US').format(num);
    }

    /**
     * Format date
     */
    formatDate(date, format = 'short') {
        const d = new Date(date);
        if (format === 'short') {
            return d.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            });
        }
        return d.toLocaleDateString('en-US');
    }

    /**
     * Create notification container if it doesn't exist
     */
    createNotificationContainer() {
        const container = document.createElement('div');
        container.className = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
        `;
        document.body.appendChild(container);
        return container;
    }

    /**
     * Animate element entrance
     */
    animateIn(element, animation = 'fade-in') {
        element.classList.add(animation);
        element.addEventListener('animationend', () => {
            element.classList.remove(animation);
        }, { once: true });
    }

    /**
     * Animate element exit
     */
    async animateOut(element, animation = 'fade-out') {
        element.classList.add(animation);
        return new Promise(resolve => {
            element.addEventListener('animationend', () => {
                element.classList.remove(animation);
                resolve();
            }, { once: true });
        });
    }

    /**
     * Debounce function
     */
    debounce(func, delay = 300) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Throttle function
     */
    throttle(func, limit = 300) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Convert string to PascalCase
     */
    toPascalCase(str) {
        return str.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join('');
    }

    /**
     * Copy to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copied to clipboard!', 'success');
            return true;
        } catch (err) {
            console.error('Failed to copy:', err);
            this.showToast('Failed to copy', 'error');
            return false;
        }
    }

    /**
     * Share content
     */
    async share(title, text, url) {
        try {
            if (navigator.share) {
                await navigator.share({ title, text, url });
            } else {
                await this.copyToClipboard(url);
            }
        } catch (err) {
            console.error('Share failed:', err);
        }
    }
}

// Initialize global UI manager
const ui = new UIManager();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UIManager, ui };
}
