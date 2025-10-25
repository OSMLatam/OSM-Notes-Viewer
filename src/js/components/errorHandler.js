// Error handling component for user-visible errors
// Provides consistent error display and retry mechanism

/**
 * Show error message in a container
 * @param {HTMLElement} container - Container to show error in
 * @param {string} message - Error message
 * @param {Function} retryFn - Function to retry the operation
 */
let retryCount = 0;

export function showError(container, message, retryFn = null) {
    retryCount++;
    const retryButton = retryFn ? `
        <button class="retry-btn" onclick="location.reload()">
            🔄 Retry
            ${retryCount > 1 ? `<span class="retry-count">(${retryCount})</span>` : ''}
        </button>
    ` : '';

    container.innerHTML = `
        <div class="error-container">
            <div class="error-icon">⚠️</div>
            <div class="error-message">${escapeHtml(message)}</div>
            ${retryButton}
            ${retryCount > 2 ? '<small class="retry-hint">Tip: Check your internet connection</small>' : ''}
        </div>
    `;
}

/**
 * Show loading state
 * @param {HTMLElement} container - Container to show loading in
 * @param {string} message - Loading message
 */
export function showLoading(container, message = 'Loading...') {
    container.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <div class="loading-message">${escapeHtml(message)}</div>
        </div>
    `;
}

/**
 * Show empty state
 * @param {HTMLElement} container - Container to show empty state in
 * @param {string} message - Empty state message
 */
export function showEmpty(container, message = 'No data available') {
    container.innerHTML = `
        <div class="empty-container">
            <div class="empty-icon">📭</div>
            <div class="empty-message">${escapeHtml(message)}</div>
        </div>
    `;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Handle API errors consistently
 * @param {Error} error - Error object
 * @param {HTMLElement} container - Container to show error in
 * @param {Function} retryFn - Function to retry
 */
export function handleApiError(error, container, retryFn = null) {
    console.error('API Error:', error);

    let message = 'An error occurred while loading data.';

    if (error.message.includes('404')) {
        message = 'Data not found. Please try again later.';
    } else if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
        message = 'Network error. Please check your connection and try again.';
    } else if (error.message.includes('500')) {
        message = 'Server error. Please try again later.';
    } else if (error.message) {
        message = error.message;
    }

    showError(container, message, retryFn);
}

export default {
    showError,
    showLoading,
    showEmpty,
    handleApiError
};


