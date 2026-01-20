// API Configuration
// Update this with your actual API endpoint

import { getUserPath } from '../js/utils/userPaths.js';

// Determine base URL based on environment variables
// Default: Use GitHub Pages (via proxy in dev to avoid CORS, direct in production)
// Set VITE_USE_LOCAL_DATA=true to use local /data directory instead
const useLocalData = import.meta.env.VITE_USE_LOCAL_DATA === 'true';
const isDev = import.meta.env.DEV;

let baseUrl;
if (useLocalData) {
    baseUrl = '/data';
} else {
    // Default: Use notes.osm.lat which serves data from OSM-Notes-Data repository
    // This works reliably and has CORS configured properly
    // GitHub Pages (osm-notes.github.io) redirects to custom domain which doesn't have the data
    baseUrl = 'https://notes.osm.lat/data';
}

// Debug log (only in development)
if (isDev) {
    console.log('API Config:', { useLocalData, isDev, baseUrl });
}

export const API_CONFIG = {
    // Base URL for JSON files
    // Default: Uses notes.osm.lat which serves data from OSM-Notes-Data repository
    // This domain has CORS properly configured and works reliably
    // Set VITE_USE_LOCAL_DATA=true to use local /data directory instead
    BASE_URL: baseUrl,

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




