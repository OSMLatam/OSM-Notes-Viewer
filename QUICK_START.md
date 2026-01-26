# Quick Start Guide

Get the OSM Notes Viewer running in 5 minutes!

## Step 1: Clone the Repository

```bash
git clone https://github.com/OSM-Notes/OSM-Notes-Viewer.git
cd OSM-Notes-Viewer
```

## Step 2: Create Sample Data (for testing)

```bash
./scripts/create-sample-data.sh
```

This creates minimal JSON files in the `data/` directory for local testing.

## Step 3: Start a Local Server

Choose one option:

### Option A: Python (if installed)

```bash
npm run serve
# or
python3 -m http.server 8000 --directory src
```

### Option B: Node.js

```bash
npm run dev
# or
npx http-server src -p 8000
```

### Option C: PHP (if installed)

```bash
cd src
php -S localhost:8000
```

## Step 4: Open in Browser

Navigate to: http://localhost:8000

## What to Try

1. **Home Page**: See global statistics and top contributors
2. **Search**: Try searching for "mapper_one" or "test"
3. **User Profile**: Click on any user to see their profile
4. **Country Profile**: Click on any country to see statistics
5. **Explore**: Browse all users and countries

## Using Real Data

### Option 1: Generate from OSM-Notes-Analytics

If you have the analytics repository set up:

```bash
# In the analytics repository
cd /path/to/OSM-Notes-Analytics
./bin/dwh/exportDatamartsToJSON.sh

# Copy to viewer
cp -r output/json/* /path/to/OSM-Notes-Viewer/data/
```

### Option 2: Point to Remote Data

Edit `config/api-config.js`:

```javascript
export const API_CONFIG = {
  BASE_URL: 'https://your-server.com/api',
  // ... rest of config
};
```

## Troubleshooting

### "CORS error" or files not loading

**Problem**: Browsers block file:// protocol for security.

**Solution**: Always use a local server (Python, Node.js, PHP, etc.)

### "No data" shown

**Problem**: Sample data not created or wrong API endpoint.

**Solutions**:

1. Run `./scripts/create-sample-data.sh`
2. Check `config/api-config.js` has correct BASE_URL
3. Verify data files exist in `data/` directory

### Module import errors

**Problem**: Older browsers don't support ES6 modules.

**Solution**: Use modern browser (Chrome 61+, Firefox 60+, Safari 11+)

## Next Steps

- Read [docs/API.md](docs/API.md) to understand data structure
- See [docs/BUILD.md](docs/Build.md) for building the project
- Check [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) to contribute

## Development Tips

- Open browser DevTools to see console logs
- Check Network tab to verify JSON files are loading
- Use `apiClient.clearCache()` in console to reset cache
- Sample data is minimal - real data will have much more detail

## Related Projects

This viewer is part of a larger ecosystem for processing OSM Notes:

- **[OSM-Notes-Ingestion](https://github.com/OSM-Notes/OSM-Notes-Ingestion)** - Downloads and
  maintains OSM notes data from Planet dumps and API
- **[OSM-Notes-Common](https://github.com/OSM-Notes/OSM-Notes-Common)** - Shared libraries and
  utilities used across all projects
- **[OSM-Notes-Analytics](https://github.com/OSM-Notes/OSM-Notes-Analytics)** - Data warehouse and
  ETL processes that generate the JSON files

Enjoy exploring OSM Notes data! 🗺️
