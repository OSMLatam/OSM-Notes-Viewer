// API Configuration
// Update this with your actual API endpoint

export const API_CONFIG = {
    // Base URL for JSON files
    // Examples:
    // - Local development: '/data' (points to ./data/)
    // - Production CDN: 'https://cdn.example.com/api'
    // - S3 bucket: 'https://your-bucket.s3.amazonaws.com/api'
    // - Shared directory: '/var/www/osm-notes-data' (production)
    BASE_URL: '/data',

    // Cache settings
    CACHE_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds

    // Endpoints
    ENDPOINTS: {
        metadata: '/metadata.json',
        userIndex: '/indexes/users.json',
        countryIndex: '/indexes/countries.json',
        globalStats: '/global_stats.json',
        user: (userId) => `/users/${userId}.json`,
        country: (countryId) => `/countries/${countryId}.json`
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




