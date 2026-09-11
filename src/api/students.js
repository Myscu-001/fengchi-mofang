import { supabase, errorMessage, TABLES } from '@/lib/supabase'

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
