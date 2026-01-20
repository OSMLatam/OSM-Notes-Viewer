# Features Documentation

## Current Features (v1.0.0)

### 1. Home Page

**URL:** `/index.html`

**Features:**

- Global statistics overview
- Top 10 contributors leaderboard
- Top 10 active countries
- Quick search functionality
- Tab switching (Users/Countries)

**Data Sources:**

- `metadata.json` - Export info
- `indexes/users.json` - User list
- `indexes/countries.json` - Country list

---

### 2. User Profile Page

**URL:** `/pages/user.html?id={user_id}`

**Features:**

- User statistics (opened, closed, commented, reopened)
- Activity visualization (placeholder for heatmap)
- Top hashtags used
- Active countries ranking
- Working hours pattern

**Data Source:**

- `users/{user_id}.json`

**Visualizations:**

- Stats cards (4 metrics)
- Hashtag tags (top 50)
- Country ranking list
- Activity heatmap (to be implemented)
- Working hours heatmap (to be implemented)

---

### 3. Country Profile Page

**URL:** `/pages/country.html?id={country_id}`

**Features:**

- Country statistics
- Top contributors in the country
- Popular hashtags
- Activity patterns

**Data Source:**

- `countries/{country_id}.json`

**Visualizations:**

- Stats cards
- User ranking
- Hashtag analysis
- Activity and working hours heatmaps (to be implemented)

---

### 4. Explore Page

**URL:** `/pages/explore.html`

**Features:**

- Browse all users
- Browse all countries
- Grid view with basic stats

**Data Sources:**

- `indexes/users.json`
- `indexes/countries.json`

---

### 5. Note Viewer Page

**URL:** `/pages/note.html?id={note_id}`

**Features:**

- Note status (open, closed, reopened)
- Interactive map showing note location
- Link to country profile
- Chronological activity timeline
- Link to note XML on OSM
- User profile links for all participants
- Hashtag identification with links to hashtag pages
- Comment field with hashtag suggestions (#surveyme, #invalid)
- Action buttons (reopen, close, comment, report) - requires OAuth
- ML recommendation section (for open notes)
  - Recommended action (close, comment, map)
  - Confidence score
  - Suggested JOSM tags (if action is "map")
  - Copy to clipboard functionality

**Data Sources:**

- `OSM-Notes-API`: `GET /api/v1/notes/{noteId}`
- `OSM-Notes-API`: `GET /api/v1/notes/{noteId}/recommendation` (ML)
- `OSM API`: `https://api.openstreetmap.org/api/0.6/notes/{noteId}.xml`

**Visualizations:**

- Leaflet map with note marker
- Activity timeline with user avatars
- Status badge
- ML recommendation card

---

### 6. Hashtag Viewer Page

**URL:** `/pages/hashtag.html?tag={hashtag}&page={page}`

**Features:**

- Hashtag header with statistics (users count, countries count)
- Filter notes by status (all, open, closed, reopened)
- Filter by date range (from/to)
- Paginated notes list
- Note cards with:
  - Note ID and status
  - Creation/closure dates
  - Comments count
  - Links to note viewer and country profile
- Keyboard navigation support

**Data Sources:**

- `OSM-Notes-API`: `GET /api/v1/hashtags/{hashtag}`
- `OSM-Notes-API`: `GET /api/v1/notes?text=#{hashtag}&page={page}&limit={limit}`

**Filters:**

- Status: `status=open|closed|reopened`
- Date from: `date_from=YYYY-MM-DD`
- Date to: `date_to=YYYY-MM-DD`

---

### 7. Map Viewer Page

**URL:** `/pages/map.html`

**Features:**

- Three map tabs:
  - **Open Notes**: Map of currently open notes
  - **Closed Notes**: Map of closed notes
  - **Boundaries**: Country boundaries and disputed areas
- Base layer switching (OpenStreetMap, Satellite)
- Geolocation support (centers map on user location)
- 500km initial bounding box for notes maps (prevents global queries)
- Reset view button
- GetFeatureInfo popups showing note details
- WMS service documentation with copy buttons
- Keyboard navigation for tabs

**Data Sources:**

- **WMS Service**: `https://geoserver.osm.lat/geoserver/osm_notes/wms`
- **Layers:**
  - `osm_notes:notesopen` - Open notes
  - `osm_notes:notesclosed` - Closed notes
  - `osm_notes:countries` - Country boundaries
  - `osm_notes:disputedareas` - Disputed areas

**Technology:**

- Leaflet.js for map rendering
- `leaflet.wms` plugin (with native fallback)
- Browser Geolocation API

---

### 8. About Page

**URL:** `/pages/about.html`

**Features:**

- Project information
- Technology stack
- Links to source code
- How to contribute

---

## New Features (v2.0.0)

### Note Search on Home Page

- **Description:** Search notes by ID from home page
- **URL:** Redirects to `/pages/note.html?id={noteId}`
- **Status:** ✅ Implemented

### Individual Note Viewer

- **Description:** Complete note details with map, timeline, and ML recommendations
- **Status:** ✅ Implemented
- **Features:**
  - Interactive map with note location
  - Activity timeline
  - ML recommendations
  - JOSM tags for mapping

### Hashtag Browser

- **Description:** Browse all notes with a specific hashtag
- **Status:** ✅ Implemented
- **Features:**
  - Filtering by status and date
  - Pagination
  - Statistics

### WMS Map Integration

- **Description:** Interactive maps showing notes and boundaries
- **Status:** ✅ Implemented
- **Features:**
  - Three map types (open, closed, boundaries)
  - Geolocation-based initial view
  - WMS layer consumption

### ML Recommendations Integration

- **Description:** AI-powered recommendations for note actions
- **Status:** ✅ Implemented
- **Features:**
  - Action recommendations (close, comment, map)
  - Confidence scores
  - JOSM tag suggestions

## Planned Features (Future Versions)

### High Priority

#### OAuth Integration for Note Actions

- **Description:** Allow users to comment, close, and reopen notes
- **Technology:** OAuth 2.0 with OpenStreetMap
- **Status:** UI ready, backend integration pending

#### GitHub-Style Activity Heatmap

- **Description:** Visual representation of last year's activity
- **Technology:** SVG-based heatmap
- **Data:** `last_year_activity` string (371 chars)
- **Status:** Component created, needs integration

#### Working Hours Heatmap

- **Description:** 24h x 7 days visualization
- **Technology:** SVG heatmap
- **Data:** `working_hours_of_week_*` arrays
- **Status:** Component created, needs integration

### Medium Priority

#### Advanced Search

- Autocomplete with suggestions
- Filter by activity level
- Multi-criteria search

#### Comparison Tool

- Compare two users side by side
- Compare two countries
- Historical comparisons

#### Detailed Statistics

- Monthly trends charts
- Year-over-year growth
- Contribution streaks
- Personal bests

### Low Priority

#### Social Features

- Share profile links
- Export statistics as image
- Leaderboard badges

#### Advanced Visualizations

- Sankey diagrams (flow of users across countries)
- Timeline view
- Network graphs (user interactions)

#### PWA Features

- Offline mode
- Install as app
- Push notifications (when followed user updates)

---

## Feature Flags

Located in `config/api-config.js`:

```javascript
FEATURES: {
    enableCache: true,          // LocalStorage caching
    enableOfflineMode: false,   // Service Worker (future)
    showDebugInfo: false        // Console logging
}
```

---

## Analytics & Metrics

### User Metrics

**Lifetime (whole):**

- `history_whole_open` - Notes opened
- `history_whole_closed` - Notes closed
- `history_whole_commented` - Comments made
- `history_whole_closed_with_comment` - Closes with text
- `history_whole_reopened` - Notes reopened

**Time-based:**

- `history_year_*` - Current year
- `history_month_*` - Current month
- `history_day_*` - Today

**Other:**

- `dates_most_open` - Peak activity days
- `hashtags` - Hashtag usage
- `countries_*_notes` - Geographic distribution
- `working_hours_of_week_*` - Time patterns

### Country Metrics

Same structure as users but:

- `users_open_notes` - Top contributors
- `users_solving_notes` - Top solvers

---

## Data Refresh

- **Backend:** Generates JSON every 15 minutes
- **Frontend Cache:** 15 minutes TTL
- **Browser Cache:** 15 minutes (HTTP headers)
- **Total latency:** 0-30 minutes from action to display

---

## Accessibility Features

### Current:

- Semantic HTML
- Keyboard navigation (full support)
- Alt text for images
- Color contrast (WCAG AA/AAA - 7:1 ratio for status badges)
- ARIA labels and roles for all interactive elements
- Skip links on all pages
- Focus management
- Screen reader optimization
- Keyboard shortcuts for map tabs and note cards

### Implemented (v2.0.0):

- ✅ ARIA roles (`banner`, `navigation`, `main`, `region`, `list`, `article`, `form`, `tablist`,
  `tab`, `tabpanel`)
- ✅ ARIA labels for all buttons and controls
- ✅ Skip links for main content
- ✅ Keyboard navigation for:
  - Map tabs (Arrow keys, Home, End, Enter, Space)
  - Note cards (Enter, Space)
  - All interactive elements
- ✅ Focus styles with visible outlines
- ✅ Color contrast improvements (7:1 ratio)

---

## Browser Support

### Tested:

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Required Features:

- ES6 Modules
- Fetch API
- CSS Grid
- LocalStorage
- Promises
- Geolocation API (for map viewer)
- Clipboard API (for JOSM tags copy)

### Polyfills:

Currently none required for modern browsers.

### Geolocation:

- Required for map viewer initial positioning
- Falls back to world view if not available
- Requires HTTPS in production

---

## Performance Targets

- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3s
- **Largest Contentful Paint:** < 2.5s
- **Cumulative Layout Shift:** < 0.1
- **First Input Delay:** < 100ms

---

## Security Features

- No user authentication (public data only)
- No cookies
- No tracking (unless analytics added)
- HTTPS only in production
- Content Security Policy headers
- No eval() or dangerous functions
- Input sanitization for XSS prevention
