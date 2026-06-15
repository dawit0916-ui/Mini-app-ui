function createUSDTCoin3D(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container "${containerId}" not found`);
        return;
    }

    const { size = 200, animated = false } = options;

    const svgHTML = `
        <svg viewBox="0 0 300 300" width="${size}" height="${size}" 
            style="display:block;cursor:default;filter:drop-shadow(0 25px 50px rgba(31,229,217,0.25));
            ${animated ? 'animation:floatCoin 3s ease-in-out infinite;' : ''}">
            
            <defs>
                <!-- Premium 3D coin gradient - more teal/darker -->
                <radialGradient id="coinGrad3D" cx="40%" cy="35%">
                    <stop offset="0%" style="stop-color:#2FF8E8;stop-opacity:1"/>
                    <stop offset="35%" style="stop-color:#1FE5D9;stop-opacity:1"/>
                    <stop offset="70%" style="stop-color:#00D4C4;stop-opacity:1"/>
                    <stop offset="100%" style="stop-color:#007B76;stop-opacity:1"/>
                </radialGradient>

                <!-- Beveled rim for 3D effect -->
                <linearGradient id="rimGrad3D" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#1FE5D9;stop-opacity:0.8"/>
                    <stop offset="25%" style="stop-color:#0F9490;stop-opacity:1"/>
                    <stop offset="50%" style="stop-color:#057B77;stop-opacity:1"/>
                    <stop offset="75%" style="stop-color:#035652;stop-opacity:1"/>
                    <stop offset="100%" style="stop-color:#023C3A;stop-opacity:1"/>
                </linearGradient>

                <!-- Top shine/highlight -->
                <radialGradient id="shineGrad3D" cx="35%" cy="25%">
                    <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:0.8"/>
                    <stop offset="20%" style="stop-color:#FFFFFF;stop-opacity:0.4"/>
                    <stop offset="50%" style="stop-color:#FFFFFF;stop-opacity:0.1"/>
                    <stop offset="100%" style="stop-color:#FFFFFF;stop-opacity:0"/>
                </radialGradient>

                <!-- Edge highlight for beveled look -->
                <linearGradient id="edgeGrad3D" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:0.4"/>
                    <stop offset="50%" style="stop-color:#FFFFFF;stop-opacity:0.05"/>
                    <stop offset="100%" style="stop-color:#000000;stop-opacity:0.2"/>
                </linearGradient>

                <!-- Bottom shadow for depth -->
                <radialGradient id="shadowGrad3D">
                    <stop offset="0%" style="stop-color:#000000;stop-opacity:0"/>
                    <stop offset="70%" style="stop-color:#000000;stop-opacity:0"/>
                    <stop offset="100%" style="stop-color:#000000;stop-opacity:0.3"/>
                </radialGradient>

                <!-- T Ring glow -->
                <radialGradient id="ringGrad3D" cx="50%" cy="50%">
                    <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:0.4"/>
                    <stop offset="50%" style="stop-color:#FFFFFF;stop-opacity:0.15"/>
                    <stop offset="100%" style="stop-color:#FFFFFF;stop-opacity:0"/>
                </radialGradient>
            </defs>

            <!-- Drop shadow beneath coin -->
            <ellipse cx="150" cy="265" rx="75" ry="18" fill="url(#shadowGrad3D)"/>

            <!-- OUTER RIM (Dark beveled edge) -->
            <circle cx="150" cy="150" r="98" fill="url(#rimGrad3D)"/>

            <!-- Inner rim highlight (top edge) -->
            <circle cx="150" cy="150" r="98" fill="none" stroke="url(#edgeGrad3D)" stroke-width="3" opacity="0.6"/>

            <!-- Main coin body -->
            <circle cx="150" cy="150" r="92" fill="url(#coinGrad3D)"/>

            <!-- Glossy top shine -->
            <ellipse cx="135" cy="100" rx="55" ry="45" fill="url(#shineGrad3D)" opacity="0.8"/>

            <!-- Additional rim detail line -->
            <circle cx="150" cy="150" r="92" fill="none" stroke="#1FE5D9" stroke-width="1.5" opacity="0.5"/>

            <!-- INNER RING around T (circular outline) -->
            <circle cx="150" cy="150" r="50" fill="none" stroke="#FFFFFF" stroke-width="2.5" opacity="0.7"/>
            <circle cx="150" cy="150" r="50" fill="url(#ringGrad3D)"/>

            <!-- T Letter - Horizontal bar -->
            <rect x="115" y="125" width="70" height="10" rx="5" fill="#FFFFFF" opacity="0.98"/>

            <!-- T Letter - Vertical stem -->
            <rect x="142" y="135" width="16" height="55" rx="8" fill="#FFFFFF" opacity="0.98"/>

            <!-- T shadow for depth -->
            <g opacity="0.15">
                <rect x="115" y="128" width="70" height="6" rx="3" fill="#000000"/>
                <rect x="143" y="140" width="14" height="50" rx="6" fill="#000000"/>
            </g>

            <!-- Top edge highlight -->
            <circle cx="150" cy="150" r="92" fill="none" stroke="#FFFFFF" stroke-width="1.5" opacity="0.2"/>

            <!-- Extra depth lines on rim -->
            <path d="M 240 150 A 90 90 0 0 1 150 60" fill="none" stroke="#FFFFFF" stroke-width="1" opacity="0.15"/>
        </svg>
    `;

    container.innerHTML = svgHTML;

    if (animated && !document.getElementById('usdt-coin-3d-animation')) {
        const style = document.createElement('style');
        style.id = 'usdt-coin-3d-animation';
        style.textContent = `
            @keyframes floatCoin {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-20px); }
            }
            @keyframes spinCoin {
                0% { transform: rotateY(0deg); }
                100% { transform: rotateY(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

// Helper function to spin coin
function spinCoinOnce3D(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;
    svg.style.animation = 'spinCoin 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
    setTimeout(() => { svg.style.animation = 'none'; }, 800);
}
