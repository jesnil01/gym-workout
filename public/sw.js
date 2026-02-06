// Update this version when deploying to force cache refresh
const CACHE_VERSION = 'v2';
const CACHE_NAME = `gym-workout-${CACHE_VERSION}`;
const RUNTIME_CACHE = 'gym-workout-runtime';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/gym-workout/',
  '/gym-workout/index.html',
  '/gym-workout/manifest.json'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker, version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Service worker installed, skipping waiting');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker, version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // Delete old caches that don't match current version
            return cacheName.startsWith('gym-workout-') && cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('[SW] Service worker activated, claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // For HTML requests, always try network first to get latest version
  const isHtmlRequest = event.request.headers.get('accept')?.includes('text/html');
  const isNavigation = event.request.mode === 'navigate';
  
  // For navigation (app start/restart), always fetch fresh from network
  if (isNavigation || isHtmlRequest) {
    event.respondWith(
      fetch(event.request, { 
        cache: 'no-store', // Never use cache for HTML
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
        .then((response) => {
          // Don't cache HTML - always get fresh version
          return response;
        })
        .catch(() => {
          // Only fallback to cache if network completely fails
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // For other assets, use network first then cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response
        const responseToCache = response.clone();

        // Cache successful responses
        if (response.status === 200) {
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request);
      })
  );
});

// Listen for skipWaiting message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
