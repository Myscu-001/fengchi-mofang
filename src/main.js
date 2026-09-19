import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initErrorMonitor } from './lib/monitor'
import { initNativeShell } from './lib/native'
import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 安装全局错误监控（Vue / window / Promise），线上报错会记录并可选上报
initErrorMonitor(app)

app.mount('#app')

// 装成安卓 App 时接管物理返回键（浏览器里这个函数直接返回，不做任何事）
initNativeShell(router)

// 注册 Service Worker：网络不稳时回退到缓存的页面外壳，避免断网白屏。
// 只在生产构建里注册 —— 开发时要避免 SW 把热更新缓存住。
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // 注册失败（隐私模式 / 非 HTTPS / 浏览器不支持）不影响正常使用
    })
  })
}
