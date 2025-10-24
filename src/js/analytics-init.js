// Initialize Analytics
import { analytics } from './utils/analytics.js';
import { GA_MEASUREMENT_ID, ANALYTICS_ENABLED } from '../../config/analytics-config.js';

// Initialize analytics if enabled
if (ANALYTICS_ENABLED && GA_MEASUREMENT_ID) {
    analytics.init(GA_MEASUREMENT_ID);
    
    // Track initial page view
    analytics.trackPageView(document.title);
}

// Make analytics available globally for component tracking
window.analytics = analytics;

