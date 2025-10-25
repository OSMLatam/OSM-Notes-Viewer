# Deployment Guide

Complete guide for deploying OSM Notes Viewer to production.

## 🚀 Quick Deploy

### Option 1: GitHub Pages (Automatic)

The project is configured for automatic deployment via GitHub Actions.

1. **Enable GitHub Pages**:
   - Go to repository Settings
   - Navigate to Pages section
   - Select source: "GitHub Actions"

2. **Push to main branch**:
   ```bash
   git push origin main
   ```

3. **Verify deployment**:
   - Wait for GitHub Actions to complete
   - Visit: `https://osmlatam.github.io/OSM-Notes-Viewer/`

### Option 2: Netlify

1. **Connect repository**:
   - Log in to [Netlify](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect GitHub repository

2. **Configure build**:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `18.x`

3. **Deploy**:
   - Click "Deploy site"
   - Netlify will auto-deploy on every push

### Option 3: Vercel

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Configure**:
   - Follow CLI prompts
   - Set root directory to project root
   - Build command: `npm run build`
   - Output directory: `dist`

## 📋 Pre-Deployment Checklist

- [ ] Run tests: `npm test`
- [ ] Build production: `npm run build`
- [ ] Test production build: `npm run preview`
- [ ] Verify all pages load
- [ ] Check responsive design
- [ ] Test dark mode
- [ ] Test language switching
- [ ] Verify keyboard shortcuts
- [ ] Check accessibility (WCAG)
- [ ] Run Lighthouse audit

## 🏗️ Build Process

### Development Build

```bash
# Start dev server
npm run dev

# Server runs on http://localhost:8080
```

### Production Build

```bash
# Build for production
npm run build

# Output goes to dist/ directory
# Files are minified and optimized
```

### Preview Production Build

```bash
# Preview production build locally
npm run preview

# Serves dist/ directory on http://localhost:4173
```

## 📦 Build Output

The production build generates:

```
dist/
├── index.html              # Main page
├── pages/
│   ├── user.html          # User profile
│   ├── country.html       # Country profile
│   ├── explore.html       # Explore page
│   └── about.html         # About page
├── assets/
│   ├── *.js               # Minified JavaScript
│   ├── *.css              # Minified CSS
│   └── *.map              # Source maps
├── manifest.json          # PWA manifest
└── sw.js                  # Service worker
```

### Bundle Size

- **Total**: ~75KB (gzipped: ~25KB)
- **JavaScript**: ~60KB (gzipped: ~17KB)
- **CSS**: ~20KB (gzipped: ~6KB)
- **HTML**: ~12KB (gzipped: ~3KB)

## 🌐 Environment Configuration

### API Configuration

Update `config/api-config.js`:

```javascript
export const API_BASE_URL = 'https://your-cdn.com/api';
```

### Environment Variables

Create `.env.production`:

```env
VITE_API_BASE_URL=https://api.example.com
VITE_ANALYTICS_ENABLED=true
```

## 📊 Performance Optimization

### 1. Code Splitting

JavaScript is automatically split by route:
- `main.js` - Home page
- `user.js` - User profile
- `country.js` - Country profile
- `explore.js` - Explore page

### 2. Caching Strategy

- **Static assets**: Cache for 1 year
- **HTML**: Cache for 1 hour
- **API data**: Cache for 15 minutes (localStorage)

### 3. Compression

Enable Gzip compression on server:

```nginx
# Nginx configuration
gzip on;
gzip_types text/css application/javascript application/json;
gzip_min_length 1000;
```

## 🔒 Security Considerations

### 1. Content Security Policy

Add CSP headers to prevent XSS:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
```

### 2. HTTPS Only

Force HTTPS redirect:

```nginx
server {
    listen 80;
    return 301 https://$host$request_uri;
}
```

### 3. Security Headers

Add security headers:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

## 📈 Monitoring

### Analytics

The app includes analytics via Plausible:
- Page views tracking
- Event tracking
- User interactions

### Error Monitoring

Consider adding:
- Sentry for error tracking
- LogRocket for session replay
- Google Analytics alternative

## 🔄 Update Process

### Regular Updates

1. **Pull latest changes**:
   ```bash
   git pull origin main
   ```

2. **Run tests**:
   ```bash
   npm test
   ```

3. **Build**:
   ```bash
   npm run build
   ```

4. **Deploy**:
   - Push to trigger automatic deployment
   - Or manually deploy to CDN

### Zero-Downtime Deployment

1. Deploy to staging first
2. Test staging thoroughly
3. Deploy to production
4. Monitor for errors
5. Rollback if needed

## 🚨 Rollback Procedure

### GitHub Pages

1. Go to Actions tab
2. Find failed deployment
3. Click "Revert to previous deployment"

### Netlify

1. Go to Site settings
2. Navigate to Deploys
3. Click "Publish deploy" on previous version

### Vercel

```bash
vercel rollback
```

## 📝 Post-Deployment

### Verification Steps

1. **Smoke Tests**:
   - [ ] Home page loads
   - [ ] Search works
   - [ ] User profile loads
   - [ ] Country profile loads
   - [ ] Explore page works

2. **Functionality**:
   - [ ] Theme toggle works
   - [ ] Language switcher works
   - [ ] Keyboard shortcuts work
   - [ ] Animations smooth

3. **Performance**:
   - [ ] Lighthouse score > 90
   - [ ] First Contentful Paint < 1.5s
   - [ ] Time to Interactive < 3s

4. **Accessibility**:
   - [ ] No console errors
   - [ ] ARIA labels present
   - [ ] Keyboard navigation works
   - [ ] Screen reader compatible

## 🌍 CDN Configuration

### Cloudflare

1. Add your domain to Cloudflare
2. Enable CDN
3. Configure caching rules
4. Enable compression

### AWS CloudFront

1. Create CloudFront distribution
2. Set origin to S3 bucket or server
3. Configure caching policies
4. Enable compression

## 📞 Support

If you encounter issues:

1. Check GitHub Issues
2. Review deployment logs
3. Verify build succeeded
4. Test locally first
5. Ask in Discussions

## 🎉 Congratulations!

Your OSM Notes Viewer is ready for production!

- ✅ Fully functional
- ✅ Highly performant
- ✅ Accessible
- ✅ Responsive
- ✅ PWA enabled
- ✅ Offline capable
- ✅ SEO optimized
