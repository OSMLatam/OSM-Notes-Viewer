// Skeleton loading components for better UX

/**
 * Create a skeleton for stat cards
 * @param {number} count - Number of skeleton cards to create
 * @returns {string} HTML string
 */
export function createStatSkeletons(count = 4) {
    return Array(count).fill(0).map(() => `
        <div class="stat-card skeleton-stat">
            <div class="skeleton-icon"></div>
            <div class="skeleton-value"></div>
            <div class="skeleton-label"></div>
        </div>
    `).join('');
}

/**
 * Create a skeleton for leaderboard items
 * @param {number} count - Number of skeleton items to create
 * @returns {string} HTML string
 */
export function createLeaderboardSkeletons(count = 10) {
    return Array(count).fill(0).map(() => `
        <div class="leaderboard-item skeleton-leaderboard">
            <div class="skeleton-rank"></div>
            <div class="skeleton-name"></div>
            <div class="skeleton-value"></div>
        </div>
    `).join('');
}

/**
 * Create a skeleton for search results
 * @param {number} count - Number of skeleton items to create
 * @returns {string} HTML string
 */
export function createSearchSkeletons(count = 5) {
    return Array(count).fill(0).map(() => `
        <div class="search-result-item skeleton-search">
            <div class="skeleton-text-full"></div>
            <div class="skeleton-text-small"></div>
        </div>
    `).join('');
}

/**
 * Create a skeleton for chart bars
 * @param {number} count - Number of skeleton bars to create
 * @returns {string} HTML string
 */
export function createChartSkeletons(count = 5) {
    return Array(count).fill(0).map(() => `
        <div class="chart-bar-item skeleton-chart">
            <div class="skeleton-label"></div>
            <div class="skeleton-bar"></div>
        </div>
    `).join('');
}

/**
 * Create a skeleton for profile sections
 * @returns {string} HTML string
 */
export function createProfileSkeleton() {
    return `
        <div class="skeleton-profile">
            <div class="skeleton-profile-header">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-text-group">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-subtitle"></div>
                </div>
            </div>
            <div class="skeleton-profile-stats">
                ${createStatSkeletons(4)}
            </div>
        </div>
    `;
}

export default {
    createStatSkeletons,
    createLeaderboardSkeletons,
    createSearchSkeletons,
    createChartSkeletons,
    createProfileSkeleton
};

