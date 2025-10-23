# Data Synchronization Guide

**⚠️ IMPORTANT: With shared directory setup, NO sync is needed!**

If you're using the shared directory pattern (recommended for production), analytics exports directly to the shared directory and the viewer reads from there. **No sync script needed.**

See [SHARED_DATA_DIRECTORY.md](SHARED_DATA_DIRECTORY.md) for the recommended production setup.

---

This document explains legacy sync methods for development or special deployment scenarios.

## Overview

The OSM Notes Viewer displays data from pre-generated JSON files. These files are created by the OSM-Notes-Analytics backend.

**Modern approach (recommended):** Use shared directory - no sync needed  
**Legacy approach:** Copy data using sync script

## Sync Methods

### Method 1: Manual Sync Script (Development)

Use the provided sync script:

```bash
cd /home/angoca/github/OSM-Notes-Viewer
./scripts/sync-data.sh
```

This copies data from the analytics repository to the viewer's `data/` directory.

### Method 2: Automated Sync (Production)

Set up a cron job to sync automatically:

```bash
# Edit crontab
crontab -e

# Add this line to sync every 15 minutes
*/15 * * * * /home/angoca/github/OSM-Notes-Viewer/scripts/sync-data.sh >> /var/log/osm-viewer-sync.log 2>&1
```

### Method 3: Git-based Sync

Automatically commit and push data updates:

```bash
export AUTO_COMMIT=true
export AUTO_PUSH=true
./scripts/sync-data.sh
```

**Warning:** This can create many commits. Better for development than production.

### Method 4: Shared Directory (Recommended for Production)

**This is the modern approach - NO sync needed!**

Configure the analytics export to write directly to a shared directory:

```bash
# In analytics etc/properties.sh
export JSON_OUTPUT_DIR="/var/www/osm-notes-data"

# Run export
cd OSM-Notes-Analytics
./bin/dwh/exportDatamartsToJSON.sh

# Files are already in shared directory
# Viewer reads directly from there
# NO sync script needed!
```

This is the recommended approach for production deployments. See [SHARED_DATA_DIRECTORY.md](SHARED_DATA_DIRECTORY.md) for complete setup instructions.

## Production Deployment Strategies

### Strategy A: Separate Data Repository

Create a third repository just for data:

```
OSM-Notes-Data (repository)
  └── Contains only JSON files
  
OSM-Notes-Viewer (repository)
  └── Fetches from OSM-Notes-Data GitHub Pages
```

**Pros:**
- Clean separation
- Independent deploy cycles
- Version control for data

**Cons:**
- More repositories to manage
- GitHub file size limits

### Strategy B: CDN Storage

Use cloud storage for JSON files:

**AWS S3:**
```bash
# Sync from analytics
aws s3 sync output/json/ s3://osm-notes-data/api/

# Configure viewer
BASE_URL: 'https://your-bucket.s3.amazonaws.com/api'
```

**Google Cloud Storage:**
```bash
gsutil -m rsync -r output/json/ gs://osm-notes-data/api/
```

**Pros:**
- Scalable
- Fast global CDN
- No repository size limits

**Cons:**
- Costs money (minimal)
- Requires cloud account

### Strategy C: Hybrid Approach (Recommended)

1. **Small files** (indexes, metadata) → Git repository
2. **Large files** (individual profiles) → CDN storage
3. **Viewer** → Deployed to Netlify/Vercel
4. **Analytics** → Runs on server, exports to both

## Sync Workflow Examples

### Development Workflow

```bash
# 1. Generate data (analytics repo)
cd ~/github/OSM-Notes-Analytics
./bin/dwh/exportDatamartsToJSON.sh

# 2. Sync to viewer (viewer repo)
cd ~/github/OSM-Notes-Viewer
./scripts/sync-data.sh

# 3. Test locally
npm run dev
```

### Production Workflow (Automated)

```bash
# Cron job on analytics server
*/15 * * * * /opt/osm-analytics/update-and-export.sh
```

**update-and-export.sh:**
```bash
#!/bin/bash
cd /opt/osm-analytics/OSM-Notes-Analytics
./bin/dwh/ETL.sh
./bin/dwh/datamartUsers/datamartUsers.sh
./bin/dwh/datamartCountries/datamartCountries.sh
./bin/dwh/exportDatamartsToJSON.sh

# Upload to S3
aws s3 sync output/json/ s3://osm-notes-data/api/ --delete
```

## Data Update Frequency

### Analytics Processing

- **ETL**: Every 15 minutes (incremental)
- **Datamarts**: Every 15 minutes (500 users/countries per run)
- **JSON Export**: After datamart update

### Viewer Updates

- **With Git**: Manual push or automated commit
- **With CDN**: Automatic (as soon as files uploaded)
- **Cache**: Browser clears every 15 minutes

## Monitoring

### Check Data Freshness

```bash
# Check last export time
cat data/metadata.json | jq .export_date

# Check file count
echo "Users: $(ls -1 data/users | wc -l)"
echo "Countries: $(ls -1 data/countries | wc -l)"
```

### Verify Sync

```bash
# Compare source and target
diff -r ${ANALYTICS_REPO}/output/json/ ${VIEWER_REPO}/data/
```

## Troubleshooting

### Data not updating in browser

**Cause:** Browser cache

**Solution:**
- Hard refresh: Ctrl+Shift+R (Chrome/Firefox)
- Clear localStorage: Run in console: `localStorage.clear()`
- Check metadata.json timestamp

### Sync script fails

**Cause:** Path not found

**Solution:**
```bash
# Set environment variables
export ANALYTICS_REPO="/path/to/OSM-Notes-Analytics"
export VIEWER_REPO="/path/to/OSM-Notes-Viewer"
./scripts/sync-data.sh
```

### Large data directory

**Cause:** Many users/countries

**Solution:**
- Don't commit data/ to git (use .gitignore)
- Use CDN for production
- Consider data compression

## Best Practices

1. **Don't commit data files** - Keep them in .gitignore
2. **Use CDN for production** - Better performance
3. **Monitor sync logs** - Catch issues early
4. **Test after sync** - Verify data integrity
5. **Backup data** - Keep copies of important exports

## Performance Tips

- Sync only changed files (rsync --update)
- Compress JSON files (gzip)
- Use CDN with edge caching
- Implement incremental updates
- Monitor bandwidth usage

