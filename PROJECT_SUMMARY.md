# OSM Notes Viewer - Project Summary

## Overview

This repository contains a static web application for visualizing OpenStreetMap Notes analytics data.

**Created:** 2025-10-21  
**Version:** 1.0.0  
**License:** MIT

## Repository Structure

```
OSM-Notes-Viewer/
├── .github/
│   └── workflows/
│       └── deploy-pages.yml        # GitHub Pages deployment
│
├── config/
│   └── api-config.js               # API endpoint configuration
│
├── data/                           # JSON data files (gitignored)
│   ├── README.md
│   ├── indexes/
│   ├── users/
│   └── countries/
│
├── docs/
│   ├── API.md                      # JSON data structure
│   ├── ARCHITECTURE.md             # System architecture
│   ├── CONTRIBUTING.md             # Contribution guidelines
│   ├── DATA_SYNC.md                # Data synchronization guide
│   ├── DEPLOYMENT.md               # Deployment instructions
│   └── FEATURES.md                 # Feature documentation
│
├── public/
│   └── favicon.svg                 # Site icon
│
├── scripts/
│   ├── create-sample-data.sh       # Generate test data
│   └── sync-data.sh                # Sync from analytics repo
│
├── src/
│   ├── css/
│   │   ├── main.css                # Main stylesheet
│   │   └── profile.css             # Profile page styles
│   │
│   ├── js/
│   │   ├── api/
│   │   │   └── apiClient.js        # API wrapper
│   │   ├── components/
│   │   │   ├── activityHeatmap.js  # GitHub-style heatmap
│   │   │   ├── chart.js            # Chart components
│   │   │   ├── search.js           # Search component
│   │   │   └── workingHoursHeatmap.js
│   │   ├── pages/
│   │   │   ├── countryProfile.js   # Country page logic
│   │   │   └── userProfile.js      # User page logic
│   │   ├── utils/
│   │   │   ├── cache.js            # LocalStorage cache
│   │   │   ├── formatter.js        # Data formatting
│   │   │   ├── urlParams.js        # URL utilities
│   │   │   └── validation.js       # Data validation
│   │   └── main.js                 # Main app logic
│   │
│   ├── pages/
│   │   ├── about.html              # About page
│   │   ├── country.html            # Country profile
│   │   ├── explore.html            # Browse all data
│   │   └── user.html               # User profile
│   │
│   ├── 404.html                    # Error page
│   ├── index.html                  # Home page
│   ├── manifest.json               # PWA manifest
│   └── robots.txt                  # SEO
│
├── tests/
│   └── test-sample.html            # Testing instructions
│
├── .editorconfig                   # Editor settings
├── .gitignore                      # Git ignore rules
├── _redirects                      # Netlify redirects
├── CHANGELOG.md                    # Version history
├── netlify.toml                    # Netlify config
├── package.json                    # NPM config
├── QUICK_START.md                  # Quick start guide
├── README.md                       # Main documentation
├── TODO.md                         # Future tasks
└── vercel.json                     # Vercel config
```

## Technology Stack

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS variables
- **JavaScript (ES6 Modules)** - Vanilla JS, no frameworks
- **No build tools** - Direct deployment
- **No dependencies** - Lightweight and fast

## Key Files

### Configuration
- `config/api-config.js` - API endpoint and feature flags

### Core Application
- `src/index.html` - Landing page
- `src/js/main.js` - Main application logic
- `src/js/api/apiClient.js` - Data fetching with caching

### Components
- `activityHeatmap.js` - GitHub-style contribution calendar
- `workingHoursHeatmap.js` - 24x7 activity heatmap
- `chart.js` - Simple chart components

### Utilities
- `formatter.js` - Number/date formatting
- `cache.js` - LocalStorage management
- `validation.js` - Data validation
- `urlParams.js` - URL parameter handling

## Data Structure

### Endpoints
- `/api/metadata.json` - Export metadata
- `/api/indexes/users.json` - All users (for search)
- `/api/indexes/countries.json` - All countries
- `/api/users/{id}.json` - User profile
- `/api/countries/{id}.json` - Country profile

### Fields per User
~50 fields including statistics, rankings, and patterns

### Fields per Country
~50 fields including statistics, top users, and patterns

See `docs/API.md` for complete field documentation.

## Development

### Quick Start
```bash
./scripts/create-sample-data.sh
npm run dev
```

### File Organization
- **Pages:** Each page in `src/pages/`
- **Styles:** Modular CSS in `src/css/`
- **Logic:** ES6 modules in `src/js/`
- **Docs:** Comprehensive in `docs/`

## Deployment

### Supported Platforms
- Netlify (recommended)
- Vercel
- GitHub Pages
- Cloudflare Pages

### Configuration Files
- `netlify.toml` - Netlify settings
- `vercel.json` - Vercel settings
- `.github/workflows/deploy-pages.yml` - GitHub Actions

## Data Synchronization

### From Analytics Repository

```bash
# Generate data
cd OSM-Notes-Analytics
./bin/dwh/exportDatamartsToJSON.sh

# Sync to viewer
cd OSM-Notes-Viewer
./scripts/sync-data.sh
```

### Automated (Cron)
Every 15 minutes via cron job or CI/CD pipeline.

## Performance

### Metrics
- **Initial Load:** < 2s on 3G
- **Profile Load:** < 500ms (cached)
- **Search:** Instant (client-side)

### Optimizations
- LocalStorage caching (15 min TTL)
- Lazy loading
- Minimal dependencies
- Small bundle size (~50 KB total)

## Files Created: 47

### Breakdown
- **HTML:** 6 files
- **CSS:** 2 files
- **JavaScript:** 13 files
- **Documentation:** 8 files
- **Configuration:** 8 files
- **Scripts:** 2 files
- **Other:** 8 files

### Total Size
~556 KB (excluding .git)

## Next Steps

1. **Test locally** with sample data
2. **Generate real data** from analytics
3. **Deploy to Netlify/Vercel**
4. **Implement heatmap visualizations**
5. **Add Chart.js for graphs**
6. **Enhance mobile experience**

## Related Projects

This viewer is part of a larger ecosystem for processing OSM Notes:

- **[OSM-Notes-Ingestion](https://github.com/OSMLatam/OSM-Notes-Ingestion)** - Data ingestion from OSM Planet dumps and API
- **[OSM-Notes-Common](https://github.com/OSMLatam/OSM-Notes-Common)** - Shared libraries and utilities
- **[OSM-Notes-Analytics](https://github.com/angoca/OSM-Notes-Analytics)** - Data warehouse and ETL processes
- **[OSM-Notes-Viewer](https://github.com/angoca/OSM-Notes-Viewer)** - This project (web viewer)

## Links

- **Issues:** https://github.com/angoca/OSM-Notes-Viewer/issues
- **Discussions:** https://github.com/angoca/OSM-Notes-Viewer/discussions

---

**Status:** ✅ Initial structure complete and ready for development!

