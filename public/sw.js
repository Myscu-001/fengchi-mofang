/* 风驰思维 · Service Worker
 *
 * 目标只有一个：**断网时不要白屏**（教室网络不稳）。
 * 因此只缓存「页面外壳 + 构建产物」，绝不缓存任何接口数据。
 *
 * 策略：
 *   - 页面导航（navigate）：网络优先 + no-cache，必须拿最新版的 index.html；失败才回退缓存的壳
 *   - /assets/ 与 /icons/：缓存优先（文件名带哈希，同一个内容换名后一定会重新下载）
 *   - 缓存代次跟着线上 version.json 的 build 号走：每次发版自动换一代，老一代直接删除
 *   - 跨域请求（Supabase 等）：一律直连，不拦截
 *
 * ⚠️ 2026-09-24 修过一个坑：以前 VERSION 是写死的字符串，网站发了很多版它都不变，
 *    App（尤其是 Capacitor WebView）里就一直跑缓存里的旧界面。现在改成从 version.json 读 build，
 *    ship 脚本每次 bump build，客户端自然会把旧缓存清掉。
 */

// 拿不到 version.json（离线安装）时的兜底代次
const FALLBACK_VERSION = 'v9'

// 必须与 vite.config.js 的 base 保持一致（public/ 下的文件不参与打包，只能写死）
const BASE_ROUTE = '/fengchi-mofang/'

const SHELL = [
  BASE_ROUTE,
  `${BASE_ROUTE}index.html`,
  `${BASE_ROUTE}manifest.webmanifest`,
  `${BASE_ROUTE}icons/icon-192.png`,
  `${BASE_ROUTE}icons/icon-512.png`,
]

// 当前缓存代次：优先跟线上 version.json 的 build 号，取不到就用兜底
let SHELL_CACHE = `fc-shell-${FALLBACK_VERSION}`
let ASSET_CACHE = `fc-assets-${FALLBACK_VERSION}`

async function resolveVersion() {
  try {
    const res = await fetch(`${BASE_ROUTE}version.json?_=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return FALLBACK_VERSION
    const json = await res.json()
    return `b${json.build || 0}`
  } catch {
    return FALLBACK_VERSION
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const v = await resolveVersion()
      SHELL_CACHE = `fc-shell-${v}`
      ASSET_CACHE = `fc-assets-${v}`

      const cache = await caches.open(SHELL_CACHE)
      await Promise.all(
        SHELL.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: 'reload' }))
          } catch {
            // 单个资源失败不影响安装（例如 robots.txt 之类的可选文件）
          }
        }),
      )
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => k.startsWith('fc-') && k !== SHELL_CACHE && k !== ASSET_CACHE)
          .map((k) => caches.delete(k)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting()
  // App 里主动清全部缓存后重载，用于「还是老样子」的兜底自救
  if (event.data === 'clear-cache') {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys()
        await Promise.all(keys.filter((k) => k.startsWith('fc-')).map((k) => caches.delete(k)))
        const clients = await self.clients.matchAll({ type: 'window' })
        clients.forEach((c) => c.navigate(c.url))
      })(),
    )
  }
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  let url
  try {
    url = new URL(req.url)
  } catch {
    return
  }

  // 只管本站资源；Supabase 等接口永远走网络（数据必须实时，也不能进缓存）
  if (url.origin !== self.location.origin) return
  if (!url.pathname.startsWith(BASE_ROUTE)) return

  // ① 页面导航：网络优先（绕过 HTTP 缓存，避免拿到旧的 index.html）；断网才回退缓存的壳
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req, { cache: 'no-cache' })
          if (fresh && fresh.ok) {
            const cache = await caches.open(SHELL_CACHE)
            cache.put(`${BASE_ROUTE}index.html`, fresh.clone())
          }
          return fresh
        } catch {
          const cache = await caches.open(SHELL_CACHE)
          const hit = (await cache.match(`${BASE_ROUTE}index.html`)) || (await cache.match(BASE_ROUTE))
          return hit || Response.error()
        }
      })(),
    )
    return
  }

  // ② 构建产物与图标：缓存优先（哈希文件名保证内容变了文件名一定变）
  const isAsset =
    url.pathname.startsWith(`${BASE_ROUTE}assets/`) ||
    url.pathname.startsWith(`${BASE_ROUTE}icons/`) ||
    url.pathname === `${BASE_ROUTE}manifest.webmanifest`

  if (!isAsset) return

  event.respondWith(
    (async () => {
      const cache = await caches.open(ASSET_CACHE)
      const hit = await cache.match(req)
      if (hit) return hit
      try {
        const res = await fetch(req)
        if (res && res.ok) cache.put(req, res.clone())
        return res
      } catch {
        const shell = await caches.open(SHELL_CACHE)
        return (await shell.match(req)) || Response.error()
      }
    })(),
  )
})
