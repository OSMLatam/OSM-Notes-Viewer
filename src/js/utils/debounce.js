/**
 * Debounce utility for limiting function calls
 * @module utils/debounce
 */

/**
 * Create a debounced function that delays execution
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @param {Object} options - Options
 * @param {boolean} options.leading - Execute on leading edge (default: false)
 * @param {boolean} options.trailing - Execute on trailing edge (default: true)
 * @returns {Function} Debounced function
 * @example
 * const debouncedSearch = debounce((query) => {
 *   console.log('Searching:', query);
 * }, 300);
 *
 * input.addEventListener('input', (e) => {
 *   debouncedSearch(e.target.value);
 * });
 */
export function debounce(fn, delay, options = {}) {
  const { leading = false, trailing = true } = options;
  let timeoutId = null;
  let lastArgs = null;
  let lastCallTime = null;

  const debounced = function (...args) {
    lastArgs = args;
    lastCallTime = Date.now();

    if (leading && timeoutId === null) {
      fn.apply(this, args);
    }

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (trailing && lastCallTime !== null) {
        fn.apply(this, lastArgs);
      }
    }, delay);
  };

  debounced.cancel = function () {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  debounced.flush = function () {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
      if (lastArgs !== null) {
        fn.apply(this, lastArgs);
      }
    }
  };

  return debounced;
}

/**
 * Create a throttled function that limits execution rate
 * @param {Function} fn - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @param {Object} options - Options
 * @param {boolean} options.leading - Execute on leading edge (default: true)
 * @param {boolean} options.trailing - Execute on trailing edge (default: true)
 * @returns {Function} Throttled function
 * @example
 * const throttledScroll = throttle(() => {
 *   console.log('Scrolled');
 * }, 100);
 *
 * window.addEventListener('scroll', throttledScroll);
 */
export function throttle(fn, delay, options = {}) {
  const { leading = true, trailing = true } = options;
  let timeoutId = null;
  let lastArgs = null;
  let lastCallTime = 0;

  const throttled = function (...args) {
    const now = Date.now();
    lastArgs = args;

    if (leading && now - lastCallTime >= delay) {
      fn.apply(this, args);
      lastCallTime = now;
    } else if (trailing) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(
        () => {
          timeoutId = null;
          lastCallTime = Date.now();
          fn.apply(this, lastArgs);
        },
        delay - (now - lastCallTime)
      );
    }
  };

  throttled.cancel = function () {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  throttled.flush = function () {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastCallTime = Date.now();
      fn.apply(this, lastArgs);
    }
  };

  return throttled;
}
