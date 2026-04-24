import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const PUBLIC_DIR = path.resolve(ROOT_DIR, 'public')
const SITEMAP_PATH = path.resolve(PUBLIC_DIR, 'sitemap.xml')

const SITE_URL = process.env.SITE_URL || 'https://wall.202597.xyz'
const TODAY = new Date().toISOString().split('T')[0]

const routes = [
  { loc: '/', changefreq: 'daily', priority: '1.0', comment: '首页' },
  { loc: '/desktop/', changefreq: 'weekly', priority: '1.0', comment: '电脑壁纸系列页' },
  { loc: '/mobile/', changefreq: 'weekly', priority: '0.9', comment: '手机壁纸系列页' },
  { loc: '/avatar/', changefreq: 'weekly', priority: '0.8', comment: '头像系列页' },
  { loc: '/bing/', changefreq: 'daily', priority: '0.8', comment: '每日Bing壁纸页' },
  { loc: '/about/', changefreq: 'monthly', priority: '0.5', comment: '关于页面' },
]

function generateSitemap() {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n`

  for (const route of routes) {
    xml += `  <url>\n`
    xml += `    <loc>${SITE_URL}${route.loc}</loc>\n`
    xml += `    <lastmod>${TODAY}</lastmod>\n`
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`
    xml += `    <priority>${route.priority}</priority>\n`
    xml += `  </url>\n\n`
  }

  xml += `</urlset>`

  fs.writeFileSync(SITEMAP_PATH, xml, 'utf-8')
  console.log(`✅ Sitemap generated: ${SITEMAP_PATH}`)
  console.log(`   Domain: ${SITE_URL}`)
  console.log(`   Routes: ${routes.length}`)
}

generateSitemap()
