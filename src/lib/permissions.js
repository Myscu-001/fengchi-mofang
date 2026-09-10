/**
 * 权限点定义 —— 与 supabase/02_seed_meta.sql 中的 permissions 表保持一致。
 * 前端仅用于控制界面显隐，真正的数据安全由数据库 RLS 策略保证。
 */
export const PERMISSIONS = {
  USER_MANAGE: 'user.manage',
  ROLE_MANAGE: 'role.manage',
  SETTINGS_MANAGE: 'settings.manage',
  COURSE_VIEW: 'course.view',
  COURSE_MANAGE: 'course.manage',
  STUDENT_VIEW: 'student.view',
  STUDENT_MANAGE: 'student.manage',
  SCORE_VIEW: 'score.view',
  SCORE_MANAGE: 'score.manage',
  RESOURCE_VIEW: 'resource.view',
  RESOURCE_MANAGE: 'resource.manage',
}

export const ROLE_LABELS = {
  admin: '超级管理员',
  teacher: '机构老师',
  assistant: '助教',
  guest: '未登录',
}

export const ROLE_STYLES = {
  admin: 'bg-brand-50 text-brand-700 border-brand-200',
  teacher: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  assistant: 'bg-amber-50 text-amber-700 border-amber-200',
  guest: 'bg-ink-100 text-ink-500 border-ink-200',
}

export function roleLabel(code) {
  return ROLE_LABELS[code] || code || '—'
}

export function roleStyle(code) {
  return ROLE_STYLES[code] || ROLE_STYLES.guest
}

export const ROLE_OPTIONS = [
  { value: 'admin', label: '超级管理员', desc: '全部权限，含账号与站点配置' },
  { value: 'teacher', label: '机构老师', desc: '课程 / 学员 / 魔方成绩 / 资源全流程' },
  { value: 'assistant', label: '助教', desc: '查看为主，可录入成绩与上传资源' },
]
