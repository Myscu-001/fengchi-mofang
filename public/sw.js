/* 风驰思维 · Service Worker
 *
 * 目标只有一个：**断网时不要白屏**（教室网络不稳）。
 * 因此只缓存「页面外壳 + 构建产物」，绝不缓存任何接口数据。
 *
 * 策略：
 *   - 页面导航（navigate）：网络优先，拿最新版本；失败才回退缓存的壳
 *   - /assets/ 与 /icons/：缓存优先（文件名带哈希，内容永不变化）
 *   - 跨域请求（Supabase 等）：一律直连，不拦截
 */

const VERSION = 'v1'
const SHELL_CACHE = `fc-shell-${VERSION}`
const ASSET_CACHE = `fc-assets-${VERSION}`

// 必须与 vite.config.js 的 base 保持一致
const BASE = '/fengchi-mofang/'

const SHELL = [
  BASE,
  `${BASE}index.html`,
  `${BASE}manifest.webmanifest`,
  `${BASE}icons/icon-192.png`,
  `${BASE}icons/icon-512.png`,
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
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
  if (!url.pathname.startsWith(BASE)) return

  // ① 页面导航：网络优先 → 断网回退到缓存的壳
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req)
          if (fresh && fresh.ok) {
            const cache = await caches.open(SHELL_CACHE)
            cache.put(`${BASE}index.html`, fresh.clone())
          }
          return fresh
        } catch {
          const cache = await caches.open(SHELL_CACHE)
          const hit = (await cache.match(`${BASE}index.html`)) || (await cache.match(BASE))
          return hit || Response.error()
        }
      })(),
    )
    return
  }

  // ② 构建产物与图标：缓存优先
  const isAsset =
    url.pathname.startsWith(`${BASE}assets/`) ||
    url.pathname.startsWith(`${BASE}icons/`) ||
    url.pathname === `${BASE}manifest.webmanifest`

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
