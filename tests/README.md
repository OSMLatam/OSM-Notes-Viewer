# Testing Guide

## Overview

This project uses **Vitest** for unit and integration testing.

## Running Tests

### Watch Mode (Development)
```bash
npm test
```
Runs tests in watch mode - automatically re-runs tests when files change.

### Single Run
```bash
npm run test:run
```
Runs all tests once and exits.

### UI Mode
```bash
npm run test:ui
```
Opens Vitest UI in browser for interactive test exploration.

## Test Structure

```
tests/
├── setup.js           # Global test configuration and mocks
├── utils/             # Tests for utility functions
│   └── formatter.test.js
├── api/               # Tests for API client
│   └── apiClient.test.js
└── components/        # Tests for UI components
    ├── darkMode.test.js
    └── pagination.test.js
```

## Test Coverage

Current coverage includes:
- ✅ **Formatter utilities** (20 tests)
  - formatNumber
  - formatDate
  - formatRelativeTime
  - formatPercentage
  - truncate

- ✅ **API Client** (6 tests)
  - getUserIndex
  - getCountryIndex
  - Caching behavior
  - Error handling

- ✅ **Dark Mode Component** (8 tests)
  - Theme switching
  - localStorage persistence
  - System preference detection

- ✅ **Pagination Component** (6 tests)
  - Pagination calculations
  - Edge cases

**Total: 40 tests passing** ✅

## Writing New Tests

### Example Test Structure

```javascript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../../src/js/utils/myModule.js';

describe('MyModule', () => {
    describe('myFunction', () => {
        it('should do something', () => {
            const result = myFunction('input');
            expect(result).toBe('expected output');
        });
    });
});
```

## Mocking

### localStorage
Already mocked in `tests/setup.js` - stores data in memory.

### window.matchMedia
Already mocked in `tests/setup.js` - use in tests like:
```javascript
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn(() => ({
        matches: true,
        addEventListener: () => {}
    }))
});
```

### fetch
Mock fetch for API tests:
```javascript
global.fetch = vi.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
    })
);
```

## CI/CD

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

See `.github/workflows/test.yml` for configuration.

## Best Practices

1. **Write descriptive test names** - "should format numbers with thousands separator"
2. **Test edge cases** - null, undefined, empty strings, large numbers
3. **Keep tests isolated** - Each test should be independent
4. **Use beforeEach** - Set up fresh state for each test
5. **Mock external dependencies** - Don't rely on network, file system, etc.

## Debugging Failed Tests

### Run specific test file
```bash
npm test tests/utils/formatter.test.js
```

### Run tests matching pattern
```bash
npm test -- -t "formatNumber"
```

### Run in debug mode
Add `.only` to a test:
```javascript
it.only('should test this', () => {
    // Only this test will run
});
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Jest Matchers](https://jestjs.io/docs/expect)

