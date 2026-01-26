---
title: "Components Documentation"
description: "This document describes all the components used in OSM Notes Viewer."
version: "1.0.0"
last_updated: "2026-01-25"
author: "AngocA"
tags:
  - "architecture"
audience:
  - "developers"
project: "OSM-Notes-Viewer"
status: "active"
---


# Components Documentation

This document describes all the components used in OSM Notes Viewer.

## 📋 Table of Contents

- [Core Components](#core-components)
- [Visualization Components](#visualization-components)
- [Utility Components](#utility-components)
- [Page Components](#page-components)

## 🎯 Core Components

### Activity Heatmap (`activityHeatmap.js`)

GitHub-style contribution calendar visualization.

**Features:**

- Displays 365 days of activity
- Color-coded intensity (5 levels)
- Hover tooltips with dates and counts
- Responsive grid layout

**Usage:**

```javascript
import { renderActivityHeatmap } from './components/activityHeatmap.js';

renderActivityHeatmap(activityString, containerElement);
```

**Parameters:**

- `activityString` (string): Binary string (365 bits) representing daily activity
- `container` (HTMLElement): DOM element to render the heatmap

### Working Hours Heatmap (`workingHoursHeatmap.js`)

24-hour × 7-day activity pattern visualization.

**Features:**

- Matrix visualization (hours × days)
- Multiple activity types (opening, commenting, closing)
- Color gradient based on intensity
- Legend and tooltips

**Usage:**

```javascript
import { renderWorkingHoursSection } from './components/workingHoursHeatmap.js';

renderWorkingHoursSection(
  openingHours,
  commentingHours,
  closingHours,
  containerElement,
  'user' // or 'country'
);
```

**Parameters:**

- `openingHours` (Array): Opening activity data
- `commentingHours` (Array): Commenting activity data
- `closingHours` (Array): Closing activity data
- `container` (HTMLElement): DOM element to render
- `context` (string): 'user' or 'country' for i18n

### Chart Component (`chart.js`)

Simple bar chart visualization using Canvas API.

**Features:**

- Horizontal bar charts
- Animated rendering
- Responsive sizing
- Customizable colors

**Usage:**

```javascript
import { createBarChart } from './components/chart.js';

const chartData = [
  { label: 'Label 1', value: 100 },
  { label: 'Label 2', value: 200 },
];

createBarChart(chartData, containerElement);
```

## 🔍 Utility Components

### Search Component (`search.js`)

Autocomplete search with filtering and highlighting.

**Features:**

- Instant filtering as you type
- Match highlighting
- Keyboard navigation
- Result click handling

**Usage:**

```javascript
import { SearchComponent } from './components/search.js';

const search = new SearchComponent(inputElement, resultsContainer, handleSelectCallback);

search.setData(dataArray);
```

### Pagination Component (`pagination.js`)

Page navigation for large lists.

**Features:**

- Previous/Next buttons
- Page number display
- Accessibility (ARIA labels)
- Keyboard support

**Usage:**

```javascript
import { renderPagination, getPaginationInfo } from './components/pagination.js';

const pagination = getPaginationInfo(totalItems, itemsPerPage, currentPage);
renderPagination(container, currentPage, totalPages, onClickCallback, 'users');
```

### Dark Mode Toggle (`darkMode.js`)

Theme switching between light and dark modes.

**Features:**

- System preference detection
- Persistent storage
- Smooth transitions
- Analytics tracking

**Usage:**

```javascript
import { initDarkMode, toggleTheme } from './components/darkMode.js';

// Initialize on page load
initDarkMode();

// Toggle theme
toggleTheme();
```

### Language Selector (`languageSelector.js`)

Multi-language support with UI selector.

**Features:**

- 4 supported languages (EN, ES, DE, FR)
- Browser language detection
- Persistent storage
- Toast notifications

**Usage:**

```javascript
import { languageSelector } from './components/languageSelector.js';

// Automatically initialized on DOMContentLoaded
// No manual initialization needed
```

### Animation Manager (`animationManager.js`)

Handles all UI animations and transitions.

**Features:**

- Scroll-triggered animations
- Ripple effects
- Counter animations
- Toast notifications
- Loading states

**Usage:**

```javascript
import { animationManager } from './components/animationManager.js';

// Show loading
animationManager.showLoading(element, 'Loading...');

// Animate counter
animationManager.animateCounter(element, 0, 1000);

// Show toast
animationManager.showToast('Success!', 'success');
```

## 📊 Page Components

### User Profile (`userProfile.js`)

Renders user profile page with all statistics.

**Features:**

- User statistics display
- Activity heatmap
- Working hours visualization
- Hashtag charts
- Country distribution
- Share functionality

### Country Profile (`countryProfile.js`)

Renders country profile page with statistics.

**Features:**

- Country statistics display
- Activity heatmap
- Working hours visualization
- Top users list
- Hashtag charts
- Share functionality

### Explore Page (`explore.js`)

Browse all users and countries.

**Features:**

- Paginated lists
- Sort options
- Filter by type
- Search integration

## 🛠️ Utility Functions

### API Client (`api/apiClient.js`)

Handles all API requests with caching.

**Methods:**

- `getMetadata()` - Get export metadata
- `getUser(userId)` - Get user profile
- `getCountry(countryId)` - Get country profile
- `getUserIndex()` - Get all users
- `getCountryIndex()` - Get all countries

**Features:**

- LocalStorage caching (15 min TTL)
- Error handling
- Automatic retry

### Formatter (`utils/formatter.js`)

Data formatting utilities.

**Functions:**

- `formatNumber(value)` - Format large numbers (1,234)
- `formatDate(dateString)` - Format dates (Jan 1, 2024)
- `formatRelativeTime(timestamp)` - Relative time (2 hours ago)

### Cache Manager (`utils/cache.js`)

LocalStorage cache management.

**Features:**

- TTL (Time To Live) support
- Automatic expiration
- Clear all / specific keys

### i18n (`utils/i18n.js`)

Internationalization system.

**Features:**

- 4 languages supported
- Browser detection
- Dynamic translation
- Persistent storage

**Usage:**

```javascript
import { i18n } from './utils/i18n.js';

// Get translation
const text = i18n.t('home.hero.title');

// Translate with parameters
const text = i18n.t('explore.results.showing', { count: 10, total: 100 });
```

## 🎨 Animation Classes

The application uses CSS animation classes for smooth transitions:

- `animate-fade-in` - Fade in animation
- `animate-fade-in-up` - Fade in from bottom
- `animate-slide-in-left` - Slide in from left
- `stagger-item` - Staggered list items
- `hover-lift` - Lift on hover
- `hover-scale` - Scale on hover
- `focus-ring` - Focus ring effect

## 📱 Responsive Design

All components are responsive and mobile-friendly:

- **Desktop**: Full feature set
- **Tablet**: Adapted layouts
- **Mobile**: Simplified navigation, touch-optimized

## ♿ Accessibility

All components include:

- ARIA labels
- Keyboard navigation
- Screen reader support
- Focus management
- High contrast support

## 🔧 Configuration

Component behavior can be configured in:

- `config/api-config.js` - API endpoints
- `config/analytics-config.js` - Analytics settings
- CSS variables in `main.css` - Theme and sizing

## 📚 Related Documentation

- [API Documentation](API.md) - Data structure and endpoints
- [Architecture](ARCHITECTURE.md) - System architecture
- [Features](FEATURES.md) - Feature documentation
- [Contributing](CONTRIBUTING.md) - Development guidelines
