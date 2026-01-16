// Error handling component for user-visible errors
// Provides consistent error display and retry mechanism

/**
 * Show error message in a container
 * @param {HTMLElement} container - Container to show error in
 * @param {string} message - Error message
 * @param {Object} options - Options
 * @param {Function} options.retryFn - Function to retry the operation
 * @param {string} options.type - Error type ('network', 'server', 'notFound', 'validation', 'generic')
 * @param {string} options.suggestion - Suggested action for user
 */
let retryCount = 0;

export function showError(container, message, options = {}) {
    const { retryFn = null, type = 'generic', suggestion = null } = options;

    if (!container) {
        console.error('Error container not found');
        return;
    }

    retryCount++;

    // Determine suggestion based on error type if not provided
    let errorSuggestion = suggestion;
    if (!errorSuggestion) {
        switch (type) {
            case 'network':
                errorSuggestion = 'Check your internet connection and try again.';
                break;
            case 'server':
                errorSuggestion = 'The server is temporarily unavailable. Please try again later.';
                break;
            case 'notFound':
                errorSuggestion = 'The requested resource was not found. Please verify the ID and try again.';
                break;
            case 'validation':
                errorSuggestion = 'Please check your input and try again.';
                break;
            default:
                errorSuggestion = null;
        }
    }

    const retryButton = retryFn ? `
        <button class="retry-btn" onclick="(${retryFn.toString()})()" aria-label="Retry operation">
            🔄 Retry
            ${retryCount > 1 ? `<span class="retry-count">(${retryCount})</span>` : ''}
        </button>
    ` : '';

    container.innerHTML = `
        <div class="error-container" role="alert">
            <div class="error-icon" aria-hidden="true">⚠️</div>
            <div class="error-message">${escapeHtml(message)}</div>
            ${errorSuggestion ? `<div class="error-suggestion">${escapeHtml(errorSuggestion)}</div>` : ''}
            ${retryButton}
            ${retryCount > 2 ? '<small class="retry-hint">Tip: Check your internet connection</small>' : ''}
        </div>
    `;

    container.style.display = 'block';
}

/**
 * Show loading state with optional progress
 * @param {HTMLElement} container - Container to show loading in
 * @param {string|Object} messageOrOptions - Loading message or options object
 * @param {string} messageOrOptions.message - Loading message
 * @param {number} messageOrOptions.progress - Progress percentage (0-100)
 * @param {string} messageOrOptions.subMessage - Sub-message or additional info
 */
export function showLoading(container, messageOrOptions = 'Loading...') {
    if (!container) {
        console.error('Loading container not found');
        return;
    }

    let message = 'Loading...';
    let progress = null;
    let subMessage = null;

    if (typeof messageOrOptions === 'string') {
        message = messageOrOptions;
    } else if (typeof messageOrOptions === 'object') {
        message = messageOrOptions.message || 'Loading...';
        progress = messageOrOptions.progress;
        subMessage = messageOrOptions.subMessage;
    }

    const progressBar = progress !== null ? `
        <div class="loading-progress-bar">
            <div class="loading-progress-fill" style="width: ${Math.min(100, Math.max(0, progress))}%"></div>
        </div>
        <div class="loading-progress-text">${progress}%</div>
    ` : '';

    container.innerHTML = `
        <div class="loading-container" role="status" aria-live="polite" aria-label="${escapeHtml(message)}">
            <div class="loading-spinner" aria-hidden="true"></div>
            <div class="loading-message">${escapeHtml(message)}</div>
            ${subMessage ? `<div class="loading-sub-message">${escapeHtml(subMessage)}</div>` : ''}
            ${progressBar}
        </div>
    `;

    container.style.display = 'block';
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
 * @param {Object} options - Options
 * @param {Function} options.retryFn - Function to retry
 * @param {string} options.fallbackMessage - Fallback message if error type can't be determined
 */
export function handleApiError(error, container, options = {}) {
    const { retryFn = null, fallbackMessage = 'An error occurred while loading data.' } = options;

    console.error('API Error:', error);

    let message = fallbackMessage;
    let type = 'generic';
    let suggestion = null;

    // Determine error type and message
    if (error.status === 404 || error.message.includes('404') || error.message.includes('not found')) {
        message = 'Data not found.';
        type = 'notFound';
        suggestion = 'The requested resource was not found. Please verify the ID and try again.';
    } else if (error.status === 429 || error.message.includes('Rate limit') || error.message.includes('rate limit')) {
        message = 'Rate limit exceeded.';
        type = 'server';
        suggestion = 'Too many requests. Please wait a moment and try again.';
    } else if (error.status >= 500 || error.message.includes('500') || error.message.includes('Server error')) {
        message = 'Server error.';
        type = 'server';
        suggestion = 'The server is temporarily unavailable. Please try again later.';
    } else if (error.message.includes('network') || error.message.includes('Failed to fetch') || error.message.includes('Network error')) {
        message = 'Network error.';
        type = 'network';
        suggestion = 'Check your internet connection and try again.';
    } else if (error.message.includes('Invalid') || error.message.includes('invalid')) {
        message = error.message;
        type = 'validation';
        suggestion = 'Please check your input and try again.';
    } else if (error.message) {
        message = error.message;
    }

    showError(container, message, { retryFn, type, suggestion });
}

export default {
    showError,
    showLoading,
    showEmpty,
    handleApiError
};


