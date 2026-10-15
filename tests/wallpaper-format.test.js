import { describe, expect, it } from 'vitest'
import { buildWallpaperDownloadFilename, buildWallpaperImageFallbackUrls } from '../src/utils/common/format.js'

describe('buildWallpaperDownloadFilename', () => {
  it('prefers metadata titles over generic upload filenames', () => {
    const filename = buildWallpaperDownloadFilename({
      category: '人像',
      displayTitle: '阳光下的甜美少女',
      filename: '663.webp',
      format: 'WEBP',
      subcategory: '甜妹',
    })

    expect(filename).toBe('阳光下的甜美少女.webp')
  })

  it('falls back to Bing title and appends the date for uniqueness', () => {
    const filename = buildWallpaperDownloadFilename({
      date: '2026-03-25',
      filename: 'bing-2026-03-25.jpg',
      isBing: true,
      title: '海牛的秘密生活',
    })

    expect(filename).toBe('海牛的秘密生活-2026-03-25.jpg')
  })
})

describe('buildWallpaperImageFallbackUrls', () => {
  it('tries avatar webp originals before CDN fallbacks', () => {
    const urls = buildWallpaperImageFallbackUrls({
      filename: '663.webp',
      format: 'WEBP',
      path: '/wallpaper/avatar/人像/甜妹/663.webp',
      thumbnailPath: '/thumbnail/avatar/人像/甜妹/663.webp',
      thumbnailUrl: 'https://cdn.jsdelivr.net/gh/IT-NuanxinPro/nuanXinProPic@v1.1.96/thumbnail/avatar/人像/甜妹/663.webp',
      url: 'https://cdn.jsdelivr.net/gh/IT-NuanxinPro/nuanXinProPic@v1.1.96/wallpaper/avatar/人像/甜妹/663.webp',
    })

    // 头像 webp 优先原图，其次轮换到备用 CDN 域名
    expect(urls[0]).toContain('/wallpaper/avatar/')
    expect(urls.some(url => url.includes('testingcf.jsdelivr.net'))).toBe(true)
    // 已移除 wsrv.nl 外部代理，fallback 只走自有 CDN 域名轮换
    expect(urls.some(url => url.includes('wsrv.nl'))).toBe(false)
  })

  it('falls back from preview thumbnails to original assets for standard wallpapers', () => {
    const urls = buildWallpaperImageFallbackUrls({
      filename: 'wallpaper.png',
      format: 'PNG',
      previewUrl: 'https://cdn.jsdelivr.net/gh/IT-NuanxinPro/nuanXinProPic@v1.2.8/preview/desktop/动漫/demo.webp',
      thumbnailUrl: 'https://cdn.jsdelivr.net/gh/IT-NuanxinPro/nuanXinProPic@v1.2.8/thumbnail/desktop/动漫/demo.webp',
      url: 'https://cdn.jsdelivr.net/gh/IT-NuanxinPro/nuanXinProPic@v1.2.8/wallpaper/desktop/动漫/demo.png',
    })

    // 预览图优先，原图保留在 fallback 链中，并轮换备用 CDN 域名
    expect(urls).toContain('https://cdn.jsdelivr.net/gh/IT-NuanxinPro/nuanXinProPic@v1.2.8/wallpaper/desktop/动漫/demo.png')
    expect(urls.some(url => url.includes('testingcf.jsdelivr.net'))).toBe(true)
    expect(urls.at(-1)).not.toContain('wsrv.nl')
  })
})
