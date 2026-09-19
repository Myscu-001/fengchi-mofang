/**
 * iOS 风格「从左边缘右滑返回」。
 *
 * Capacitor 安卓已通过系统返回键 + @capacitor/app 的 backButton 处理；
 * iOS 的 WebView 没有系统级返回手势，这里补一个与原生一致的边缘侧滑。
 * 仅在触屏设备启用；用 passive 监听，绝不阻塞滚动或造成卡顿。
 */
import { platform } from '@/lib/platform'

const EDGE = 28 // 触发区域：屏幕左缘 28px 内起手才算「返回手势」
const THRESHOLD = 64 // 滑动超过该距离才真正返回，避免误触
const MAX_DY = 80 // 纵向位移过大则判定为滚动而非横滑

let startX = 0
let startY = 0
let tracking = false

function onStart(e) {
  if (e.touches.length !== 1) {
    tracking = false
    return
  }
  const t = e.touches[0]
  startX = t.clientX
  startY = t.clientY
  tracking = startX <= EDGE
}

function onMove(e) {
  if (!tracking) return
  const t = e.touches[0]
  const dx = t.clientX - startX
  const dy = t.clientY - startY
  if (Math.abs(dy) > Math.abs(dx) || Math.abs(dy) > MAX_DY) {
    tracking = false // 纵向主导 → 当作滚动，放弃返回手势
  } else if (dx > 4) {
    // 可选：给页面加一点左移跟手效果（此处仅做手势判定，不强制跟手渲染）
  }
}

function onEnd(e) {
  if (!tracking) return
  const t = e.changedTouches[0]
  const dx = t.clientX - startX
  if (dx > THRESHOLD && window.history.length > 1) {
    window.history.back()
  }
  tracking = false
}

export function initEdgeSwipeBack() {
  if (!platform.touch) return // 桌面 / 非触屏不启用
  window.addEventListener('touchstart', onStart, { passive: true })
  window.addEventListener('touchmove', onMove, { passive: true })
  window.addEventListener('touchend', onEnd, { passive: true })
}
