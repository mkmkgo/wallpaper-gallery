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

function collectCdnThumbnailUrls() {
  const urls = []
  const thumbnailPaths = [
    '/thumbnail/desktop/',
    '/thumbnail/mobile/',
    '/thumbnail/avatar/',
  ]

  if (FULL_MODE) {
    for (const path of thumbnailPaths) {
      urls.push(`${CDN_BASE}${path}`)
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
    const contentType = res.headers.get('content-type') || ''
    return { url, ok: res.ok, status: res.status, cacheStatus, contentType }
  } catch (err) {
    clearTimeout(timer)
    return { url, ok: false, status: 0, error: err.message }
  }
}

async function warmupWithConcurrency(urls, concurrency) {
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
    process.stdout.write(`\r   Progress: ${results.length}/${urls.length} (HIT: ${hitCount}, MISS: ${missCount})`)
  }
  console.log('')
  return { results, hitCount, missCount }
}

async function main() {
  const modeLabel = FULL_MODE ? 'Full' : 'Incremental'
  console.log(`\n🔥 CDN Cache Warmup [${modeLabel}]`)
  console.log(`   CDN Version: ${CDN_VERSION}`)
  console.log(`   Primary CDN: ${PRIMARY_CDN}`)
  console.log(`   Site URL: ${SITE_URL}`)
  console.log(`   Concurrency: ${CONCURRENCY}\n`)

  const allUrls = []

  const dataUrls = collectDataUrls()
  console.log(`   📁 Data files: ${dataUrls.length} URLs`)
  allUrls.push(...dataUrls)

  const hotUrls = collectHotUrls()
  console.log(`   🔥 Hot files: ${hotUrls.length} URLs`)
  allUrls.push(...hotUrls)

  const cdnUrls = collectCdnThumbnailUrls()
  console.log(`   🖼️  CDN thumbnail dirs: ${cdnUrls.length} URLs`)
  allUrls.push(...cdnUrls)

  if (allUrls.length === 0) {
    console.log('\n   ⚠️  No URLs found, skipping warmup')
    return
  }

  console.log(`\n   📊 Total: ${allUrls.length} URLs to warm`)
  console.log(`   🚀 Warming...\n`)

  const { results, hitCount, missCount } = await warmupWithConcurrency(allUrls, CONCURRENCY)

  const success = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok).length
  console.log(`\n   ✅ Success: ${success}, Failed: ${failed}`)
  console.log(`   📊 Cache: ${hitCount} HIT, ${missCount} MISS`)

  if (failed > 0) {
    console.log('\n   ❌ Failed URLs:')
    results.filter(r => !r.ok).slice(0, 10).forEach(r => {
      console.log(`      ${r.status || 'error'} - ${r.url}`)
    })
  }

  console.log('\n🏁 CDN Warmup Done\n')
}

main()
