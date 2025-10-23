# Shared Data Directory Setup

## Overview

Instead of copying JSON files into the repository, both projects use a shared directory on the server that is accessible by both the analytics backend and the web viewer.

## Directory Structure

```
/var/www/osm-notes-data/           # Production (or /opt/osm-notes/data)
├── users/
│   ├── 123.json
│   ├── 456.json
│   └── ...
├── countries/
│   ├── 1.json
│   ├── 2.json
│   └── ...
├── indexes/
│   ├── users.json
│   └── countries.json
└── metadata.json
```

## Production Setup

### 1. Create Shared Directory

```bash
# Create directory
sudo mkdir -p /var/www/osm-notes-data
sudo chown -R www-data:www-data /var/www/osm-notes-data
sudo chmod 755 /var/www/osm-notes-data
```

### 2. Configure Analytics Export

Edit `OSM-Notes-Analytics/etc/properties.sh`:

```bash
# Point JSON export to shared directory
export JSON_OUTPUT_DIR="/var/www/osm-notes-data"
```

### 3. Configure Web Server

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name osm-notes.example.com;
    
    root /var/www/osm-notes-viewer/src;
    
    # Serve viewer files
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Serve JSON data from shared directory
    location /data/ {
        alias /var/www/osm-notes-data/;
        add_header Cache-Control "public, max-age=900";  # 15 minutes
        add_header Access-Control-Allow-Origin "*";
    }
    
    # API endpoint (optional)
    location /api/ {
        alias /var/www/osm-notes-data/;
        add_header Cache-Control "public, max-age=900";
        add_header Access-Control-Allow-Origin "*";
    }
}
```

#### Apache Configuration

```apache
<VirtualHost *:80>
    ServerName osm-notes.example.com
    DocumentRoot /var/www/osm-notes-viewer/src
    
    # Serve viewer files
    <Directory /var/www/osm-notes-viewer/src>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    # Serve JSON data from shared directory
    Alias /data /var/www/osm-notes-data
    <Directory /var/www/osm-notes-data>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
        Header set Cache-Control "public, max-age=900"
        Header set Access-Control-Allow-Origin "*"
    </Directory>
    
    # API endpoint (optional)
    Alias /api /var/www/osm-notes-data
    <Directory /var/www/osm-notes-data>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
        Header set Cache-Control "public, max-age=900"
        Header set Access-Control-Allow-Origin "*"
    </Directory>
</VirtualHost>
```

### 4. Update Viewer Configuration

The viewer's `config/api-config.js` should point to the shared directory:

```javascript
export const API_CONFIG = {
    // In production, this is served by the web server
    BASE_URL: '/data',
    // ...
};
```

## Development Setup

For local development, you can use the analytics output directory directly:

```bash
# Set environment variable
export SHARED_DATA_DIR="$HOME/github/OSM-Notes-Analytics/output/json"

# Run sync script
./scripts/sync-data.sh
```

## Automated Sync

### Cron Job

Set up a cron job to sync data every 15 minutes:

```bash
# Edit crontab
crontab -e

# Add this line
*/15 * * * * /home/angoca/github/OSM-Notes-Viewer/scripts/sync-data.sh >> /var/log/osm-viewer-sync.log 2>&1
```

### Environment Variables

You can customize the directories using environment variables:

```bash
# Production
export SHARED_DATA_DIR="/var/www/osm-notes-data"
export ANALYTICS_REPO="/opt/osm-analytics/OSM-Notes-Analytics"
./scripts/sync-data.sh

# Development
export SHARED_DATA_DIR="$HOME/github/OSM-Notes-Analytics/output/json"
./scripts/sync-data.sh
```

## Advantages

✅ **No duplication** - Single source of truth for JSON files  
✅ **No Git commits** - Data files don't clutter the repository  
✅ **Better performance** - Direct file access without copying  
✅ **Easier updates** - Analytics exports directly to web-accessible location  
✅ **Security** - Viewer can't access analytics code, only data  

## Troubleshooting

### Permission Issues

```bash
# Check ownership
ls -la /var/www/osm-notes-data

# Fix ownership
sudo chown -R www-data:www-data /var/www/osm-notes-data
```

### Files Not Updating

```bash
# Check if sync script is running
ps aux | grep sync-data

# Manually trigger sync
./scripts/sync-data.sh

# Check file timestamps
ls -lht /var/www/osm-notes-data/users/ | head -10
```

### 404 Errors

```bash
# Verify files exist
ls -la /var/www/osm-notes-data/metadata.json

# Test web server access
curl http://localhost/data/metadata.json

# Check web server logs
sudo tail -f /var/log/nginx/error.log
# or
sudo tail -f /var/log/apache2/error.log
```

## Migration from Old Setup

If you previously used the `data/` directory inside the repository:

1. **Stop web server** (if running)
2. **Copy existing data** to shared directory:
   ```bash
   sudo cp -r /path/to/OSM-Notes-Viewer/data/* /var/www/osm-notes-data/
   ```
3. **Remove old data directory** from repository:
   ```bash
   git rm -r data/
   git commit -m "Remove data directory, use shared directory"
   ```
4. **Update `.gitignore`** to ensure data/ stays ignored
5. **Restart web server**

## Do I Need sync-data.sh?

**Short answer: NO, not in production with shared directory.**

### When sync-data.sh is NOT needed:
- ✅ **Production setup** - Analytics exports directly to shared directory
- ✅ **Same machine** - Both projects on same server
- ✅ **Modern setup** - Using shared directory pattern

### When sync-data.sh might be useful:
- 🔧 **Development** - Copying from analytics output to viewer for local testing
- 🔧 **Different machines** - Analytics and viewer on separate servers
- 🔧 **Migration** - Transitioning from old setup to new setup

### With Shared Directory (Production):
```bash
# Analytics exports directly to shared directory
cd OSM-Notes-Analytics
./bin/dwh/exportDatamartsToJSON.sh

# Files are already in /var/www/osm-notes-data/
# Viewer reads directly from there
# NO sync needed!
```

### Without Shared Directory (Development/Testing):
```bash
# If you need to copy data for testing
cd OSM-Notes-Viewer
SHARED_DATA_DIR="./data" ./scripts/sync-data.sh
```

## Security Considerations

- ✅ Web server only serves JSON files, not PHP/executables
- ✅ No direct database access from web server
- ✅ Analytics code remains private
- ✅ JSON files are read-only
- ⚠️ Consider rate limiting for public API endpoints
- ⚠️ Monitor disk space usage

