import { computed, onUnmounted, ref } from 'vue'
import { isPageScrollLocked } from '@/composables/useScrollLock'

const INITIAL_PAGE_SIZE = 30
const PAGE_SIZE = 20
// 滚动自动加载的封顶数量：移动端全系列可达 800+ 张，
// 无封顶时文档高度超过 25 万 px、DOM 4 万+，会触发 iOS Safari
// WKWebView 长文档渲染缺陷（下拉到底内容消失并重载）。
const MAX_DISPLAY = 150

export function useGridPagination({ wallpapers }) {
  const displayCount = ref(INITIAL_PAGE_SIZE)
  const isLoadingMore = ref(false)

  // RAF 节流标记
  let scrollRafId = null
  let loadRafId = null

  const displayedItems = computed(() => wallpapers.value.slice(0, displayCount.value))

  const hasMoreData = computed(() =>
    displayCount.value < Math.min(MAX_DISPLAY, wallpapers.value.length),
  )

  function loadMore() {
    // 并发保护：上一次加载未完成 / 已无更多数据时直接跳过
    if (isLoadingMore.value || loadRafId !== null || !hasMoreData.value)
      return

    isLoadingMore.value = true

    loadRafId = requestAnimationFrame(() => {
      loadRafId = null
      displayCount.value = Math.min(displayCount.value + PAGE_SIZE, Math.min(MAX_DISPLAY, wallpapers.value.length))
      isLoadingMore.value = false
    })
  }

  // 手动「加载更多」：自动加载已封顶（MAX_DISPLAY），此处由用户主动展开，
  // 不再设硬上限，仅受数据总量约束
  function loadMoreManual() {
    displayCount.value = Math.min(displayCount.value + PAGE_SIZE, wallpapers.value.length)
  }

  function checkScroll() {
    scrollRafId = null

    // 弹窗打开时 body 变为 position:fixed，文档高度瞬间塌缩，
    // 滚动监听会误判「已触底」而白触发 loadMore —— 锁定期间直接跳过
    if (isPageScrollLocked())
      return

    if (isLoadingMore.value || !hasMoreData.value)
      return

    const scrollTop = window.scrollY || document.documentElement.scrollTop
    const windowHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight

    if (scrollTop + windowHeight >= documentHeight - 500) {
      loadMore()
    }
  }

  function handleScroll() {
    if (scrollRafId)
      return
    scrollRafId = requestAnimationFrame(checkScroll)
  }

  function resetDisplayCount() {
    cancelAnimationFrame(loadRafId)
    loadRafId = null
    isLoadingMore.value = false
    displayCount.value = INITIAL_PAGE_SIZE
  }

  onUnmounted(() => {
    cancelAnimationFrame(scrollRafId)
    cancelAnimationFrame(loadRafId)
  })

  return {
    displayCount,
    displayedItems,
    handleScroll,
    hasMoreData,
    isLoadingMore,
    loadMoreManual,
    resetDisplayCount,
  }
}

export { PAGE_SIZE }
