// Analytics Configuration
// Configure your Google Analytics Measurement ID here

// Google Analytics Measurement ID (GA4)
// Get this from: https://analytics.google.com/
// Format: G-XXXXXXXXXX
export const GA_MEASUREMENT_ID = ''; // Empty string disables analytics

// Enable/disable analytics tracking
export const ANALYTICS_ENABLED = GA_MEASUREMENT_ID !== '';

// Privacy settings
export const ANALYTICS_CONFIG = {
    // Anonymize IP addresses (GDPR compliance)
    anonymizeIp: true,
    
    // Cookie settings
    cookieFlags: 'SameSite=None;Secure',
    
    // Disable advertising features
    allowGoogleSignals: false,
    allowAdPersonalizationSignals: false
};

