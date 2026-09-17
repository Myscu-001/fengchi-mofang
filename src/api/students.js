import { supabase, errorMessage, TABLES, BUCKETS } from '@/lib/supabase'
import { safeStoragePath } from '@/lib/format'

function clean(kw) {
  return String(kw || '')
    .replace(/[,()]/g, ' ')
    .trim()
}

export async function listStudents(params = {}) {
  const { keyword = '', status = '', level = '', page = 1, pageSize = 20, paged = true } = params

  let query = supabase.from(TABLES.students).select('*', { count: 'exact' })

  const kw = clean(keyword)
  if (kw) {
    query = query.or(
      `name.ilike.%${kw}%,nickname.ilike.%${kw}%,guardian_name.ilike.%${kw}%,guardian_phone.ilike.%${kw}%,phone.ilike.%${kw}%`,
    )
  }
  if (status) query = query.eq('status', status)
  if (level) query = query.eq('level', level)

  query = query.order('created_at', { ascending: false })

  if (paged) {
    const from = (Math.max(1, page) - 1) * pageSize
    query = query.range(from, from + pageSize - 1)
  }

  const { data, error, count } = await query
  if (error) throw new Error(errorMessage(error, '加载学员列表失败'))
  return { items: data || [], total: count ?? (data || []).length }
}

/** 下拉选择用的轻量列表 */
export async function listStudentOptions() {
  const { data, error } = await supabase
    .from(TABLES.students)
    .select('id,name,level,status')
    .order('name', { ascending: true })
  if (error) throw new Error(errorMessage(error, '加载学员选项失败'))
  return data || []
}

export async function getStudent(id) {
  const { data, error } = await supabase.from(TABLES.students).select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(errorMessage(error, '加载学员失败'))
  return data
}

export async function createStudent(payload) {
  const { data: auth } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from(TABLES.students)
    .insert({ ...payload, created_by: auth?.user?.id ?? null })
    .select()
    .single()
  if (error) throw new Error(errorMessage(error, '新增学员失败'))
  return data
}

export async function updateStudent(id, payload) {
  const { data, error } = await supabase
    .from(TABLES.students)
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(errorMessage(error, '保存学员失败'))
  return data
}

export async function deleteStudent(id) {
  const { error } = await supabase.from(TABLES.students).delete().eq('id', id)
  if (error) throw new Error(errorMessage(error, '删除学员失败'))
}

/**
 * 上传学员头像。
 *
 * 存储策略限制：avatars 桶只允许写「自己 uid 命名的目录」，所以文件落在
 * 操作者目录下（形如 {uid}/student-{id}-{随机}.jpg）。桶是公开读的，
 * 因此拿到的 publicUrl 任何登录用户都能显示，不受限于上传者。
 *
 * 每次上传都用新文件名，绕开 CDN 缓存，保证换了图立刻能看到新头像。
 *
 * @returns {Promise<{ avatarUrl: string, student: object }>}
 */
export async function uploadStudentAvatar(studentId, file) {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) throw new Error('登录状态已失效，请重新登录后再试')

  const path = `${uid}/student-${studentId}-${safeStoragePath(file?.name || 'avatar.jpg')}`
  const { error } = await supabase.storage.from(BUCKETS.avatars).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })
  if (error) throw new Error(errorMessage(error, '头像上传失败'))

  const { data: urlData } = supabase.storage.from(BUCKETS.avatars).getPublicUrl(path)
  const avatarUrl = urlData?.publicUrl
  if (!avatarUrl) throw new Error('头像地址生成失败')

  const { data, error: saveError } = await supabase
    .from(TABLES.students)
    .update({ avatar_url: avatarUrl })
    .eq('id', studentId)
    .select()
    .single()
  if (saveError) throw new Error(errorMessage(saveError, '图片已上传，但保存失败'))

  return { avatarUrl, student: data }
}

/**
 * 移除学员头像：只清空字段。
 * 不删存储文件——文件可能在别的老师目录下（删除权限只认自己的目录），
 * 强行删会失败；留着也不影响使用，头像尺寸很小。
 */
export async function clearStudentAvatar(studentId) {
  const { data, error } = await supabase
    .from(TABLES.students)
    .update({ avatar_url: null })
    .eq('id', studentId)
    .select()
    .single()
  if (error) throw new Error(errorMessage(error, '移除头像失败'))
  return data
}

/** 生成学员花名册 CSV 文本（含 BOM，便于 Excel 识别中文） */
export function buildStudentCsv(list) {
  const head = ['姓名', '性别', '昵称', '出生日期', '家长姓名', '家长电话', '电话', '学校', '年级', '水平', '加入日期', '状态']
  const genderMap = { male: '男', female: '女', unknown: '未填写' }
  const statusMap = { active: '在读', paused: '停课', graduated: '结业', left: '退学' }
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [head.join(',')]
  for (const s of list || []) {
    lines.push([
      s.name,
      genderMap[s.gender] || '未填写',
      s.nickname || '',
      s.birthday || '',
      s.guardian_name || '',
      s.guardian_phone || '',
      s.phone || '',
      s.school || '',
      s.grade || '',
      s.level || '',
      s.joined_at || '',
      statusMap[s.status] || '在读',
    ].map(esc).join(','))
  }
  return '﻿' + lines.join('\n')
}
