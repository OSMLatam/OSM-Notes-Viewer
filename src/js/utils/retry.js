/**
 * Retry utility with exponential backoff
 * @module utils/retry
 */

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {number} options.backoffMultiplier - Multiplier for exponential backoff (default: 2)
 * @param {Function} options.shouldRetry - Function to determine if error should be retried (default: retry all errors)
 * @returns {Promise<any>} Result of the function
 * @example
 * const data = await retryWithBackoff(
 *   () => fetch('/api/data'),
 *   { maxRetries: 3, initialDelay: 1000 }
 * );
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    shouldRetry = () => true,
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted attempts or if error shouldn't be retried
      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Don't wait after the last attempt
      if (attempt < maxRetries) {
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Calculate next delay with exponential backoff
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }
  }

  throw lastError;
}

/**
 * Check if an error is retryable (network errors, 5xx status codes)
 * @param {Error} error - Error to check
 * @returns {boolean} True if error should be retried
 */
export function isRetryableError(error) {
  // Network errors (no response)
  if (
    error.message &&
    (error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('network'))
  ) {
    return true;
  }

  // 5xx server errors
  if (error.status >= 500 && error.status < 600) {
    return true;
  }

  // Rate limiting (429) - retry after delay
  if (error.status === 429) {
    return true;
  }

  // Don't retry client errors (4xx except 429)
  if (error.status >= 400 && error.status < 500) {
    return false;
  }

  // Retry other errors by default
  return true;
}

/**
 * Create a retryable fetch wrapper
 * @param {string} url - URL to fetch
 * @param {RequestInit} init - Fetch options
 * @param {Object} retryOptions - Retry options
 * @returns {Promise<Response>} Fetch response
 */
export async function fetchWithRetry(url, init = {}, retryOptions = {}) {
  return retryWithBackoff(
    async () => {
      const response = await fetch(url, init);

      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.status = response.status;
        error.response = response;
        throw error;
      }

      return response;
    },
    {
      shouldRetry: isRetryableError,
      ...retryOptions,
    }
  );
}
