const CACHE_NAME = 'wallpaper-sw-v4'
const IMAGE_CACHE_NAME = 'wallpaper-images-v3'
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

const CDN_RACE_ORDER = ['cdn.jsdmirror.com', 'testingcf.jsdelivr.net', 'cdn.jsdelivr.net']

const IMAGE_EXTENSIONS = /\.(?:jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico|heic|heif)$/i

const RACE_TIMEOUT = 3000

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

  if (isCdnImageRequest(url)) {
    event.respondWith(cdnImageWithRace(event.request, url))
    return
  }

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

function isCdnImageRequest(url) {
  return CDN_DOMAINS.includes(url.hostname) && url.pathname.includes('/nuanXinProPic')
}

function isImageRequest(url) {
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

async function cdnImageWithRace(request, originalUrl) {
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

  const currentDomain = originalUrl.hostname
  const allDomains = [currentDomain, ...CDN_RACE_ORDER.filter(d => d !== currentDomain)]

  try {
    const response = await raceCdnRequests(request, originalUrl, allDomains)
    if (response && response.ok) {
      cacheResponse(request, response, IMAGE_CACHE_NAME)
    }
    if (response) return response
  } catch {
    // race failed
  }

  if (cached) return cached
  return new Response('', { status: 503, statusText: 'Service Unavailable' })
}

function raceCdnRequests(request, originalUrl, domains) {
  return new Promise((resolve, reject) => {
    let settled = false
    let failures = 0
    const total = domains.length

    for (const domain of domains) {
      let fetchUrl
      if (domain === originalUrl.hostname) {
        fetchUrl = originalUrl.toString()
      } else {
        const fallbackUrl = new URL(originalUrl.toString())
        fallbackUrl.hostname = domain
        fetchUrl = fallbackUrl.toString()
      }

      const controller = new AbortController()

      const timeoutId = setTimeout(() => {
        controller.abort()
        failures++
        if (failures === total && !settled) {
          settled = true
          reject(new Error('all cdn requests failed'))
        }
      }, RACE_TIMEOUT)

      fetch(fetchUrl, { signal: controller.signal, mode: 'cors', credentials: 'omit' })
        .then((response) => {
          clearTimeout(timeoutId)
          if (settled) return
          if (response.ok) {
            settled = true
            resolve(response)
          } else {
            failures++
            if (failures === total && !settled) {
              settled = true
              reject(new Error('all cdn requests failed'))
            }
          }
        })
        .catch(() => {
          clearTimeout(timeoutId)
          failures++
          if (failures === total && !settled) {
            settled = true
            reject(new Error('all cdn requests failed'))
          }
        })
    }
  })
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
