// ========================================
// 政治分类黑名单（defense-in-depth 兜底过滤）
// ========================================
// 数据层会同步清理，但数据文件可能回退、浏览器/CDN 可能缓存旧数据，
// 前端在三个数据入口（系列索引 / 分类数据 / 最新切片）统一收敛，
// 确保黑名单分类与条目在任何情况下都不会进入 store 并被渲染。

// 黑名单分类名（精确命中，比较前会 trim）
export const BLOCKED_CATEGORIES = ['政治']

// 命中黑名单的文本形态：明文 + URL 编码（UTF-8 百分号编码，含大小写变体），从宽防御
const BLOCKED_TEXT_PATTERNS = (() => {
  const patterns = new Set()
  for (const name of BLOCKED_CATEGORIES) {
    patterns.add(name)
    const encoded = encodeURIComponent(name)
    patterns.add(encoded)
    patterns.add(encoded.toLowerCase())
  }
  return [...patterns]
})()

// 条目对象中参与检测的字符串字段
const BLOCKED_ITEM_STRING_FIELDS = [
  'category',
  'subcategory',
  'path',
  'filename',
  'id',
  'thumbnail',
  'thumbnailPath',
  'thumbnailUrl',
  'previewPath',
  'previewUrl',
  'originalUrl',
  'url',
  'downloadUrl',
  'playbackUrl',
  'title',
  'displayTitle',
  'copyright',
]

// 条目对象中参与检测的字符串数组字段
const BLOCKED_ITEM_ARRAY_FIELDS = ['keywords', 'tags']

/**
 * 任意文本是否命中黑名单（包含匹配，覆盖 URL 编码形态）
 */
export function isBlockedText(value) {
  if (typeof value !== 'string') {
    return false
  }

  const normalized = value.trim()
  if (!normalized) {
    return false
  }

  return BLOCKED_TEXT_PATTERNS.some(pattern => normalized.includes(pattern))
}

/**
 * 分类名是否命中黑名单（trim 后精确命中）
 */
export function isBlockedCategory(name) {
  if (typeof name !== 'string') {
    return false
  }

  return BLOCKED_CATEGORIES.includes(name.trim())
}

/**
 * 单个壁纸条目是否命中黑名单：
 * - item.category 精确命中黑名单分类名
 * - 或 path / filename / thumbnail / url 等字符串字段包含黑名单关键词（含 URL 编码形态）
 * - 或 keywords / tags 数组元素包含黑名单关键词
 */
export function isBlockedWallpaper(item) {
  if (!item || typeof item !== 'object') {
    return false
  }

  if (isBlockedCategory(item.category)) {
    return true
  }

  for (const field of BLOCKED_ITEM_STRING_FIELDS) {
    if (isBlockedText(item[field])) {
      return true
    }
  }

  for (const field of BLOCKED_ITEM_ARRAY_FIELDS) {
    const values = item[field]
    if (Array.isArray(values) && values.some(value => isBlockedText(value))) {
      return true
    }
  }

  return false
}

/**
 * 过滤分类数组：分类名精确命中，或 file / id 包含黑名单关键词的一律剔除
 */
export function filterBlockedCategories(categories) {
  if (!Array.isArray(categories)) {
    return categories
  }

  return categories.filter(category =>
    !isBlockedCategory(category?.name)
    && !isBlockedText(category?.file)
    && !isBlockedText(category?.id),
  )
}

/**
 * 过滤壁纸条目数组
 */
export function filterBlockedWallpapers(wallpapers) {
  if (!Array.isArray(wallpapers)) {
    return wallpapers
  }

  return wallpapers.filter(wallpaper => !isBlockedWallpaper(wallpaper))
}
