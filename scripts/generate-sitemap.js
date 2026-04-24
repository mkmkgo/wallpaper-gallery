import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const PUBLIC_DIR = path.resolve(ROOT_DIR, 'public')
const SITEMAP_PATH = path.resolve(PUBLIC_DIR, 'sitemap.xml')
const CONSTANTS_PATH = path.resolve(ROOT_DIR, 'src/utils/config/constants.js')

const SITE_URL = process.env.SITE_URL || 'https://wall.202597.xyz'
const TODAY = new Date().toISOString().split('T')[0]

function readCdnVersion() {
  try {
    const content = fs.readFileSync(CONSTANTS_PATH, 'utf-8')
    const match = content.match(/export const CDN_VERSION = '([^']+)'/)
    return match ? match[1] : 'v1.1.29'
  }
  catch {
    return 'v1.1.29'
  }
}

const CDN_VERSION = readCdnVersion()
const CDN_BASE = `https://cdn.jsdelivr.net/gh/mkmkgo/nuanXinProPic@${CDN_VERSION}`

const routes = [
  {
    loc: '/',
    lastmod: TODAY,
    changefreq: 'daily',
    priority: '1.0',
    comment: '首页',
  },
  {
    loc: '/desktop/',
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: '1.0',
    comment: '电脑壁纸系列页',
    images: [
      { loc: `${CDN_BASE}/preview/desktop/风景/极光雪原.webp`, title: '精选高清4K电脑桌面壁纸' },
    ],
  },
  {
    loc: '/mobile/',
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: '0.9',
    comment: '手机壁纸系列页',
    images: [
      { loc: `${CDN_BASE}/preview/mobile/风景/极光雪原.webp`, title: '精选高清手机壁纸下载' },
    ],
  },
  {
    loc: '/avatar/',
    lastmod: TODAY,
    changefreq: 'weekly',
    priority: '0.8',
    comment: '头像系列页',
    images: [
      { loc: `${CDN_BASE}/preview/avatar/动漫/二次元.webp`, title: '精选个性高清头像' },
    ],
  },
  {
    loc: '/bing/',
    lastmod: TODAY,
    changefreq: 'daily',
    priority: '0.8',
    comment: '每日Bing壁纸页',
  },
  {
    loc: '/about/',
    lastmod: TODAY,
    changefreq: 'monthly',
    priority: '0.5',
    comment: '关于页面',
  },
]

function generateSitemap() {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`
  xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n\n`

  for (const route of routes) {
    xml += `  <!-- ${route.comment} -->\n`
    xml += `  <url>\n`
    xml += `    <loc>${SITE_URL}${route.loc}</loc>\n`
    xml += `    <lastmod>${route.lastmod}</lastmod>\n`
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`
    xml += `    <priority>${route.priority}</priority>\n`

    if (route.images) {
      for (const img of route.images) {
        xml += `    <image:image>\n`
        xml += `      <image:loc>${img.loc}</image:loc>\n`
        xml += `      <image:title>${img.title}</image:title>\n`
        xml += `    </image:image>\n`
      }
    }

    xml += `  </url>\n\n`
  }

  xml += `</urlset>`

  fs.writeFileSync(SITEMAP_PATH, xml, 'utf-8')
  console.log(`✅ Sitemap generated: ${SITEMAP_PATH}`)
  console.log(`   Domain: ${SITE_URL}`)
  console.log(`   CDN Version: ${CDN_VERSION}`)
  console.log(`   Routes: ${routes.length}`)
}

generateSitemap()
