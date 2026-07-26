/**
 * PREMIUM MOBILE NAVIGATION LAYOUT ENGINE
 * 
 * Features:
 * - Dynamic center-pivot positioning (no hard-coded values)
 * - Spring/ease-out animations (cubic-bezier(0.34, 1.56, 0.64, 1))
 * - Responsive to all screen widths
 * - Handles hidden buttons (Admin toggle)
 * - Smooth button distribution on both sides of active button
 * - Resize and orientation change handling
 * - GPU-accelerated transforms
 * - Zero layout shifts
 */

// Global state for navigation layout
const navState = {
    activeButtonIndex: 0,
    visibleButtons: [],
    containerWidth: 0,
    buttonWidth: 0,
    positions: [],
    animationFrameId: null,
    isCalculating: false
};

/**
 * Initialize premium navigation on DOM ready
 */
function initPremiumNavigation() {
    const container = document.getElementById('navButtonsContainer');
    if (!container) {
        console.warn('Navigation container not found');
        return;
    }

    // Initial calculation
    recalculateNavLayout();

    // Set up click handlers with proper delegation
    document.querySelectorAll('.nav-btn').forEach((btn, index) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const visibleIndex = navState.visibleButtons.indexOf(btn);
            if (visibleIndex !== -1) {
                animateNavLayout(visibleIndex);
            }
        });
    });

    // Prevent default behavior
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
            btn.style.transform = btn.classList.contains('nav-active') 
                ? 'scale(1.25) translateY(-12px)' 
                : 'scale(0.95)';
        });
        btn.addEventListener('touchend', (e) => {
            recalculateNavLayout();
        });
    });
}

/**
 * Recalculate navigation layout (called on resize, orientation change)
 */
function recalculateNavLayout() {
    if (navState.isCalculating) return;
    navState.isCalculating = true;

    const container = document.getElementById('navButtonsContainer');
    if (!container) return;

    // Get all visible buttons (not hidden)
    navState.visibleButtons = Array.from(
        document.querySelectorAll('.nav-btn:not(.hidden)')
    );

    if (navState.visibleButtons.length === 0) {
        navState.isCalculating = false;
        return;
    }

    // Container dimensions
    const navBar = document.getElementById('bottom-nav');
    const rect = navBar.getBoundingClientRect();
    navState.containerWidth = rect.width - 24; // Account for padding (px-3 = 0.75rem on each side)

    // Calculate button width based on container and visible count
    navState.buttonWidth = navState.containerWidth / navState.visibleButtons.length;

    // Find active button index
    const activeBtn = document.querySelector('.nav-btn.nav-active');
    navState.activeButtonIndex = navState.visibleButtons.indexOf(activeBtn);
    if (navState.activeButtonIndex === -1) {
        navState.activeButtonIndex = 0;
    }

    // Calculate positions for all buttons
    calculateButtonPositions();

    // Apply layout (without triggering animations)
    applyNavLayout(false);

    navState.isCalculating = false;
}

/**
 * Calculate pixel positions for each button
 * Positions are relative to container center
 */
function calculateButtonPositions() {
    const buttonCount = navState.visibleButtons.length;
    navState.positions = [];

    const centerX = navState.containerWidth / 2;
    const activeIndex = navState.activeButtonIndex;

    // Button width with proper spacing
    const effectiveButtonWidth = navState.containerWidth / buttonCount;

    for (let i = 0; i < buttonCount; i++) {
        let position = 0;

        if (i === activeIndex) {
            // Active button stays at center
            position = centerX - effectiveButtonWidth / 2;
        } else if (i < activeIndex) {
            // Buttons to the left of active
            const distanceFromActive = activeIndex - i;
            position = centerX - (distanceFromActive + 1) * effectiveButtonWidth;
        } else {
            // Buttons to the right of active
            const distanceFromActive = i - activeIndex;
            position = centerX + distanceFromActive * effectiveButtonWidth;
        }

        navState.positions.push(position);
    }
}

/**
 * Apply layout transformations to buttons
 * @param {boolean} animate - Whether to enable transitions
 
function applyNavLayout(animate = true) {
    navState.visibleButtons.forEach((btn, index) => {
        const targetX = navState.positions[index];

        if (!animate) {
            // Instant layout (no animation)
            btn.style.transition = 'none';
            btn.style.transform = `translateX(${targetX}px)`;
            // Force repaint
            void btn.offsetWidth;
            btn.style.transition = '';
        } else {
            // Animated layout (spring ease)
            btn.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
            btn.style.transform = `translateX(${targetX}px)`;
        }
    });
}

/**
 * Animate to a new active button
 * @param {number} newIndex - Index of button to activate
 
function animateNavLayout(newIndex) {
    if (newIndex === navState.activeButtonIndex || newIndex >= navState.visibleButtons.length) {
        return;
    }

    // Update active state
    navState.visibleButtons.forEach((btn, index) => {
        if (index === newIndex) {
            btn.classList.add('nav-active');
        } else {
            btn.classList.remove('nav-active');
        }
    });

    navState.activeButtonIndex = newIndex;

    // Recalculate positions
    calculateButtonPositions();

    // Apply animated layout
    applyNavLayout(true);
}
*/
/**
 * Get the current active button element
 * @returns {HTMLElement|null}
 */
function getActiveNavButton() {
    return navState.visibleButtons[navState.activeButtonIndex] || null;
}

/**
 * Switch to button by tab ID (called from switchTab)
 * @param {string} tabId - The tab ID to switch to
 */
function switchToNavButton(tabId) {
    const button = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
    if (!button) return;

    const index = navState.visibleButtons.indexOf(button);
    if (index !== -1) {
        animateNavLayout(index);
    }
}

/**
 * Handle window resize with debounce
 */
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        recalculateNavLayout();
    }, 150);
});

/**
 * Handle orientation change
 */
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        recalculateNavLayout();
    }, 300);
});

/**
 * Expose public API
 */
window.premiumNav = {
    init: initPremiumNavigation,
    recalculate: recalculateNavLayout,
    switchTo: switchToNavButton,
    getActive: getActiveNavButton,
    getState: () => ({ ...navState })
};

// Auto-initialize if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPremiumNavigation);
} else {
    initPremiumNavigation();
}
