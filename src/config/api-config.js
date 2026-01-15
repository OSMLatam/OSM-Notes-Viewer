// API Configuration
// Update this with your actual API endpoint

import { getUserPath } from '../js/utils/userPaths.js';

export const API_CONFIG = {
    // Base URL for JSON files
    // Uses remote data repository in production, local data in development
    BASE_URL: import.meta.env.PROD
        ? 'https://notes.osm.lat/data'
        : '/data',

    // Cache settings
    CACHE_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds

    // Endpoints
    ENDPOINTS: {
        metadata: '/metadata.json',
        userIndex: '/indexes/users.json',
        countryIndex: '/indexes/countries.json',
        user: (userId) => getUserPath(userId),
        country: (countryId) => `/countries/${countryId}.json`
        // Note: Notes endpoint is handled via REST API (OSM-Notes-API), not static JSON
    },

    // Feature flags
    FEATURES: {
        enableCache: true,
        enableOfflineMode: false,
        showDebugInfo: false
    }
};

// Helper to get full URL
export function getApiUrl(endpoint) {
    return `${API_CONFIG.BASE_URL}${endpoint}`;
}

// Export for convenience
export default API_CONFIG;




