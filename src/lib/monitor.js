/**
 * 前端错误监控。
 *
 * 目标：线上发生报错时不再"悄无声息"。
 * - 捕获 Vue 组件错误、window 未捕获错误、未处理的 Promise 拒绝；
 * - 去重 + 节流，最多在本地保留最近 50 条（localStorage）；
 * - 可选：把错误通过 Webhook 推送到 企业微信 / 钉钉 / 飞书 群机器人，或通用 JSON 接口；
 * - 个人中心提供「诊断日志」查看与复制，方便反馈问题。
 *
 * 配置读取自 site_settings 的 `monitor.config`：
 *   { enabled: boolean, webhook: string, format: 'wecom' | 'dingtalk' | 'feishu' | 'generic' }
 */
import { getSetting } from '@/api/settings'

export const MONITOR_KEY = 'monitor.config'
const LS_KEY = 'fc.errorLogs'
const MAX_LOGS = 50
const DEDUP_WINDOW = 60000 // 同一错误 60 秒内只记录/上报一次
const SEND_INTERVAL = 15000 // 上报节流：最快每 15 秒一次

let config = { enabled: true, webhook: '', format: 'wecom' }
let lastSentAt = 0
const recent = new Map()

function readLogs() {
  try {
    const list = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function writeLogs(list) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, MAX_LOGS)))
  } catch {
    // localStorage 不可用（隐私模式等）时忽略
  }
}

export function listErrors() {
  return readLogs()
}

export function clearErrors() {
  writeLogs([])
}

export function getMonitorConfig() {
  return config
}

/** 启动时加载一次配置（失败则用默认：只本地记录，不上报） */
export async function loadMonitorConfig() {
  try {
    const c = await getSetting(MONITOR_KEY, null)
    if (c && typeof c === 'object') config = { ...config, ...c }
  } catch {
    // 使用默认配置
  }
  return config
}

function currentRoute() {
  try {
    return location.hash || location.pathname || ''
  } catch {
    return ''
  }
}

function shouldDedup(key) {
  const now = Date.now()
  const last = recent.get(key)
  if (last && now - last < DEDUP_WINDOW) return true
  recent.set(key, now)
  for (const [k, t] of recent) {
    if (now - t > DEDUP_WINDOW) recent.delete(k)
  }
  return false
}

function buildPayload(entry) {
  const text = [
    '【风驰系统】前端报错',
    '时间：' + entry.time,
    '页面：' + entry.route,
    '信息：' + entry.message,
    entry.info ? '位置：' + entry.info : '',
  ]
    .filter(Boolean)
    .join('\n')

  if (config.format === 'feishu') return { msg_type: 'text', content: { text } }
  if (config.format === 'dingtalk') return { msgtype: 'text', text: { content: text } }
  if (config.format === 'generic') return { type: 'frontend-error', ...entry }
  return { msgtype: 'text', text: { content: text } } // 默认企业微信
}

function report(entry) {
  if (!config.enabled || !config.webhook) return
  const now = Date.now()
  if (now - lastSentAt < SEND_INTERVAL) return
  lastSentAt = now
  try {
    fetch(config.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(entry)),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // 上报失败不影响业务
  }
}

/** 记录一条错误（对外统一入口） */
export function captureError(err, info = '') {
  try {
    const message = (err && (err.message || String(err))) || '未知错误'
    const stack = err && err.stack ? String(err.stack).split('\n').slice(0, 5).join('\n') : ''
    const key = message + '|' + info
    if (shouldDedup(key)) return
    const entry = {
      time: new Date().toLocaleString('zh-CN'),
      message: String(message).slice(0, 500),
      info: String(info).slice(0, 200),
      stack: stack.slice(0, 1200),
      route: currentRoute(),
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    }
    writeLogs([entry, ...readLogs()])
    report(entry)
  } catch {
    // 监控自身异常必须静默，避免递归
  }
}

/** 安装全局监听（main.js 中调用） */
export function initErrorMonitor(app) {
  loadMonitorConfig()

  if (app && app.config) {
    app.config.errorHandler = (err, _instance, info) => {
      // 保留控制台输出，便于本地调试
      console.error(err)
      captureError(err, 'vue:' + info)
    }
  }

  window.addEventListener('error', (event) => {
    // 资源加载失败（img/script）没有 error 对象，忽略以免噪音
    if (!event.error && !event.message) return
    captureError(event.error || new Error(event.message), 'window:error')
  })

  window.addEventListener('unhandledrejection', (event) => {
    captureError(event.reason || new Error('未处理的 Promise 拒绝'), 'promise')
  })
}
