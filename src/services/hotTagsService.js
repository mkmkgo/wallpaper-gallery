import { filterBlockedWallpapers, isBlockedText } from '@/utils/wallpaper/blocklist'

const HOT_TAGS_BASE_URL = '/data/stats'

export async function loadHotTags(series = 'all') {
  if (series === 'video') {
    return []
  }

  try {
    const response = await fetch(`${HOT_TAGS_BASE_URL}/hot-tags-${series}.json`, { cache: 'no-cache' })
    if (!response.ok) {
      if (response.status === 404) {
        return []
      }
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    if (!Array.isArray(data?.tags)) {
      return []
    }

    // 兜底过滤：黑名单标签整体剔除，标签内预览壁纸同样过滤
    return data.tags
      .filter(tag => !isBlockedText(tag?.tag))
      .map((tag) => {
        if (!Array.isArray(tag?.topWallpapers)) {
          return tag
        }
        return { ...tag, topWallpapers: filterBlockedWallpapers(tag.topWallpapers) }
      })
  }
  catch (error) {
    console.error(`[HotTagsService] 加载热门标签失败: ${series}`, error)
    return []
  }
}
