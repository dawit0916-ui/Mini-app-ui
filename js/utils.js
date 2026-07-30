function getEmptyStateHTML(icon, title, subtitle) {
    return `
        <div class="flex flex-col items-center justify-center py-20 opacity-40">
            <div class="text-5xl mb-4">${icon}</div>
            <h4 class="text-sm font-black uppercase tracking-widest text-white">${title}</h4>
            <p class="text-[10px] font-bold text-slate-500 mt-1">${subtitle}</p>
        </div>
    `;
}

// Level Configuration (matches backend)
const LEVEL_CONFIG = [
    {
        level: 1,
        name: 'Hustler',
        emoji: '🚀',
        price: 10000,
        dailyReward: 500,
        dailyLimit: 1,
        commission: 5,
        courseDiscount: 0,
        description: 'Entry Level • Start Your Journey',
        features: [{ name: 'Access to task platform', unlocksAtLevel: 1 }]
    },
    {
        level: 2,
        name: 'Authority',
        emoji: '📈',
        price: 20000,
        dailyReward: 700,
        dailyLimit: 1,
        commission: 5,
        courseDiscount: 0,
        description: 'Growing Your Authority',
        features: [
            { name: 'Daily Tasks Unlocked', unlocksAtLevel: 2 },
            { name: 'Secret Word + Emoji Reaction', unlocksAtLevel: 2 }
        ]
    },
    {
        level: 3,
        name: 'Creator',
        emoji: '✨',
        price: 30000,
        dailyReward: 900,
        dailyLimit: 1,
        commission: 10,
        courseDiscount: 0,
        description: 'Unleash Your Creativity',
        features: [
            { name: 'Custom Tasks', unlocksAtLevel: 3 },
            { name: 'Weekly Tasks', unlocksAtLevel: 3 },
            { name: 'Advanced Settings', unlocksAtLevel: 3 }
        ]
    },
    {
        level: 4,
        name: 'Content King',
        emoji: '👑',
        price: 40000,
        dailyReward: 1100,
        dailyLimit: 1,
        commission: 10,
        courseDiscount: 0,
        description: 'Master Content Creation',
        features: [
            { name: 'Monthly Tasks', unlocksAtLevel: 4 },
            { name: 'Content Analytics', unlocksAtLevel: 4 },
            { name: 'Scheduling Tools', unlocksAtLevel: 4 }
        ]
    },
    {
        level: 5,
        name: 'Power User',
        emoji: '⚡',
        price: 50000,
        dailyReward: 1200,
        dailyLimit: 2,
        commission: 15,
        courseDiscount: 20,
        description: 'Unlock Premium Features',
        features: [
            { name: '3-Month Tasks', unlocksAtLevel: 5 },
            { name: 'Whitelist Access', unlocksAtLevel: 5 },
            { name: 'Analytics Dashboard', unlocksAtLevel: 5 },
            { name: 'Ad Multiplier (1.5x-2.5x)', unlocksAtLevel: 5 }
        ]
    },
    {
        level: 6,
        name: 'Master Tactician',
        emoji: '🎯',
        price: 60000,
        dailyReward: 1250,
        dailyLimit: 2,
        commission: 15,
        courseDiscount: 30,
        description: 'Strategic Advantage',
        features: [
            { name: 'Task Scheduling', unlocksAtLevel: 6 },
            { name: 'Advanced Automation', unlocksAtLevel: 6 },
            { name: 'Priority Queue', unlocksAtLevel: 6 }
        ]
    },
    {
        level: 7,
        name: 'Influencer',
        emoji: '📺',
        price: 70000,
        dailyReward: 1300,
        dailyLimit: 2,
        commission: 20,
        courseDiscount: 40,
        description: 'Become an Influencer',
        features: [
            { name: 'YouTube Task Priority', unlocksAtLevel: 7 },
            { name: 'Influencer Badge', unlocksAtLevel: 7 },
            { name: 'Exclusive Opportunities', unlocksAtLevel: 7 }
        ]
    },
    {
        level: 8,
        name: 'Empire Builder',
        emoji: '🏛️',
        price: 80000,
        dailyReward: 1350,
        dailyLimit: 2,
        commission: 20,
        courseDiscount: 50,
        description: 'Build Your Empire',
        features: [
            { name: 'Team Management', unlocksAtLevel: 8 },
            { name: 'Bulk Operations', unlocksAtLevel: 8 },
            { name: 'Custom Workflows', unlocksAtLevel: 8 }
        ]
    },
    {
        level: 9,
        name: 'Legend Candidate',
        emoji: '🌟',
        price: 90000,
        dailyReward: 1375,
        dailyLimit: 2,
        commission: 25,
        courseDiscount: 55,
        description: 'Almost There',
        features: [
            { name: 'Priority Support', unlocksAtLevel: 9 },
            { name: 'VIP Status', unlocksAtLevel: 9 },
            { name: 'Exclusive Rewards', unlocksAtLevel: 9 }
        ]
    },
    {
        level: 10,
        name: 'Legend',
        emoji: '👸',
        price: 100000,
        dailyReward: 1400,
        dailyLimit: 2,
        commission: 25,
        courseDiscount: 60,
        description: 'The Ultimate Level',
        features: [
            { name: 'All Features Unlocked', unlocksAtLevel: 10 },
            { name: 'VIP Special', unlocksAtLevel: 10 },
            { name: 'Exclusive Events', unlocksAtLevel: 10 },
            { name: 'Custom Rewards', unlocksAtLevel: 10 }
        ]
    }
];
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
