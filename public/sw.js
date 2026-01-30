// Novamind PWA Service Worker

const CACHE_NAME = 'novamind-v2'
const STATIC_ASSETS = [
  '/',
  '/all',
  '/login',
  '/signup',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Fetch event - network first, cache fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Skip API routes - always fetch from network
  if (event.request.url.includes('/api/')) {
    return
  }

  // Don't intercept cross-origin requests (CDN, WASM, Hugging Face, etc.)
  // so the page's CSP and fetches work correctly for AI models
  try {
    const url = new URL(event.request.url)
    if (url.origin !== self.location.origin) {
      return
    }
  } catch (_) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache same-origin successful responses
        if (response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        return caches.match(event.request)
      })
  )
})

// Handle share target
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Handle share target POST requests
  if (url.pathname === '/api/share' && event.request.method === 'POST') {
    // Let the request pass through to the API
    return
  }
})
