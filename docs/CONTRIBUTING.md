---
title: 'Contributing to OSM Notes Viewer'
description:
  'Thank you for your interest in contributing! This document provides guidelines for contributing
  to'
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

# Contributing to OSM Notes Viewer

Thank you for your interest in contributing! This document provides guidelines for contributing to
the project.

## How to Contribute

### Reporting Bugs

1. Check if the issue already exists in
   [GitHub Issues](https://github.com/OSM-Notes/OSM-Notes-Viewer/issues)
2. If not, create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Browser and OS information

### Suggesting Features

1. Open a GitHub Issue with the `enhancement` label
2. Describe the feature and its benefits
3. Provide examples or mockups if possible

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Test thoroughly
5. Commit with clear messages
6. Push and create a Pull Request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/OSM-Notes-Viewer.git
cd OSM-Notes-Viewer

# Start local server
python3 -m http.server 8000
# or
npx http-server -p 8000

# Open browser
open http://localhost:8000/src/index.html
```

## Coding Guidelines

### JavaScript

- Use ES6+ features
- Use `const` and `let`, avoid `var`
- Prefer async/await over promises
- Add JSDoc comments for functions
- Keep functions small and focused

Example:

```javascript
/**
 * Formats a number with thousands separator
 * @param {number} num - The number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
  return new Intl.NumberFormat('en-US').format(num);
}
```

### CSS

- Use CSS variables for theming
- Mobile-first approach
- Use BEM naming when appropriate
- Keep selectors specific but not overly complex

Example:

```css
.profile-header {
  padding: 2rem;
}

.profile-header__title {
  font-size: 2rem;
}
```

### HTML

- Semantic HTML5 elements
- Accessibility attributes (ARIA)
- Meta tags for SEO
- Valid, well-formatted markup

### File Organization

```
src/
├── index.html          # Main page
├── css/               # Stylesheets
│   └── main.css
├── js/
│   ├── main.js        # Main application logic
│   ├── api/           # API client code
│   ├── components/    # Reusable components
│   └── utils/         # Utility functions
└── pages/             # Additional pages
```

## Testing

### Manual Testing Checklist

- [ ] Test on Chrome, Firefox, Safari
- [ ] Test on mobile devices
- [ ] Test with slow network (throttling)
- [ ] Test with missing data
- [ ] Test error scenarios
- [ ] Check console for errors
- [ ] Verify accessibility (keyboard navigation)

### Performance

- Lazy load images and data
- Minimize network requests
- Use caching effectively
- Keep bundle sizes small

## Commit Messages

Follow conventional commits format:

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**

```
feat(search): add autocomplete to search input

fix(user-profile): handle missing hashtag data

docs(api): update API documentation for new fields
```

## Code Review Process

1. All PRs require review before merging
2. Address review comments promptly
3. Keep PRs focused and reasonably sized
4. Update documentation if needed

## Questions?

- Open a GitHub Discussion
- Comment on related issues
- Reach out to maintainers

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing! 🎉
