/**
 * 站点静态资源路径。
 * GitHub Pages 部署在 /<仓库名>/ 子路径下，所以配置里写 /brand/logo.png
 * 必须补上 BASE_URL 才能取到，否则会指向域名根目录而 404。
 */
export function assetUrl(path) {
  if (!path) return ''
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:')) return path
  const base = import.meta.env.BASE_URL || '/'
  return base.replace(/\/+$/, '') + (path.startsWith('/') ? path : `/${path}`)
}
