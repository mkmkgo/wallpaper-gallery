import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  loadStaticStats,
  loadStatsFromSupabase,
} from '@/services/statsService'

export const usePopularityStore = defineStore('popularity', () => {
  const statsMap = ref(new Map())

  const viewDownloadOverrides = ref(new Map())

  const likeCollectOverrides = ref(new Map())

  // 加载状态
  const loading = ref(false)

  // 当前加载的系列
  const currentSeries = ref('')
  let requestVersion = 0

  // ========================================
  // Getters
  // ========================================

  // 热门数据（按浏览量排序的数组）
  const allTimeData = computed(() => {
    const entries = Array.from(statsMap.value.entries())
    return entries
      .map(([imageId, stats]) => {
        const views = stats.views || 0
        const downloads = stats.downloads || 0
        return {
          filename: imageId,
          image_id: imageId,
          view_count: views,
          download_count: downloads,
          popularity_score: views + downloads * 2,
        }
      })
      .sort((a, b) => b.popularity_score - a.popularity_score)
  })

  // 热门数据 Map（用于快速查找）
  const popularityMap = computed(() => {
    const map = new Map()
    allTimeData.value.forEach((item, index) => {
      map.set(item.filename, {
        rank: index + 1,
        score: item.popularity_score,
        downloads: item.download_count,
        views: item.view_count,
      })
    })
    return map
  })

  // 兼容旧 API：weeklyMap 和 monthlyMap 返回相同数据
  const weeklyMap = computed(() => popularityMap.value)
  const monthlyMap = computed(() => popularityMap.value)

  // 是否有热门数据
  const hasData = computed(() => statsMap.value.size > 0)

  // ========================================
  // Actions
  // ========================================

  /**
   * 获取指定文件的热门排名
   */
  function getPopularRank(filename) {
    return popularityMap.value.get(filename)?.rank || 0
  }

  /**
   * 获取指定文件的下载次数
   */
  function getDownloadCount(filename) {
    const base = statsMap.value.get(filename)?.downloads || 0
    const delta = viewDownloadOverrides.value.get(filename)?.downloads || 0
    return Math.max(0, base + delta)
  }

  function getViewCount(filename) {
    const base = statsMap.value.get(filename)?.views || 0
    const delta = viewDownloadOverrides.value.get(filename)?.views || 0
    return Math.max(0, base + delta)
  }

  /**
   * 获取指定文件的点赞数（静态基准 + 乐观增量）
   */
  function getLikeCount(filename) {
    const base = statsMap.value.get(filename)?.likes || 0
    const delta = likeCollectOverrides.value.get(filename)?.likes || 0
    return Math.max(0, base + delta)
  }

  /**
   * 获取指定文件的收藏数（静态基准 + 乐观增量）
   */
  function getCollectCount(filename) {
    const base = statsMap.value.get(filename)?.collects || 0
    const delta = likeCollectOverrides.value.get(filename)?.collects || 0
    return Math.max(0, base + delta)
  }

  /**
   * 乐观更新点赞计数 (+1/-1)
   */
  function adjustLikeCount(filename, delta) {
    const current = likeCollectOverrides.value.get(filename) || { likes: 0, collects: 0 }
    const newMap = new Map(likeCollectOverrides.value)
    newMap.set(filename, { ...current, likes: current.likes + delta })
    likeCollectOverrides.value = newMap
  }

  function adjustCollectCount(filename, delta) {
    const current = likeCollectOverrides.value.get(filename) || { likes: 0, collects: 0 }
    const newMap = new Map(likeCollectOverrides.value)
    newMap.set(filename, { ...current, collects: current.collects + delta })
    likeCollectOverrides.value = newMap
  }

  function adjustViewCount(filename, delta = 1) {
    const current = viewDownloadOverrides.value.get(filename) || { views: 0, downloads: 0 }
    const newMap = new Map(viewDownloadOverrides.value)
    newMap.set(filename, { ...current, views: current.views + delta })
    viewDownloadOverrides.value = newMap
  }

  function adjustDownloadCount(filename, delta = 1) {
    const current = viewDownloadOverrides.value.get(filename) || { views: 0, downloads: 0 }
    const newMap = new Map(viewDownloadOverrides.value)
    newMap.set(filename, { ...current, downloads: current.downloads + delta })
    viewDownloadOverrides.value = newMap
  }

  /**
   * 加载热门数据
   * @param {string} series - 系列名称
   * @param {boolean} forceRefresh - 是否强制刷新
   */
  async function fetchPopularityData(series, forceRefresh = false) {
    // 如果已加载且不强制刷新，直接返回
    if (!forceRefresh && currentSeries.value === series && hasData.value) {
      return
    }

    const currentRequestVersion = ++requestVersion
    loading.value = true
    currentSeries.value = series

    try {
      // 优先从静态文件加载
      let data = await loadStaticStats(series, forceRefresh)

      // 如果静态文件为空，尝试从 Supabase 加载（降级方案）
      if (data.size === 0) {
        if (import.meta.env.DEV) {
          console.log(`[PopularityStore] 静态文件为空，尝试从 Supabase 加载: ${series}`)
        }
        data = await loadStatsFromSupabase(series, 500)
      }

      if (currentRequestVersion !== requestVersion) {
        return
      }

      statsMap.value = data

      likeCollectOverrides.value = new Map()
      viewDownloadOverrides.value = new Map()

      if (import.meta.env.DEV) {
        console.log(`[PopularityStore] 加载完成: ${series}, ${data.size} 条数据`)
      }
    }
    catch (err) {
      if (currentRequestVersion !== requestVersion) {
        return
      }

      console.error('[PopularityStore] 加载热门数据失败:', err)
      statsMap.value = new Map()
    }
    finally {
      if (currentRequestVersion === requestVersion) {
        loading.value = false
      }
    }
  }

  /**
   * 清除热门数据
   */
  function clearData() {
    requestVersion++
    statsMap.value = new Map()
    likeCollectOverrides.value = new Map()
    viewDownloadOverrides.value = new Map()
    currentSeries.value = ''
  }

  return {
    statsMap,
    loading,
    currentSeries,
    allTimeData,
    popularityMap,
    weeklyMap,
    monthlyMap,
    hasData,
    fetchPopularityData,
    getPopularRank,
    getDownloadCount,
    getViewCount,
    getLikeCount,
    getCollectCount,
    adjustLikeCount,
    adjustCollectCount,
    adjustViewCount,
    adjustDownloadCount,
    clearData,
  }
})
