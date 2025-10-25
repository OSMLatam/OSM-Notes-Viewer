/**
 * @fileoverview API Client for fetching JSON data with caching
 * @module api/apiClient
 */

import { API_CONFIG, getApiUrl } from '../../config/api-config.js';

/**
 * API Client class for handling HTTP requests with caching
 * @class APIClient
 */
class APIClient {
    /**
     * Create an API client instance
     * @constructor
     */
    constructor() {
        /** @type {Map<string, any>} Cache storage for responses */
        this.cache = new Map();
        /** @type {Map<string, number>} Cache timestamps for TTL validation */
        this.cacheTimestamps = new Map();
    }

    /**
     * Fetch JSON data with caching support
     * @param {string} endpoint - API endpoint path
     * @returns {Promise<any>} Response data
     * @throws {Error} If fetch fails or response is not OK
     * @example
     * const data = await apiClient.fetch('/api/users/123.json');
     */
    async fetch(endpoint) {
        // Check cache if enabled
        if (API_CONFIG.FEATURES.enableCache && this.isCacheValid(endpoint)) {
            console.log(`Cache hit for: ${endpoint}`);
            return this.cache.get(endpoint);
        }

        try {
            const url = getApiUrl(endpoint);
            console.log(`Fetching: ${url}`);

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Store in cache
            if (API_CONFIG.FEATURES.enableCache) {
                this.cache.set(endpoint, data);
                this.cacheTimestamps.set(endpoint, Date.now());
            }

            return data;
        } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Check if cache entry is still valid based on TTL
     * @param {string} endpoint - API endpoint path
     * @returns {boolean} True if cache is valid, false otherwise
     */
    isCacheValid(endpoint) {
        if (!this.cache.has(endpoint)) {
            return false;
        }

        const timestamp = this.cacheTimestamps.get(endpoint);
        const age = Date.now() - timestamp;

        return age < API_CONFIG.CACHE_DURATION;
    }

    /**
     * Clear all cached data
     * @returns {void}
     */
    clearCache() {
        this.cache.clear();
        this.cacheTimestamps.clear();
        console.log('Cache cleared');
    }

    /**
     * Get export metadata
     * @returns {Promise<Object>} Metadata object with export info
     * @example
     * const metadata = await apiClient.getMetadata();
     * console.log(metadata.total_users, metadata.export_date);
     */
    async getMetadata() {
        return this.fetch(API_CONFIG.ENDPOINTS.metadata);
    }

    /**
     * Get user index (list of all users)
     * @returns {Promise<Array>} Array of user objects
     * @example
     * const users = await apiClient.getUserIndex();
     * console.log(`Found ${users.length} users`);
     */
    async getUserIndex() {
        return this.fetch(API_CONFIG.ENDPOINTS.userIndex);
    }

    /**
     * Get country index (list of all countries)
     * @returns {Promise<Array>} Array of country objects
     * @example
     * const countries = await apiClient.getCountryIndex();
     * console.log(`Found ${countries.length} countries`);
     */
    async getCountryIndex() {
        return this.fetch(API_CONFIG.ENDPOINTS.countryIndex);
    }

    /**
     * Get user profile by ID
     * @param {number|string} userId - User ID
     * @returns {Promise<Object>} User profile object
     * @example
     * const user = await apiClient.getUser(123);
     * console.log(user.username, user.history_whole_open);
     */
    async getUser(userId) {
        return this.fetch(API_CONFIG.ENDPOINTS.user(userId));
    }

    /**
     * Get country profile by ID
     * @param {number|string} countryId - Country ID
     * @returns {Promise<Object>} Country profile object
     * @example
     * const country = await apiClient.getCountry(456);
     * console.log(country.country_name, country.history_whole_open);
     */
    async getCountry(countryId) {
        return this.fetch(API_CONFIG.ENDPOINTS.country(countryId));
    }
}

/**
 * Singleton instance of APIClient
 * @type {APIClient}
 */
export const apiClient = new APIClient();

export default apiClient;




