import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initErrorMonitor } from './lib/monitor'
import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 安装全局错误监控（Vue / window / Promise），线上报错会记录并可选上报
initErrorMonitor(app)

app.mount('#app')
