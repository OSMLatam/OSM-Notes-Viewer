import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Base public path when served in production
  base: './',

  // Input directory
  root: 'src',

  // Build configuration
  build: {
    // Output directory
    outDir: '../dist',

    // Generate source maps for production
    sourcemap: true,

    // Manifest for proper caching
    manifest: true,

    // Rollup options
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        user: resolve(__dirname, 'src/pages/user.html'),
        country: resolve(__dirname, 'src/pages/country.html'),
        explore: resolve(__dirname, 'src/pages/explore.html'),
        about: resolve(__dirname, 'src/pages/about.html'),
      },
    },

    // Minification
    minify: 'esbuild', // Use esbuild instead of terser (faster and included)

    // CSS minification
    cssMinify: true,

    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },

  // Server configuration for development
  server: {
    port: 8080,
    open: true,
  },

  // CSS configuration
  css: {
    devSourcemap: true,
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});

