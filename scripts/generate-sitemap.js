import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const PUBLIC_DIR = path.resolve(ROOT_DIR, 'public')
const SITEMAP_PATH = path.resolve(PUBLIC_DIR, 'sitemap.xml')
const DIST_DIR = path.resolve(ROOT_DIR, 'dist')

const SITE_URL = process.env.SITE_URL || 'https://wall.202597.xyz'
const TODAY = new Date().toISOString().split('T')[0]

const routes = [
  { loc: '/', changefreq: 'daily', priority: '1.0', title: '超赞壁纸 - 4K高清壁纸免费下载' },
  { loc: '/desktop/', changefreq: 'daily', priority: '1.0', title: '4K电脑桌面壁纸' },
  { loc: '/mobile/', changefreq: 'daily', priority: '0.9', title: '4K手机壁纸' },
  { loc: '/avatar/', changefreq: 'weekly', priority: '0.8', title: '高清头像' },
  { loc: '/video/', changefreq: 'weekly', priority: '0.8', title: '视频壁纸' },
  { loc: '/bing/', changefreq: 'daily', priority: '0.8', title: 'Bing每日壁纸' },
  { loc: '/about/', changefreq: 'monthly', priority: '0.5', title: '关于超赞壁纸' },
]

const desktopCategories = ['风景', '动漫', '游戏', '人像', '插画', '萌宠', '影视', 'IP形象']
const mobileCategories = ['风景', '动漫', '游戏', '人像', '插画', '萌宠', '影视', '创意', '通用', 'IP形象']
const avatarCategories = ['动漫', '人像', '插画', '萌宠', '表情包', '通用', 'IP形象']

function buildCategoryRoutes(series, categories) {
  const seriesNames = { desktop: '电脑壁纸', mobile: '手机壁纸', avatar: '头像' }
  return categories.map(cat => ({
    loc: `/${series}/?category=${encodeURIComponent(cat)}`,
    changefreq: 'weekly',
    priority: '0.7',
    title: `${cat}${seriesNames[series] || '壁纸'}`,
  }))
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function generateSitemap() {
  const allRoutes = [
    ...routes,
    ...buildCategoryRoutes('desktop', desktopCategories),
    ...buildCategoryRoutes('mobile', mobileCategories),
    ...buildCategoryRoutes('avatar', avatarCategories),
  ]

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`
  xml += `        xmlns:xhtml="http://www.w3.org/1999/xhtml"\n`
  xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n\n`

  for (const route of allRoutes) {
    xml += `  <url>\n`
    xml += `    <loc>${escapeXml(`${SITE_URL}${route.loc}`)}</loc>\n`
    xml += `    <lastmod>${TODAY}</lastmod>\n`
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`
    xml += `    <priority>${route.priority}</priority>\n`
    if (route.title) {
      xml += `    <image:image>\n`
      xml += `      <image:loc>${escapeXml(`${SITE_URL}/og-image.jpg`)}</image:loc>\n`
      xml += `      <image:title>${escapeXml(route.title)}</image:title>\n`
      xml += `    </image:image>\n`
    }
    xml += `  </url>\n\n`
  }

  xml += `</urlset>`

  fs.writeFileSync(SITEMAP_PATH, xml, 'utf-8')

  const distSitemapPath = path.resolve(DIST_DIR, 'sitemap.xml')
  if (fs.existsSync(DIST_DIR)) {
    fs.writeFileSync(distSitemapPath, xml, 'utf-8')
    console.log(`✅ Sitemap also written to dist/`)
  }

  console.log(`✅ Sitemap generated: ${SITEMAP_PATH}`)
  console.log(`   Domain: ${SITE_URL}`)
  console.log(`   Routes: ${allRoutes.length} (main: ${routes.length}, category: ${allRoutes.length - routes.length})`)
}

generateSitemap()
