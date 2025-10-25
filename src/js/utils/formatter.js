/**
 * @fileoverview Utility functions for formatting data to display in the UI
 * @module utils/formatter
 */

/**
 * Format numbers with thousands separator
 * @param {number|null|undefined} num - The number to format
 * @returns {string} Formatted number with thousands separator (e.g., "1,234")
 * @example
 * formatNumber(1234) // Returns "1,234"
 * formatNumber(1000000) // Returns "1,000,000"
 */
export function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format dates in a human-readable format
 * @param {string|null|undefined} dateString - ISO date string
 * @returns {string} Formatted date string (e.g., "Jan 1, 2024, 12:00 PM")
 * @example
 * formatDate("2024-01-15T12:00:00Z") // Returns "Jan 15, 2024, 12:00 PM"
 */
export function formatDate(dateString) {
    if (!dateString) return '-';

    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    } catch (error) {
        return dateString;
    }
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {string|null|undefined} dateString - ISO date string
 * @returns {string} Relative time string (e.g., "2 hours ago", "just now")
 * @example
 * formatRelativeTime("2024-01-15T10:00:00Z") // Returns "2 hours ago"
 */
export function formatRelativeTime(dateString) {
    if (!dateString) return '-';

    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

        return formatDate(dateString);
    } catch (error) {
        return dateString;
    }
}

/**
 * Format percentage value
 * @param {number} value - The value to convert to percentage
 * @param {number} total - The total value for percentage calculation
 * @returns {string} Formatted percentage string (e.g., "45.5%")
 * @example
 * formatPercentage(455, 1000) // Returns "45.5%"
 */
export function formatPercentage(value, total) {
    if (!total || total === 0) return '0%';
    const percent = (value / total) * 100;
    return `${percent.toFixed(1)}%`;
}

/**
 * Truncate text to a maximum length
 * @param {string|null|undefined} text - The text to truncate
 * @param {number} [maxLength=50] - Maximum length before truncation
 * @returns {string} Truncated text with ellipsis if needed
 * @example
 * truncate("This is a very long text", 10) // Returns "This is a..."
 */
export function truncate(text, maxLength = 50) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}


