const CACHE_NAME = 'wallpaper-sw-v1'
const IMAGE_CACHE_NAME = 'wallpaper-images-v1'
const DATA_CACHE_NAME = 'wallpaper-data-v1'

const IMAGE_MAX_AGE = 7 * 24 * 60 * 60
const DATA_MAX_AGE = 1 * 24 * 60 * 60
const STATIC_MAX_AGE = 30 * 24 * 60 * 60

const CDN_DOMAINS = [
  'cdn.jsdmirror.com',
  'testingcf.jsdelivr.net',
  'cdn.jsdelivr.net',
  'raw.githubusercontent.com',
]

const IMAGE_EXTENSIONS = /\.(?:jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico|heic|heif)$/i

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== IMAGE_CACHE_NAME && name !== DATA_CACHE_NAME)
          .map(name => caches.delete(name)),
      )
    }),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  if (event.request.method !== 'GET') return

  if (isImageRequest(url)) {
    event.respondWith(cacheFirst(event.request, IMAGE_CACHE_NAME, IMAGE_MAX_AGE))
    return
  }

  if (isDataRequest(url)) {
    event.respondWith(staleWhileRevalidate(event.request, DATA_CACHE_NAME, DATA_MAX_AGE))
    return
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request, CACHE_NAME, STATIC_MAX_AGE))
    return
  }
})

function isImageRequest(url) {
  if (IMAGE_EXTENSIONS.test(url.pathname)) return true
  if (CDN_DOMAINS.includes(url.hostname) && url.pathname.includes('/nuanXinProPic')) return true
  if (url.hostname === 'wsrv.nl') return true
  if (url.hostname === 'cn.bing.com' && url.pathname.startsWith('/th')) return true
  return false
}

function isDataRequest(url) {
  if (url.hostname === self.location.hostname && url.pathname.startsWith('/data/')) return true
  return false
}

function isStaticAsset(url) {
  if (url.hostname !== self.location.hostname) return false
  if (IMAGE_EXTENSIONS.test(url.pathname)) return false
  if (url.pathname.startsWith('/data/')) return false
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) return true
  if (url.pathname.endsWith('.woff2') || url.pathname.endsWith('.woff')) return true
  return false
}

async function cacheFirst(request, cacheName, maxAge) {
  const cached = await caches.match(request)
  if (cached) {
    const dateHeader = cached.headers.get('sw-cache-date')
    if (dateHeader) {
      const age = (Date.now() - Number(dateHeader)) / 1000
      if (age < maxAge) return cached
    } else {
      return cached
    }
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      const responseToCache = response.clone()
      const headers = new Headers(responseToCache.headers)
      headers.set('sw-cache-date', String(Date.now()))
      const body = await responseToCache.blob()
      const cachedResponse = new Response(body, { headers })
      caches.open(cacheName).then((cache) => {
        cache.put(request, cachedResponse)
      })
    }
    return response
  } catch (error) {
    if (cached) return cached
    return new Response('', { status: 503, statusText: 'Service Unavailable' })
  }
}

async function staleWhileRevalidate(request, cacheName, maxAge) {
  const cached = await caches.match(request)
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      const responseToCache = response.clone()
      const headers = new Headers(responseToCache.headers)
      headers.set('sw-cache-date', String(Date.now()))
      const body = await responseToCache.blob()
      const cachedResponse = new Response(body, { headers })
      caches.open(cacheName).then((cache) => {
        cache.put(request, cachedResponse)
      })
    }
    return response
  }).catch(() => cached)

  if (cached) {
    const dateHeader = cached.headers.get('sw-cache-date')
    if (dateHeader) {
      const age = (Date.now() - Number(dateHeader)) / 1000
      if (age < maxAge) return cached
    }
    fetchPromise.then()
    return cached
  }

  return fetchPromise
}
