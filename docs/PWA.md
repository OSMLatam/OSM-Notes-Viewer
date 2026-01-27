---
title: 'Progressive Web App (PWA) Setup'
description:
  'OSM Notes Viewer is now a Progressive Web App that can be installed on devices and works offline.'
version: '1.0.0'
last_updated: '2026-01-25'
author: 'AngocA'
tags:
  - 'documentation'
audience:
  - 'developers'
project: 'OSM-Notes-Viewer'
status: 'active'
---

# Progressive Web App (PWA) Setup

## Overview

OSM Notes Viewer is now a Progressive Web App that can be installed on devices and works offline.

## Features

- ✅ **Installable** - Add to home screen on mobile and desktop
- ✅ **Offline Support** - Cache static assets and essential data for offline use
- ✅ **Fast Loading** - Service Worker caches assets for instant loading
- ✅ **App-like Experience** - Standalone display mode
- ✅ **Offline Search** - Search indexes cached for offline browsing

## Offline Capabilities

### What Works Offline

- ✅ **Full Interface** - All HTML pages, CSS, and JavaScript
- ✅ **Search Functionality** - Users and countries indexes (~184 KB total)
  - Lists all available users/countries for search
  - Search autocomplete works offline
- ✅ **Cached Profiles** - Any profile visited while online becomes available offline
- ✅ **Navigation** - Full navigation between pages

### What Requires Network

- ⚠️ **Individual Profiles** - First-time profile visits need network
- ⚠️ **Fresh Data** - Live data updates require connection
- ⚠️ **Total Size** - ~6.9 MB of profile data NOT pre-cached

### Offline Strategy

The PWA uses a **hybrid caching strategy**:

1. **Index Files** → Pre-cached on install (~184 KB)
   - `users.json` (137 KB) - List of all users
   - `countries.json` (47 KB) - List of all countries
   - `metadata.json` - Global statistics

2. **Individual Profiles** → Cached on-demand with TTL
   - When user visits a profile, it's cached with timestamp
   - Cache duration: **15 minutes** (matches API client)
   - Network-first: Always tries to fetch fresh data
   - Offline fallback: Uses cache if network fails
   - Automatic expiration: Old data refreshed every 15 min

3. **Why Not Cache Everything?**
   - ~1,200 profile files = ~6.9 MB
   - Would exhaust mobile storage
   - Most users only visit a few profiles
   - Better to cache-as-you-go

### Cache Strategy Details

The PWA implements a **double-layer caching**:

1. **API Client Cache** (Browser Memory)
   - Duration: 15 minutes
   - Scope: Current session only
   - Fast access for repeated requests

2. **Service Worker Cache** (Disk Storage)
   - Duration: 15 minutes (with TTL check)
   - Scope: Survives page refresh
   - Offline access enabled
   - Automatic refresh after TTL expires

**Cache Flow:**

```
User Request
    ↓
[1] Check API Client Cache (< 15 min?) → Serve
    ↓ No
[2] Check Service Worker Cache (< 15 min?) → Serve
    ↓ No
[3] Fetch from Network → Cache Both Layers
    ↓ Offline?
[4] Fallback to SW Cache (even if stale)
```

## How It Works

### 1. Web App Manifest (`public/manifest.json`)

Defines app metadata:

- Name, description, icons
- Display mode (standalone)
- Theme colors
- Start URL

### 2. Service Worker (`public/sw.js`)

Handles:

- **Installation** - Caches static assets on first visit
- **Fetch Interception** - Serves cached content when offline
- **Cache Management** - Updates cache when new version available

### 3. Registration (`src/js/sw-register.js`)

Registers service worker on page load and handles updates.

## Installation

### Mobile (Android/iOS)

1. Open the app in browser
2. Tap menu (⋮) → "Add to Home Screen"
3. App icon appears on home screen
4. Tap icon to launch as standalone app

### Desktop (Chrome/Edge)

1. Open the app in browser
2. Click install icon in address bar
3. App installs as standalone window
4. Launch from Start Menu or Desktop

## Testing PWA

### Check Installation Status

Open DevTools → Application tab:

- **Manifest** - Shows app details
- **Service Workers** - Shows SW status
- **Cache Storage** - Shows cached assets

### Test Offline Mode

1. Open DevTools → Network tab
2. Check "Offline" checkbox
3. Refresh page
4. App should load from cache

### Lighthouse Test

Run Lighthouse audit to test PWA:

- Should score 90+ on PWA category
- Checks installability, offline functionality

## Development

### Adding New Assets to Cache

Update `STATIC_ASSETS` array in `public/sw.js`:

```javascript
const STATIC_ASSETS = [
  '/index.html',
  '/pages/user.html',
  // Add new files here
];
```

### Updating Cache Version

Change `CACHE_NAME` in `public/sw.js`:

```javascript
const CACHE_NAME = 'osm-notes-viewer-v2'; // Increment version
```

This forces cache refresh on next visit.

## Troubleshooting

### Service Worker Not Registering

1. Check HTTPS (required for SW)
2. Check browser support
3. Check console for errors

### Cache Not Updating

1. Force reload (Ctrl+Shift+R)
2. Clear cache in DevTools
3. Update CACHE_NAME version

### Offline Mode Not Working

1. Check Service Worker status in DevTools
2. Verify assets are cached
3. Check network requests in console

## Browser Support

- ✅ Chrome/Edge (Full support)
- ✅ Firefox (Full support)
- ✅ Safari (Partial support)
- ⚠️ Service Worker requires HTTPS in production

## Future Enhancements

- Background sync for data updates
- Push notifications
- Periodic background sync
- Share target API
- File handling API

## Resources

- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev PWA](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
