/* ============================================================
   MODALS & SHEETS MANAGER
   ============================================================ */

class ModalsManager {
    constructor() {
        this.activeModals = new Set();
        this.modalStack = [];
        this.init();
    }

    init() {
        // Setup global modal close listeners
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.closeTopModal();
            }
        });

        // Setup keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTopModal();
            }
        });
    }

    /**
     * Open a modal/sheet
     */
    open(modalId, options = {}) {
        const backdrop = document.getElementById(`${modalId}-backdrop`);
        if (!backdrop) {
            console.error(`Modal backdrop not found: ${modalId}-backdrop`);
            return false;
        }

        backdrop.classList.add('active');
        this.activeModals.add(modalId);
        this.modalStack.push(modalId);

        // Trigger modal-specific init
        const initFn = window[`init${this.toPascalCase(modalId)}`];
        if (initFn && typeof initFn === 'function') {
            initFn(options);
        }

        return true;
    }

    /**
     * Close a specific modal
     */
    close(modalId) {
        const backdrop = document.getElementById(`${modalId}-backdrop`);
        if (backdrop) {
            backdrop.classList.remove('active');
        }
        this.activeModals.delete(modalId);
        this.modalStack = this.modalStack.filter(id => id !== modalId);
    }

    /**
     * Close the topmost modal
     */
    closeTopModal() {
        if (this.modalStack.length > 0) {
            const topModal = this.modalStack[this.modalStack.length - 1];
            this.close(topModal);
        }
    }

    /**
     * Close all modals
     */
    closeAll() {
        [...this.activeModals].forEach(modalId => this.close(modalId));
    }

    /**
     * Check if a modal is open
     */
    isOpen(modalId) {
        return this.activeModals.has(modalId);
    }

    /**
     * Get currently active modals
     */
    getActiveModals() {
        return Array.from(this.activeModals);
    }

    /**
     * Convert to PascalCase
     */
    toPascalCase(str) {
        return str.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join('');
    }
}

// Initialize modals manager
const modalsManager = new ModalsManager();

/**
 * Sheet Drawer Helper Functions
 */
class SheetDrawer {
    static openSheet(sheetId, data = {}) {
        modalsManager.open(sheetId, data);
    }

    static closeSheet(sheetId) {
        modalsManager.close(sheetId);
    }

    static closeTopSheet() {
        modalsManager.closeTopModal();
    }

    /**
     * Get sheet data from backdrop
     */
    static getSheetData(sheetId) {
        const backdrop = document.getElementById(`${sheetId}-backdrop`);
        if (!backdrop) return null;

        const data = {};
        backdrop.querySelectorAll('[data-field]').forEach(el => {
            const fieldName = el.dataset.field;
            const value = el.value || el.textContent;
            data[fieldName] = value;
        });

        return data;
    }

    /**
     * Set sheet data
     */
    static setSheetData(sheetId, data) {
        const backdrop = document.getElementById(`${sheetId}-backdrop`);
        if (!backdrop) return false;

        Object.entries(data).forEach(([key, value]) => {
            const field = backdrop.querySelector(`[data-field="${key}"]`);
            if (field) {
                if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') {
                    field.value = value;
                } else {
                    field.textContent = value;
                }
            }
        });

        return true;
    }

    /**
     * Setup form submission in sheet
     */
    static onSubmit(sheetId, formSelector, callback) {
        const backdrop = document.getElementById(`${sheetId}-backdrop`);
        if (!backdrop) return false;

        const form = backdrop.querySelector(formSelector);
        if (!form) return false;

        const submitBtn = form.querySelector('[type="submit"]') || 
                          form.querySelector('.sheet-btn-primary');

        if (submitBtn) {
            submitBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                submitBtn.classList.add('loading');
                submitBtn.disabled = true;

                try {
                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData);
                    await callback(data);
                    this.closeSheet(sheetId);
                } catch (error) {
                    notifications.error(error.message || 'An error occurred');
                    console.error('Form submission error:', error);
                } finally {
                    submitBtn.classList.remove('loading');
                    submitBtn.disabled = false;
                }
            });
        }

        return true;
    }
}

/**
 * Common Modal Handler Functions
 */

// Wallet Transfer Modal
function initWalletTransfer(data = {}) {
    const form = document.querySelector('[data-modal="wallet-transfer"] form');
    if (!form) return;

    const submitBtn = form.querySelector('.sheet-btn-primary');
    if (submitBtn) {
        submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const recipientId = form.querySelector('[name="recipient_id"]')?.value;
            const amount = form.querySelector('[name="amount"]')?.value;

            if (!recipientId || !amount) {
                notifications.warning('Please fill in all fields');
                return;
            }

            submitBtn.classList.add('loading');
            submitBtn.disabled = true;

            try {
                const result = await apiEndpoints.transfer({
                    recipient_id: recipientId,
                    amount: parseFloat(amount)
                });

                if (result.success) {
                    notifications.success('Transfer successful!');
                    modalsManager.close('wallet-transfer');
                    // Refresh wallet balance
                    if (window.refreshWalletBalance) {
                        window.refreshWalletBalance();
                    }
                }
            } catch (error) {
                notifications.error(error.message || 'Transfer failed');
            } finally {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        });
    }
}

// Wallet Withdraw Modal
function initWalletWithdraw(data = {}) {
    const form = document.querySelector('[data-modal="wallet-withdraw"] form');
    if (!form) return;

    const submitBtn = form.querySelector('.sheet-btn-primary');
    if (submitBtn) {
        submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const address = form.querySelector('[name="wallet_address"]')?.value;
            const amount = form.querySelector('[name="amount"]')?.value;

            if (!address || !amount) {
                notifications.warning('Please fill in all fields');
                return;
            }

            submitBtn.classList.add('loading');
            submitBtn.disabled = true;

            try {
                const result = await apiEndpoints.withdraw({
                    wallet_address: address,
                    amount: parseFloat(amount)
                });

                if (result.success) {
                    notifications.success('Withdrawal initiated!');
                    modalsManager.close('wallet-withdraw');
                    if (window.refreshWalletBalance) {
                        window.refreshWalletBalance();
                    }
                }
            } catch (error) {
                notifications.error(error.message || 'Withdrawal failed');
            } finally {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        });
    }
}

// Lucky Spin Modal
function initLuckySpin(data = {}) {
    const spinBtn = document.querySelector('[data-modal="lucky-spin"] .spin-button');
    if (spinBtn) {
        spinBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            spinBtn.classList.add('loading');
            spinBtn.disabled = true;

            try {
                const result = await apiEndpoints.spinWheel();
                
                if (result.success) {
                    const reward = result.reward;
                    notifications.success(`You won: ${reward.name}!`);
                    
                    // Show reward animation if available
                    if (window.showRewardAnimation) {
                        window.showRewardAnimation(reward);
                    }

                    // Refresh user balance
                    if (window.refreshUserBalance) {
                        window.refreshUserBalance();
                    }
                }
            } catch (error) {
                notifications.error(error.message || 'Spin failed');
            } finally {
                spinBtn.classList.remove('loading');
                spinBtn.disabled = false;
            }
        });
    }
}

/**
 * Generic modal show/hide utilities
 */
const Modal = {
    show: (id, data) => modalsManager.open(id, data),
    hide: (id) => modalsManager.close(id),
    hideAll: () => modalsManager.closeAll(),
    isOpen: (id) => modalsManager.isOpen(id),
    getActive: () => modalsManager.getActiveModals()
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ModalsManager,
        modalsManager,
        SheetDrawer,
        Modal
    };
}
