
let spinCanvas = null;
let spinCtx = null;
let isSpinningActive = false;
let wheelRotationAngle = 0; 
const WHEEL_SEGMENTS = [
    // Index 0: 1.0% Odds - USDT REWARD
    { text: "1 USDT", type: "USDT", color: "#e11d48", textClr: "#ffffff", iconUrl: "/assets/images/usdt-stack.png" },
    
    // Index 1: 45% Odds - POINTS
    { text: "25 PTS", type: "POINTS", color: "#1e293b", textClr: "#ffffff", iconUrl: "/assets/images/point-coin.png" },
    
    // Index 2: 30% Odds - TRY AGAIN
    { text: "TRY AGAIN", type: "EMPTY", color: "#334155", textClr: "#ffffff", iconUrl: "/assets/images/try-again.png" },
    
    // Index 3: 15% Odds - POINTS
    { text: "100 PTS", type: "POINTS", color: "#581c87", textClr: "#ffffff", iconUrl: "/assets/images/point-stack.png" },
    
    // Index 4: 6% Odds - SPINS
    { text: "1 SPIN", type: "SPINS", color: "#2563eb", textClr: "#ffffff", iconUrl: "/assets/images/spin-coin.png" },
    
    // Index 5: 2.5% Odds - POINTS
    { text: "500 PTS", type: "POINTS", color: "#0f172a", textClr: "#ffffff", iconUrl: "/assets/images/point-stack.png" },
    
    // Index 6: 0.5% Odds - SAFETY BONUS
    { text: "50 PTS", type: "POINTS", color: "#0f766e", textClr: "#ffffff", iconUrl: "/assets/images/point-stack.png" },
    
    // Index 7: 0.5% Odds - JACKPOT (Randomly picks between 3 types!)
    { text: "🎉 JACKPOT!", type: "JACKPOT", color: "#ca8a04", textClr: "#ffffff", iconUrl: "/assets/images/jackpot-coin.png" }
];
// 🆕 ADD THIS MAPPING - Maps wheel index to reward amounts
const spinAmountMap = {
    0: '1.00',      // 1 USDT
    1: '25',        // 25 Points
    2: '0',         // Try Again
    3: '100',       // 100 Points
    4: '1',         // 1 Spin
    5: '500',       // 500 Points
    6: '50',        // 50 Points
    7: '5000'       // Jackpot (varies)
};

const totalSegmentsCount = WHEEL_SEGMENTS.length;
const segmentArcRadiantLength = (2 * Math.PI) / totalSegmentsCount;

// Cache object to store loaded HTMLImageElements
const loadedSegmentIconsCache = {};

// 2. Preloader Engine: Loops through config and boots up image assets into memory
function preloadWheelIconAssets() {
    WHEEL_SEGMENTS.forEach((segment, index) => {
        if (segment.iconUrl) {
            const imgInstance = new Image();
            imgInstance.src = segment.iconUrl;
            imgInstance.onload = () => {
                // Store inside cache once asset successfully streams down
                loadedSegmentIconsCache[index] = imgInstance;
                // Force a redraw once loaded so wheel isn't blank on cold launch
                if (spinCtx) renderWheelStaticFrameState();
            };
            imgInstance.onerror = () => {
                console.warn(`Failed to preload asset icon at pathway: ${segment.iconUrl}`);
            };
        }
    });
}

// Trigger image preloading immediately when script evaluates
preloadWheelIconAssets();

function initializeWheelCanvasContext() {
    // Look up the canvas hardcoded element hook directly
    spinCanvas = document.getElementById('wheel-canvas');
    if (!spinCanvas) return console.error("Canvas element 'wheel-canvas' not found in DOM.");

    spinCtx = spinCanvas.getContext('2d');
    
    // Set initial canvas position shifted by -90 deg so slice 0 starts perfectly centered at 12 o'clock
    wheelRotationAngle = -Math.PI / 2 - (segmentArcRadiantLength / 2);
    
    renderWheelStaticFrameState();
}

function renderWheelStaticFrameState() {
    if (!spinCtx || !spinCanvas) return;
    
    // --- DYNAMIC SCALING RATIO SYSTEM ---
    const displayRect = spinCanvas.getBoundingClientRect();
    const currentDisplayWidth = displayRect.width || 330; 
    
    if (spinCanvas.width !== currentDisplayWidth * 2) {
        spinCanvas.width = currentDisplayWidth * 2;
        spinCanvas.height = currentDisplayWidth * 2;
    }
    
    const centerPointAxis = spinCanvas.width / 2;
    const exteriorOuterRadiusValue = centerPointAxis - 8;
    
    // Wipe layout dirty frames clean
    spinCtx.clearRect(0, 0, spinCanvas.width, spinCanvas.height);
    
    spinCtx.save();
    spinCtx.translate(centerPointAxis, centerPointAxis);
    spinCtx.rotate(wheelRotationAngle); 

    for (let i = 0; i < totalSegmentsCount; i++) {
        const currentAngleRad = i * segmentArcRadiantLength;

        // Draw colored slice wedge background
        spinCtx.beginPath();
        spinCtx.fillStyle = WHEEL_SEGMENTS[i].color || "#1e1b4b";
        spinCtx.moveTo(0, 0);
        spinCtx.arc(0, 0, exteriorOuterRadiusValue, currentAngleRad, currentAngleRad + segmentArcRadiantLength);
        spinCtx.lineTo(0, 0);
        spinCtx.fill();
        
        // Premium subtle segment split separator lines
        spinCtx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        spinCtx.lineWidth = 2;
        spinCtx.stroke();
        
        // Typography Vector Transformation
        spinCtx.save();
        
        const midSegmentAngle = currentAngleRad + (segmentArcRadiantLength / 2);
        spinCtx.rotate(midSegmentAngle);
        
        // REFINED RADIUS PLACEMENT: Pulls the text outward toward the rim edge cleanly
        const textRadiusPlacement = exteriorOuterRadiusValue - 65;
        spinCtx.translate(textRadiusPlacement, 0);
        
        let absoluteTextAngle = (midSegmentAngle + wheelRotationAngle) % (2 * Math.PI);
        if (absoluteTextAngle < 0) absoluteTextAngle += 2 * Math.PI;
        
        const isBottomHalf = absoluteTextAngle > 0 && absoluteTextAngle < Math.PI;
        if (isBottomHalf) {
            spinCtx.rotate(-Math.PI / 2);
        } else {
            spinCtx.rotate(Math.PI / 2);
        }
        
        spinCtx.fillStyle = WHEEL_SEGMENTS[i].textClr || "#FFFFFF";
        spinCtx.textAlign = "center";
        spinCtx.textBaseline = "middle";
        
        // Scale text size proportional to the canvas layout container scale rule
        const textFontSize = Math.floor(spinCanvas.width * 0.042);
        const subFontSize = Math.floor(spinCanvas.width * 0.024);
        
        // 1. Render Main Value Text String
        spinCtx.font = `bold ${textFontSize}px 'Inter', sans-serif`;
        spinCtx.fillText(WHEEL_SEGMENTS[i].text || "", 0, isBottomHalf ? 18 : -18);
        
        // 2. Render Sub-Category text label
        if (WHEEL_SEGMENTS[i].type) {
            spinCtx.fillStyle = "rgba(255, 255, 255, 0.55)";
            spinCtx.font = `800 ${subFontSize}px 'Inter', sans-serif`;
            spinCtx.fillText(WHEEL_SEGMENTS[i].type, 0, isBottomHalf ? -2 : 2);
        }
        
        // 3. Draw segment icon image if loaded
const cachedIcon = loadedSegmentIconsCache[i];
if (cachedIcon) {
    const iconSize = Math.floor(spinCanvas.width * 0.12);
    spinCtx.drawImage(cachedIcon, -iconSize / 2, isBottomHalf ? -5 : 5, iconSize, iconSize);
}

spinCtx.restore();
    }
    
    spinCtx.restore();
}

/* ==========================================================================
   PRODUCTION UTILITY: MODAL OPEN AND DYNAMIC BALANCE HUD SYNC ENGINE
   ========================================================================== */
function openSpinModal() {
    const targetModalNode = document.getElementById('lucky-spin-modal');
    if (!targetModalNode) return console.error("Target element 'lucky-spin-modal' not located in DOM.");

    updateSpinModalCoinsDisplay(); // ← ADD THIS LINE

    targetModalNode.classList.add('show');

    setTimeout(() => {
        initializeWheelCanvasContext();
    }, 150); 
}

function closeSpinModal() {
    if (isSpinningActive) {
        showAppAlert("Please wait until the spin finishes.", 'warning');
        return;
    }
    const targetModalNode = document.getElementById('lucky-spin-modal');
    if (targetModalNode) targetModalNode.classList.remove('show');
}


async function executeSecureSpinState() {
    if (isSpinningActive) return;

    const actionTriggerNodeButton = document.getElementById('spin-trigger-btn');
    if (!actionTriggerNodeButton) return console.error("Spin trigger button context missing.");

    actionTriggerNodeButton.disabled = true;
    isSpinningActive = true;

    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }

    const cooldownTimer = document.getElementById('spin-cooldown-timer');
    if (cooldownTimer) cooldownTimer.innerText = "⏳ VALIDATING REQUEST WITH SERVER...";

    try {
        const backendServerExecutionResult = await secureFetch('/api/secure/lucky-spin', { method: 'POST' });

        if (!backendServerExecutionResult || !backendServerExecutionResult.success || backendServerExecutionResult.error) {
            if (window.Telegram?.WebApp) {
                showAppAlert(backendServerExecutionResult?.error || "Transaction verification failed.", 'error')
            }
            if (cooldownTimer) cooldownTimer.innerText = "❌ TRANSACTION REJECTED";
            actionTriggerNodeButton.disabled = false;
            isSpinningActive = false;
            return;
        }

        const assignedWinningIndexTarget = parseInt(backendServerExecutionResult.winningIndex ?? backendServerExecutionResult.index);
        if (isNaN(assignedWinningIndexTarget)) {
            throw new Error("Invalid or missing winning index from server response.");
        }

        // --- CLOCKWISE MATH CORRECTION BALANCING LOGIC ---
        // 1. Establish structural base offset (-90 degrees) to treat 12 o'clock as zero alignment
        const baseZeroPointerOffset = -Math.PI / 2;

        // 🔥 FIXED: Corrected clockwise tracking computation matrix so Index 0 lands perfectly on Index 0
        const invertedIndexClockwiseTarget = (totalSegmentsCount - assignedWinningIndexTarget - 1 + totalSegmentsCount) % totalSegmentsCount;

        // 3. Center Target Offset: Half a segment size added to land directly in the middle of the wedge
        const sliceCenterTargetOffset = segmentArcRadiantLength / 2;

        // 4. Final structural destination point calculation
        const targetedLandingCoordinates = baseZeroPointerOffset + (invertedIndexClockwiseTarget * segmentArcRadiantLength) + sliceCenterTargetOffset;

        // 5. Build full rotational velocity spin revolutions momentum (8 complete circles)
        const totalSpinRevolutionsAngle = 8 * (2 * Math.PI);

        // 6. Formulate absolute endpoint rotation state target
        const finalAbsoluteTerminalRotationAngleCoordinate = totalSpinRevolutionsAngle + targetedLandingCoordinates;

        let timestampStartReferenceFrame = null;
        const completeAnimationDurationTimeRequirementLimit = 4500; // Smooth 4.5 second spin action

        function animationEngineTickFrameSequence(timestampCurrentFrame) {
            if (!timestampStartReferenceFrame) timestampStartReferenceFrame = timestampCurrentFrame;
            const animationElapsedDurationTime = timestampCurrentFrame - timestampStartReferenceFrame;
            const completeProgressRatioDelta = Math.min(animationElapsedDurationTime / completeAnimationDurationTimeRequirementLimit, 1);

            // Premium ease-out quartic easing calculation formula curve
            const physicsDecelerationDecayModifierValue = 1 - Math.pow(1 - completeProgressRatioDelta, 4);
            
            // Increment rotation values positively to spin clockwise
            wheelRotationAngle = (physicsDecelerationDecayModifierValue * finalAbsoluteTerminalRotationAngleCoordinate);

            renderWheelStaticFrameState();

            if (animationElapsedDurationTime < completeAnimationDurationTimeRequirementLimit) {
                requestAnimationFrame(animationEngineTickFrameSequence);
            } else {
                isSpinningActive = false;
                actionTriggerNodeButton.disabled = false;
                if (cooldownTimer) cooldownTimer.innerText = "🎉 WINNING PAYOUT CONFIRMED SYNCED";
                
                if (window.Telegram?.WebApp?.HapticFeedback) {
                    window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
                }

                // 🔥 FIXED: Direct explicit integration of new server balances into HTML DOM UI nodes
                if (backendServerExecutionResult.newWalletBalance !== undefined) {
                    const mBal = document.getElementById('balance-main');
                    const wBal = document.getElementById('balance-wallet');
                    if (mBal) mBal.innerText = backendServerExecutionResult.newWalletBalance.toFixed(2);
                    if (wBal) wBal.innerText = backendServerExecutionResult.newWalletBalance.toFixed(2);
                }

                if (backendServerExecutionResult.newPointBalance !== undefined) {
                    const pBal = document.getElementById('user-points-display');
                    if (pBal) pBal.innerText = backendServerExecutionResult.newPointBalance.toLocaleString();
                }

                if (backendServerExecutionResult.newCoinBalance !== undefined) {
                    const cBal = document.getElementById('user-spins-left-display');
                    if (cBal) cBal.innerText = backendServerExecutionResult.newCoinBalance;
                }

                // Call internal synchronization functions safely
                if (typeof syncWalletBalances === "function") syncWalletBalances();
 // Map winning index to reward type
const rewardTypeMap = {
    0: 'usdt',
    1: 'points',
    2: 'tryagain',
    3: 'points',
    4: 'coins',
    5: 'points',
    6: 'points',
    7: 'jackpot'
};

let spinRewardType = rewardTypeMap[assignedWinningIndexTarget] || 'tryagain';
let spinDisplayAmount = spinAmountMap[assignedWinningIndexTarget];

// 🎉 JACKPOT SPECIAL LOGIC: If index 7 won, randomly select jackpot type
if (assignedWinningIndexTarget === 7) {
    const jackpotTypes = [
        { type: 'jackpot_usdt', amount: '5.00', label: 'USDT Jackpot' },
        { type: 'jackpot_coin', amount: '10', label: 'Coin Jackpot' },
        { type: 'jackpot_point', amount: '1000', label: 'Points Jackpot' }
    ];
    
    // Randomly pick one of the 3 jackpot types
    const selectedJackpot = jackpotTypes[Math.floor(Math.random() * jackpotTypes.length)];
    
    spinRewardType = selectedJackpot.type;
    spinDisplayAmount = selectedJackpot.amount;
    
    console.log(`🎉 JACKPOT TRIGGERED: ${selectedJackpot.label} - Amount: ${spinDisplayAmount}`);
    
    // Optional: Send to server which jackpot type was won
    secureFetch('/api/secure/lucky-spin-jackpot', {
        method: 'POST',
        body: JSON.stringify({
            jackpotType: selectedJackpot.type,
            amount: selectedJackpot.amount
        })
    }).catch(e => console.error("Jackpot logging failed:", e));
}

showAppReward(spinRewardType, spinDisplayAmount);
            }
        }

        requestAnimationFrame(animationEngineTickFrameSequence);

    } catch (err) {
        console.error("Spin failure:", err);
        if (window.Telegram?.WebApp) {
            showAppAlert("An error occurred during verification.", 'error')
        }
        if (cooldownTimer) cooldownTimer.innerText = "❌ ERROR";
        actionTriggerNodeButton.disabled = false;
        isSpinningActive = false;
    }
        }
