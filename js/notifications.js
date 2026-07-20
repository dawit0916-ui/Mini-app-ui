/* ============================================================
   NOTIFICATIONS SYSTEM
   ============================================================ */

class NotificationManager {
    constructor() {
        this.toasts = [];
        this.maxToasts = 5;
        this.container = null;
        this.init();
    }

    init() {
        // Create notifications container
        this.container = document.createElement('div');
        this.container.className = 'notifications-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9000;
            display: flex;
            flex-direction: column;
            gap: 12px;
            max-width: 400px;
            pointer-events: none;
        `;
        document.body.appendChild(this.container);
    }

    /**
     * Show notification toast
     */
    show(message, type = 'info', duration = 3000, icon = null) {
        // Limit number of toasts
        if (this.toasts.length >= this.maxToasts) {
            const oldest = this.toasts.shift();
            oldest.element.remove();
        }

        const toastId = Date.now();
        const toast = document.createElement('div');
        toast.className = `notification notification-${type} notification-enter`;
        toast.style.pointerEvents = 'auto';
        
        const iconHtml = icon ? `<span class="notification-icon">${icon}</span>` : '';
        
        toast.innerHTML = `
            <div class="notification-content">
                ${iconHtml}
                <div class="notification-text">
                    <span>${this.escapeHtml(message)}</span>
                </div>
                <button class="notification-close" data-toast-id="${toastId}">&times;</button>
            </div>
        `;

        this.container.appendChild(toast);
        this.container.style.pointerEvents = 'auto';

        const toastObj = { id: toastId, element: toast, timeout: null };
        this.toasts.push(toastObj);

        // Close button handler
        toast.querySelector('.notification-close').addEventListener('click', () => {
            this.remove(toastId);
        });

        // Auto-remove after duration
        if (duration > 0) {
            toastObj.timeout = setTimeout(() => this.remove(toastId), duration);
        }

        return toastId;
    }

    /**
     * Remove notification
     */
    remove(toastId) {
        const index = this.toasts.findIndex(t => t.id === toastId);
        if (index !== -1) {
            const toast = this.toasts[index];
            clearTimeout(toast.timeout);
            
            toast.element.classList.remove('notification-enter');
            toast.element.classList.add('notification-exit');
            
            setTimeout(() => {
                toast.element.remove();
                this.toasts.splice(index, 1);
            }, 300);
        }
    }

    /**
     * Success notification
     */
    success(message, duration = 3000) {
        return this.show(message, 'success', duration, '✓');
    }

    /**
     * Error notification
     */
    error(message, duration = 4000) {
        return this.show(message, 'error', duration, '✕');
    }

    /**
     * Warning notification
     */
    warning(message, duration = 3500) {
        return this.show(message, 'warning', duration, '⚠');
    }

    /**
     * Info notification
     */
    info(message, duration = 3000) {
        return this.show(message, 'info', duration, 'ℹ');
    }

    /**
     * Persistent notification (no auto-close)
     */
    persistent(message, type = 'info') {
        return this.show(message, type, 0);
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Clear all notifications
     */
    clearAll() {
        this.toasts.forEach(toast => {
            clearTimeout(toast.timeout);
            toast.element.remove();
        });
        this.toasts = [];
    }
}

/**
 * Alert Dialog Manager
 */
class AlertManager {
    /**
     * Show confirmation dialog
     */
    static async confirm(title, message, buttons = { yes: 'Confirm', no: 'Cancel' }) {
        return new Promise(resolve => {
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop active';
            backdrop.style.zIndex = '9500';
            backdrop.innerHTML = `
                <div class="alert-dialog">
                    <div class="alert-header">
                        <h3>${this.escapeHtml(title)}</h3>
                    </div>
                    <div class="alert-body">
                        <p>${this.escapeHtml(message)}</p>
                    </div>
                    <div class="alert-footer">
                        <button class="btn btn-secondary btn-cancel">${this.escapeHtml(buttons.no)}</button>
                        <button class="btn btn-primary btn-confirm">${this.escapeHtml(buttons.yes)}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(backdrop);

            backdrop.querySelector('.btn-confirm').addEventListener('click', () => {
                backdrop.remove();
                resolve(true);
            });

            backdrop.querySelector('.btn-cancel').addEventListener('click', () => {
                backdrop.remove();
                resolve(false);
            });

            // Close on backdrop click
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    backdrop.remove();
                    resolve(false);
                }
            });
        });
    }

    /**
     * Show alert dialog
     */
    static async alert(title, message) {
        return new Promise(resolve => {
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop active';
            backdrop.style.zIndex = '9500';
            backdrop.innerHTML = `
                <div class="alert-dialog">
                    <div class="alert-header">
                        <h3>${this.escapeHtml(title)}</h3>
                    </div>
                    <div class="alert-body">
                        <p>${this.escapeHtml(message)}</p>
                    </div>
                    <div class="alert-footer">
                        <button class="btn btn-primary btn-ok">OK</button>
                    </div>
                </div>
            `;

            document.body.appendChild(backdrop);

            const close = () => {
                backdrop.remove();
                resolve();
            };

            backdrop.querySelector('.btn-ok').addEventListener('click', close);
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) close();
            });
        });
    }

    /**
     * Show prompt dialog
     */
    static async prompt(title, message, placeholder = '') {
        return new Promise(resolve => {
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop active';
            backdrop.style.zIndex = '9500';
            backdrop.innerHTML = `
                <div class="alert-dialog">
                    <div class="alert-header">
                        <h3>${this.escapeHtml(title)}</h3>
                    </div>
                    <div class="alert-body">
                        <p>${this.escapeHtml(message)}</p>
                        <input type="text" class="prompt-input" placeholder="${this.escapeHtml(placeholder)}" />
                    </div>
                    <div class="alert-footer">
                        <button class="btn btn-secondary btn-cancel">Cancel</button>
                        <button class="btn btn-primary btn-ok">OK</button>
                    </div>
                </div>
            `;

            document.body.appendChild(backdrop);
            const input = backdrop.querySelector('.prompt-input');
            input.focus();

            const close = (value) => {
                backdrop.remove();
                resolve(value);
            };

            backdrop.querySelector('.btn-ok').addEventListener('click', () => {
                close(input.value);
            });

            backdrop.querySelector('.btn-cancel').addEventListener('click', () => {
                close(null);
            });

            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') close(input.value);
            });

            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) close(null);
            });
        });
    }

    /**
     * Escape HTML
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize notification manager globally
const notifications = new NotificationManager();

// Helper function for backward compatibility
function showNotificationToast(message, type = 'info') {
    return notifications.show(message, type);
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NotificationManager, AlertManager, notifications };
}
