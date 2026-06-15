function createUSDTCoin(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container "${containerId}" not found`);
        return;
    }

    const { size = 200, animated = false } = options;

    const svgHTML = `
        <svg viewBox="0 0 300 300" width="${size}" height="${size}" 
            style="display:block;cursor:default;filter:drop-shadow(0 20px 40px rgba(31,229,217,0.15));
            ${animated ? 'animation:floatCoin 3s ease-in-out infinite;' : ''}">
            <defs>
                <radialGradient id="coinGradient" cx="50%" cy="35%">
                    <stop offset="0%" style="stop-color:#1FE5D9"/>
                    <stop offset="50%" style="stop-color:#00D4C4"/>
                    <stop offset="100%" style="stop-color:#00A89C"/>
                </radialGradient>
                <linearGradient id="glossGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:0.6"/>
                    <stop offset="50%" style="stop-color:#FFFFFF;stop-opacity:0.2"/>
                    <stop offset="100%" style="stop-color:#FFFFFF;stop-opacity:0"/>
                </linearGradient>
                <linearGradient id="rimGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#1A7A72"/>
                    <stop offset="50%" style="stop-color:#0F4A44"/>
                    <stop offset="100%" style="stop-color:#1A7A72"/>
                </linearGradient>
                <radialGradient id="shadowGradient" cx="50%" cy="50%">
                    <stop offset="60%" style="stop-color:#000000;stop-opacity:0"/>
                    <stop offset="100%" style="stop-color:#000000;stop-opacity:0.15"/>
                </radialGradient>
                <radialGradient id="depthGradient" cx="50%" cy="40%">
                    <stop offset="0%" style="stop-color:#00E8DE;stop-opacity:0.4"/>
                    <stop offset="100%" style="stop-color:#006B63;stop-opacity:0.8"/>
                </radialGradient>
            </defs>
            <ellipse cx="150" cy="240" rx="70" ry="20" fill="url(#shadowGradient)"/>
            <ellipse cx="150" cy="120" rx="95" ry="95" fill="url(#rimGradient)"/>
            <ellipse cx="150" cy="120" rx="90" ry="90" fill="url(#coinGradient)"/>
            <ellipse cx="150" cy="120" rx="90" ry="90" fill="url(#depthGradient)" opacity="0.3"/>
            <ellipse cx="120" cy="80" rx="50" ry="40" fill="url(#glossGradient)"/>
            <ellipse cx="140" cy="70" rx="25" ry="20" fill="#FFFFFF" opacity="0.3"/>
            <circle cx="150" cy="120" r="85" fill="none" stroke="#00B5AC" stroke-width="1.5" opacity="0.4"/>
            <rect x="120" y="95" width="60" height="8" rx="4" fill="#FFFFFF" opacity="0.95"/>
            <rect x="143" y="103" width="14" height="50" rx="7" fill="#FFFFFF" opacity="0.95"/>
            <circle cx="150" cy="120" r="90" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.15"/>
        </svg>
    `;

    container.innerHTML = svgHTML;

    if (animated && !document.getElementById('usdt-coin-animation')) {
        const style = document.createElement('style');
        style.id = 'usdt-coin-animation';
        style.textContent = `
            @keyframes floatCoin {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-20px); }
            }
        `;
        document.head.appendChild(style);
    }
}
