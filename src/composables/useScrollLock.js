/**
 * 滚动锁定 composable
 * 用于弹窗等场景，锁定背景滚动并在关闭时恢复原位置
 *
 * 方案：保存滚动位置 + body.style.top 固定 + modal-open class
 *
 * ⚠️ 锁定状态保存在**模块作用域**（而非组件实例）：
 * 同时可能有多个弹窗组件各自调用 useScrollLock()。若状态挂在实例上，
 * 两个组件各 lock() 一次就会在 body 已经是 position:fixed 的状态下
 * 二次采样 window.scrollY（读到 0），把 body.style.top 覆盖成 `-0px`，
 * 导致页面被钉在顶部、关闭后无法回到原位置。
 * 提到模块级后：只有「计数 0 → 1」时采样并固定，重复 lock() 只递增计数。
 */
import { onUnmounted, ref } from 'vue'

const MODAL_OPEN_CLASS = 'modal-open'

// 模块级共享状态：所有 useScrollLock() 实例共用同一份
let lockCount = 0
let savedScrollY = 0

/** 首次锁定：采样滚动位置并固定 body */
function applyLock() {
  savedScrollY = window.scrollY || window.pageYOffset || 0
  document.body.style.top = `-${savedScrollY}px`
  document.body.classList.add(MODAL_OPEN_CLASS)
}

/** 完全解锁：恢复 body 并回到首次采样时的滚动位置 */
function releaseLock() {
  document.body.classList.remove(MODAL_OPEN_CLASS)
  document.body.style.top = ''
  window.scrollTo({ top: savedScrollY, behavior: 'instant' })
  savedScrollY = 0
}

/**
 * 页面当前是否处于滚动锁定状态（弹窗打开）。
 * 供滚动监听等场景做跨组件守卫，避免依赖某个组件实例的局部状态。
 * @returns {boolean} 是否已锁定
 */
export function isPageScrollLocked() {
  return typeof document !== 'undefined'
    && !!document.body
    && document.body.classList.contains(MODAL_OPEN_CLASS)
}

export function useScrollLock() {
  const isLocked = ref(false)

  function lock() {
    // 同一实例重复 lock 保持幂等（避免只解锁一次却计数翻倍 → 永久锁死）
    if (isLocked.value)
      return
    // 仅在全局计数从 0 变 1 时真正锁定；已锁定则只递增计数，绝不重新采样
    if (lockCount === 0)
      applyLock()
    lockCount += 1
    isLocked.value = true
  }

  function unlock() {
    // 计数为 0 时直接返回，保证不会变成负数
    if (lockCount === 0)
      return
    lockCount -= 1
    // 仅在计数归零时真正解锁并恢复滚动位置
    if (lockCount === 0)
      releaseLock()
    isLocked.value = false
  }

  onUnmounted(() => {
    if (isLocked.value)
      unlock()
  })

  return { lock, unlock, isLocked }
}
