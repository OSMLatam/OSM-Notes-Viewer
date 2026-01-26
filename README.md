# OSM Notes Viewer 🗺️

Interactive web viewer for OpenStreetMap Notes analytics data.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenStreetMap](https://img.shields.io/badge/OpenStreetMap-%23E7352B?logo=openstreetmap&logoColor=white)](https://www.openstreetmap.org/)
[![Build Status](https://github.com/OSM-Notes/OSM-Notes-Viewer/workflows/CI/badge.svg)](https://github.com/OSM-Notes/OSM-Notes-Viewer/actions)

🌐 **Live Demo**: [View on notes.osm.lat](https://notes.osm.lat/)

## 🎯 Overview

This web application provides an interactive interface to explore OpenStreetMap notes statistics,
including:

- User profiles with activity analysis
- Country-level statistics
- Hashtag usage trends
- Activity heatmaps and visualizations
- Working hours patterns

## 📸 Screenshots

### Home Page

![Home Page](docs/screenshots/home.png) _Overview of global statistics and top contributors_

### User Profile

![User Profile](docs/screenshots/user-profile.png) _Detailed user statistics with activity heatmap
and working hours_

### Country Profile

![Country Profile](docs/screenshots/country-profile.png) _Country-level analytics and top
contributors_

### Working Hours Heatmap

![Working Hours](docs/screenshots/working-hours.png) _24/7 activity patterns visualization_

> 📝 **Note**: Screenshots will be added after deployment. Check back soon!

## ✨ Features

### 🔍 Search & Navigation

- **Instant Search** - Find users and countries with autocomplete
- **Advanced Filtering** - Sort by activity, date, or alphabetically
- **Quick Access** - Direct links to user and country profiles

### 📊 Visualizations

- **Activity Heatmaps** - GitHub-style contribution calendars (365 days)
- **Working Hours** - 24/7 activity patterns visualization
- **Interactive Charts** - Bar charts for hashtags and countries
- **Statistics Cards** - Real-time counts and metrics

### 🌍 Geographic Analysis

- **Country Profiles** - Detailed statistics per country
- **Top Contributors** - Most active users worldwide
- **Geographic Distribution** - See where notes are created

### #️⃣ Hashtag Tracking

- **Trending Hashtags** - Most used hashtags
- **User-specific Tags** - Personalized hashtag analysis
- **Country-specific Tags** - Regional hashtag patterns

### 🎨 User Experience

- **Dark Mode** - Eye-friendly dark theme
- **Internationalization** - Support for 4 languages (EN, ES, DE, FR)
- **Animations** - Smooth transitions and micro-interactions
- **Responsive Design** - Works on desktop, tablet, and mobile
- **PWA Support** - Installable progressive web app
- **Offline Mode** - Works without internet connection

### ⚡ Performance

- **Lightning Fast** - Pure HTML/CSS/JS, no build step
- **Smart Caching** - LocalStorage with TTL for instant loading
- **Minimal Bundle** - ~50KB total size
- **CDN Ready** - Easy deployment to any static host

## Data Architecture

The viewer uses a **separate data repository** served via GitHub Pages for maximum flexibility and
performance.

### Architecture

```
┌────────────────────────────────────────┐
│  OSM-Notes-Analytics                  │
│  Generates JSON data                   │
└──────────────┬─────────────────────────┘
               │ exportAndPushToGitHub.sh
               ▼
┌────────────────────────────────────────┐
│  OSM-Notes-Data                         │
│  https://notes.osm.lat/data             │
│  Serves JSON files                      │
└──────────────┬─────────────────────────┘
               │ HTTP Requests
               ▼
┌────────────────────────────────────────┐
│  OSM-Notes-Viewer (GitHub Pages)      │
│  Web application                        │
└────────────────────────────────────────┘
```

### Benefits

- ✅ **Separation of concerns** - Data and viewer are independent
- ✅ **Easy updates** - Update data without rebuilding viewer
- ✅ **Better caching** - Separate caching for data and app
- ✅ **Scalable** - Easy to migrate to CDN later
- ✅ **Public data** - Data repository is publicly accessible

### Updating Data

To update the data files:

```bash
cd ~/github/OSM-Notes-Analytics
./bin/dwh/exportAndPushToGitHub.sh
```

The script will:

1. Export JSON files from the analytics database
2. Push them to the OSM-Notes-Data repository
3. GitHub Pages automatically updates within 1-2 minutes

## OSM-Notes Ecosystem

This viewer project is part of the **OSM-Notes ecosystem**, consisting of 8 interconnected projects.
**OSM-Notes-Ingestion is the base project** - it was the first created and provides the foundation
for all others.

### Ecosystem Projects

1. **[OSM-Notes-Ingestion](https://github.com/OSM-Notes/OSM-Notes-Ingestion)** - **Base project**
   - Downloads and synchronizes OSM notes from Planet and API
   - Populates base PostgreSQL tables
   - First project created, foundation for all others

2. **[OSM-Notes-Analytics](https://github.com/OSM-Notes/OSM-Notes-Analytics)**
   - ETL processes and data warehouse
   - Generates analytics and datamarts
   - Exports JSON data to OSM-Notes-Data
   - **Requires**: OSM-Notes-Ingestion (reads from base tables)

3. **[OSM-Notes-API](https://github.com/OSM-Notes/OSM-Notes-API)**
   - REST API for programmatic access
   - Provides dynamic queries and advanced features
   - **Requires**: OSM-Notes-Analytics (reads from data warehouse)
   - **Alternative to**: Static JSON system (can be used instead of Viewer for programmatic access)

4. **[OSM-Notes-Viewer](https://github.com/OSM-Notes/OSM-Notes-Viewer)** (this project)
   - Web application for interactive visualization
   - Interactive dashboards and visualizations
   - User and country profiles
   - Consumes JSON data from OSM-Notes-Data (GitHub Pages)
   - **Requires**: OSM-Notes-Data (which is generated by OSM-Notes-Analytics)

5. **[OSM-Notes-WMS](https://github.com/OSM-Notes/OSM-Notes-WMS)**
   - Web Map Service for geographic visualization
   - Publishes WMS layers for mapping applications
   - **Requires**: OSM-Notes-Ingestion (uses same database)

6. **[OSM-Notes-Monitoring](https://github.com/OSM-Notes/OSM-Notes-Monitoring)**
   - Centralized monitoring and alerting
   - Monitors all ecosystem components
   - **Requires**: Access to all other projects' databases/services

7. **[OSM-Notes-Common](https://github.com/OSM-Notes/OSM-Notes-Common)**
   - Shared Bash libraries and utilities
   - Used as Git submodule by multiple projects
   - **Used by**: Ingestion, Analytics, WMS, Monitoring
   - **Note**: This Viewer project (JavaScript) does not use Common directly

8. **[OSM-Notes-Data](https://github.com/OSM-Notes/OSM-Notes-Data)**
   - JSON data files exported from Analytics
   - Served via GitHub Pages
   - **Requires**: OSM-Notes-Analytics (generates and publishes the data)
   - **Consumed by**: Viewer (this project - primary consumer), API (optional)

### Project Relationships

```
OSM Planet/API
    ↓
[OSM-Notes-Ingestion] ← Base project
    ├─→ [OSM-Notes-Analytics] → ETL → Data Warehouse
    │       ├─→ [OSM-Notes-Data] → JSON files (GitHub Pages)
    │       │       └─→ [OSM-Notes-Viewer] → Consumes JSON from Data (this project)
    │       └─→ [OSM-Notes-API] → REST API (reads from Analytics DWH)
    └─→ [OSM-Notes-WMS] → WMS layers
    
[OSM-Notes-Monitoring] → Monitors all projects
[OSM-Notes-Common] → Shared libraries (submodule, not used by this Viewer)
```

### Data Flow

```
OSM Planet Dump / API
    ↓
[OSM-Notes-Ingestion] → Raw notes data in PostgreSQL
    ↓
[OSM-Notes-Analytics] → ETL processes → Data warehouse
    ↓
[OSM-Notes-Analytics] → Export to JSON → [OSM-Notes-Data] (GitHub Pages)
    ↓
[OSM-Notes-Viewer] → Display in web browser (this project)
```

The backend (Analytics) generates the following JSON files in OSM-Notes-Data:

- `/api/users/{user_id}.json` - Individual user profiles
- `/api/countries/{country_id}.json` - Country statistics
- `/api/indexes/users.json` - List of all users
- `/api/indexes/countries.json` - List of all countries
- `/api/metadata.json` - Export metadata (timestamp, counts)

The backend generates the following JSON files:

- `/api/users/{user_id}.json` - Individual user profiles
- `/api/countries/{country_id}.json` - Country statistics
- `/api/indexes/users.json` - List of all users
- `/api/indexes/countries.json` - List of all countries
- `/api/metadata.json` - Export metadata (timestamp, counts)

## Requirements

### Application Requirements

- **Modern web browser**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Node.js** 14+ (for development only, optional)
- **Python** 3+ (for local development server, optional)
- **GitHub Pages** or static hosting (for production deployment)

### Internal Repository Requirements

- **OSM-Notes-Data** ⚠️ **REQUIRED**
  - This viewer consumes JSON data from OSM-Notes-Data (GitHub Pages)
  - Data is automatically generated by OSM-Notes-Analytics
  - **Installation order**: Analytics → Data → Viewer
  - **Note**: Viewer can work independently once Data is available (no direct dependency on Analytics)

## Recommended Reading Path

**New to this project?** Follow this reading path to understand the Viewer (~1 hour):

### For Users

1. **Start Here** (10 min)
   - Read this README.md (you're here!)
   - Understand the project purpose and features
   - Review the Quick Start guide below

2. **Using the Viewer** (20 min)
   - Visit the live demo: [notes.osm.lat](https://notes.osm.lat/)
   - Explore user and country profiles
   - Try the search and filtering features

**Total time: ~30 minutes** for basic usage.

### For Developers

1. **Foundation** (30 min)
   - [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture (20 min)
   - [docs/FEATURES.md](docs/FEATURES.md) - Feature documentation (10 min)

2. **Setup and Development** (30 min)
   - Quick Start section below - Local development setup (15 min)
   - [docs/BUILD.md](docs/BUILD.md) - Building the project (15 min)

3. **Data and API** (20 min)
   - [docs/API.md](docs/API.md) - API endpoints and data structure (10 min)
   - [docs/DATA_CONTRACT.md](docs/DATA_CONTRACT.md) - Data contract with Analytics (10 min)

4. **Deep Dive** (as needed)
   - [docs/COMPONENTS.md](docs/COMPONENTS.md) - Component documentation
   - [docs/AUTHENTICATION_STRATEGY.md](docs/AUTHENTICATION_STRATEGY.md) - Authentication approach
   - [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) - Contribution guidelines

**Total time: ~1.5 hours** for complete developer overview.

## Entry Points

**Main entry points** for using and developing the Viewer:

### Application Entry Points

1. **Production Access** (GitHub Pages)
   - **Live URL**: [https://notes.osm.lat/](https://notes.osm.lat/)
   - **Data Source**: [OSM-Notes-Data](https://github.com/OSM-Notes/OSM-Notes-Data) (GitHub Pages)

2. **Local Development Server**
   ```bash
   # Option 1: Vite (recommended, with hot reload)
   npm run dev
   
   # Option 2: Python HTTP server
   npm run serve
   # or: python3 -m http.server 8000 --directory src
   
   # Option 3: Node.js http-server
   npx http-server src -p 8000
   ```
   Then open: `http://localhost:8000/src/index.html`

### Development Entry Points

1. **Build for Production**
   ```bash
   npm run build          # Build static files to dist/
   npm run preview        # Preview production build locally
   ```

2. **Testing**
   ```bash
   npm test               # Run tests in watch mode
   npm run test:run       # Run tests once
   npm run test:coverage  # Run tests with coverage
   ```

3. **Data Validation**
   ```bash
   npm run validate       # Validate data files
   npm run validate:all   # Validate all data files
   ```

4. **Create Sample Data** (for local testing)
   ```bash
   ./scripts/create-sample-data.sh
   ```

### Web Entry Points

- **Home Page**: `/src/index.html` - Main application entry point
- **User Profile**: `/src/index.html#/user/:username` - User profile view
- **Country Profile**: `/src/index.html#/country/:countryId` - Country profile view
- **Search**: `/src/index.html#/search` - Search interface

### Configuration Entry Point

- **API Configuration**: `config/api-config.js` - Configure data source URL
  ```javascript
  export const API_BASE_URL = 'https://your-cdn.com/api';
  ```

### JSON Schema Validation

To ensure data compatibility between the Analytics (producer) and Viewer (consumer) repositories,
JSON Schema definitions are provided in the `lib/OSM-Notes-Common/schemas/` directory via a git
submodule.

These schemas define the contract for data exchange:

- **Type safety** - Enforce correct data types
- **Required fields** - Ensure critical data is present
- **Validation** - Catch errors before deployment
- **Documentation** - Self-documenting data structure

To validate data files:

```bash
# Install AJV CLI
npm install -g ajv-cli

# Validate schemas
./scripts/validate-schemas.sh

# Or validate individual files
ajv -s lib/OSM-Notes-Common/schemas/user-profile.schema.json -d src/data/users/*.json
```

For more details, see [docs/DATA_CONTRACT.md](docs/DATA_CONTRACT.md) and
[lib/OSM-Notes-Common/schemas/README.md](lib/OSM-Notes-Common/schemas/README.md).

## 🚀 Quick Start

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Node.js 14+ (for development)
- Python 3+ (alternative server)

### Installation

```bash
# Clone the repository
git clone https://github.com/OSM-Notes/OSM-Notes-Viewer.git
cd OSM-Notes-Viewer

# Install dependencies (optional, for development)
npm install
```

### Development Server

```bash
# Option 1: Using Vite (recommended)
npm run dev

# Option 2: Using Python
python3 -m http.server 8000

# Option 3: Using Node.js http-server
npx http-server -p 8000

# Open browser
open http://localhost:8000/src/index.html
```

### Build for Production

```bash
# Build static files
npm run build

# Preview production build
npm run preview
```

### For Production Deployment

The application is deployed via GitHub Pages using GitHub Actions. Configuration files:

- `.github/workflows/deploy-pages.yml` - Deployment workflow
- Data is served from a separate repository:
  [OSM-Notes-Data](https://github.com/OSM-Notes/OSM-Notes-Data)

## Configuration

Update the API endpoint in `config/api-config.js`:

```javascript
export const API_BASE_URL = 'https://your-cdn.com/api';
```

## Project Structure

```
OSM-Notes-Viewer/
├── src/
│   ├── index.html              # Main page
│   ├── css/                    # Stylesheets
│   ├── js/
│   │   ├── api/               # API client functions
│   │   ├── components/        # UI components
│   │   └── utils/             # Utility functions
│   └── pages/                 # Additional pages
├── public/                    # Static assets
├── config/                    # Configuration files
└── docs/                      # Documentation
```

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Charts**: Canvas API
- **Build Tool**: Vite
- **Testing**: Vitest
- **CI/CD**: GitHub Actions

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari, Chrome Mobile

## 📚 Documentation

- [Architecture](docs/ARCHITECTURE.md) - System architecture overview
- [Components](docs/COMPONENTS.md) - Component documentation
- [API](docs/API.md) - API endpoints and data structure
- [Authentication Strategy](docs/AUTHENTICATION_STRATEGY.md) - Hybrid authentication approach
  (User-Agent required, OAuth optional) including client-side protection
- [Features](docs/FEATURES.md) - Feature documentation
- [Build Guide](docs/BUILD.md) - Building the project
- [Contributing](docs/CONTRIBUTING.md) - Contribution guidelines

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](docs/CONTRIBUTING.md) first.

### Development Guidelines

1. **Keep it simple** - Vanilla JS preferred, no frameworks
2. **Mobile-first** - Responsive design from the start
3. **Accessibility** - ARIA labels, keyboard navigation, screen readers
4. **Performance** - Lazy loading, caching, minimal bundle size
5. **Documentation** - Add JSDoc comments and update docs

### Code Style

- Use ES6+ features
- Follow existing code patterns
- Add comments for complex logic
- Keep functions small and focused
- Test on multiple browsers

## Related Projects

For complete information about the OSM-Notes ecosystem and all 8 projects, see the
[OSM-Notes Ecosystem](#osm-notes-ecosystem) section above.

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

- Data from [OpenStreetMap](https://www.openstreetmap.org/)
- Processing by OSM-Notes-Analytics
- Built for the OSM community

## Contact

For issues and questions, please use
[GitHub Issues](https://github.com/OSM-Notes/OSM-Notes-Viewer/issues).
