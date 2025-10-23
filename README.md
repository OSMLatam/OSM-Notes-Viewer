# OSM Notes Viewer

Interactive web viewer for OpenStreetMap Notes analytics data.

🌐 **Live Demo**: Coming soon...

## Overview

This web application provides an interactive interface to explore OpenStreetMap notes statistics, including:
- User profiles with activity analysis
- Country-level statistics
- Hashtag usage trends
- Activity heatmaps and visualizations

## Features

- 🔍 **Search** - Find users and countries quickly
- 📊 **Interactive Statistics** - Charts and graphs powered by Chart.js
- 📈 **Activity Heatmaps** - GitHub-style contribution calendars
- 🌍 **Geographic Distribution** - See where notes are created
- #️⃣ **Hashtag Analysis** - Track popular hashtags
- ⚡ **Real-time Updates** - Data refreshed every 15 minutes
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🚀 **Fast & Static** - Pure HTML/CSS/JS, no backend needed

## Data Storage

The viewer reads JSON data from a **shared directory** on the server that is accessible by both the analytics backend and the web viewer.

### How It Works

**Production (with shared directory):**
1. Analytics exports directly to `/var/www/osm-notes-data/`
2. Viewer reads directly from the same directory
3. **No sync script needed** - data flows directly!

**Development (local testing):**
- Analytics exports to `./output/json`
- Use `sync-data.sh` if you need to copy data for testing

### Benefits

- ✅ No duplication - Single source of truth
- ✅ No sync step - Direct export/read
- ✅ Better performance - No copying overhead
- ✅ Simpler updates - Analytics exports, viewer reads
- ✅ Keeps analytics code private

For detailed setup instructions, see [docs/SHARED_DATA_DIRECTORY.md](docs/SHARED_DATA_DIRECTORY.md)

### Related Projects

This viewer is part of a larger ecosystem of projects for processing and visualizing OSM Notes:

- **[OSM-Notes-Ingestion](https://github.com/OSMLatam/OSM-Notes-Ingestion)** - Downloads and maintains a local copy of OSM notes data from the Planet dump and API
- **[OSM-Notes-Common](https://github.com/OSMLatam/OSM-Notes-Common)** - Shared libraries and utilities used across all OSM Notes projects
- **[OSM-Notes-Analytics](https://github.com/angoca/OSM-Notes-Analytics)** - Data warehouse and ETL processes that generate analytics from the ingested notes
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

## Quick Start

### For Development

```bash
# Clone the repository
git clone https://github.com/angoca/OSM-Notes-Viewer.git
cd OSM-Notes-Viewer

# Open with a local server (required for CORS)
# Option 1: Using Python
python3 -m http.server 8000

# Option 2: Using Node.js
npx http-server -p 8000

# Open browser
open http://localhost:8000/src/index.html
```

### For Production Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment instructions to:
- Netlify
- Vercel
- GitHub Pages
- Cloudflare Pages

For server setup with shared data directory, see [SHARED_DATA_DIRECTORY.md](docs/SHARED_DATA_DIRECTORY.md)

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

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Charts**: Chart.js
- **Icons**: Font Awesome (optional)
- **Build**: None required (pure static files)

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari, Chrome Mobile

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](docs/CONTRIBUTING.md) first.

### Development Guidelines

1. Keep it simple - vanilla JS preferred
2. Mobile-first responsive design
3. Accessibility is important (ARIA labels, keyboard navigation)
4. Performance matters (lazy loading, caching)

## Related Projects

- [OSM-Notes-Ingestion](https://github.com/OSMLatam/OSM-Notes-Ingestion) - Data ingestion from OSM Planet
- [OSM-Notes-Common](https://github.com/OSMLatam/OSM-Notes-Common) - Shared libraries and utilities
- [OSM-Notes-Analytics](https://github.com/angoca/OSM-Notes-Analytics) - Data processing backend

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

- Data from [OpenStreetMap](https://www.openstreetmap.org/)
- Processing by OSM-Notes-Analytics
- Built for the OSM community

## Contact

For issues and questions, please use [GitHub Issues](https://github.com/angoca/OSM-Notes-Viewer/issues).
