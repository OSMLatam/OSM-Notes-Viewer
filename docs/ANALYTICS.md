---
title: "Analytics Setup"
description: "OSM Notes Viewer includes built-in analytics support using Google Analytics 4 (GA4). Analytics"
version: "1.0.0"
last_updated: "2026-01-25"
author: "AngocA"
tags:
  - "documentation"
audience:
  - "developers"
project: "OSM-Notes-Viewer"
status: "active"
---


# Analytics Setup

## Overview

OSM Notes Viewer includes built-in analytics support using Google Analytics 4 (GA4). Analytics
tracking is optional and disabled by default for privacy.

## Features

The analytics implementation tracks:

- **Page views** - All page navigation
- **Search events** - Search queries and results
- **Profile views** - User and country profile visits
- **Theme toggles** - Dark/light mode changes
- **Pagination** - Leaderboard navigation
- **Chart interactions** - Chart clicks and interactions
- **Share events** - Social sharing
- **Errors** - Error tracking

## Setup

### 1. Get Google Analytics Measurement ID

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new property or use existing one
3. Get your Measurement ID (format: `G-XXXXXXXXXX`)

### 2. Configure Analytics

Edit `config/analytics-config.js`:

```javascript
export const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // Your Measurement ID
```

### 3. Privacy Settings

The analytics implementation includes privacy-focused settings:

```javascript
export const ANALYTICS_CONFIG = {
  anonymizeIp: true, // GDPR compliance
  cookieFlags: 'SameSite=None;Secure',
  allowGoogleSignals: false, // Disable advertising features
  allowAdPersonalizationSignals: false,
};
```

## How It Works

### Initialization

Analytics is initialized in `src/js/analytics-init.js`:

```javascript
import { analytics } from './utils/analytics.js';
import { GA_MEASUREMENT_ID, ANALYTICS_ENABLED } from '../../config/analytics-config.js';

if (ANALYTICS_ENABLED && GA_MEASUREMENT_ID) {
  analytics.init(GA_MEASUREMENT_ID);
  analytics.trackPageView(document.title);
}
```

### Tracking Events

Analytics tracks events automatically throughout the application:

#### Search Tracking

```javascript
analytics.trackSearch(searchType, query, resultCount);
// Example: analytics.trackSearch('users', 'john', 5)
```

#### Profile Views

```javascript
analytics.trackProfileView(type, id);
// Example: analytics.trackProfileView('user', 12345)
```

#### Theme Toggle

```javascript
analytics.trackThemeToggle(theme);
// Example: analytics.trackThemeToggle('dark')
```

#### Pagination

```javascript
analytics.trackPagination(type, pageNumber);
// Example: analytics.trackPagination('users', 2)
```

## Disabling Analytics

To disable analytics, leave `GA_MEASUREMENT_ID` empty in `config/analytics-config.js`:

```javascript
export const GA_MEASUREMENT_ID = ''; // Empty string disables analytics
```

When disabled, all tracking calls are ignored silently.

## Privacy & GDPR Compliance

The implementation includes several privacy measures:

1. **IP Anonymization** - IP addresses are anonymized before sending to Google
2. **No Advertising** - Advertising features are disabled
3. **Consent Ready** - Can be easily extended with consent management
4. **Opt-out** - Users can disable by blocking scripts

### Adding Consent Management

To add GDPR consent management:

```javascript
// In analytics-init.js
if (ANALYTICS_ENABLED && GA_MEASUREMENT_ID && getUserConsent()) {
  analytics.init(GA_MEASUREMENT_ID);
}
```

## Alternative Analytics Providers

### Plausible Analytics

Plausible is a privacy-friendly alternative:

```javascript
// In analytics.js, add Plausible support
if (provider === 'plausible') {
  window.plausible =
    window.plausible ||
    function () {
      (window.plausible.q = window.plausible.q || []).push(arguments);
    };
}
```

### Custom Analytics

You can implement custom analytics by extending the `Analytics` class:

```javascript
class CustomAnalytics extends Analytics {
  trackEvent(eventName, category, label, value) {
    // Custom tracking logic
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({ eventName, category, label, value }),
    });
  }
}
```

## Testing

### Verify Analytics Works

1. Open DevTools → Network tab
2. Filter by "google-analytics.com"
3. Perform actions (search, navigate, etc.)
4. Check for requests to Google Analytics

### Debug Mode

Enable debug mode in `analytics-config.js`:

```javascript
export const ANALYTICS_CONFIG = {
  debug: true, // Enables console logging
  // ... other config
};
```

## Common Events

### Event Structure

All events follow this structure:

```javascript
{
    event_name: 'event_name',
    event_category: 'category',
    event_label: 'label',
    value: value
}
```

### Event Examples

| Event        | Category   | Label           | Value |
| ------------ | ---------- | --------------- | ----- |
| search       | search     | users:john      | 5     |
| profile_view | profile    | user:12345      | -     |
| theme_toggle | ui         | dark            | -     |
| pagination   | pagination | users:page_2    | -     |
| error        | error      | network:timeout | -     |

## Viewing Analytics Data

### Google Analytics Dashboard

1. Go to Google Analytics → Reports
2. Navigate to **Events** report
3. View tracked events and metrics

### Useful Reports

- **Real-time** - Current users and events
- **Events** - All tracked events
- **Pages and screens** - Page views
- **User demographics** - User characteristics

## Troubleshooting

### Analytics Not Working

1. Check `GA_MEASUREMENT_ID` is set
2. Check browser console for errors
3. Verify network requests to Google Analytics
4. Check ad blockers aren't blocking scripts

### Events Not Appearing

1. Wait 24-48 hours for data to appear
2. Check Real-time reports for immediate verification
3. Verify event names match GA4 naming conventions

### Privacy Blocking

Some users may have privacy extensions that block analytics:

- uBlock Origin
- Privacy Badger
- Firefox tracking protection

This is expected behavior.

## Resources

- [Google Analytics 4 Documentation](https://developers.google.com/analytics/devguides/collection/ga4)
- [GA4 Event Reference](https://developers.google.com地址/analytics/devguides/collection/ga4/events)
- [Privacy Best Practices](https://developers.google.com/analytics/devguides/collection/ga4/best-practices-privacy)
