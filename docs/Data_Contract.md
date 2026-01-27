---
title: 'Data Contract Between Repositories'
description:
  'This document defines the contract between the  (producer) and  (consumer) repositories to ensure
  data structure compatibility.'
version: '1.0.0'
last_updated: '2026-01-25'
author: 'AngocA'
tags:
  - 'documentation'
audience:
  - 'developers'
project: 'OSM-Notes-Viewer'
status: 'active'
---

# Data Contract Between Repositories

## Overview

This document defines the contract between the **OSM-Notes-Analytics** (producer) and
**OSM-Notes-Viewer** (consumer) repositories to ensure data structure compatibility.

## Problem Statement

When two separate repositories exchange data via JSON files:

- **Producer** (Analytics) generates JSON files
- **Consumer** (Viewer) reads and displays those files

Both must agree on the exact structure of the JSON files to avoid runtime errors.

## Solution: JSON Schema

JSON Schema is the industry-standard way to define the structure, data types, and constraints of
JSON data.

### Benefits

✅ **Explicit contract** - Both teams know exactly what to expect  
✅ **Validation** - Can validate JSON files before deployment  
✅ **Documentation** - Self-documenting data structure  
✅ **Versioning** - Track schema changes over time  
✅ **IDE support** - Autocomplete and validation in editors  
✅ **Testing** - Automated validation in CI/CD

## Implementation Strategy

### 1. Create Schemas Directory

The schemas are stored in the OSM-Notes-Common repository and accessed via git submodule:

```
OSM-Notes-Viewer/
├── lib/
│   └── OSM-Notes-Common/
│       └── schemas/
│           ├── metadata.schema.json
│           ├── user-index.schema.json
│           ├── user-profile.schema.json
│           ├── country-index.schema.json
│           └── country-profile.schema.json
└── docs/
    └── DATA_CONTRACT.md (this file)
```

### 2. Share Schemas Repository

**Option A: In Common Repository (Implemented)**

- Schemas stored in `OSM-Notes-Common` repository
- Both Analytics and Viewer import via git submodule
- Ensures consistency across all projects

**Option B: In Viewer Repository**

- Viewer defines what it expects
- Analytics validates against viewer's schemas

**Option C: In Analytics Repository**

- Analytics defines what it produces
- Viewer validates against analytics schemas

### 3. Validation Points

#### Producer Side (Analytics)

```bash
# Before exporting JSON files
./scripts/validate-schemas.sh

# Exit if validation fails
if [ $? -ne 0 ]; then
    echo "Schema validation failed!"
    exit 1
fi

# Schemas are located in lib/OSM-Notes-Common/schemas/
```

#### Consumer Side (Viewer)

```javascript
// During development
import { validateUserProfile } from './lib/OSM-Notes-Common/schemas/validator.js';

// Validate when fetching data
const user = await apiClient.getUser(id);
const errors = validateUserProfile(user);
if (errors.length > 0) {
  console.error('Data contract violation:', errors);
}
```

#### CI/CD Pipeline

```yaml
# .github/workflows/validate-data.yml
- name: Validate JSON Schema
  run: |
    npm install ajv-cli
    ajv -s lib/OSM-Notes-Common/schemas/user-profile.schema.json -d data/users/*.json
```

## Schema Examples

### User Profile Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "User Profile",
  "description": "Complete user profile data",
  "type": "object",
  "required": ["user_id", "username", "history_whole_open"],
  "properties": {
    "user_id": {
      "type": "integer",
      "description": "OSM user ID"
    },
    "username": {
      "type": "string",
      "description": "OSM username"
    },
    "history_whole_open": {
      "type": "integer",
      "minimum": 0,
      "description": "Total notes opened by user"
    },
    "dates_most_open": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["date", "quantity"],
        "properties": {
          "date": {
            "type": "string",
            "format": "date"
          },
          "quantity": {
            "type": "integer",
            "minimum": 0
          }
        }
      }
    },
    "working_hours_of_week_opening": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["day_of_week", "hour_of_day", "count"],
        "properties": {
          "day_of_week": {
            "type": "integer",
            "minimum": 0,
            "maximum": 6
          },
          "hour_of_day": {
            "type": "integer",
            "minimum": 0,
            "maximum": 23
          },
          "count": {
            "type": "integer",
            "minimum": 0
          }
        }
      }
    }
  }
}
```

### Metadata Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Metadata",
  "description": "Export metadata information",
  "type": "object",
  "required": ["export_date", "total_users", "total_countries"],
  "properties": {
    "export_date": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of export"
    },
    "total_users": {
      "type": "integer",
      "minimum": 0
    },
    "total_countries": {
      "type": "integer",
      "minimum": 0
    },
    "version": {
      "type": "string",
      "description": "Schema version"
    }
  }
}
```

## Alternative Approaches

### 1. TypeScript Types (if using TypeScript)

```typescript
// Define interface
interface UserProfile {
  user_id: number;
  username: string;
  history_whole_open: number;
  // ...
}

// Use in code
const user: UserProfile = await apiClient.getUser(id);
```

**Pros:** Compile-time checking, IDE support  
**Cons:** Only works if consumer is TypeScript

### 2. C# Data Classes (if using C#)

```csharp
public class UserProfile
{
    public int UserId { get; set; }
    public string Username { get; set; }
    public int HistoryWholeOpen { get; set; }
    // ...
}
```

### 3. Python Dataclasses (if using Python)

```python
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class UserProfile:
    user_id: int
    username: str
    history_whole_open: int
    # ...
```

### 4. OpenAPI/Swagger Specification

```yaml
openapi: 3.0.0
paths:
  /users/{id}.json:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserProfile'
```

**Pros:** Standard for APIs  
**Cons:** More complex than needed for static files

## Recommended Approach for This Project

### Phase 1: JSON Schema (Now)

1. Create JSON schemas in Viewer repository
2. Add validation script to Analytics export
3. Document schema changes in CHANGELOG

### Phase 2: Automated Validation (Soon)

1. Add AJV validation to CI/CD
2. Create pre-commit hooks
3. Integrate with sync script

### Phase 3: Schema Evolution (Future)

1. Version schemas (v1, v2, etc.)
2. Support backward compatibility
3. Deprecation policy

## Migration Guide

### Step 1: Generate Schemas

```bash
# Install tool
npm install -g json-schema-generator

# Generate from sample JSON (in OSM-Notes-Common repository)
json-schema-generator data/users/260756.json > lib/OSM-Notes-Common/schemas/user-profile.schema.json
```

### Step 2: Refine Schemas

Manually edit to add:

- Descriptions
- Minimum/maximum values
- Required fields
- Format constraints

### Step 3: Add Validation

```bash
# Install validator
npm install ajv-cli

# Validate all files
ajv -s lib/OSM-Notes-Common/schemas/user-profile.schema.json -d data/users/*.json
```

### Step 4: Integrate into Workflow

```bash
# Add to export script
#!/bin/bash
# ... export JSON files ...

# Validate schemas
echo "Validating schemas..."
ajv -s lib/OSM-Notes-Common/schemas/user-profile.schema.json -d output/json/users/*.json
if [ $? -ne 0 ]; then
    echo "ERROR: Schema validation failed"
    exit 1
fi
```

## Best Practices

### 1. Schema Versioning

Include version in schema and metadata:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "User Profile",
  "version": "1.2.0",
  ...
}
```

### 2. Change Management

- **Breaking changes** → Increment major version
- **New fields** → Increment minor version
- **Bug fixes** → Increment patch version

### 3. Documentation

Keep schemas commented and documented:

```json
{
  "user_id": {
    "type": "integer",
    "description": "OSM user ID from OpenStreetMap API",
    "minimum": 1,
    "examples": [260756]
  }
}
```

### 4. Testing

Test schema changes:

```bash
# Validate against all existing files
ajv -s lib/OSM-Notes-Common/schemas/user-profile.schema.json -d data/users/*.json

# Test with sample data
ajv -s lib/OSM-Notes-Common/schemas/user-profile.schema.json -d tests/sample-user.json
```

## Tools and Libraries

### JavaScript/Node.js

- **AJV** - JSON Schema validator
- **ajv-cli** - Command-line tool
- **ajv-formats** - Extended format support

### Python

- **jsonschema** - JSON Schema validator
- **cerberus** - Data validation

### Java

- **json-schema-validator** - GitHub validator
- **everit-json-schema** - Alt implementation

### C#

- **Newtonsoft.Json.Schema** - JSON Schema support
- **NJsonSchema** - Schema generation

## References

- [JSON Schema Specification](https://json-schema.org/)
- [Understanding JSON Schema](https://json-schema.org/understanding-json-schema/)
- [Schema Validation Tools](https://json-schema.org/implementations.html)

## Conclusion

JSON Schema is the **best approach** for defining contracts between repositories because:

1. ✅ Language-agnostic
2. ✅ Standard format
3. ✅ Tool support
4. ✅ Self-documenting
5. ✅ Validation support
6. ✅ Version control friendly

Start with schemas in the Viewer repository, then add validation to the Analytics export process.
