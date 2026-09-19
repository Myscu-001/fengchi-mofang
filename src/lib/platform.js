/**
 * 运行平台探测。
 *
 * 站点同时跑在「桌面浏览器 / 手机浏览器 / 装成 App（Capacitor 原生壳或加到主屏幕）」三种环境。
 * 这里把环境归一成一个对象，并在 <html> 上打 class，供只针对移动端 / App 的样式与逻辑生效，
 * 桌面端完全不受影响（满足「手机改动必须挂三把锁」的约束：这里用运行态锁 app-touch / app-installed）。
 */

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''

/** 判定操作系统：ios / android / web */
function detectOS() {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  // iPadOS 13+ 伪装成 Mac，但带触摸点
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'web'
}

/** 是否以「独立 App」形态运行：Capacitor 外壳 / PWA standalone / iOS 加到主屏幕 */
function detectInstalled() {
  if (document.documentElement.classList.contains('native-app')) return true
  // Capacitor 外壳：即使 display-mode 不是 standalone，也当作独立 App
  try {
    if (window.Capacitor?.isNativePlatform?.()) return true
  } catch {
    /* ignore */
  }
  if (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) return true
  if (navigator.standalone === true) return true // iOS 加到主屏幕的 webapp
  return false
}

/** 是否触屏设备（手机 / 平板），用于决定是否启用按压反馈、水波纹、侧滑返回 */
function detectTouch() {
  if (typeof window.matchMedia === 'function' && window.matchMedia('(hover: none) and (pointer: coarse)').matches) return true
  return 'ontouchstart' in window
}

/** 全局环境对象（非响应式即可，只用于 CSS 门控与逻辑开关） */
export const platform = {
  os: 'web',
  installed: false,
  touch: false,
}

export function initPlatform() {
  platform.os = detectOS()
  platform.installed = detectInstalled()
  platform.touch = detectTouch()

  const root = document.documentElement
  root.classList.add(`app-os-${platform.os}`)
  root.classList.toggle('app-installed', platform.installed)
  root.classList.toggle('app-touch', platform.touch)

  // 监听「显示模式」变化（如从浏览器切到主屏幕、或 PWA 安装后），同步 installed 状态
  if (typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(display-mode: standalone)')
    const onChange = () => {
      platform.installed = detectInstalled()
      root.classList.toggle('app-installed', platform.installed)
    }
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else if (mq.addListener) mq.addListener(onChange)
  }
}

export const isIOS = () => platform.os === 'ios'
export const isAndroid = () => platform.os === 'android'
export const isInstalled = () => platform.installed
export const isTouch = () => platform.touch
