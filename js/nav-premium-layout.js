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
function initPremiumNavigation() {
    const container = document.getElementById('navButtonsContainer');
    if (!container) {
        console.warn('Navigation container not found');
        return;
    }

    // Initial calculation
    recalculateNavLayout();

    // Set up click handlers with proper delegation
    document.querySelectorAll('.nav-btn').forEach((btn) => {
        
        // 1. Click Event
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const visibleIndex = navState.visibleButtons.indexOf(btn);
            if (visibleIndex !== -1) {
                animateNavLayout(visibleIndex);
            }
        });

        // 2. Touch Start Event (UPDATED)
        btn.addEventListener('touchstart', (e) => {
            const visibleIndex = navState.visibleButtons.indexOf(btn);
            if (visibleIndex !== -1) {
                const targetX = navState.positions[visibleIndex];
                const isActive = btn.classList.contains('nav-active');
                
                // We combine translateX with the scale/lift animations
                btn.style.transform = isActive 
                    ? `translateX(${targetX}px) scale(1.25) translateY(-12px)` 
                    : `translateX(${targetX}px) scale(0.95) translateY(0)`;
            }
        });
        
        // 3. Touch End Event
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
 * Calculate pixel positions using a Wrap-Around Carousel algorithm
 */
function calculateButtonPositions() {
    const buttonCount = navState.visibleButtons.length;
    navState.positions = [];

    // Width of a single button slot
    const effectiveButtonWidth = navState.containerWidth / buttonCount;
    
    // Find the index of the exact middle slot
    const centerSlot = Math.floor((buttonCount - 1) / 2);
    const activeIndex = navState.activeButtonIndex;
    
    const half = Math.floor(buttonCount / 2);

    for (let i = 0; i < buttonCount; i++) {
        let distance = i - activeIndex;

        // CAROUSEL WRAP-AROUND LOGIC
        // If a button is too far right, wrap it to the left side
        if (distance > half) {
            distance -= buttonCount;
        } else if (distance < -(buttonCount - half - 1)) {
            distance += buttonCount;
        }

        // Map the wrapped distance to a physical slot (active button = centerSlot)
        const targetSlot = centerSlot + distance;

        // Calculate absolute left position in pixels
        const position = targetSlot * effectiveButtonWidth;
        navState.positions.push(position);
    }
}

/**
 * Apply layout transformations, combining Slide + Scale + Lift natively
 */
function applyNavLayout(animate = true) {
    const effectiveButtonWidth = navState.containerWidth / navState.visibleButtons.length;

    navState.visibleButtons.forEach((btn, index) => {
        const targetX = navState.positions[index];
        const isActive = index === navState.activeButtonIndex;

        // Force uniform width so items center perfectly within their slots
        btn.style.width = `${effectiveButtonWidth}px`;

        // Combine X slide with active scaling and Y lift
        const transformString = isActive 
            ? `translateX(${targetX}px) scale(1.3) translateY(-12px)`
            : `translateX(${targetX}px) scale(1) translateY(0)`;

        if (!animate) {
            btn.style.transition = 'none';
            btn.style.transform = transformString;
            void btn.offsetWidth; // Force reflow
            btn.style.transition = '';
        } else {
            btn.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
            btn.style.transform = transformString;
        }
    });
}



/**
 * Animate to a new active button
 * @param {number} newIndex - Index of button to activate
 */
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
