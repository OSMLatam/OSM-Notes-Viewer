// API Client for fetching JSON data
import { API_CONFIG, getApiUrl } from '../../config/api-config.js';

class APIClient {
    constructor() {
        this.cache = new Map();
        this.cacheTimestamps = new Map();
    }

    /**
     * Fetch JSON data with caching
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
     * Check if cache is still valid
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
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        this.cacheTimestamps.clear();
        console.log('Cache cleared');
    }

    /**
     * Get metadata
     */
    async getMetadata() {
        return this.fetch(API_CONFIG.ENDPOINTS.metadata);
    }

    /**
     * Get user index
     */
    async getUserIndex() {
        return this.fetch(API_CONFIG.ENDPOINTS.userIndex);
    }

    /**
     * Get country index
     */
    async getCountryIndex() {
        return this.fetch(API_CONFIG.ENDPOINTS.countryIndex);
    }

    /**
     * Get user profile
     */
    async getUser(userId) {
        return this.fetch(API_CONFIG.ENDPOINTS.user(userId));
    }

    /**
     * Get country profile
     */
    async getCountry(countryId) {
        return this.fetch(API_CONFIG.ENDPOINTS.country(countryId));
    }
}

// Export singleton instance
export const apiClient = new APIClient();
export default apiClient;




