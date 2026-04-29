import process from 'node:process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = resolve(__dirname, '..')

const CDN_DOMAINS = ['cdn.jsdmirror.com', 'testingcf.jsdelivr.net', 'cdn.jsdelivr.net']
const PRIMARY_CDN = CDN_DOMAINS[0]

const CDN_VERSION = process.env.CDN_VERSION || 'v1.1.29'
const CDN_BASE = `https://${PRIMARY_CDN}/gh/mkmkgo/nuanXinProPic@${CDN_VERSION}`

const CONCURRENCY = 8
const WARMUP_TIMEOUT = 15000

const WARMUP_STATE_DIR = resolve(ROOT_DIR, '.warmup-state')
const WARMUP_STATE_FILE = resolve(WARMUP_STATE_DIR, `warmup-${CDN_VERSION}.json`)

const FULL_MODE = process.argv.includes('--full')

function loadWarmupState() {
  if (FULL_MODE) return { warmedIds: new Set() }
  if (!existsSync(WARMUP_STATE_FILE)) return { warmedIds: new Set() }
  try {
    const data = JSON.parse(readFileSync(WARMUP_STATE_FILE, 'utf-8'))
    return { warmedIds: new Set(data.warmedIds || []) }
  } catch {
    return { warmedIds: new Set() }
  }
}

function saveWarmupState(state) {
  if (!existsSync(WARMUP_STATE_DIR)) mkdirSync(WARMUP_STATE_DIR, { recursive: true })
  writeFileSync(WARMUP_STATE_FILE, JSON.stringify({
    version: CDN_VERSION,
    warmedIds: [...state.warmedIds],
    updatedAt: new Date().toISOString(),
  }, null, 2))
}

function loadLatestWallpapers(seriesId) {
  try {
    const filePath = resolve(ROOT_DIR, `public/data/${seriesId}/latest.json`)
    const raw = readFileSync(filePath, 'utf-8')
    let data
    try {
      data = JSON.parse(raw)
    } catch {
      return []
    }
    return data.wallpapers || data || []
  } catch {
    return []
  }
}

function buildWarmupUrls(wallpaper) {
  const urls = []
  if (wallpaper.thumbnailPath) urls.push(`${CDN_BASE}${wallpaper.thumbnailPath}`)
  else if (wallpaper.thumbnailUrl) urls.push(wallpaper.thumbnailUrl)
  if (wallpaper.previewPath) urls.push(`${CDN_BASE}${wallpaper.previewPath}`)
  else if (wallpaper.previewUrl) urls.push(wallpaper.previewUrl)
  return urls
}

async function warmupUrl(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), WARMUP_TIMEOUT)

  try {
    const res = await fetch(url, { signal: controller.signal, mode: 'cors' })
    clearTimeout(timer)
    const cacheStatus = res.headers.get('x-cache') || res.headers.get('cf-cache-status') || 'unknown'
    return { url, ok: res.ok, status: res.status, cacheStatus }
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

async function warmupFallbackCdn(failedUrls) {
  if (failedUrls.length === 0) return

  for (let i = 1; i < CDN_DOMAINS.length; i++) {
    const domain = CDN_DOMAINS[i]
    const fallbackUrls = failedUrls.map(url => {
      try {
        const u = new URL(url)
        u.hostname = domain
        return u.toString()
      } catch {
        return null
      }
    }).filter(Boolean)

    if (fallbackUrls.length === 0) continue

    console.log(`\n   🔄 Warming fallback CDN: ${domain} (${fallbackUrls.length} URLs)`)
    const { results } = await warmupWithConcurrency(fallbackUrls, CONCURRENCY)
    const success = results.filter(r => r.ok).length
    console.log(`   ✅ ${domain}: ${success}/${fallbackUrls.length} warmed`)
  }
}

async function main() {
  const modeLabel = FULL_MODE ? 'Full (all images)' : 'Incremental (new images only)'
  console.log(`\n🔥 CDN Cache Warmup [${modeLabel}]`)
  console.log(`   CDN Version: ${CDN_VERSION}`)
  console.log(`   Primary CDN: ${PRIMARY_CDN}`)
  console.log(`   Concurrency: ${CONCURRENCY}\n`)

  const state = loadWarmupState()
  const allUrls = []
  let totalWallpapers = 0
  let newWallpapers = 0
  let alreadyWarmed = 0

  for (const seriesId of ['desktop', 'mobile', 'avatar']) {
    const wallpapers = loadLatestWallpapers(seriesId)
    totalWallpapers += wallpapers.length

    let seriesNew = 0
    for (const w of wallpapers) {
      const wallpaperId = w.id || w.filename || `${seriesId}-${w.thumbnailPath || w.thumbnailUrl}`
      if (state.warmedIds.has(wallpaperId)) {
        alreadyWarmed++
        continue
      }

      newWallpapers++
      seriesNew++
      const urls = buildWarmupUrls(w)
      allUrls.push(...urls.map(url => ({ url, id: wallpaperId })))
    }

    console.log(`   ${seriesId}: ${wallpapers.length} total, ${seriesNew} new, ${wallpapers.length - seriesNew} already warmed`)
  }

  if (allUrls.length === 0) {
    console.log(`\n   ✅ All ${totalWallpapers} wallpapers already warmed! No new images to warmup.`)
    console.log('\n🏁 CDN Warmup Done (skipped)\n')
    return
  }

  console.log(`\n   📊 ${newWallpapers} new wallpapers to warm (${allUrls.length} URLs)`)
  console.log(`   🚀 Warming primary CDN: ${PRIMARY_CDN}\n`)

  const { results, hitCount, missCount } = await warmupWithConcurrency(
    allUrls.map(u => u.url),
    CONCURRENCY,
  )

  const success = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok).length
  console.log(`\n   ✅ Primary CDN: ${success} success, ${failed} failed`)
  console.log(`   📊 Cache status: ${hitCount} HIT (already cached), ${missCount} MISS (newly cached)`)

  const warmedIds = new Set(state.warmedIds)
  for (const u of allUrls) {
    warmedIds.add(u.id)
  }
  saveWarmupState({ warmedIds })

  if (failed > 0) {
    const failedUrls = results.filter(r => !r.ok).map(r => r.url)
    await warmupFallbackCdn(failedUrls)
  }

  console.log(`\n   📝 Warmup state saved: ${warmedIds.size} total warmed images`)
  console.log('\n🏁 CDN Warmup Done\n')
}

main()
