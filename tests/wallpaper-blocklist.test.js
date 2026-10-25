import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { decodeDataWithWorker } from '../src/services/wallpaper/decoder.js'
import { fetchWithRetry } from '../src/services/wallpaper/fetch.js'
import { loadHotTags } from '../src/services/hotTagsService.js'
import { useWallpaperStore } from '../src/stores/wallpaper.js'
import {
  BLOCKED_CATEGORIES,
  filterBlockedCategories,
  filterBlockedWallpapers,
  isBlockedCategory,
  isBlockedText,
  isBlockedWallpaper,
} from '../src/utils/wallpaper/blocklist.js'

vi.mock('../src/services/wallpaper/fetch.js', () => ({ fetchWithRetry: vi.fn(), delay: vi.fn() }))
vi.mock('../src/services/wallpaper/decoder.js', () => ({ decodeDataWithWorker: vi.fn() }))

const response = data => ({ json: async () => data })
const item = (series, title) => ({
  id: `${series}-${title}`,
  filename: `${title}.jpg`,
  path: `/wallpaper/${series}/${title}.jpg`,
  createdAt: '2026-10-10T00:00:00Z',
  format: 'JPG',
})

describe('政治黑名单模块', () => {
  it('黑名单分类名 trim 后精确命中', () => {
    expect(BLOCKED_CATEGORIES).toEqual(['政治'])
    expect(isBlockedCategory('政治')).toBe(true)
    expect(isBlockedCategory(' 政治 ')).toBe(true)
    expect(isBlockedCategory('风景')).toBe(false)
    expect(isBlockedCategory('政治宣传')).toBe(false)
    expect(isBlockedCategory(undefined)).toBe(false)
  })

  it('文本检测覆盖明文与 URL 编码形态（含大小写变体）', () => {
    expect(isBlockedText('政治')).toBe(true)
    expect(isBlockedText(' 政治 ')).toBe(true)
    expect(isBlockedText('%E6%94%BF%E6%B2%BB')).toBe(true)
    expect(isBlockedText('%e6%94%bf%e6%b2%bb')).toBe(true)
    expect(isBlockedText('/thumbnail/desktop/%E6%94%BF%E6%B2%BB/1.webp')).toBe(true)
    expect(isBlockedText('风景')).toBe(false)
    expect(isBlockedText(null)).toBe(false)
  })

  it('条目 category 精确命中黑名单即屏蔽', () => {
    expect(isBlockedWallpaper({ filename: 'a.jpg', category: '政治' })).toBe(true)
    expect(isBlockedWallpaper({ filename: 'a.jpg', category: '风景' })).toBe(false)
  })

  it('条目字符串字段包含黑名单关键词（含 URL 编码）即屏蔽', () => {
    expect(isBlockedWallpaper({ filename: 'ok.jpg', path: '/wallpaper/desktop/政治.jpg' })).toBe(true)
    expect(isBlockedWallpaper({ filename: 'ok.jpg', thumbnail: '/thumbnail/desktop/%E6%94%BF%E6%B2%BB/a.webp' })).toBe(true)
    expect(isBlockedWallpaper({ filename: 'ok.jpg', originalUrl: 'https://cdn.example.com/政治/a.jpg' })).toBe(true)
    expect(isBlockedWallpaper({ filename: 'ok.jpg', title: '政治宣传画' })).toBe(true)
    expect(isBlockedWallpaper({ filename: 'ok.jpg', category: '风景', tags: ['风景', '政治'] })).toBe(true)
    expect(isBlockedWallpaper({ filename: 'ok.jpg', category: '风景', keywords: ['山脉'] })).toBe(false)
    expect(isBlockedWallpaper(null)).toBe(false)
  })

  it('数组过滤工具剔除黑名单分类与条目', () => {
    const categories = [
      { name: '风景', file: '风景.json' },
      { name: '政治', file: '政治.json' },
      { name: '动物', file: '动物.json' },
    ]
    expect(filterBlockedCategories(categories).map(c => c.name)).toEqual(['风景', '动物'])
    expect(filterBlockedWallpapers([item('desktop', 'ok'), { ...item('desktop', 'bad'), category: '政治' }])
      .map(w => w.filename)).toEqual(['ok.jpg'])
  })
})

describe('store 数据入口黑名单过滤', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(fetchWithRetry).mockReset()
    vi.mocked(decodeDataWithWorker).mockReset()
  })

  it('系列索引中的黑名单分类被过滤，且不会请求对应分类文件', async () => {
    vi.mocked(fetchWithRetry).mockImplementation(async (url) => {
      if (url.includes('index.json'))
        return response({ total: 3, blob: 'encoded' })
      return response({ wallpapers: [item('desktop', 'ok')] })
    })
    vi.mocked(decodeDataWithWorker).mockResolvedValue([
      { id: '风景', name: '风景', file: '风景.json' },
      { id: '政治', name: '政治', file: '政治.json' },
      { id: '动物', name: '动物', file: '动物.json' },
    ])

    const store = useWallpaperStore()
    await store.initSeries('desktop')

    expect(store.getSeriesCategories('desktop').map(c => c.name)).toEqual(['风景', '动物'])
    const urls = vi.mocked(fetchWithRetry).mock.calls.map(([url]) => url)
    expect(urls.some(url => url.includes('政治'))).toBe(false)
  })

  it('解码失败回退原始 categories 时，黑名单分类同样被过滤', async () => {
    vi.mocked(fetchWithRetry).mockImplementation(async (url) =>
      url.includes('index.json')
        ? response({ total: 2, blob: 'encoded', categories: [{ name: '风景', file: '风景.json' }, { name: '政治', file: '政治.json' }] })
        : response({ wallpapers: [item('desktop', 'ok')] }))
    vi.mocked(decodeDataWithWorker).mockRejectedValue(new Error('decode failed'))

    const store = useWallpaperStore()
    await store.initSeries('desktop')

    expect(store.getSeriesCategories('desktop').map(c => c.name)).toEqual(['风景'])
  })

  it('分类数据中的黑名单条目被过滤，缓存中同样是过滤结果', async () => {
    vi.mocked(fetchWithRetry).mockImplementation(async (url) => {
      if (url.includes('index.json'))
        return response({ total: 1, blob: 'encoded' })
      return response({
        wallpapers: [
          item('desktop', 'ok'),
          { ...item('desktop', 'bad-category'), category: '政治' },
          { ...item('desktop', 'bad-path'), path: '/wallpaper/desktop/政治宣传.jpg' },
        ],
      })
    })
    vi.mocked(decodeDataWithWorker).mockResolvedValue([{ name: '风景', file: '风景.json' }])

    const store = useWallpaperStore()
    const list = await store.loadCategory('desktop', '风景.json')
    expect(list.map(w => w.filename)).toEqual(['ok.jpg'])

    const calls = vi.mocked(fetchWithRetry).mock.calls.length
    const cached = await store.loadCategory('desktop', '风景.json')
    expect(cached.map(w => w.filename)).toEqual(['ok.jpg'])
    expect(vi.mocked(fetchWithRetry).mock.calls.length).toBe(calls)
  })

  it('最新切片中的黑名单条目被过滤', async () => {
    vi.mocked(fetchWithRetry).mockResolvedValue(response({
      wallpapers: [
        item('desktop', 'ok'),
        { ...item('desktop', 'bad'), category: '政治' },
      ],
    }))

    const store = useWallpaperStore()
    const latest = await store.loadSeriesLatest('desktop')
    expect(latest.map(w => w.filename)).toEqual(['ok.jpg'])
  })

  it('Bing 年度数据中的黑名单条目被过滤', async () => {
    const year = new Date().getFullYear()
    vi.mocked(fetchWithRetry).mockImplementation(async (url) =>
      url.includes('index.json')
        ? response({ years: [{ year, file: `${year}.json` }] })
        : response({
          items: [
            { date: `${year}-10-01`, title: '森林', urlbase: '/th?id=OHR.Forest' },
            { date: `${year}-10-02`, title: '政治宣传画', urlbase: '/th?id=OHR.Politics' },
          ],
        }))

    const store = useWallpaperStore()
    await store.initSeries('bing')

    expect(store.wallpapers.map(w => w.title)).toEqual(['森林'])
  })
})

describe('热门标签服务黑名单过滤', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('黑名单标签整体剔除，标签内预览条目同样过滤', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tags: [
          {
            tag: '风景',
            topWallpapers: [
              { filename: 'ok.jpg', thumbnail: '/thumbnail/desktop/ok.webp' },
              { filename: 'bad.jpg', thumbnail: '/thumbnail/desktop/政治/bad.webp' },
            ],
          },
          { tag: '政治', topWallpapers: [{ filename: 'x.jpg' }] },
        ],
      }),
    }))

    const tags = await loadHotTags('desktop')
    expect(tags.map(t => t.tag)).toEqual(['风景'])
    expect(tags[0].topWallpapers.map(w => w.filename)).toEqual(['ok.jpg'])
  })
})
