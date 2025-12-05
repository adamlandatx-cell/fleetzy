// Fleetzy Service Worker - PWA + Capacitor Ready
// Version 1.0.0

const CACHE_NAME = 'fleetzy-v1.0.0';
const OFFLINE_CACHE = 'fleetzy-offline-v1';

// Files to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/application.html',
  '/dashboard.html',
  '/payment.html',
  '/admin.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://cdn.tailwindcss.com'
];

// API endpoints to cache with network-first strategy
const API_CACHE_ROUTES = [
  'https://xmixxqtcgaydasejshwn.supabase.co/rest/v1/'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching essential assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Service worker installed');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== OFFLINE_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests that aren't API calls
  if (url.origin !== location.origin && !isAPIRequest(url)) {
    return;
  }

  // Strategy 1: Network-first for API calls
  if (isAPIRequest(url)) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Strategy 2: Cache-first for assets (images, CSS, JS)
  if (isAssetRequest(url)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Strategy 3: Network-first with cache fallback for HTML pages
  if (isHTMLRequest(request)) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Default: Network-first
  event.respondWith(networkFirstStrategy(request));
});

// Network-first strategy (good for API calls and dynamic content)
async function networkFirstStrategy(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }
    
    // If HTML request and nothing in cache, return offline page
    if (isHTMLRequest(request)) {
      return caches.match('/offline.html') || new Response(
        '<h1>Offline</h1><p>You are currently offline. Please check your connection.</p>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    
    throw error;
  }
}

// Cache-first strategy (good for static assets)
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    console.log('[SW] Serving from cache:', request.url);
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    throw error;
  }
}

// Helper: Check if request is to API
function isAPIRequest(url) {
  return API_CACHE_ROUTES.some(route => url.href.includes(route));
}

// Helper: Check if request is for an asset
function isAssetRequest(url) {
  const assetExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.css', '.js', '.woff', '.woff2', '.ttf'];
  return assetExtensions.some(ext => url.pathname.endsWith(ext));
}

// Helper: Check if request is for HTML
function isHTMLRequest(request) {
  return request.headers.get('accept')?.includes('text/html');
}

// Background Sync - for payment submissions when offline
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-payments') {
    event.waitUntil(syncPayments());
  }
  
  if (event.tag === 'sync-applications') {
    event.waitUntil(syncApplications());
  }
});

// Sync pending payments
async function syncPayments() {
  console.log('[SW] Syncing pending payments...');
  
  try {
    // Get pending payments from IndexedDB (you'll implement this)
    const pendingPayments = await getPendingPayments();
    
    if (pendingPayments.length === 0) {
      console.log('[SW] No pending payments to sync');
      return;
    }
    
    // Submit each payment
    for (const payment of pendingPayments) {
      try {
        await submitPayment(payment);
        await removePendingPayment(payment.id);
        console.log('[SW] Payment synced:', payment.id);
      } catch (error) {
        console.error('[SW] Failed to sync payment:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Sync pending applications
async function syncApplications() {
  console.log('[SW] Syncing pending applications...');
  // Implement similar to syncPayments
}

// Push Notifications - for payment reminders
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Fleetzy';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: data.url ? { url: data.url } : {},
    actions: data.actions || [
      { action: 'view', title: 'View' },
      { action: 'close', title: 'Close' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    const url = event.notification.data.url || '/dashboard.html';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if app is already open
          for (const client of clientList) {
            if (client.url.includes(url) && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Open new window
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  }
});

// Message handler - for communication with app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then(cache => cache.addAll(event.data.urls))
    );
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then(names => Promise.all(names.map(name => caches.delete(name))))
    );
  }
});

// Placeholder functions (implement with IndexedDB)
async function getPendingPayments() {
  // TODO: Implement with IndexedDB
  return [];
}

async function submitPayment(payment) {
  // TODO: Implement API submission
}

async function removePendingPayment(id) {
  // TODO: Implement IndexedDB deletion
}

console.log('[SW] Service worker script loaded');
