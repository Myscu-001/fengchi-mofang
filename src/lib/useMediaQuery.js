import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 响应式媒体查询。
 *
 * 项目里的移动端适配优先用 CSS 断点（lg / max-lg）解决；只有当「手机端和桌面端要渲染
 * 完全不同的结构、且不想让另一套 DOM 白白挂载并触发请求」时，才用它。
 */
export function useMediaQuery(query) {
  const supported =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  const matches = ref(supported ? window.matchMedia(query).matches : false)

  let mq = null
  const onChange = (event) => {
    matches.value = event.matches
  }

  onMounted(() => {
    if (!supported) return
    mq = window.matchMedia(query)
    matches.value = mq.matches
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else if (mq.addListener) mq.addListener(onChange)
  })

  onBeforeUnmount(() => {
    if (!mq) return
    if (mq.removeEventListener) mq.removeEventListener('change', onChange)
    else if (mq.removeListener) mq.removeListener(onChange)
  })

  return matches
}

/** Tailwind 的 lg 断点是 min-width 1024px；这里取它的补集 */
export const MOBILE_QUERY = '(max-width: 1023.98px)'

/** 当前是否处于「手机端」布局（< 1024px）。桌面端恒为 false。 */
export function useIsMobile() {
  return useMediaQuery(MOBILE_QUERY)
}
