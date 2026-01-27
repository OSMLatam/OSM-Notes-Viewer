// Analytics utility for tracking user interactions
// Supports Google Analytics (gtag) and custom event tracking

class Analytics {
  constructor() {
    this.enabled = false;
    this.measurementId = null;
  }

  // Initialize analytics with Google Analytics measurement ID
  init(measurementId) {
    if (!measurementId) {
      console.log('Analytics disabled - no measurement ID provided');
      return;
    }

    this.measurementId = measurementId;
    this.enabled = true;

    // Load Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', measurementId, {
      anonymize_ip: true,
      cookie_flags: 'SameSite=None;Secure',
    });

    console.log('✅ Analytics initialized:', measurementId);
  }

  // Track page view
  trackPageView(pageName) {
    if (!this.enabled) return;

    try {
      window.gtag('event', 'page_view', {
        page_title: pageName,
        page_location: window.location.href,
        page_path: window.location.pathname,
      });
    } catch (error) {
      console.warn('Analytics tracking error:', error);
    }
  }

  // Track custom events
  trackEvent(eventName, category, label, value) {
    if (!this.enabled) return;

    try {
      window.gtag('event', eventName, {
        event_category: category,
        event_label: label,
        value: value,
      });
    } catch (error) {
      console.warn('Analytics tracking error:', error);
    }
  }

  // Track search events
  trackSearch(searchType, query, resultCount) {
    this.trackEvent('search', 'search', `${searchType}:${query}`, resultCount);
  }

  // Track navigation events
  trackNavigation(destination) {
    this.trackEvent('navigation', 'navigation', destination);
  }

  // Track user profile views
  trackProfileView(type, id) {
    this.trackEvent('profile_view', 'profile', `${type}:${id}`);
  }

  // Track leaderboard interactions
  trackLeaderboardInteraction(action, type) {
    this.trackEvent('leaderboard_interaction', 'leaderboard', `${action}:${type}`);
  }

  // Track chart interactions
  trackChartInteraction(chartType, action) {
    this.trackEvent('chart_interaction', 'chart', `${chartType}:${action}`);
  }

  // Track pagination
  trackPagination(type, pageNumber) {
    this.trackEvent('pagination', 'pagination', `${type}:page_${pageNumber}`);
  }

  // Track theme toggle
  trackThemeToggle(theme) {
    this.trackEvent('theme_toggle', 'ui', theme);
  }

  // Track share
  trackShare(platform, contentType) {
    this.trackEvent('share', 'social', `${platform}:${contentType}`);
  }

  // Track error
  trackError(errorType, errorMessage) {
    this.trackEvent('error', 'error', `${errorType}:${errorMessage}`);
  }
}

// Export singleton instance
export const analytics = new Analytics();
