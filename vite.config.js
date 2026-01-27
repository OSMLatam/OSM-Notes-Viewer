import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Base public path when served in production
  base: './',

  // Input directory
  root: 'src',

  // Public directory for static assets
  publicDir: '../public',

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
      output: {
        // Add content hash to filenames for cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
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
    // Disable caching in development to ensure fresh content
    headers: {
      'Cache-Control': 'no-store',
    },
    hmr: {
      overlay: true, // Show error overlay in browser
    },
    // Proxy configuration to avoid CORS issues in development
    // Proxies requests to GitHub Pages (osm-notes.github.io/OSM-Notes-Data)
    // Note: GitHub Pages may redirect, but we'll handle that
    proxy: {
      '/api/data': {
        target: 'https://osm-notes.github.io',
        changeOrigin: true,
        secure: true,
        followRedirects: true,
        rewrite: (path) => path.replace(/^\/api\/data/, '/OSM-Notes-Data/data'),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Prevent redirect to custom domain
            proxyReq.setHeader('Host', 'osm-notes.github.io');
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Add CORS headers
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type';
            // If redirected, rewrite location header to use proxy
            if (
              (proxyRes.statusCode === 301 || proxyRes.statusCode === 302) &&
              proxyRes.headers['location']
            ) {
              const location = proxyRes.headers['location'];
              // If redirecting to custom domain, ignore it and use GitHub Pages URL directly
              // This handles cases where GitHub Pages redirects to a custom domain that doesn't have the data
              if (location.includes('.org') && !location.includes('github.io')) {
                // Remove the redirect and fetch directly from GitHub Pages
                delete proxyRes.headers['location'];
                proxyRes.statusCode = 200;
              }
            }
          });
        },
      },
    },
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
