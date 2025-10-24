#!/bin/bash
# Validate JSON schemas against data files
# Usage: ./scripts/validate-schemas.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SCHEMAS_DIR="$PROJECT_ROOT/lib/OSM-Notes-Common/schemas"
DATA_DIR="$PROJECT_ROOT/src/data"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if ajv-cli is installed
if ! command -v ajv &> /dev/null; then
    echo -e "${YELLOW}AJV CLI not found. Installing...${NC}"
    npm install -g ajv-cli ajv-formats
fi

echo "Validating JSON schemas..."
echo ""

# Counter for errors
ERRORS=0

# Function to validate
validate_schema() {
    local schema_file=$1
    local data_pattern=$2
    local description=$3

    echo -n "Validating $description... "

    if ajv validate -s "$schema_file" -d "$data_pattern" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
    else
        echo -e "${RED}✗ FAILED${NC}"
        ERRORS=$((ERRORS + 1))
        # Show detailed errors
        ajv validate -s "$schema_file" -d "$data_pattern" || true
    fi
}

# Validate metadata
validate_schema \
    "$SCHEMAS_DIR/metadata.schema.json" \
    "$DATA_DIR/metadata.json" \
    "metadata"

# Validate user index (array of user entries)
echo -n "Validating user index... "
if jq -c '.[]' "$DATA_DIR/indexes/users.json" | while read -r user; do
    echo "$user" | ajv validate -s "$SCHEMAS_DIR/user-index.schema.json" -d /dev/stdin > /dev/null 2>&1 || exit 1
done 2>/dev/null; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Validate country index (array of country entries)
echo -n "Validating country index... "
if jq -c '.[]' "$DATA_DIR/indexes/countries.json" | while read -r country; do
    echo "$country" | ajv validate -s "$SCHEMAS_DIR/country-index.schema.json" -d /dev/stdin > /dev/null 2>&1 || exit 1
done 2>/dev/null; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Sample validation of user profiles (first 5 only)
if [ -d "$DATA_DIR/users" ]; then
    echo -n "Validating sample user profiles... "
    SAMPLE_FILES=$(find "$DATA_DIR/users" -name "*.json" | head -5)
    if [ -n "$SAMPLE_FILES" ]; then
        LOCAL_ERRORS=0
        for file in $SAMPLE_FILES; do
            ajv validate -s "$SCHEMAS_DIR/user-profile.schema.json" -d "$file" > /dev/null 2>&1 || LOCAL_ERRORS=$((LOCAL_ERRORS + 1))
        done
        if [ $LOCAL_ERRORS -eq 0 ]; then
            echo -e "${GREEN}✓ OK${NC}"
        else
            echo -e "${RED}✗ FAILED${NC}"
            ERRORS=$((ERRORS + 1))
        fi
    else
        echo -e "${YELLOW}No sample files found${NC}"
    fi
fi

# Sample validation of country profiles (first 5 only)
if [ -d "$DATA_DIR/countries" ]; then
    echo -n "Validating sample country profiles... "
    SAMPLE_FILES=$(find "$DATA_DIR/countries" -name "*.json" | head -5)
    if [ -n "$SAMPLE_FILES" ]; then
        LOCAL_ERRORS=0
        for file in $SAMPLE_FILES; do
            ajv validate -s "$SCHEMAS_DIR/country-profile.schema.json" -d "$file" > /dev/null 2>&1 || LOCAL_ERRORS=$((LOCAL_ERRORS + 1))
        done
        if [ $LOCAL_ERRORS -eq 0 ]; then
            echo -e "${GREEN}✓ OK${NC}"
        else
            echo -e "${RED}✗ FAILED${NC}"
            ERRORS=$((ERRORS + 1))
        fi
    else
        echo -e "${YELLOW}No sample files found${NC}"
    fi
fi

echo ""
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}All validations passed!${NC}"
    exit 0
else
    echo -e "${RED}Validation failed with $ERRORS error(s)${NC}"
    exit 1
fi

