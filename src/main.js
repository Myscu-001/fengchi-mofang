import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initErrorMonitor } from './lib/monitor'
import { initNativeShell } from './lib/native'
import { initPlatform } from './lib/platform'
import { initEdgeSwipeBack } from './lib/gesture'
import { registerTouchDirectives } from './directives/touch'
import './style.css'
import './styles/mobile-native.css'
import './styles/app-workbench.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 全局触控反馈指令（v-feedback）：触屏才生效，桌面自动 no-op
registerTouchDirectives(app)

// 安装全局错误监控（Vue / window / Promise），线上报错会记录并可选上报
initErrorMonitor(app)

// 探测运行环境（iOS/Android/网页、是否装成 App、是否触屏），在挂载前打好 <html> class，
// 这样只针对移动端 / App 的样式与手势能立即生效，且桌面端完全不受影响。
initPlatform()

app.mount('#app')

// 装成安卓 App 时接管物理返回键（浏览器里这个函数直接返回，不做任何事）
initNativeShell(router)

// iOS 风格左边缘右滑返回（仅触屏启用，桌面忽略）
initEdgeSwipeBack()

/* 版本自愈：不管 Service Worker 有没有更新、Webview 缓存多顽固，只要线上有了新版就拉回来。
   做法：每次启动用 no-store 拉一次 version.json，跟本机记录的 build 号比 —— 不一样说明
   站在我这个 App 里的还是旧包，于是清缓存并重新加载。整个动作每次会话最多一次。 */
async function checkNewVersion() {
  try {
    const KEY = 'fc-app-build'
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?_=${Date.now()}`, {
      cache: 'no-store',
    })
    if (!res.ok) return
    const { build } = await res.json()
    const known = localStorage.getItem(KEY)
    localStorage.setItem(KEY, String(build))
    if (known && known !== String(build)) {
      const sw = navigator.serviceWorker?.controller
      if (sw) sw.postMessage('clear-cache')
      else window.location.reload()
    }
  } catch {
    // 拉不到就当作没更新，正常使用
  }
}
checkNewVersion()

// 注册 Service Worker：网络不稳时回退到缓存的页面外壳，避免断网白屏。
// 只在生产构建里注册 —— 开发时要避免 SW 把热更新缓存住。
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((reg) => {
        /* 网站发新版后（sw.js 内容变了 / 代次变了），浏览器会装一个新 SW。
           老 SW 还占着页面时，新 SW 处于 waiting —— 这里直接放行并重载，
           保证打开 App 看到的永远是最新的界面。每次会话只重载一次，避免来回抖。 */
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing
          if (!worker) return
          worker.addEventListener('statechange', () => {
            if (worker.state !== 'installed') return
            if (!navigator.serviceWorker.controller) return
            if (sessionStorage.getItem('fc-sw-reloaded')) return
            sessionStorage.setItem('fc-sw-reloaded', '1')
            worker.postMessage('skip-waiting')
            // 稍等一拍，让新 SW 接管完成后再刷新，否则还会拿到旧资源
            setTimeout(() => window.location.reload(), 300)
          })
        })
      })
      .catch(() => {
        // 注册失败（隐私模式 / 非 HTTPS / 浏览器不支持）不影响正常使用
      })
  })
}
