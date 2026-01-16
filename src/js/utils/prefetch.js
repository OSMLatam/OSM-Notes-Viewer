/**
 * Prefetch utility for critical data
 * Intelligently prefetches data that is likely to be needed soon
 * @module utils/prefetch
 */

import { apiClient } from '../api/apiClient.js';
import { API_CONFIG } from '../../config/api-config.js';

/**
 * Prefetch queue to avoid overwhelming the browser
 */
class PrefetchQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.maxConcurrent = 3;
        this.active = 0;
    }

    async add(fn, priority = 0) {
        return new Promise((resolve, reject) => {
            this.queue.push({ fn, priority, resolve, reject });
            this.queue.sort((a, b) => b.priority - a.priority);
            this.process();
        });
    }

    async process() {
        if (this.processing || this.active >= this.maxConcurrent || this.queue.length === 0) {
            return;
        }

        this.processing = true;

        while (this.queue.length > 0 && this.active < this.maxConcurrent) {
            const item = this.queue.shift();
            this.active++;

            item.fn()
                .then(item.resolve)
                .catch(item.reject)
                .finally(() => {
                    this.active--;
                    this.process();
                });
        }

        this.processing = false;
    }
}

const prefetchQueue = new PrefetchQueue();

/**
 * Prefetch a URL using link rel=prefetch or fetch
 * @param {string} url - URL to prefetch
 * @param {Object} options - Options
 * @param {string} options.type - Prefetch type ('link' or 'fetch')
 * @param {number} options.priority - Priority (higher = more important)
 * @returns {Promise<void>}
 */
export async function prefetchUrl(url, options = {}) {
    const { type = 'fetch', priority = 0 } = options;

    // Skip if already cached (check both apiClient cache and localStorage)
    try {
        if (apiClient.isCacheValid && apiClient.isCacheValid(url)) {
            return;
        }
    } catch (e) {
        // Continue if cache check fails
    }

    // Use link prefetch for HTML pages (faster, browser-managed)
    if (type === 'link' && 'requestIdleCallback' in window) {
        requestIdleCallback(() => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            link.as = 'document';
            document.head.appendChild(link);
        });
        return;
    }

    // Use fetch for API/data (can be cached by apiClient)
    return prefetchQueue.add(async () => {
        try {
            // Use low priority fetch to avoid blocking critical requests
            if ('scheduler' in window && 'postTask' in window.scheduler) {
                await window.scheduler.postTask(
                    () => fetch(url, { priority: 'low' }),
                    { priority: 'background' }
                );
            } else {
                await fetch(url);
            }
        } catch (error) {
            // Silently fail - prefetch is best effort
            console.debug('Prefetch failed:', url, error);
        }
    }, priority);
}

/**
 * Prefetch user profile
 * @param {number|string} userId - User ID
 * @param {number} priority - Priority (default: 1)
 */
export function prefetchUserProfile(userId, priority = 1) {
    if (!userId) return;
    const endpoint = API_CONFIG.ENDPOINTS.user(userId);
    return prefetchUrl(endpoint, { type: 'fetch', priority });
}

/**
 * Prefetch country profile
 * @param {number|string} countryId - Country ID
 * @param {number} priority - Priority (default: 1)
 */
export function prefetchCountryProfile(countryId, priority = 1) {
    if (!countryId) return;
    const endpoint = API_CONFIG.ENDPOINTS.country(countryId);
    return prefetchUrl(endpoint, { type: 'fetch', priority });
}

/**
 * Prefetch critical data on page load
 * Prefetches metadata and indexes if not already cached
 */
export function prefetchCriticalData() {
    // Prefetch metadata (high priority)
    prefetchUrl(API_CONFIG.ENDPOINTS.metadata, { type: 'fetch', priority: 10 });

    // Prefetch indexes (medium priority)
    prefetchUrl(API_CONFIG.ENDPOINTS.userIndex, { type: 'fetch', priority: 5 });
    prefetchUrl(API_CONFIG.ENDPOINTS.countryIndex, { type: 'fetch', priority: 5 });
}

/**
 * Prefetch related data for a note
 * Prefetches user profiles and country profile
 * @param {Object} noteData - Note data object
 */
export function prefetchNoteRelatedData(noteData) {
    if (!noteData) return;

    // Extract unique user IDs from comments
    const userIds = new Set();
    if (noteData.comments && Array.isArray(noteData.comments)) {
        noteData.comments.forEach(comment => {
            if (comment.user && comment.user.uid) {
                userIds.add(comment.user.uid);
            }
        });
    }

    // Prefetch user profiles (medium priority)
    userIds.forEach(userId => {
        prefetchUserProfile(userId, 3);
    });

    // Prefetch country if we have country info
    // This will be done when country info is loaded
}

/**
 * Prefetch next page in pagination
 * @param {string} url - Next page URL
 * @param {number} priority - Priority (default: 2)
 */
export function prefetchNextPage(url, priority = 2) {
    if (!url) return;
    return prefetchUrl(url, { type: 'fetch', priority });
}

/**
 * Setup prefetch on link hover
 * Prefetches data when user hovers over links
 * @param {HTMLElement} link - Link element
 * @param {Function} prefetchFn - Function to call for prefetching
 * @param {number} delay - Delay before prefetch (ms, default: 100)
 */
export function setupLinkPrefetch(link, prefetchFn, delay = 100) {
    let timeoutId = null;

    link.addEventListener('mouseenter', () => {
        timeoutId = setTimeout(() => {
            prefetchFn();
        }, delay);
    });

    link.addEventListener('mouseleave', () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    });

    link.addEventListener('click', () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    });
}

/**
 * Prefetch note data
 * @param {number|string} noteId - Note ID
 * @param {number} priority - Priority (default: 5)
 */
export function prefetchNote(noteId, priority = 5) {
    if (!noteId) return;
    const url = `https://api.openstreetmap.org/api/0.6/notes/${noteId}.json`;
    return prefetchUrl(url, { type: 'fetch', priority });
}

/**
 * Prefetch ML recommendation for a note
 * @param {number|string} noteId - Note ID
 * @param {number} priority - Priority (default: 2)
 */
export function prefetchMLRecommendation(noteId, priority = 2) {
    if (!noteId) return;
    const apiBaseUrl = import.meta.env.PROD
        ? 'https://notes-api.osm.lat'
        : 'http://localhost:3000';
    const url = `${apiBaseUrl}/api/v1/notes/${noteId}/recommendation`;
    return prefetchUrl(url, { type: 'fetch', priority });
}

/**
 * Prefetch country info for a note
 * @param {number|string} noteId - Note ID
 * @param {number} priority - Priority (default: 3)
 */
export function prefetchCountryInfo(noteId, priority = 3) {
    if (!noteId) return;
    const apiBaseUrl = import.meta.env.PROD
        ? 'https://notes-api.osm.lat'
        : 'http://localhost:3000';
    const url = `${apiBaseUrl}/api/v1/notes/${noteId}`;
    return prefetchUrl(url, { type: 'fetch', priority });
}

/**
 * Initialize prefetch on page load
 * Should be called early in page lifecycle
 */
export function initPrefetch() {
    // Prefetch critical data
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', prefetchCriticalData);
    } else {
        prefetchCriticalData();
    }

    // Setup prefetch for user/country profile links
    setupProfileLinkPrefetch();
}

/**
 * Setup prefetch for profile links (user and country)
 */
function setupProfileLinkPrefetch() {
    // User profile links
    document.addEventListener('mouseover', (e) => {
        const link = e.target.closest('a[href*="/pages/user.html"]');
        if (link) {
            const url = new URL(link.href, window.location.origin);
            const userId = url.searchParams.get('id');
            if (userId) {
                setupLinkPrefetch(link, () => prefetchUserProfile(userId, 4));
            }
        }
    }, true);

    // Country profile links
    document.addEventListener('mouseover', (e) => {
        const link = e.target.closest('a[href*="/pages/country.html"]');
        if (link) {
            const url = new URL(link.href, window.location.origin);
            const countryId = url.searchParams.get('id');
            if (countryId) {
                setupLinkPrefetch(link, () => prefetchCountryProfile(countryId, 4));
            }
        }
    }, true);

    // Note links
    document.addEventListener('mouseover', (e) => {
        const link = e.target.closest('a[href*="/pages/note.html"]');
        if (link) {
            const url = new URL(link.href, window.location.origin);
            const noteId = url.searchParams.get('id');
            if (noteId) {
                setupLinkPrefetch(link, () => prefetchNote(noteId, 4));
            }
        }
    }, true);
}

export default {
    prefetchUrl,
    prefetchUserProfile,
    prefetchCountryProfile,
    prefetchCriticalData,
    prefetchNoteRelatedData,
    prefetchNextPage,
    prefetchNote,
    prefetchMLRecommendation,
    prefetchCountryInfo,
    setupLinkPrefetch,
    initPrefetch
};
