// Service Worker for OSM Notes Viewer PWA

const CACHE_NAME = 'osm-notes-viewer-v3';
const STATIC_ASSETS = [
  '/index.html',
  '/pages/user.html',
  '/pages/country.html',
  '/pages/explore.html',
  '/pages/about.html'
];

// Data to cache for offline access
const OFFLINE_DATA = [
  '/data/indexes/users.json',
  '/data/indexes/countries.json',
  '/data/metadata.json'
];

// Install event - cache static assets and essential data
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        // Cache static HTML files
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Cache essential data in background
        console.log('[SW] Caching offline data...');
        return caches.open(CACHE_NAME);
      })
      .then((cache) => {
        // Cache index files for offline search
        return Promise.all(
          OFFLINE_DATA.map(url =>
            fetch(url)
              .then(response => {
                if (response.ok) {
                  cache.put(url, response.clone());
                  console.log('[SW] Cached:', url);
                }
              })
              .catch(err => console.warn('[SW] Failed to cache:', url, err))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only cache GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip data URLs and external requests
  if (url.origin !== location.origin) {
    return;
  }

  // Network-first strategy for data files with TTL check
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          // Check if cached data is still fresh (< 15 minutes)
          if (cachedResponse) {
            const cachedDate = cachedResponse.headers.get('sw-cached-date');
            if (cachedDate) {
              const age = Date.now() - parseInt(cachedDate);
              const cacheDuration = 15 * 60 * 1000; // 15 minutes

              if (age < cacheDuration) {
                console.log('[SW] Serving fresh cached data:', request.url);
                return cachedResponse;
              } else {
                console.log('[SW] Cached data expired, fetching fresh:', request.url);
              }
            }
          }

          // Fetch fresh data from network
          return fetch(request)
            .then((response) => {
              // Cache successful responses with timestamp
              if (response.ok) {
                const responseToCache = response.clone();
                // Add timestamp header for TTL checking
                const headers = new Headers(responseToCache.headers);
                headers.set('sw-cached-date', Date.now().toString());

                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, new Response(responseToCache.body, {
                    status: responseToCache.status,
                    statusText: responseToCache.statusText,
                    headers: headers
                  }));
                });
              }
              return response;
            })
            .catch(() => {
              // Fallback to stale cache if network fails
              if (cachedResponse) {
                console.log('[SW] Serving stale cache (offline):', request.url);
                return cachedResponse;
              }
              return new Response('Data not available offline', {
                status: 503,
                headers: { 'Content-Type': 'text/plain' }
              });
            });
        })
    );
    return;
  }

  // Network-first strategy for HTML pages to ensure fresh content
  if (request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Don't cache if not successful
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone response and cache it for offline use
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseToCache);
            });

          console.log('[SW] Serving from network (HTML):', request.url);
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails (offline)
          console.log('[SW] Network failed, serving from cache:', request.url);
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return index.html as fallback
              if (request.destination === 'document') {
                return caches.match('/index.html');
              }
              return new Response('Offline', { status: 503 });
            });
        })
    );
    return;
  }

  // Cache-first strategy for static assets (CSS, JS, images)
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', request.url);
          return cachedResponse;
        }

        // Fetch from network
        console.log('[SW] Fetching from network:', request.url);
        return fetch(request)
          .then((response) => {
            // Don't cache if not successful
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone response and cache it
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Return offline page if fetch fails
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// Handle notifications (for future use)
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Background sync (for future use)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
});

