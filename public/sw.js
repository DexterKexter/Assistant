// Logistics PWA service worker
// Cache-first for static assets, network-first for pages and API, offline fallback.

const VERSION = 'v3'
const SUPABASE_STORAGE_HOST = 'xkrxmtjxicdiyawldeyp.supabase.co'
const IMAGE_CACHE = `images-${VERSION}`
const STATIC_CACHE = `static-${VERSION}`
const PAGE_CACHE = `pages-${VERSION}`
const RUNTIME_CACHE = `runtime-${VERSION}`
const OFFLINE_URL = '/offline'

const PRECACHE_URLS = [
  '/offline',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, PAGE_CACHE, RUNTIME_CACHE, IMAGE_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
      await self.clients.claim()
    })()
  )
})

// Simple LRU trim: keep at most N entries in a cache
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length > maxEntries) {
    // Delete oldest entries
    for (let i = 0; i < keys.length - maxEntries; i++) {
      await cache.delete(keys[i])
    }
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request

  // Only GET requests
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // Cache Supabase Storage photos (cross-origin) — stale-while-revalidate
  if (url.hostname === SUPABASE_STORAGE_HOST && url.pathname.startsWith('/storage/v1/object/public/')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(req)
        const network = fetch(req)
          .then((res) => {
            if (res.ok) {
              cache.put(req, res.clone()).then(() => trimCache(IMAGE_CACHE, 200))
            }
            return res
          })
          .catch(() => cached)
        return cached || network
      })
    )
    return
  }

  // Skip other cross-origin (API calls, maps tiles, etc.) — let browser handle them
  if (url.origin !== self.location.origin) return

  // Skip Next.js dev/HMR and API routes — always fresh
  if (url.pathname.startsWith('/_next/webpack-hmr') || url.pathname.startsWith('/api/')) return

  // Never intercept the manifest, SW itself, auth pages — let browser handle them fresh
  if (url.pathname === '/manifest.webmanifest' || url.pathname === '/sw.js') return
  if (url.pathname === '/login' || url.pathname === '/register') return

  // Next.js static assets — cache-first, long-lived
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached
        return fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy))
          }
          return res
        })
      })
    )
    return
  }

  // Navigation requests (HTML pages) — network-first, fallback to cache, then offline page
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req)
          if (fresh.ok) {
            const copy = fresh.clone()
            caches.open(PAGE_CACHE).then((c) => c.put(req, copy))
          }
          return fresh
        } catch {
          const cached = await caches.match(req)
          if (cached) return cached
          return caches.match(OFFLINE_URL)
        }
      })()
    )
    return
  }

  // Images / fonts / other static — stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy))
          }
          return res
        })
        .catch(() => cached)
      return cached || network
    })
  )
})

// Allow forced update from the app
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})
