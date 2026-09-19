/**
 * 原生外壳（Capacitor）适配。
 *
 * 站点既跑在浏览器里，也跑在 APK 外壳里；这里只做「装了 App 才需要」的事，
 * 浏览器的行为一点不改。@capacitor/app 用动态 import 引入，
 * 所以普通网页构建的产物里根本不会带上它。
 */

/** 是否运行在原生外壳里（浏览器里恒为 false；PWA 独立窗口也不算） */
export function isNativeApp() {
  try {
    return !!window.Capacitor?.isNativePlatform?.()
  } catch {
    return false
  }
}

/**
 * 接管安卓物理返回键。
 *
 * 默认行为是直接退出 App（哪怕正停在某个二级页面），体验很差。
 * 这里改成：有浏览历史就回退一页，已经在第一页才退出。
 * 同时在 <html> 上打一个 native-app 标记，方便只针对 App 写样式。
 */
export async function initNativeShell(router) {
  if (!isNativeApp()) return
  document.documentElement.classList.add('native-app')
  try {
    const { App } = await import('@capacitor/app')
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back()
      else App.exitApp()
    })
  } catch {
    // 插件缺失不影响使用，返回键退回系统默认行为
  }
}
