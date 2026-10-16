import { computed, onUnmounted, ref, watch } from 'vue'

/**
 * 渐进式图片加载 composable
 *
 * 策略：首帧先显示低清预览图（previewUrl / thumbnailUrl）秒出占位，
 * 同时在后台用 `new Image()` 加载高清原图；原图加载完成后再把 `src`
 * 切换为原图（**最终画质不变**）。关闭 / 卸载时调用 release() 清空 `src`
 * 并释放后台加载句柄，避免多张高清图（弹窗里常见 0.7–5MB 的 4K 原图）
 * 的解码结果持续占用内存而触发浏览器丢弃标签页。
 *
 * @param {object} options 配置
 * @param {() => string} options.preview 低清占位图 URL getter
 * @param {() => string} options.full 高清原图 URL getter（降级后可返回回退地址）
 * @param {() => boolean} [options.enabled] 是否允许加载（默认始终允许；弹窗可传 isOpen）
 * @param {() => void} [options.onFullError] 高清图加载失败回调（用于触发降级）
 * @returns {{ displaySrc: import('vue').ComputedRef<string>, isFullLoaded: import('vue').Ref<boolean>, load: () => void, release: () => void }} 渐进式加载状态与操作
 */
export function useProgressiveImage({ preview, full, enabled, onFullError }) {
  const isFullLoaded = ref(false)
  const released = ref(false)
  let loader = null
  let lastRequestedUrl = ''

  const previewUrl = computed(() => normalize(preview))
  const fullUrl = computed(() => normalize(full))

  // 优先展示低清占位，原图就绪后再切换；release 后清空 src
  const displaySrc = computed(() => {
    if (released.value)
      return ''
    if (!isFullLoaded.value && previewUrl.value)
      return previewUrl.value
    return fullUrl.value
  })

  function disposeLoader() {
    if (!loader)
      return
    loader.onload = null
    loader.onerror = null
    loader = null
  }

  function load() {
    const url = fullUrl.value
    if (!url)
      return
    if (typeof enabled === 'function' && !enabled())
      return
    // 同一 URL 且未释放：已在加载或已就绪 → 跳过，避免重复请求
    if (!released.value && url === lastRequestedUrl && (loader !== null || isFullLoaded.value))
      return

    disposeLoader()
    isFullLoaded.value = false
    released.value = false
    lastRequestedUrl = url
    if (typeof Image === 'undefined')
      return

    const img = new Image()
    loader = img
    img.onload = () => {
      if (loader !== img)
        return
      loader = null
      isFullLoaded.value = true
    }
    img.onerror = (event) => {
      if (loader !== img)
        return
      loader = null
      if (typeof onFullError === 'function')
        onFullError(event)
    }
    img.src = url
  }

  /** 释放：取消后台句柄并清空 src，交由 GC 回收解码结果 */
  function release() {
    disposeLoader()
    isFullLoaded.value = false
    released.value = true
  }

  // 原图 URL 变化（含降级到回退地址）时自动重新加载
  watch(fullUrl, () => load())

  onUnmounted(release)

  return { displaySrc, isFullLoaded, load, release }
}

function normalize(getter) {
  if (typeof getter !== 'function')
    return ''
  return getter() || ''
}
