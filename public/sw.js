// public/sw.js
// IMPORTANT: Cache version changes with each deployment
// This ensures users always get fresh content after updates
// Using timestamp ensures each build has unique cache
const CACHE_VERSION = 'v' + new Date().getTime();
const CACHE_NAME = `referral-flywheel-${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell with version:', CACHE_VERSION);
      return cache.addAll(urlsToCache);
    })
  );
  // Force immediate activation
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
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
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip Chrome extension requests
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Cache hit - return response
      if (cachedResponse) {
        return cachedResponse;
      }

      // Clone the request
      const fetchRequest = event.request.clone();

      return fetch(fetchRequest).then((response) => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        // Cache dynamic content based on URL patterns
        if (shouldCache(event.request.url)) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return response;
      }).catch(() => {
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/offline');
        }

        // Return cached version if available
        return caches.match(event.request);
      });
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: 'view',
        title: 'View Dashboard',
        icon: '/icons/checkmark.png',
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png',
      },
    ],
  };

  // Parse custom notification data
  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.body || options.body;
      options.title = data.title || 'Referral Flywheel';
      options.tag = data.tag || 'default';
      options.data = { ...options.data, ...data };
    } catch (e) {
      // Use default text
    }
  }

  event.waitUntil(
    self.registration.showNotification('Referral Flywheel', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    // Open dashboard
    event.waitUntil(
      clients.openWindow('/customer')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-commissions') {
    event.waitUntil(syncCommissions());
  }
});

// Sync commissions when back online
async function syncCommissions() {
  try {
    const response = await fetch('/api/sync/commissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      console.log('[SW] Commissions synced successfully');
    }
  } catch (error) {
    console.error('[SW] Failed to sync commissions:', error);
  }
}

// Helper function to determine if URL should be cached
function shouldCache(url) {
  const cacheablePatterns = [
    /\.(js|css|png|jpg|jpeg|svg|gif|webp|woff2?)$/,
    /^https?:\/\/[^/]+\/(api\/public|static)\//,
  ];

  return cacheablePatterns.some(pattern => pattern.test(url));
}

// Periodic background sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-stats') {
    event.waitUntil(updateStats());
  }
});

async function updateStats() {
  try {
    const response = await fetch('/api/stats/update', {
      method: 'POST',
    });

    if (response.ok) {
      const data = await response.json();
      // Send notification if there are new commissions
      if (data.newCommissions > 0) {
        self.registration.showNotification('New Commissions!', {
          body: `You've earned ${data.newCommissions} new commissions!`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
        });
      }
    }
  } catch (error) {
    console.error('[SW] Failed to update stats:', error);
  }
}