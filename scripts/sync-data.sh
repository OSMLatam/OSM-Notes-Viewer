#!/bin/bash

# Sync data from OSM-Notes-Analytics to shared data directory
#
# ⚠️ NOTE: This script is mainly for DEVELOPMENT/TESTING
#
# In PRODUCTION with shared directory setup:
#   - Analytics exports directly to /var/www/osm-notes-data/
#   - Viewer reads directly from the same directory
#   - NO sync script needed!
#
# This script is useful for:
#   - Local development testing
#   - Migrating from old setup
#   - Testing with different data sources
#
# Author: Andres Gomez (AngocA)
# Version: 2025-10-23

set -e

# Configuration
ANALYTICS_REPO="${ANALYTICS_REPO:-/home/angoca/github/OSM-Notes-Analytics}"
# Shared data directory accessible by both analytics and viewer
# Production: /var/www/osm-notes-data or /opt/osm-notes/data
# Development: analytics output directory
SHARED_DATA_DIR="${SHARED_DATA_DIR:-${ANALYTICS_REPO}/output/json}"
DATA_SOURCE="${ANALYTICS_REPO}/output/json"
DATA_TARGET="${SHARED_DATA_DIR}"

echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting data sync"
echo "⚠️  Note: In production with shared directory, this script is NOT needed!"
echo "   Analytics exports directly, viewer reads directly."
echo ""

# Check if source exists
if [[ ! -d "${DATA_SOURCE}" ]]; then
    echo "ERROR: Source directory not found: ${DATA_SOURCE}"
    echo "Please run exportDatamartsToJSON.sh first in the analytics repository"
    exit 1
fi

# Create shared data directory if needed
mkdir -p "${DATA_TARGET}"
mkdir -p "${DATA_TARGET}/users"
mkdir -p "${DATA_TARGET}/countries"
mkdir -p "${DATA_TARGET}/indexes"

# Sync data
echo "Syncing data from ${DATA_SOURCE} to ${DATA_TARGET}..."

rsync -av --delete \
    --exclude='.git' \
    --exclude='README.md' \
    "${DATA_SOURCE}/" "${DATA_TARGET}/"

echo "$(date '+%Y-%m-%d %H:%M:%S') - Data sync completed"

# Show summary
echo ""
echo "Summary:"
echo "  Users: $(ls -1 "${DATA_TARGET}/users" 2>/dev/null | wc -l) files"
echo "  Countries: $(ls -1 "${DATA_TARGET}/countries" 2>/dev/null | wc -l) files"
echo ""

# Note: Data is now in shared directory, no need to commit to git
# The viewer will serve files directly from the shared directory

echo "✅ Sync completed successfully"

