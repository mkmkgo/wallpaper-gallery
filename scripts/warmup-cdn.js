import process from 'node:process'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = resolve(__dirname, '..')

const CDN_DOMAINS = ['cdn.jsdmirror.com', 'testingcf.jsdelivr.net', 'cdn.jsdelivr.net']
const PRIMARY_CDN = CDN_DOMAINS[0]

const CDN_VERSION = process.env.CDN_VERSION || 'v1.1.29'
const CDN_BASE = `https://${PRIMARY_CDN}/gh/mkmkgo/nuanXinProPic@${CDN_VERSION}`

const SITE_URL = process.env.SITE_URL || 'https://wall.202597.xyz'

const CONCURRENCY = 8
const WARMUP_TIMEOUT = 15000

const FULL_MODE = process.argv.includes('--full')

function loadWarmupConfig() {
  const configPath = resolve(ROOT_DIR, 'public/warmup-config.json')
  try {
    const content = readFileSync(configPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return { version: CDN_VERSION, images: [], series: {} }
  }
}

function collectConfiguredImageUrls() {
  const config = loadWarmupConfig()
  const urls = []
  
  for (const imagePath of config.images) {
    urls.push(`${CDN_BASE}${imagePath}`)
  }
  
  return urls
}

function collectDataUrls() {
  const urls = []
  const dataDir = resolve(ROOT_DIR, 'public/data')

  const seriesDirs = ['desktop', 'mobile', 'avatar', 'bing']
  for (const series of seriesDirs) {
    const seriesDir = resolve(dataDir, series)
    try {
      const files = readdirSync(seriesDir)
      for (const file of files) {
        if (!file.endsWith('.json')) continue
        urls.push(`${SITE_URL}/data/${series}/${file}`)
      }
    } catch {
      // skip
    }
  }

  return urls
}

function collectHotUrls() {
  const urls = []
  const publicDir = resolve(ROOT_DIR, 'public')

  const hotFiles = [
    'hot-desktop.json',
    'hot-mobile.json',
    'hot-avatar.json',
    'hot-tags-desktop.json',
    'hot-tags-mobile.json',
    'hot-tags-avatar.json',
  ]

  for (const file of hotFiles) {
    try {
      readFileSync(resolve(publicDir, file))
      urls.push(`${SITE_URL}/${file}`)
    } catch {
      // skip
    }
  }

  return urls
}

async function warmupUrl(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), WARMUP_TIMEOUT)

  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    const cacheStatus = res.headers.get('x-cache') || res.headers.get('cf-cache-status') || 'unknown'
    return { url, ok: res.ok, status: res.status, cacheStatus }
  } catch (err) {
    clearTimeout(timer)
    return { url, ok: false, status: 0, error: err.message }
  }
}

async function warmupWithConcurrency(urls, concurrency, label) {
  if (urls.length === 0) return { results: [], hitCount: 0, missCount: 0 }
  
  console.log(`   🚀 ${label}: ${urls.length} URLs`)
  
  const results = []
  let hitCount = 0
  let missCount = 0

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(batch.map(warmupUrl))
    for (const r of batchResults) {
      const result = r.status === 'fulfilled' ? r.value : { ok: false, cacheStatus: 'error' }
      results.push(result)
      if (result.cacheStatus?.includes('HIT')) hitCount++
      else if (result.cacheStatus?.includes('MISS')) missCount++
    }
    process.stdout.write(`\r      Progress: ${results.length}/${urls.length} (HIT: ${hitCount}, MISS: ${missCount})`)
  }
  console.log('')
  
  const success = results.filter(r => r.ok).length
  console.log(`      ✅ Success: ${success}/${urls.length}`)
  
  return { results, hitCount, missCount }
}

async function main() {
  console.log(`\n🔥 CDN Cache Warmup`)
  console.log(`   CDN Version: ${CDN_VERSION}`)
  console.log(`   Primary CDN: ${PRIMARY_CDN}`)
  console.log(`   Site URL: ${SITE_URL}`)
  console.log(`   Concurrency: ${CONCURRENCY}\n`)

  const allResults = []
  let totalHit = 0
  let totalMiss = 0

  const imageUrls = collectConfiguredImageUrls()
  if (imageUrls.length > 0) {
    const { results, hitCount, missCount } = await warmupWithConcurrency(imageUrls, CONCURRENCY, '🖼️  Configured images')
    allResults.push(...results)
    totalHit += hitCount
    totalMiss += missCount
  } else {
    console.log(`   ⚠️  No configured images. Create public/warmup-config.json to preheat specific images.`)
  }

  const dataUrls = collectDataUrls()
  const { results: dataResults, hitCount: dataHit, missCount: dataMiss } = await warmupWithConcurrency(dataUrls, CONCURRENCY, '📁 Data files')
  allResults.push(...dataResults)
  totalHit += dataHit
  totalMiss += dataMiss

  const hotUrls = collectHotUrls()
  const { results: hotResults, hitCount: hotHit, missCount: hotMiss } = await warmupWithConcurrency(hotUrls, CONCURRENCY, '🔥 Hot files')
  allResults.push(...hotResults)
  totalHit += hotHit
  totalMiss += hotMiss

  const success = allResults.filter(r => r.ok).length
  const failed = allResults.filter(r => !r.ok).length
  
  console.log(`\n📊 Summary:`)
  console.log(`   Total URLs: ${allResults.length}`)
  console.log(`   Success: ${success}`)
  console.log(`   Failed: ${failed}`)
  console.log(`   Cache HIT: ${totalHit} (already cached)`)
  console.log(`   Cache MISS: ${totalMiss} (newly cached)`)

  if (failed > 0) {
    console.log('\n❌ Failed URLs (first 5):')
    allResults.filter(r => !r.ok).slice(0, 5).forEach(r => {
      console.log(`   ${r.status || 'timeout'} - ${r.url}`)
    })
  }

  console.log('\n🏁 CDN Warmup Done\n')
  console.log('💡 Tip: Add images to public/warmup-config.json to preheat specific wallpaper images')
}

main()
