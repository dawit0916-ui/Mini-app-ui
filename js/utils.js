function getEmptyStateHTML(icon, title, subtitle) {
    return `
        <div class="flex flex-col items-center justify-center py-20 opacity-40">
            <div class="text-5xl mb-4">${icon}</div>
            <h4 class="text-sm font-black uppercase tracking-widest text-white">${title}</h4>
            <p class="text-[10px] font-bold text-slate-500 mt-1">${subtitle}</p>
        </div>
    `;
}
function getErrorStateHTML(icon, title, subtitle) {
    return `
        <div class="flex flex-col items-center justify-center py-20 opacity-40">
            <div class="text-5xl mb-4">${icon}</div>
            <h4 class="text-sm font-black uppercase tracking-widest text-red-500">${title}</h4>
            <p class="text-[10px] font-bold text-red-400/60 mt-1">${subtitle}</p>
        </div>
    `;
}

function formatLastActive(timestamp) {
    if (!timestamp) return 'Never';

    const date = new Date(timestamp);
    const now = Date.now();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffWeeks === 1) return '1 week ago';
    if (diffWeeks < 5) return `${diffWeeks} weeks ago`;

    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
}
// Helper: human-readable time ago
function getTimeAgo(date) {
    const seconds = Math.floor((Date.now() - date) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
                    }
  let currentTicketId = null;
let currentTicketFilter = 'open';
