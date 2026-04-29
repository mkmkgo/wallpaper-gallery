import process from 'node:process'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = resolve(__dirname, '..')

const CDN_DOMAINS = ['cdn.jsdmirror.com', 'testingcf.jsdelivr.net', 'cdn.jsdelivr.net']
const PRIMARY_CDN = CDN_DOMAINS[0]

const CDN_VERSION = process.env.CDN_VERSION || 'v1.1.29'
const CDN_BASE = `https://${PRIMARY_CDN}/gh/mkmkgo/nuanXinProPic@${CDN_VERSION}`

const CONCURRENCY = 5
const WARMUP_TIMEOUT = 10000

function loadLatestPaths(seriesId) {
  try {
    const filePath = resolve(ROOT_DIR, `public/data/${seriesId}/latest.json`)
    const raw = readFileSync(filePath, 'utf-8')
    let data
    try {
      data = JSON.parse(raw)
    } catch {
      return []
    }
    const wallpapers = data.wallpapers || data || []
    return wallpapers.slice(0, 20).map((w) => {
      const paths = []
      if (w.thumbnailPath) paths.push(`${CDN_BASE}${w.thumbnailPath}`)
      else if (w.thumbnailUrl) paths.push(w.thumbnailUrl)
      if (w.previewPath) paths.push(`${CDN_BASE}${w.previewPath}`)
      else if (w.previewUrl) paths.push(w.previewUrl)
      return paths
    }).flat()
  } catch {
    return []
  }
}

async function warmupUrl(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), WARMUP_TIMEOUT)

  try {
    const res = await fetch(url, { signal: controller.signal, mode: 'cors' })
    clearTimeout(timer)
    return { url, ok: res.ok, status: res.status }
  } catch (err) {
    clearTimeout(timer)
    return { url, ok: false, status: 0, error: err.message }
  }
}

async function warmupWithConcurrency(urls, concurrency) {
  const results = []
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(batch.map(warmupUrl))
    results.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : { ok: false }))

    const success = results.filter(r => r.ok).length
    process.stdout.write(`\r   Progress: ${results.length}/${urls.length} (success: ${success})`)
  }
  console.log('')
  return results
}

async function warmupAllCdnDomains(primaryResults) {
  const failedUrls = primaryResults
    .filter(r => !r.ok)
    .map(r => r.url)

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
    const results = await warmupWithConcurrency(fallbackUrls, CONCURRENCY)
    const success = results.filter(r => r.ok).length
    console.log(`   ✅ ${domain}: ${success}/${fallbackUrls.length} warmed`)
  }
}

async function main() {
  console.log(`\n🔥 CDN Cache Warmup`)
  console.log(`   CDN Version: ${CDN_VERSION}`)
  console.log(`   Primary CDN: ${PRIMARY_CDN}`)
  console.log(`   Concurrency: ${CONCURRENCY}\n`)

  const allUrls = []
  for (const seriesId of ['desktop', 'mobile', 'avatar']) {
    const paths = loadLatestPaths(seriesId)
    console.log(`   ${seriesId}: ${paths.length} URLs from latest.json`)
    allUrls.push(...paths)
  }

  if (allUrls.length === 0) {
    console.log('\n   ⚠️  No URLs found, skipping warmup')
    return
  }

  console.log(`\n   🚀 Warming primary CDN: ${PRIMARY_CDN} (${allUrls.length} URLs)`)
  const results = await warmupWithConcurrency(allUrls, CONCURRENCY)

  const success = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok).length
  console.log(`\n   ✅ Primary CDN: ${success} warmed, ${failed} failed`)

  if (failed > 0) {
    await warmupAllCdnDomains(results)
  }

  console.log('\n🏁 CDN Warmup Done\n')
}

main()
