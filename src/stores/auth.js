import { defineStore } from 'pinia'
import { supabase, isSupabaseConfigured, errorMessage, TABLES, BUCKETS } from '@/lib/supabase'
import { safeStoragePath } from '@/lib/format'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    profile: null,
    permissions: [],
    initialized: false,
    loading: false,
  }),

  getters: {
    isLoggedIn: (s) => Boolean(s.user),
    isActiveStaff: (s) => s.profile?.status === 'active',
    roleCode: (s) => s.profile?.role_code || 'guest',
    displayName: (s) => s.profile?.full_name || s.user?.email || '未登录',
    initial: (s) => {
      const name = s.profile?.full_name || s.user?.email || '?'
      return name.trim().charAt(0).toUpperCase()
    },
    /** auth.can('course.manage') */
    can: (s) => (perm) => {
      if (!perm) return true
      const list = Array.isArray(perm) ? perm : [perm]
      return list.some((p) => s.permissions.includes(p))
    },
    canAll: (s) => (perm) => {
      const list = Array.isArray(perm) ? perm : [perm]
      return list.every((p) => s.permissions.includes(p))
    },
  },

  actions: {
    /** 应用启动时恢复会话 */
    async init() {
      if (this.initialized) return
      if (!isSupabaseConfigured) {
        this.initialized = true
        return
      }
      try {
        const { data } = await supabase.auth.getSession()
        if (data?.session?.user) {
          await this.loadIdentity(data.session.user)
        }
      } catch {
        // 会话无效时静默处理，用户重新登录即可
      } finally {
        this.initialized = true
      }
    },

    /** 拉取用户资料与权限点 */
    async loadIdentity(user) {
      this.user = user
      this.permissions = []

      const { data: profile, error } = await supabase
        .from(TABLES.profiles)
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (error || !profile) {
        this.profile = null
        return null
      }
      this.profile = profile

      if (profile.status === 'active') {
        const { data: perms } = await supabase
          .from(TABLES.rolePermissions)
          .select('permission_code')
          .eq('role_code', profile.role_code)
        this.permissions = (perms || []).map((p) => p.permission_code)
      }
      return profile
    },

    async signIn(email, password) {
      this.loading = true
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw new Error(errorMessage(error, '登录失败，请稍后重试'))

        const profile = await this.loadIdentity(data.user)

        if (!profile) {
          await supabase.auth.signOut()
          throw new Error('该账号尚未建立员工档案，请联系超级管理员')
        }
        if (profile.status !== 'active') {
          await supabase.auth.signOut()
          throw new Error('该账号已被停用，请联系超级管理员')
        }

        // 记录最近登录时间（失败不影响登录）
        supabase
          .from(TABLES.profiles)
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.user.id)
          .then(() => {})

        this.initialized = true
        return profile
      } finally {
        this.loading = false
      }
    },

    async signOut() {
      try {
        await supabase.auth.signOut()
      } finally {
        this.user = null
        this.profile = null
        this.permissions = []
      }
    },

    /** 重新拉取资料与权限（权限调整后调用） */
    async refresh() {
      if (!this.user) return null
      return this.loadIdentity(this.user)
    },

    /** 更新本人资料（角色与状态由数据库触发器保护，无法自行修改） */
    async updateProfile(patch) {
      if (!this.user) throw new Error('未登录')
      const allowed = ['full_name', 'phone', 'title', 'bio', 'avatar_url']
      const payload = {}
      for (const key of allowed) {
        if (key in patch) payload[key] = patch[key]
      }
      const { data, error } = await supabase
        .from(TABLES.profiles)
        .update(payload)
        .eq('id', this.user.id)
        .select()
        .single()
      if (error) throw new Error(errorMessage(error, '保存资料失败'))
      this.profile = data
      return data
    },

    async changePassword(newPassword) {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw new Error(errorMessage(error, '修改密码失败'))
      if (this.profile?.must_change_password) {
        const { data } = await supabase
          .from(TABLES.profiles)
          .update({ must_change_password: false })
          .eq('id', this.user.id)
          .select()
          .single()
        if (data) this.profile = data
      }
      return true
    },

    /** 上传头像（仅能写入自己的目录） */
    async uploadAvatar(file) {
      if (!this.user) throw new Error('未登录')
      const path = `${this.user.id}/${safeStoragePath(file.name)}`
      const { error } = await supabase.storage.from(BUCKETS.avatars).upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      })
      if (error) throw new Error(errorMessage(error, '头像上传失败'))

      const { data } = supabase.storage.from(BUCKETS.avatars).getPublicUrl(path)
      await this.updateProfile({ avatar_url: data.publicUrl })
      return data.publicUrl
    },
  },
})
