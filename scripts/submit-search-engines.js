import process from 'node:process'

const SITE_URL = process.env.SITE_URL || 'https://wall.202597.xyz'

const SUBMIT_URLS = [
  `${SITE_URL}/`,
  `${SITE_URL}/desktop/`,
  `${SITE_URL}/mobile/`,
  `${SITE_URL}/avatar/`,
  `${SITE_URL}/bing/`,
  `${SITE_URL}/about/`,
]

async function submitBaidu() {
  const token = process.env.BAIDU_PUSH_TOKEN
  if (!token) {
    console.log('⏭️  Baidu: BAIDU_PUSH_TOKEN not set, skipping')
    return
  }

  const site = new URL(SITE_URL).host
  const url = `http://data.zz.baidu.com/urls?site=${site}&token=${token}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: SUBMIT_URLS.join('\n'),
    })
    const data = await res.json()
    if (data.success !== undefined) {
      console.log(`✅ Baidu: submitted ${data.success} URLs, remaining ${data.remain}`)
    }
    else {
      console.log(`⚠️  Baidu: ${JSON.stringify(data)}`)
    }
  }
  catch (err) {
    console.log(`❌ Baidu: ${err.message}`)
  }
}

async function submitBingIndexNow() {
  const key = process.env.BING_INDEXNOW_KEY
  if (!key) {
    console.log('⏭️  Bing IndexNow: BING_INDEXNOW_KEY not set, skipping')
    return
  }

  const url = 'https://api.indexnow.org/IndexNow'
  const body = {
    host: new URL(SITE_URL).host,
    key,
    keyLocation: `${SITE_URL}/${key}.txt`,
    urlList: SUBMIT_URLS,
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      console.log(`✅ Bing IndexNow: submitted ${SUBMIT_URLS.length} URLs (status ${res.status})`)
    }
    else {
      const text = await res.text()
      console.log(`⚠️  Bing IndexNow: status ${res.status} - ${text}`)
    }
  }
  catch (err) {
    console.log(`❌ Bing IndexNow: ${err.message}`)
  }
}

async function submitBingWebmaster() {
  const apiKey = process.env.BING_WEBMASTER_API_KEY
  if (!apiKey) {
    console.log('⏭️  Bing Webmaster: BING_WEBMASTER_API_KEY not set, skipping')
    return
  }

  const siteUrl = SITE_URL
  const url = `https://ssl.bing.com/webmaster/api.svc/json/SubmitUrl?apikey=${apiKey}&siteUrl=${encodeURIComponent(siteUrl)}&url=${encodeURIComponent(SUBMIT_URLS[0])}`

  try {
    const res = await fetch(url)
    if (res.ok) {
      console.log(`✅ Bing Webmaster: submitted ${SUBMIT_URLS[0]}`)
    }
    else {
      const text = await res.text()
      console.log(`⚠️  Bing Webmaster: status ${res.status} - ${text}`)
    }
  }
  catch (err) {
    console.log(`❌ Bing Webmaster: ${err.message}`)
  }
}

async function pingGoogleSitemap() {
  const sitemapUrl = encodeURIComponent(`${SITE_URL}/sitemap.xml`)
  const url = `https://www.google.com/ping?sitemap=${sitemapUrl}`

  try {
    const res = await fetch(url)
    if (res.ok) {
      console.log(`✅ Google: sitemap pinged successfully`)
    }
    else {
      console.log(`⚠️  Google: sitemap ping status ${res.status}`)
    }
  }
  catch (err) {
    console.log(`❌ Google: ${err.message}`)
  }
}

async function main() {
  console.log(`\n🚀 Search Engine Submission`)
  console.log(`   Site: ${SITE_URL}`)
  console.log(`   URLs: ${SUBMIT_URLS.length}\n`)

  await Promise.allSettled([
    submitBaidu(),
    submitBingIndexNow(),
    submitBingWebmaster(),
    pingGoogleSitemap(),
  ])

  console.log('\n🏁 Done')
}

main()
