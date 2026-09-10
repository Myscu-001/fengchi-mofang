import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Supabase 是否已完成配置（未配置时站点仍可浏览，但无法登录与读写数据） */
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // 站点使用 hash 路由，关闭 URL 自动解析避免与 fragment 冲突
      detectSessionInUrl: false,
      storageKey: 'fengchi-mofang-auth',
      flowType: 'implicit',
    },
    global: {
      headers: { 'x-application-name': 'fengchi-mofang' },
    },
  },
)

/** 统一的错误信息提取 */
export function errorMessage(error, fallback = '操作失败，请稍后重试') {
  if (!error) return fallback
  const msg = error.message || error.error_description || ''
  const map = {
    'Invalid login credentials': '邮箱或密码不正确',
    'Email not confirmed': '该账号邮箱尚未确认，请联系管理员',
    'User already registered': '该邮箱已注册',
    'Password should be at least 6 characters': '密码长度至少 6 位',
    'New password should be different from the old password': '新密码不能与当前密码相同',
    'new row violates row-level security policy': '当前账号没有执行该操作的权限',
    'duplicate key value violates unique constraint': '数据重复，请检查后重试',
    'permission denied': '当前账号没有执行该操作的权限',
    'Email rate limit exceeded': '邮件发送过于频繁，请稍后再试',
    'Request rate limit reached': '操作过于频繁，请稍后再试',
    'invalid JWT': '登录状态已失效，请重新登录',
    'JWT expired': '登录已过期，请重新登录',
    'Failed to fetch': '网络连接失败，请检查网络后重试',
  }
  for (const key of Object.keys(map)) {
    if (msg.includes(key)) return map[key]
  }
  return msg || fallback
}

export const TABLES = {
  profiles: 'profiles',
  roles: 'roles',
  permissions: 'permissions',
  rolePermissions: 'role_permissions',
  courses: 'courses',
  courseOverview: 'v_course_overview',
  lessons: 'course_lessons',
  students: 'students',
  scores: 'student_scores',
  resourceCategories: 'resource_categories',
  resources: 'resources',
  downloads: 'resource_downloads',
  coaches: 'coaches',
  siteSettings: 'site_settings',
}

export const BUCKETS = {
  covers: 'covers',
  avatars: 'avatars',
  resources: 'resources',
}
