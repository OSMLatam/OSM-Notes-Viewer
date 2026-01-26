---
title: "Build Process Documentation"
description: "Build process and deployment guide for OSM Notes Viewer using Vite as the build tool for optimized production builds"
version: "1.0.0"
last_updated: "2026-01-25"
author: "AngocA"
tags:
  - "build"
  - "deployment"
audience:
  - "developers"
project: "OSM-Notes-Viewer"
status: "active"
---


# Build Process Documentation

## Overview

The OSM Notes Viewer now uses **Vite** as its build tool for optimized production builds.

## Build Configuration

### Tools Used

- **Vite 4.5** - Fast build tool
- **esbuild** - Fast minifier (included with Vite)
- **CSS Minification** - Enabled for production

### Features

✅ **Source Maps** - Available for debugging production issues  
✅ **CSS Minification** - Reduces CSS file size  
✅ **JavaScript Minification** - Reduces JS file size  
✅ **Asset Optimization** - Optimizes images and other assets  
✅ **Code Splitting** - Automatically splits code for better caching

## Build Commands

### Development

```bash
npm run dev
```

Starts Vite dev server with hot module replacement (HMR) on `http://localhost:8080`

### Production Build

```bash
npm run build
```

Creates optimized production build in `dist/` directory

### Preview Production Build

```bash
npm run preview
```

Previews the production build locally

### Old Method (for reference)

```bash
npm run serve
```

Uses Python's http.server (no build optimization)

## Build Output

### Directory Structure

```
dist/
├── index.html              # Main page
├── pages/                  # Additional pages
│   ├── user.html
│   ├── country.html
│   ├── explore.html
│   └── about.html
├── assets/                 # Optimized assets
│   ├── main-{hash}.js      # Main JavaScript bundle
│   ├── main-{hash}.css     # Main CSS bundle
│   ├── favicon.svg
│   └── ...
└── manifest.json           # PWA manifest
```

### File Sizes (typical)

- Main JS: ~9.4 KB (2.8 KB gzipped)
- Main CSS: ~6.7 KB (1.8 KB gzipped)
- Total: ~45 KB (uncompressed)

## Source Maps

Source maps are generated for all JavaScript files:

- `.js.map` files included in `dist/assets/`
- Enable debugging production issues
- Can be disabled for smaller builds (not recommended)

## Minification Settings

### JavaScript

- Minifier: **esbuild**
- Compression: Enabled
- Console logs: Kept (for debugging)
- Debugger statements: Removed

### CSS

- Minification: Enabled
- Remove comments: Yes
- Compress whitespace: Yes

## Deployment

### Netlify

Update `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

### Vercel

Update `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

### GitHub Pages

1. Build: `npm run build`
2. Copy `dist/` contents to `gh-pages` branch
3. Deploy from `gh-pages` branch

## Performance Improvements

### Before Build Process

- Raw files: ~200 KB total
- No minification
- No optimization
- Separate HTTP requests for each file

### After Build Process

- Built files: ~45 KB total
- Minified JavaScript
- Minified CSS
- Optimized assets
- Better caching with hashed filenames

### Load Time Improvement

- **Before**: ~800ms average
- **After**: ~300ms average (estimated)
- **Improvement**: ~60% faster

## Configuration Files

### `vite.config.js`

Main build configuration:

- Input pages configuration
- Build output settings
- Minification options
- Source map settings

### `package.json`

Scripts:

- `dev`: Development server
- `build`: Production build
- `preview`: Preview production build

## Troubleshooting

### Build Fails

1. Check Node.js version (should be 18+)
2. Run `npm install` to ensure dependencies
3. Check `vite.config.js` for errors

### Build Output Missing Files

1. Check that input files exist in `src/`
2. Verify paths in `vite.config.js`
3. Check console for errors

### Source Maps Not Working

1. Ensure `sourcemap: true` in `vite.config.js`
2. Verify `.map` files exist in `dist/assets/`
3. Check browser console for warnings

## Next Steps

1. ✅ Build process implemented
2. ⏳ Add automated testing
3. ⏳ Implement pagination
4. ⏳ Add CI/CD pipeline
