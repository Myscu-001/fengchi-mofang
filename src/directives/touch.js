/**
 * 触控反馈指令。
 *
 * v-feedback：统一给按钮 / 列表项 / Tab 等可点元素加上「原生感」交互反馈：
 *   - 所有触屏：按下时轻微缩放（iOS / Android 共通的下压手感）
 *   - Android：额外叠加 Material 水波纹（ripple）
 * 桌面鼠标环境自动 no-op，完全不影响网页端。
 *
 * 实现上：缩放靠 CSS（.fc-pressable:active），水波纹靠 JS 在按下点生成一个扩散圆。
 */
import { platform } from '@/lib/platform'

/** 在按下点生成一个 Material 风格水波纹 */
function spawnRipple(el, e) {
  const rect = el.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 2
  const x = (e.clientX ?? rect.left + rect.width / 2) - rect.left - size / 2
  const y = (e.clientY ?? rect.top + rect.height / 2) - rect.top - size / 2

  const ripple = document.createElement('span')
  ripple.className = 'fc-ripple'
  ripple.style.width = `${size}px`
  ripple.style.height = `${size}px`
  ripple.style.left = `${x}px`
  ripple.style.top = `${y}px`

  // 确保宿主能裁剪水波纹到圆角内
  const cs = getComputedStyle(el)
  if (cs.position === 'static') el.style.position = 'relative'
  if (cs.overflow === 'visible') el.style.overflow = 'hidden'

  el.appendChild(ripple)
  ripple.addEventListener('animationend', () => ripple.remove())
}

export const feedback = {
  mounted(el) {
    if (!platform.touch) return // 桌面不启用
    el.classList.add('fc-pressable')
    if (platform.os === 'android') {
      el.classList.add('fc-ripple-host')
      const handler = (e) => {
        if (e.pointerType === 'mouse') return
        spawnRipple(el, e)
      }
      el.__fbRipple = handler
      el.addEventListener('pointerdown', handler)
    }
  },
  unmounted(el) {
    if (el.__fbRipple) el.removeEventListener('pointerdown', el.__fbRipple)
    el.classList.remove('fc-pressable', 'fc-ripple-host')
  },
}

/** 全局注册指令：使用时写 v-feedback */
export function registerTouchDirectives(app) {
  app.directive('feedback', feedback)
}
