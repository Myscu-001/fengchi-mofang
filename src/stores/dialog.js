import { defineStore } from 'pinia'

// 解析函数放在模块作用域，避免被响应式代理包裹
let resolver = null

export const useDialogStore = defineStore('dialog', {
  state: () => ({
    open: false,
    title: '请确认',
    message: '',
    detail: '',
    confirmText: '确定',
    cancelText: '取消',
    danger: false,
  }),

  actions: {
    /**
     * 打开确认框，返回 Promise<boolean>
     * confirm({ title, message, detail, confirmText, danger })
     */
    confirm(options = {}) {
      this.title = options.title || '请确认'
      this.message = options.message || ''
      this.detail = options.detail || ''
      this.confirmText = options.confirmText || '确定'
      this.cancelText = options.cancelText || '取消'
      this.danger = Boolean(options.danger)
      this.open = true
      return new Promise((resolve) => {
        resolver = resolve
      })
    },

    settle(value) {
      this.open = false
      if (resolver) {
        resolver(value)
        resolver = null
      }
    },
  },
})
