import { defineStore } from 'pinia'

let seq = 0

export const useToastStore = defineStore('toast', {
  state: () => ({
    items: [],
  }),
  actions: {
    push(message, type = 'info', duration = 3200) {
      const id = ++seq
      this.items.push({ id, message: String(message), type })
      if (duration > 0) {
        setTimeout(() => this.remove(id), duration)
      }
      return id
    },
    success(message, duration) {
      return this.push(message, 'success', duration)
    },
    error(message, duration = 4600) {
      return this.push(message, 'error', duration)
    },
    warning(message, duration = 4000) {
      return this.push(message, 'warning', duration)
    },
    info(message, duration) {
      return this.push(message, 'info', duration)
    },
    remove(id) {
      const i = this.items.findIndex((t) => t.id === id)
      if (i > -1) this.items.splice(i, 1)
    },
  },
})
