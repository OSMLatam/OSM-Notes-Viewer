# Screenshots Directory

This directory contains screenshots of the OSM Notes Viewer application.

## 📸 Screenshot Instructions

To add screenshots:

1. **Take screenshots** of key pages:
   - `home.png` - Home page with statistics
   - `user-profile.png` - User profile page
   - `country-profile.png` - Country profile page
   - `working-hours.png` - Working hours heatmap
   - `explore.png` - Explore page
   - `dark-mode.png` - Dark mode interface

2. **Recommended dimensions:**
   - Desktop: 1920x1080 or 1440x900
   - Mobile: 375x667 (iPhone)
   - Format: PNG or JPG

3. **Optimize images:**
   ```bash
   # Using ImageMagick
   convert screenshot.png -resize 1200x -quality 85 screenshot-optimized.png
   
   # Using TinyPNG
   # Upload to https://tinypng.com/
   ```

4. **Add to git:**
   ```bash
   git add docs/screenshots/*.png
   git commit -m "Add screenshots"
   ```

## 📝 Screenshot Checklist

- [ ] Home page (light mode)
- [ ] Home page (dark mode)
- [ ] User profile
- [ ] Country profile
- [ ] Working hours heatmap
- [ ] Explore page
- [ ] Mobile view
- [ ] Search functionality
- [ ] Language selector
- [ ] Share menu

## 🎨 Screenshot Guidelines

### What to Capture

1. **Home Page:**
   - Global statistics cards
   - Top contributors list
   - Search interface
   - Navigation bar

2. **User Profile:**
   - User statistics
   - Activity heatmap
   - Working hours heatmap
   - Hashtag charts
   - Country distribution

3. **Country Profile:**
   - Country statistics
   - Activity heatmap
   - Top users
   - Geographic distribution

### Design Tips

- Use clean, consistent browser window
- Hide browser extensions
- Use realistic data (not all zeros)
- Capture both light and dark modes
- Include mobile responsive views
- Add helpful annotations if needed

### Privacy

- Use anonymized or dummy usernames
- Avoid showing sensitive data
- Get permission for any personal data shown
- Follow OSM privacy guidelines
