import { supabase, errorMessage, TABLES } from '@/lib/supabase'

/**
 * 管理员账号操作走 Supabase Edge Function（内部持有 service_role，前端不接触密钥）。
 * 调用者身份由 Edge Function 校验：必须为启用状态的超级管理员。
 */
async function invokeAdmin(body) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body })

  if (error) {
    let message = '操作失败，请稍后重试'
    try {
      const detail = await error.context?.json?.()
      if (detail?.error) message = detail.error
    } catch {
      if (error.message) message = error.message
    }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

function clean(kw) {
  return String(kw || '')
    .replace(/[,()]/g, ' ')
    .trim()
}

// ---------------------------------------------------------------------------
// 员工列表与编辑
// ---------------------------------------------------------------------------
export async function listStaff(params = {}) {
  const { keyword = '', role = '', status = '', page = 1, pageSize = 20 } = params

  let query = supabase.from(TABLES.profiles).select('*', { count: 'exact' })

  const kw = clean(keyword)
  if (kw) query = query.or(`full_name.ilike.%${kw}%,email.ilike.%${kw}%,phone.ilike.%${kw}%`)
  if (role) query = query.eq('role_code', role)
  if (status) query = query.eq('status', status)

  query = query.order('created_at', { ascending: false })

  const from = (Math.max(1, page) - 1) * pageSize
  query = query.range(from, from + pageSize - 1)

  const { data, error, count } = await query
  if (error) throw new Error(errorMessage(error, '加载员工列表失败'))
  return { items: data || [], total: count ?? 0 }
}

export async function staffStats() {
  const [total, active, admins] = await Promise.all([
    supabase.from(TABLES.profiles).select('id', { count: 'exact', head: true }),
    supabase.from(TABLES.profiles).select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from(TABLES.profiles).select('id', { count: 'exact', head: true }).eq('role_code', 'admin'),
  ])
  return {
    total: total.count || 0,
    active: active.count || 0,
    admins: admins.count || 0,
  }
}

/** 由超级管理员创建员工账号 */
export async function createStaff({ email, password, full_name, role_code, phone, title }) {
  return invokeAdmin({
    action: 'create',
    email: email?.trim().toLowerCase(),
    password,
    full_name,
    role_code,
    phone,
    title,
  })
}

/** 更新员工资料 / 角色 / 状态 */
export async function updateStaff(id, payload) {
  const allowed = ['full_name', 'phone', 'title', 'bio', 'role_code', 'status']
  const body = {}
  for (const key of allowed) {
    if (key in payload) body[key] = payload[key]
  }
  const { data, error } = await supabase
    .from(TABLES.profiles)
    .update(body)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(errorMessage(error, '保存员工信息失败'))
  return data
}

/** 重置密码（同时下发 user_metadata，使 Supabase 侧密码同步更新） */
export async function resetStaffPassword(id, password) {
  return invokeAdmin({ action: 'reset-password', user_id: id, password })
}

/** 删除账号（连带删除 auth 用户与资料） */
export async function deleteStaff(id) {
  return invokeAdmin({ action: 'delete', user_id: id })
}

// ---------------------------------------------------------------------------
// 角色与权限
// ---------------------------------------------------------------------------
export async function listRoles() {
  const { data, error } = await supabase.from(TABLES.roles).select('*').order('level', { ascending: false })
  if (error) throw new Error(errorMessage(error, '加载角色失败'))
  return data || []
}

export async function listPermissions() {
  const { data, error } = await supabase
    .from(TABLES.permissions)
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw new Error(errorMessage(error, '加载权限点失败'))
  return data || []
}

export async function listRolePermissions() {
  const { data, error } = await supabase.from(TABLES.rolePermissions).select('role_code, permission_code')
  if (error) throw new Error(errorMessage(error, '加载角色权限失败'))
  return data || []
}

/** 整体覆盖某个角色的权限集合 */
export async function setRolePermissions(roleCode, permissionCodes) {
  const { error: delErr } = await supabase
    .from(TABLES.rolePermissions)
    .delete()
    .eq('role_code', roleCode)
  if (delErr) throw new Error(errorMessage(delErr, '重置角色权限失败'))

  if (!permissionCodes?.length) return

  const rows = permissionCodes.map((permission_code) => ({ role_code: roleCode, permission_code }))
  const { error } = await supabase.from(TABLES.rolePermissions).insert(rows)
  if (error) throw new Error(errorMessage(error, '保存角色权限失败'))
}

/** 最近加入的员工 */
export async function recentStaff(limit = 5) {
  const { data, error } = await supabase
    .from(TABLES.profiles)
    .select('id, full_name, email, role_code, status, created_at, avatar_url')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(errorMessage(error, '加载员工动态失败'))
  return data || []
}

/** 授课老师下拉选项 */
export async function listTeacherOptions() {
  const { data, error } = await supabase
    .from(TABLES.profiles)
    .select('id, full_name, role_code, status')
    .eq('status', 'active')
    .order('full_name', { ascending: true })
  if (error) throw new Error(errorMessage(error, '加载老师列表失败'))
  return data || []
}
