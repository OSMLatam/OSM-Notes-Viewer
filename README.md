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

### Related Projects

This viewer is part of a larger ecosystem of projects for processing and visualizing OSM Notes:

- **[OSM-Notes-Ingestion](https://github.com/OSM-Notes/OSM-Notes-Ingestion)** - Downloads and
  maintains a local copy of OSM notes data from the Planet dump and API
- **[OSM-Notes-Common](https://github.com/OSM-Notes/OSM-Notes-Common)** - Shared libraries and
  utilities used across all OSM Notes projects
- **[OSM-Notes-Analytics](https://github.com/OSM-Notes/OSM-Notes-Analytics)** - Data warehouse and
  ETL processes that generate analytics from the ingested notes
- **OSM-Notes-Viewer** (this project) - Web interface for visualizing the analytics data

### Data Flow

```
OSM Planet Dump / API
    ↓
[OSM-Notes-Ingestion] → Raw notes data in PostgreSQL
    ↓
[OSM-Notes-Analytics] → ETL processes → Data warehouse
    ↓
[OSM-Notes-Analytics] → Export to JSON
    ↓
[OSM-Notes-Viewer] → Display in web browser
```

The backend generates the following JSON files:

- `/api/users/{user_id}.json` - Individual user profiles
- `/api/countries/{country_id}.json` - Country statistics
- `/api/indexes/users.json` - List of all users
- `/api/indexes/countries.json` - List of all countries
- `/api/metadata.json` - Export metadata (timestamp, counts)

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

- [OSM-Notes-Ingestion](https://github.com/OSM-Notes/OSM-Notes-Ingestion) - Data ingestion from OSM
  Planet
- [OSM-Notes-Common](https://github.com/OSM-Notes/OSM-Notes-Common) - Shared libraries and utilities
- [OSM-Notes-Analytics](https://github.com/OSM-Notes/OSM-Notes-Analytics) - Data processing backend

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

- Data from [OpenStreetMap](https://www.openstreetmap.org/)
- Processing by OSM-Notes-Analytics
- Built for the OSM community

## Contact

For issues and questions, please use
[GitHub Issues](https://github.com/OSM-Notes/OSM-Notes-Viewer/issues).
