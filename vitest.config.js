import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    coverage: {
      enabled: false, // Disable for now due to Node 18 compatibility
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: ['node_modules/', 'tests/', 'dist/', '**/*.config.js', '**/*.html'],
    },
  },
});
