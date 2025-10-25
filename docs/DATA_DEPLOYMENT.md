# Data Deployment Strategy for GitHub Pages

## Current Situation

The JSON data files (`data/` directory) are **NOT** included in the repository because they are in `.gitignore`. This means when GitHub Pages deploys the site, **there are no JSON files available**.

The application expects to load JSON files from `/data` path, but these files don't exist in the GitHub Pages deployment.

## Solutions

### ✅ Option 1: Separate Data Repository (Recommended)

Create a separate public repository to host the JSON data:

#### Setup Steps:

1. **Create a new repository**: `OSM-Notes-Data` (public)
2. **Add JSON files to the new repo**
3. **Use GitHub Pages** in the data repository
4. **Update API config** to point to the data repository

```javascript
// In src/config/api-config.js
export const API_CONFIG = {
    // Point to separate data repository
    BASE_URL: 'https://osmlatam.github.io/OSM-Notes-Data',
    // ... rest of config
};
```

**Pros:**
- ✅ Clean separation of concerns
- ✅ Independent data updates
- ✅ Better caching
- ✅ No repository bloat

**Cons:**
- ⚠️ Need to maintain two repositories
- ⚠️ CORS configuration needed

---

### Option 2: GitHub LFS

Use Git Large File Storage for JSON files:

```bash
# Install git-lfs
git lfs install

# Track JSON files
git lfs track "*.json"
git lfs track "data/**/*.json"

# Commit
git add .gitattributes
git add data/
git commit -m "Add JSON data with LFS"
git push
```

**Pros:**
- ✅ Keep everything in one repository
- ✅ Automatic handling of large files

**Cons:**
- ⚠️ GitHub LFS has bandwidth limits (1GB/month on free tier)
- ⚠️ Slower cloning for contributors
- ⚠️ LFS storage costs

---

### Option 3: External CDN

Host JSON files on a CDN (S3, Cloudflare, etc.):

```javascript
// In src/config/api-config.js
export const API_CONFIG = {
    BASE_URL: 'https://your-cdn.com/osm-notes-data',
    // ... rest of config
};
```

**Pros:**
- ✅ Fast global access
- ✅ No repository bloat
- ✅ Scalable

**Cons:**
- ⚠️ Requires CDN setup and costs
- ⚠️ More complex deployment

---

### Option 4: Sample Data (Demo Only)

Add minimal sample data to the repository for demonstration:

```bash
# Remove data/ from .gitignore
# Add only essential files:
data/
├── metadata.json (small)
├── indexes/
│   ├── users.json (first 10 entries)
│   └── countries.json (first 10 entries)
└── users/
    └── (only a few example files)
```

**Pros:**
- ✅ Simple for demos
- ✅ Everything in one place

**Cons:**
- ⚠️ Limited functionality
- ⚠️ Not production-ready

---

## Recommended Approach

For this project, I recommend **Option 1 (Separate Data Repository)**:

1. It follows the current architecture (data separated from viewer)
2. Allows independent updates to data
3. Better performance (data cached separately)
4. Aligns with production architecture

## Implementation Steps

Would you like me to:
1. Create a sample data repository setup?
2. Configure the API to use external data?
3. Set up minimal demo data?

Let me know which approach you prefer!

