# Architecture Overview

## System Architecture

### Complete Ecosystem

This viewer is part of a larger system for processing and visualizing OSM Notes:

```
┌─────────────────────────────────────────────────────────────────┐
│                    OpenStreetMap Planet                        │
│              (XML Dump + API Endpoints)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Download
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   OSM-Notes-Ingestion                          │
│                  (Data Ingestion Layer)                        │
│  - Downloads Planet dumps                                      │
│  - Syncs via OSM API                                          │
│  - Stores raw notes in PostgreSQL                              │
│  - Handles incremental updates                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Raw Notes Data
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   OSM-Notes-Analytics                          │
│                 (ETL + Data Warehouse)                         │
│  - Processes raw notes data                                    │
│  - Creates data warehouse (dwh schema)                        │
│  - Generates statistics and profiles                           │
│  - Exports to JSON files                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Pre-generated JSON
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CDN / Storage                             │
│                  (JSON Files Serving)                          │
│  - S3 / CloudFront / GitHub Pages                               │
│  - Static file hosting                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Fetch JSON
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   OSM-Notes-Viewer                            │
│                    (Static Web App)                            │
│  - User profiles                                               │
│  - Country statistics                                          │
│  - Interactive visualizations                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Shared Libraries

- **[OSM-Notes-Common](https://github.com/OSMLatam/OSM-Notes-Common)** - Shared utilities and libraries used across all projects
  - Common Bash functions
  - Logging utilities
  - Error handling
  - Validation functions

## Frontend Architecture

### Layer Structure

```
┌────────────────────────────────────────┐
│         Presentation Layer             │
│    (HTML Pages + CSS Styling)          │
└────────────────────────────────────────┘
              ▲
              │
┌────────────────────────────────────────┐
│        Component Layer                 │
│   (Reusable UI Components)             │
│   - activityHeatmap.js                 │
│   - workingHoursHeatmap.js             │
└────────────────────────────────────────┘
              ▲
              │
┌────────────────────────────────────────┐
│         Business Logic                 │
│    (Page Controllers)                  │
│   - main.js                            │
│   - userProfile.js                     │
│   - countryProfile.js                  │
└────────────────────────────────────────┘
              ▲
              │
┌────────────────────────────────────────┐
│         Data Layer                     │
│   - apiClient.js (API wrapper)         │
│   - cache.js (LocalStorage)            │
│   - formatter.js (Utilities)           │
└────────────────────────────────────────┘
              ▲
              │
┌────────────────────────────────────────┐
│      Configuration                     │
│   - api-config.js                      │
└────────────────────────────────────────┘
```

## Data Flow

### 1. Initial Page Load

```
User visits page
    ↓
Load HTML/CSS/JS
    ↓
main.js initializes
    ↓
Check localStorage cache
    │
    ├─ Cache valid → Use cached data
    │
    └─ Cache invalid or missing
        ↓
    Fetch from API
        ↓
    Store in cache
        ↓
    Render UI
```

### 2. Search Flow

```
User types in search
    ↓
Fetch index.json (users or countries)
    ↓
Filter results client-side
    ↓
Display matching results
    ↓
User clicks result
    ↓
Navigate to profile page
```

### 3. Profile Page Flow

```
Profile page loads
    ↓
Extract ID from URL params
    ↓
Check cache
    │
    ├─ Cache hit → Render immediately
    │
    └─ Cache miss
        ↓
    Fetch /users/{id}.json or /countries/{id}.json
        ↓
    Parse JSON
        ↓
    Store in cache
        ↓
    Render components
        ├─ Statistics cards
        ├─ Activity heatmap
        ├─ Hashtags
        ├─ Rankings
        └─ Working hours
```

## Component Architecture

### API Client (apiClient.js)

**Responsibilities:**
- Fetch JSON files
- Manage cache
- Handle errors
- Provide typed methods for each endpoint

**Key Methods:**
- `getMetadata()` - Export info
- `getUserIndex()` - All users list
- `getCountryIndex()` - All countries list
- `getUser(id)` - User profile
- `getCountry(id)` - Country profile

### Cache System (cache.js)

**Responsibilities:**
- Store data in localStorage
- Validate cache age
- Clear expired cache
- Manage cache size

**Key Methods:**
- `cacheSet(key, data)` - Store data
- `cacheGet(key, maxAge)` - Retrieve if valid
- `cacheDelete(key)` - Remove entry
- `cacheClear()` - Clear all

### Formatter (formatter.js)

**Responsibilities:**
- Format numbers (1234 → 1,234)
- Format dates (ISO → readable)
- Format percentages
- Truncate text

## Caching Strategy

### Cache Levels

1. **Browser Cache** (HTTP headers)
   - Controlled by CDN/server
   - 15 minutes for data files
   - 1 hour for static assets

2. **LocalStorage Cache** (application level)
   - Managed by cache.js
   - 15 minutes TTL
   - Per-entity caching
   - Survives page refresh

3. **Memory Cache** (apiClient)
   - In-memory Map
   - Cleared on page unload
   - Fastest access

### Cache Keys

```
osm_notes_metadata          → metadata.json
osm_notes_index_users       → indexes/users.json
osm_notes_index_countries   → indexes/countries.json
osm_notes_user_123          → users/123.json
osm_notes_country_456       → countries/456.json
```

## Performance Considerations

### Initial Load Time

**Target:** < 2 seconds on 3G

**Optimizations:**
- Minimal CSS (< 10KB)
- Vanilla JS (no framework overhead)
- Lazy load components
- Cache index files aggressively

### Profile Page Load

**Target:** < 500ms with cache, < 2s without

**Optimizations:**
- Small JSON files (2-10 KB each)
- Client-side rendering
- Progressive loading
- Skeleton screens

### Search Performance

**Strategy:** Client-side filtering

**Why:**
- Index files are small (< 100 KB typically)
- No server required
- Instant results
- Works offline (if cached)

## Scalability

### Current Design Supports:

- **Users:** Up to 100,000 (index ~1 MB)
- **Countries:** Up to 500 (index ~50 KB)
- **JSON files:** Millions (fetched on-demand)

### If Scale Exceeds:

1. **Split index files** by letter/range
2. **Implement server-side search** API
3. **Add pagination** to index
4. **Consider database** backend

## Security Considerations

### Current (Static JSON)

- **No sensitive data** - All OSM data is public
- **No authentication** - Read-only viewer (historical data)
- **HTTPS required** - For CDN and site
- **No XSS risk** - All data properly escaped
- **No CSRF risk** - No state-changing operations

### Future (REST API)

- **Hybrid authentication strategy** - Historical data remains public, recent data requires User-Agent
- **User-Agent required** - Valid User-Agent header required for all API endpoints (format: `AppName/Version (Contact)`)
- **OAuth 2.0 with OSM** - Optional, only for specific endpoints that require user identity
- **Rate limiting** - Per IP + User-Agent limits for API access
- **Usage analytics** - Track and analyze API usage patterns by application (User-Agent)

This approach is aligned with the [OSM-Notes-API proposal](../OSM-Notes-API/docs/API_Proposal.md). For detailed information about the authentication strategy, see [AUTHENTICATION_STRATEGY.md](AUTHENTICATION_STRATEGY.md).

## Browser Compatibility

### Required Features:

- ES6 Modules
- Fetch API
- LocalStorage
- Promises/async-await
- CSS Grid

### Minimum Versions:

- Chrome: 61+
- Firefox: 60+
- Safari: 11+
- Edge: 79+

### Progressive Enhancement:

- Core functionality works without JS (minimal)
- Enhanced with JS modules
- Graceful degradation for older browsers

## Future Architecture

### Potential Enhancements:

1. **Service Worker** for offline mode
2. **IndexedDB** for larger cache
3. **WebSocket** for real-time updates
4. **GraphQL** layer for flexible queries
5. **Server-Side Rendering** for better SEO
6. **Web Components** for better encapsulation

### Migration Path:

Current (Vanilla JS) → React/Vue → Next.js/Nuxt → Full-stack

Each step adds complexity but also features. Start simple, evolve as needed.

