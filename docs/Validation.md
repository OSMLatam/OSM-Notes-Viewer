---
title: 'Data Validation Guide'
description:
  'This document explains how to validate data files against JSON schemas to ensure data integrity'
version: '1.0.0'
last_updated: '2026-01-25'
author: 'AngocA'
tags:
  - 'validation'
audience:
  - 'developers'
project: 'OSM-Notes-Viewer'
status: 'active'
---

# Data Validation Guide

This document explains how to validate data files against JSON schemas to ensure data integrity
across repositories.

## Overview

The validation system uses JSON schemas from the `OSM-Notes-Common` submodule to validate data
files. This ensures that data exported from one repository (data generation) is compatible with the
format expected by this viewer application.

## Running Validation

### Basic Usage

```bash
npm run validate
```

This command will:

1. Validate `data/metadata.json` against the metadata schema
2. Validate all entries in `data/indexes/countries.json` against the country-index schema
3. Validate all entries in `data/indexes/users.json` against the user-index schema
4. Sample validate 10 user profile files from `data/users/`
5. Sample validate 10 country profile files from `data/countries/`

### Manual Execution

```bash
node scripts/validate-data.js
```

## What Gets Validated

### 1. Metadata File

- File: `data/metadata.json`
- Schema: `lib/OSM-Notes-Common/schemas/metadata.schema.json`
- Validates export date, total counts, and version information

### 2. Country Index

- File: `data/indexes/countries.json`
- Schema: `lib/OSM-Notes-Common/schemas/country-index.schema.json`
- Validates each country entry for required fields and value types

### 3. User Index

- File: `data/indexes/users.json`
- Schema: `lib/OSM-Notes-Common/schemas/user-index.schema.json`
- Validates each user entry for required fields and value types

### 4. Country Profiles

- Files: `data/countries/*.json`
- Schema: `lib/OSM-Notes-Common/schemas/country-profile.schema.json`
- Validates detailed country statistics and activity data

### 5. User Profiles

- Files: `data/users/*.json`
- Schema: `lib/OSM-Notes-Common/schemas/user-profile.schema.json`
- Validates detailed user statistics and activity data

## Schema Constraints

### Country Index/Profile Constraints

- `country_id` must be an integer >= 1 (except for special cases like international waters)
- All integer counts must be >= 0
- Dates must be in ISO 8601 format
- Arrays must contain objects with required properties

### User Index/Profile Constraints

- `user_id` must be an integer >= 1
- `username` must be a non-empty string
- All integer counts must be >= 0
- `last_year_activity` must be a binary string (0s and 1s)
- `day_of_week` values in working hours must be 0-6 (0=Sunday, 6=Saturday)
- `hour_of_day` values must be 0-23

## Common Validation Errors

### Error: `country_id` must be >= 1

**Problem**: Some special cases (like international waters) use `-1` as country_id  
**Fix**: Update schema to allow special cases or normalize the data

### Error: must be integer

**Problem**: Numeric field contains a string or null when not allowed  
**Fix**: Ensure data export includes proper type conversion

### Error: must be <= 6

**Problem**: `day_of_week` value exceeds valid range (0-6)  
**Fix**: Check data export logic for working hours calculation

### Error: Corrupted JSON file

**Problem**: JSON file has syntax errors  
**Fix**: Re-export the data from source

## Integration with CI/CD

Add validation to your deployment pipeline:

```yaml
# Example GitHub Actions workflow
- name: Validate data
  run: npm run validate
```

## Output Format

The validation script provides:

- ✓ Green checkmarks for valid files
- ✗ Red X marks for invalid files
- Detailed error messages showing:
  - Which field failed validation
  - Expected vs actual value
  - File path for debugging

## Troubleshooting

### Schema Not Found

Make sure the submodule is initialized:

```bash
git submodule update --init --recursive
```

### Validation Script Not Found

Ensure dependencies are installed:

```bash
npm install
```

### Too Many Errors

The script samples files for speed. To validate all files, check the `validateProfiles` function in
`scripts/validate-data.js` and remove the `sampleSize` parameter.

## Related Files

- Schemas: `lib/OSM-Notes-Common/schemas/*.schema.json`
- Validation script: `scripts/validate-data.js`
- Data directory: `data/`
