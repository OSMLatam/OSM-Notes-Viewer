# Testing Guide

Complete testing guide for OSM Notes Viewer application.

## 📋 Table of Contents

- [Unit Tests](#unit-tests)
- [Integration Tests](#integration-tests)
- [Cross-Browser Testing](#cross-browser-testing)
- [Mobile Testing](#mobile-testing)
- [Performance Testing](#performance-testing)
- [Accessibility Testing](#accessibility-testing)
- [Running Tests](#running-tests)

## 🧪 Unit Tests

Test individual components and functions in isolation.

### Test Structure

```
tests/
├── api/
│   └── apiClient.test.js
├── components/
│   ├── darkMode.test.js
│   └── pagination.test.js
├── utils/
│   └── formatter.test.js
└── integration/
    └── criticalFlows.test.js
```

### Running Unit Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- formatter.test.js

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## 🔗 Integration Tests

Test complete user flows and component interactions.

### Critical Flows Covered

1. **Page Load and Initialization**
   - i18n initialization
   - Language detection
   - Theme loading

2. **Search Functionality**
   - User search
   - Country search
   - Filtering and autocomplete

3. **Profile Loading**
   - User profile display
   - Country profile display
   - Statistics rendering

4. **Theme Toggle**
   - Light/dark mode switching
   - Persistence

5. **Language Switching**
   - Multi-language support
   - Translation loading

6. **Data Formatting**
   - Number formatting
   - Date formatting
   - Error handling

7. **API Caching**
   - Cache mechanism
   - TTL validation

8. **Error Handling**
   - Network errors
   - 404 errors
   - Invalid data

### Running Integration Tests

```bash
# Run integration tests
npm test -- --integration

# Run with detailed output
npm test -- --reporter=verbose
```

## 🌐 Cross-Browser Testing

### Supported Browsers

| Browser | Version  | Status         |
| ------- | -------- | -------------- |
| Chrome  | Latest 2 | ✅ Tested      |
| Firefox | Latest 2 | ✅ Tested      |
| Safari  | Latest 2 | ✅ Tested      |
| Edge    | Latest 2 | ✅ Tested      |
| Opera   | Latest   | ⚠️ Should work |

### Manual Testing Checklist

#### Chrome

- [ ] Home page loads correctly
- [ ] Search works
- [ ] User profile displays
- [ ] Country profile displays
- [ ] Theme toggle works
- [ ] Language switcher works
- [ ] Dark mode renders correctly
- [ ] Animations smooth
- [ ] Mobile responsive

#### Firefox

- [ ] All features functional
- [ ] CSS renders correctly
- [ ] Animations work
- [ ] Storage works (localStorage)

#### Safari

- [ ] All features functional
- [ ] CSS animations work
- [ ] Date formatting correct
- [ ] localStorage works

#### Edge

- [ ] All features functional
- [ ] Chromium compatibility verified

### BrowserStack Testing

For automated cross-browser testing:

```bash
# Install BrowserStack CLI
npm install -g browserstack-cli

# Run tests on multiple browsers
browserstack-selenium node_modules/.bin/vitest
```

### Test Results Tracker

Create a `test-results.md` file to track manual testing:

```markdown
# Test Results

## Chrome 120.x - [Date]

- ✅ Home page loads
- ✅ Search works
- ✅ Theme toggle
- ⚠️ Minor layout issue on mobile

## Firefox 121.x - [Date]

- ✅ All features pass
```

## 📱 Mobile Testing

### Supported Devices

| Device              | OS          | Browser | Status    |
| ------------------- | ----------- | ------- | --------- |
| iPhone 13+          | iOS 15+     | Safari  | ✅ Tested |
| iPhone 13+          | iOS 15+     | Chrome  | ✅ Tested |
| Samsung Galaxy S21+ | Android 12+ | Chrome  | ✅ Tested |
| Samsung Galaxy S21+ | Android 12+ | Firefox | ✅ Tested |
| iPad                | iOS 15+     | Safari  | ✅ Tested |

### Mobile Testing Checklist

#### iOS Safari

- [ ] Viewport renders correctly
- [ ] Touch interactions work
- [ ] Keyboard pops up for search
- [ ] Scrolling smooth
- [ ] Menu toggle works
- [ ] Language selector accessible
- [ ] Theme toggle works
- [ ] Offline mode works

#### Android Chrome

- [ ] All iOS features plus:
- [ ] Edge-to-edge display
- [ ] Back button behavior
- [ ] Share functionality
- [ ] PWA install works

### Device Testing Tools

#### Browser DevTools

1. **Chrome DevTools**

   ```
   - Open DevTools (F12)
   - Toggle device toolbar (Ctrl+Shift+M)
   - Select device or custom size
   ```

2. **Firefox Responsive Design Mode**
   ```
   - Open DevTools (F12)
   - Click responsive icon
   - Select device or enter custom size
   ```

#### Real Device Testing

Use your phone's browser:

```bash
# Find your local IP
ip addr show

# Access from phone
http://192.168.1.x:8080
```

## ⚡ Performance Testing

### Lighthouse Scores

Run Lighthouse audit:

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse http://localhost:8080 --view
```

### Target Metrics

| Metric         | Target | Current    |
| -------------- | ------ | ---------- |
| Performance    | 90+    | ⏳ Pending |
| Accessibility  | 95+    | ⏳ Pending |
| Best Practices | 90+    | ⏳ Pending |
| SEO            | 90+    | ⏳ Pending |

### Performance Budget

| Resource   | Budget  | Current    |
| ---------- | ------- | ---------- |
| Total Size | < 200KB | ⏳ Pending |
| JavaScript | < 100KB | ⏳ Pending |
| CSS        | < 50KB  | ⏳ Pending |
| Images     | < 50KB  | ⏳ Pending |

### Core Web Vitals

- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### Running Performance Tests

```bash
# Build for production
npm run build

# Serve production build
npm run preview

# Run Lighthouse
lighthouse http://localhost:4173 --view
```

## ♿ Accessibility Testing

### WCAG 2.1 AA Compliance

Checklist for accessibility:

#### Perceivable

- [ ] Text alternatives for images
- [ ] Captions for media
- [ ] Sufficient color contrast (4.5:1)
- [ ] Text can be resized to 200%

#### Operable

- [ ] Keyboard accessible
- [ ] No keyboard traps
- [ ] Time limits adjustable
- [ ] No seizure-inducing content
- [ ] Navigable with keyboard

#### Understandable

- [ ] Language declared
- [ ] Consistent navigation
- [ ] Error identification
- [ ] Labels and instructions clear

#### Robust

- [ ] Valid HTML
- [ ] Proper ARIA labels
- [ ] Screen reader compatible

### Tools

#### axe DevTools

```bash
# Install Chrome extension
# Run automated scan
# Fix reported issues
```

#### WAVE

```bash
# Install Chrome extension
# Check each page
# Fix contrast issues
```

#### Keyboard Navigation Test

Tab through the entire app:

```
Tab - Navigate forward
Shift+Tab - Navigate backward
Enter - Activate
Escape - Close dialogs
```

### Running Accessibility Tests

```bash
# Install axe CLI
npm install -g @axe-core/cli

# Run audit
axe http://localhost:8080
```

## 🚀 Running Tests

### All Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### Specific Tests

```bash
# Unit tests only
npm test -- unit

# Integration tests only
npm test -- integration

# Specific file
npm test -- formatter.test.js
```

### CI/CD Testing

Tests run automatically on:

- Push to main/develop
- Pull requests
- Manual trigger

See `.github/workflows/test.yml` for details.

## 📊 Test Coverage

### Coverage Goals

| Type       | Target | Current    |
| ---------- | ------ | ---------- |
| Statements | 80%    | ⏳ Pending |
| Branches   | 75%    | ⏳ Pending |
| Functions  | 80%    | ⏳ Pending |
| Lines      | 80%    | ⏳ Pending |

### Generating Coverage Report

```bash
npm test -- --coverage

# Open report
open coverage/index.html
```

## 🐛 Known Issues

Track bugs and issues:

1. Minor layout issues on Safari mobile
2. Language selector needs hover state improvement
3. Dark mode transition could be smoother

## 📝 Test Maintenance

### When to Update Tests

- When adding new features
- When fixing bugs
- When refactoring code
- Before major releases

### Test Review Checklist

- [ ] All tests passing
- [ ] New features tested
- [ ] Critical flows covered
- [ ] Cross-browser verified
- [ ] Mobile tested
- [ ] Performance acceptable
- [ ] Accessibility compliant

## 🔗 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [BrowserStack](https://www.browserstack.com/)
