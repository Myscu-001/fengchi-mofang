/**
 * 原生外壳（Capacitor）适配层。
 *
 * 站点既跑在浏览器里，也跑在 APK 外壳里；这里只做「装了 App 才需要」的事，
 * 浏览器的行为一点不改。@capacitor/app 用动态 import 引入，
 * 所以普通网页构建的产物里根本不会带上它。
 */

/** 远端版本清单：App 内「检查更新」比对用的数据源（随站点一起部署到 GitHub Pages） */
const UPDATE_MANIFEST_URL = 'https://myscu-001.github.io/fengchi-mofang/version.json'

/** 默认下载页（仓库 Release 固定链接，手机免登录） */
const DEFAULT_APK_URL = 'https://github.com/Myscu-001/fengchi-mofang/releases/tag/apk-latest'

/** 是否运行在原生外壳里（浏览器里恒为 false；PWA 独立窗口也不算） */
export function isNativeApp() {
  try {
    return !!window.Capacitor?.isNativePlatform?.()
  } catch {
    return false
  }
}

/**
 * 接管安卓物理返回键 + 自动检查更新。
 *
 * 默认返回键行为是直接退出 App（哪怕正停在某个二级页面），体验很差。
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
  // 装成独立 App 后，自动检查是否有新版本可更新
  notifyUpdateIfNeeded()
}

/** 读取原生 App 的版本信息（version=显示版本，build=构建号 / versionCode） */
export async function getAppInfo() {
  if (!isNativeApp()) return null
  try {
    const { App } = await import('@capacitor/app')
    const info = await App.getInfo()
    return { id: info.id, name: info.name, version: info.version, build: info.build }
  } catch {
    return null
  }
}

/**
 * 检查远端版本清单，判断当前安装包是否需要更新。
 * 主要用于 bundled（离线包）模式：online 模式页面走线上、永远最新，
 * 其 build 与远端清单一致，因此不会误报。
 */
export async function checkAppUpdate() {
  const info = await getAppInfo()
  if (!info) return { updateAvailable: false }
  try {
    const res = await fetch(UPDATE_MANIFEST_URL, { cache: 'no-store' })
    if (!res.ok) return { updateAvailable: false }
    const remote = await res.json()
    const localBuild = parseInt(String(info.build), 10) || 0
    const remoteBuild = parseInt(String(remote.build), 10) || 0
    return {
      updateAvailable: remoteBuild > localBuild,
      latestVersion: remote.version || '',
      latestBuild: remote.build,
      url: remote.apk || DEFAULT_APK_URL,
    }
  } catch {
    return { updateAvailable: false }
  }
}

/** 有更新时，在页面顶部展示一个不打断操作的提示条，点击跳转下载。 */
export async function notifyUpdateIfNeeded() {
  const result = await checkAppUpdate()
  if (!result.updateAvailable) return
  if (document.getElementById('app-update-banner')) return
  const banner = document.createElement('div')
  banner.id = 'app-update-banner'
  banner.setAttribute('role', 'alert')
  banner.textContent = `发现新版本 v${result.latestVersion}，点击更新`
  banner.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:9999',
    'padding:10px 16px', 'text-align:center', 'cursor:pointer',
    'font-size:14px', 'color:#fff', 'background:#E8564F',
    'box-shadow:0 2px 8px rgba(0,0,0,.2)',
  ].join(';')
  banner.addEventListener('click', () => {
    window.open(result.url, '_blank')
  })
  document.body.appendChild(banner)
}
