// ========================================
// 政治分类黑名单（defense-in-depth 兜底过滤）
// ========================================
// 数据层会同步清理，但数据文件可能回退、浏览器/CDN 可能缓存旧数据，
// 前端在三个数据入口（系列索引 / 分类数据 / 最新切片）统一收敛，
// 确保黑名单分类与条目在任何情况下都不会进入 store 并被渲染。

// 黑名单分类名（精确命中，比较前会 trim）
export const BLOCKED_CATEGORIES = ['政治']

// 黑名单子分类（2026-11-19）：爱国主题整体禁止（插画/创意下的三级目录）
export const BLOCKED_SUBCATEGORIES = ['爱国主题']

// 黑名单关键词（2026-11-19）：国家象征 / 政党政治 / 领袖人物 / 爱国军事主题。
// 与小程序 config/index.js 的 BLOCKED_KEYWORDS、studio compliance/policy.js 同源。
// 只用完整词组；刻意不收「将军」「士兵」「红色」这类宽泛词，避免误伤
// 「雷电将军」「古装将军」「红色旗袍」等正常内容。
export const BLOCKED_KEYWORDS = [
  '天安门',
  '国旗',
  '五星红旗',
  '国徽',
  '党旗',
  '党徽',
  '国歌',
  '义勇军进行曲',
  '人民大会堂',
  '中南海',
  '人民英雄纪念碑',
  '红旗',
  '红色旗帜',
  '政治',
  '政党',
  '共产党',
  '中共',
  '党建',
  '党员',
  '党支部',
  '共青团',
  '少先队',
  '马克思主义',
  '社会主义',
  '毛泽东思想',
  '邓小平理论',
  '三个代表',
  '中国梦',
  '伟大复兴',
  '领袖',
  '总书记',
  '主席',
  '毛泽东',
  '毛主席',
  '周恩来',
  '朱德',
  '刘少奇',
  '邓小平',
  '江泽民',
  '胡锦涛',
  '习近平',
  '革命先烈',
  '先烈',
  '烈士',
  '爱国',
  '爱国主义',
  '祖国',
  '国庆',
  '阅兵',
  '建军',
  '建党',
  '抗战',
  '抗日',
  '革命',
  '红军',
  '长征',
  '解放军',
  '军人',
  '万岁',
  '为人民服务',
  '强国有我',
  '请党放心',
  '红领巾',
  '升旗',
  '铁锤镰刀',
  '红星',
]

// 命中黑名单的文本形态：明文 + URL 编码（UTF-8 百分号编码，含大小写变体），从宽防御。
// 分类名与关键词都要覆盖编码形态——数据里的 path 有明文也有编码两种写法。
const BLOCKED_TEXT_PATTERNS = (() => {
  const patterns = new Set()
  const add = (name) => {
    patterns.add(name)
    const encoded = encodeURIComponent(name)
    patterns.add(encoded)
    patterns.add(encoded.toLowerCase())
  }
  for (const name of [...BLOCKED_CATEGORIES, ...BLOCKED_SUBCATEGORIES, ...BLOCKED_KEYWORDS]) {
    add(name)
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
  'description',
  'copyright',
]

// 条目对象中参与检测的字符串数组字段
const BLOCKED_ITEM_ARRAY_FIELDS = ['keywords', 'tags']

// 防误伤放行词：检测前先剥离，避免「红色旗袍」被「红旗」误杀
const ALLOW_PHRASES = ['红旗袍']

/**
 * 任意文本是否命中黑名单（包含匹配，覆盖 URL 编码形态）
 */
export function isBlockedText(value) {
  if (typeof value !== 'string') {
    return false
  }

  // 先剥离放行词，再判定剩余内容（allowlist 优先）
  let normalized = value.trim()
  if (!normalized) {
    return false
  }
  for (const phrase of ALLOW_PHRASES) {
    if (normalized.includes(phrase)) {
      normalized = normalized.split(phrase).join('')
    }
  }
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
 * 子分类名是否命中黑名单（trim 后包含命中，兼容「爱国主题/xxx」写法）
 */
export function isBlockedSubcategory(name) {
  if (typeof name !== 'string') {
    return false
  }

  const normalized = name.trim()
  if (!normalized) {
    return false
  }

  return BLOCKED_SUBCATEGORIES.some(blocked => normalized === blocked || normalized.includes(blocked))
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

  if (isBlockedSubcategory(item.subcategory)) {
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
