import { defineStore } from 'pinia'
import { supabase, isSupabaseConfigured, TABLES } from '@/lib/supabase'

const DEFAULT_BRAND = {
  name: '风驰思维',
  full_name: '风驰思维魔方教育',
  english_name: 'FONGCHI EDUCATION',
  slogan: '专注 4 岁+ 教学 · 解锁新技能 · 发散新思维',
  logo_url: '/brand/logo.png',
  logo_mark_url: '/brand/logo-mark.png',
}

/**
 * 站点配置（site_settings）缓存。
 * 品牌、联系方式、首页文案都属于公开信息，未登录也能读取，
 * 集中在这里以避免每个页面各查一次。
 */
export const useSiteStore = defineStore('site', {
  state: () => ({
    loaded: false,
    loading: false,
    settings: {},
  }),

  getters: {
    brand: (s) => ({ ...DEFAULT_BRAND, ...(s.settings['site.brand'] || {}) }),
    contact: (s) => s.settings['site.contact'] || {},
    hero: (s) => s.settings['home.hero'] || {},
    about: (s) => s.settings['home.about'] || {},
    highlights: (s) => s.settings['home.highlights']?.items || [],
    outcomes: (s) => s.settings['home.outcomes'] || {},
    philosophy: (s) => s.settings['home.philosophy'] || {},
    why: (s) => s.settings['home.why'] || {},
    baseline: (s) => s.settings['stats.baseline'] || {},
  },

  actions: {
    async load(force = false) {
      if (this.loaded && !force) return this.settings
      if (!isSupabaseConfigured) {
        this.loaded = true
        return this.settings
      }
      this.loading = true
      try {
        const { data } = await supabase.from(TABLES.siteSettings).select('key, value')
        const map = {}
        for (const row of data || []) map[row.key] = row.value
        this.settings = map
        this.loaded = true
      } catch {
        // 读取失败时退回默认品牌
        this.loaded = true
      } finally {
        this.loading = false
      }
      return this.settings
    },

    /** 局部更新（用于站点配置页保存后即时生效） */
    patch(key, value) {
      this.settings = { ...this.settings, [key]: value }
    },
  },
})
