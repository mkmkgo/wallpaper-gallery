import { CDN_DOMAINS } from '@/utils/config/constants'

const preloadedUrls = new Set()

export function usePreload() {
  function preloadImages(urls, limit = 6) {
    if (!urls || !urls.length) return

    const urlsToPreload = urls
      .filter((url) => {
        if (!url || preloadedUrls.has(url)) return false
        preloadedUrls.add(url)
        return true
      })
      .slice(0, limit)

    urlsToPreload.forEach((url) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = url
      link.fetchpriority = 'high'
      document.head.appendChild(link)
    })
  }

  function preloadCdnImages(paths, cdnTag, limit = 6) {
    const primaryDomain = CDN_DOMAINS.PRIMARY
    const urls = paths
      .slice(0, limit)
      .map((path) => {
        const tag = cdnTag || 'main'
        return `https://${primaryDomain}/gh/mkmkgo/nuanXinProPic@${tag}${path}`
      })
    preloadImages(urls, limit)
  }

  return { preloadImages, preloadCdnImages }
}
