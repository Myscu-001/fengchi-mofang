/** 通用格式化工具 */

function pad(n) {
  return String(n).padStart(2, '0')
}

export function parseDate(value) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDate(value, fallback = '—') {
  const d = parseDate(value)
  if (!d) return fallback
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatDateTime(value, fallback = '—') {
  const d = parseDate(value)
  if (!d) return fallback
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatTime(value, fallback = '—') {
  if (!value) return fallback
  const parts = String(value).split(':')
  if (parts.length < 2) return String(value)
  return `${parts[0]}:${parts[1]}`
}

export function relativeTime(value) {
  const d = parseDate(value)
  if (!d) return '—'
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 小时前`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day} 天前`
  return formatDate(d)
}

export function formatFileSize(bytes) {
  const n = Number(bytes) || 0
  if (n <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1)
  const v = n / 1024 ** i
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`
}

/** 复原耗时：毫秒 → 9.87s / 1:23.45 */
export function formatDuration(ms) {
  const n = Number(ms)
  if (!n || n <= 0) return '—'
  const totalSec = n / 1000
  if (totalSec < 60) return `${totalSec.toFixed(2)}s`
  const m = Math.floor(totalSec / 60)
  const s = totalSec - m * 60
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(2)}`
}

export function formatMoney(value) {
  const n = Number(value) || 0
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function formatNumber(value) {
  return (Number(value) || 0).toLocaleString('zh-CN')
}

/** 文件扩展名 → 内部 file_kind */
export function detectFileKind(fileName = '', mime = '') {
  const ext = (fileName.split('.').pop() || '').toLowerCase()
  if (['pdf'].includes(ext)) return 'pdf'
  if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(ext)) return 'document'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'sheet'
  if (['ppt', 'pptx'].includes(ext)) return 'slide'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image'
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'mp3', 'wav', 'm4a'].includes(ext)) return 'video'
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/') || mime.startsWith('audio/')) return 'video'
  return 'other'
}

/** 生成安全的存储路径：时间戳 + 随机串 + 原扩展名 */
export function safeStoragePath(fileName) {
  const ext = (fileName.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const stamp = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return ext ? `${stamp}-${rand}.${ext}` : `${stamp}-${rand}`
}

export function truncate(text, len = 40) {
  const s = String(text ?? '')
  return s.length > len ? `${s.slice(0, len)}…` : s
}
