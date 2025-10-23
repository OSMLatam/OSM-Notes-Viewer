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

### 5. About Page

**URL:** `/pages/about.html`

**Features:**
- Project information
- Technology stack
- Links to source code
- How to contribute

---

## Planned Features (Future Versions)

### High Priority

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

#### Interactive Charts
- **Description:** Bar charts, pie charts for statistics
- **Technology:** Chart.js or custom SVG
- **Data:** Various datamart fields
- **Status:** Basic components created

### Medium Priority

#### Advanced Search
- Autocomplete with suggestions
- Filter by activity level
- Search by hashtag
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

#### Map Integration
- Show note locations on map (Leaflet)
- Cluster markers by country
- Heat map of activity

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
- Keyboard navigation (basic)
- Alt text for images
- Color contrast (WCAG AA)

### Planned:
- ARIA labels for all interactive elements
- Screen reader optimization
- Focus management
- Skip links
- Keyboard shortcuts

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

### Polyfills:
Currently none required for modern browsers.

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

