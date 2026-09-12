import { supabase, errorMessage, TABLES } from '@/lib/supabase'

/** 操作日志查询（仅超级管理员可读） */
export async function listAuditLogs(params = {}) {
  const {
    keyword = '',
    targetType = '',
    action = '',
    start = '',
    end = '',
    page = 1,
    pageSize = 30,
  } = params

  let query = supabase.from(TABLES.auditLogs).select('*', { count: 'exact' })

  const kw = String(keyword || '')
    .replace(/[,()]/g, ' ')
    .trim()
  if (kw) query = query.or(`summary.ilike.%${kw}%,actor_name.ilike.%${kw}%`)
  if (targetType) query = query.eq('target_type', targetType)
  if (action) query = query.eq('action', action)
  if (start) query = query.gte('created_at', start)
  if (end) query = query.lte('created_at', `${end}T23:59:59`)

  query = query.order('created_at', { ascending: false })

  const from = (Math.max(1, page) - 1) * pageSize
  query = query.range(from, from + pageSize - 1)

  const { data, error, count } = await query
  if (error) throw new Error(errorMessage(error, '加载操作日志失败'))
  return { items: data || [], total: count ?? 0 }
}

/** 清理指定日期之前的日志（默认保留 90 天） */
export async function purgeAuditLogsBefore(dateIso) {
  const { data, error } = await supabase
    .from(TABLES.auditLogs)
    .delete({ count: 'exact' })
    .lt('created_at', dateIso)
    .select('id')
  if (error) throw new Error(errorMessage(error, '清理日志失败'))
  return (data || []).length
}

export const AUDIT_ACTIONS = [
  { value: 'create', label: '新增', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'update', label: '修改', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'delete', label: '删除', style: 'bg-red-50 text-red-600 border-red-200' },
  { value: 'upload', label: '上传', style: 'bg-brand-50 text-brand-700 border-brand-200' },
  { value: 'link', label: '链接', style: 'bg-sky-50 text-sky-600 border-sky-200' },
  { value: 'settings', label: '配置', style: 'bg-violet-50 text-violet-700 border-violet-200' },
]

export const AUDIT_TARGETS = [
  { value: 'score', label: '魔方成绩' },
  { value: 'resource', label: '教学资源' },
  { value: 'student', label: '学员档案' },
  { value: 'account', label: '账号' },
  { value: 'course', label: '课程' },
  { value: 'coach', label: '师资' },
  { value: 'settings', label: '站点配置' },
  { value: 'goal', label: '训练目标' },
]

export function auditActionMeta(action) {
  return AUDIT_ACTIONS.find((a) => a.value === action) || {
    value: action,
    label: action,
    style: 'bg-ink-100 text-ink-600 border-ink-200',
  }
}

export function auditTargetLabel(targetType) {
  return AUDIT_TARGETS.find((t) => t.value === targetType)?.label || targetType
}
