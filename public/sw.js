const CACHE_NAME = 'wallpaper-sw-v3'
const IMAGE_CACHE_NAME = 'wallpaper-images-v2'
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

const CDN_FALLBACK_ORDER = ['cdn.jsdmirror.com', 'testingcf.jsdelivr.net', 'cdn.jsdelivr.net']

const IMAGE_EXTENSIONS = /\.(?:jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico|heic|heif)$/i

const NETWORK_TIMEOUT = 8000

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
    event.respondWith(imageWithFallback(event.request, url))
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
  if (CDN_DOMAINS.includes(url.hostname) && url.pathname.includes('/nuanXinProPic')) return true
  if (url.hostname === 'wsrv.nl') return true
  if (url.hostname === 'cn.bing.com' && url.pathname.startsWith('/th')) return true
  if (url.hostname === self.location.hostname && IMAGE_EXTENSIONS.test(url.pathname)) return true
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

function timeoutPromise(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
}

async function imageWithFallback(request, url) {
  const cached = await caches.match(request)
  if (cached) {
    const dateHeader = cached.headers.get('sw-cache-date')
    if (dateHeader) {
      const age = (Date.now() - Number(dateHeader)) / 1000
      if (age < IMAGE_MAX_AGE) return cached
    } else {
      return cached
    }
  }

  if (CDN_DOMAINS.includes(url.hostname) && url.pathname.includes('/nuanXinProPic')) {
    return cdnFallbackFetch(request, url, cached)
  }

  try {
    const response = await Promise.race([
      fetch(request),
      timeoutPromise(NETWORK_TIMEOUT),
    ])
    if (response.ok) {
      cacheResponse(request, response, IMAGE_CACHE_NAME)
    }
    return response
  } catch (error) {
    if (cached) return cached
    return new Response('', { status: 503, statusText: 'Service Unavailable' })
  }
}

async function cdnFallbackFetch(request, originalUrl, cached) {
  const currentDomain = originalUrl.hostname
  const fallbackDomains = CDN_FALLBACK_ORDER.filter(d => d !== currentDomain)

  const tryFetch = async (url) => {
    try {
      const response = await Promise.race([
        fetch(url.toString(), { mode: 'cors', credentials: 'omit' }),
        timeoutPromise(NETWORK_TIMEOUT),
      ])
      if (response.ok) {
        cacheResponse(request, response, IMAGE_CACHE_NAME)
        return response
      }
      return null
    } catch {
      return null
    }
  }

  const primaryResponse = await tryFetch(originalUrl)
  if (primaryResponse) return primaryResponse

  for (const domain of fallbackDomains) {
    const fallbackUrl = new URL(originalUrl.toString())
    fallbackUrl.hostname = domain
    const fallbackResponse = await tryFetch(fallbackUrl)
    if (fallbackResponse) return fallbackResponse
  }

  if (cached) return cached
  return new Response('', { status: 503, statusText: 'Service Unavailable' })
}

async function cacheResponse(request, response, cacheName) {
  const responseToCache = response.clone()
  const headers = new Headers(responseToCache.headers)
  headers.set('sw-cache-date', String(Date.now()))
  const body = await responseToCache.blob()
  const cachedResponse = new Response(body, { headers })
  caches.open(cacheName).then((cache) => {
    cache.put(request, cachedResponse)
  })
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
      cacheResponse(request, response, cacheName)
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
      cacheResponse(request, response, cacheName)
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
