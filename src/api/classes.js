import { supabase, errorMessage, TABLES } from '@/lib/supabase'

function clean(kw) {
  return String(kw || '')
    .replace(/[,()]/g, ' ')
    .trim()
}

const CLASS_SELECT = `
  id, name, room, weekday, start_time, end_time, start_date, end_date,
  capacity, status, notes, created_at,
  course:courses(id, title, category),
  teacher:profiles(id, full_name, role_code),
  members:class_members(count)
`

export async function listClasses(params = {}) {
  const { keyword = '', status = '', courseId = '' } = params

  let query = supabase.from(TABLES.classes).select(CLASS_SELECT, { count: 'exact' })

  const kw = clean(keyword)
  if (kw) query = query.ilike('name', `%${kw}%`)
  if (status) query = query.eq('status', status)
  if (courseId) query = query.eq('course_id', courseId)

  query = query.order('created_at', { ascending: false })

  const { data, error, count } = await query
  if (error) throw new Error(errorMessage(error, '加载班级失败'))
  return {
    items: (data || []).map(normalizeClass),
    total: count ?? (data || []).length,
  }
}

function normalizeClass(row) {
  return {
    ...row,
    member_count: row.members?.[0]?.count ?? 0,
    members: undefined,
  }
}

export async function getClass(id) {
  const { data, error } = await supabase.from(TABLES.classes).select(CLASS_SELECT).eq('id', id).maybeSingle()
  if (error) throw new Error(errorMessage(error, '加载班级失败'))
  return data ? normalizeClass(data) : null
}

export async function createClass(payload) {
  const { data: auth } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from(TABLES.classes)
    .insert({ ...payload, created_by: auth?.user?.id ?? null })
    .select()
    .single()
  if (error) throw new Error(errorMessage(error, '新建班级失败'))
  return data
}

export async function updateClass(id, payload) {
  const { data, error } = await supabase
    .from(TABLES.classes)
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(errorMessage(error, '保存班级失败'))
  return data
}

export async function deleteClass(id) {
  const { error } = await supabase.from(TABLES.classes).delete().eq('id', id)
  if (error) throw new Error(errorMessage(error, '删除班级失败'))
}

// ---------------------------------------------------------------------------
// 班级成员
// ---------------------------------------------------------------------------
export async function listClassMembers(classId) {
  const { data, error } = await supabase
    .from(TABLES.classMembers)
    .select('id, status, joined_at, student:students(id, name, nickname, level, status, avatar_url)')
    .eq('class_id', classId)
    .order('joined_at', { ascending: true })
  if (error) throw new Error(errorMessage(error, '加载班级成员失败'))
  return data || []
}

export async function addClassMembers(classId, studentIds) {
  if (!studentIds?.length) return []
  const rows = studentIds.map((student_id) => ({ class_id: classId, student_id }))
  const { data, error } = await supabase
    .from(TABLES.classMembers)
    .upsert(rows, { onConflict: 'class_id,student_id', ignoreDuplicates: true })
    .select()
  if (error) throw new Error(errorMessage(error, '添加学员失败'))
  return data || []
}

export async function removeClassMember(memberId) {
  const { error } = await supabase.from(TABLES.classMembers).delete().eq('id', memberId)
  if (error) throw new Error(errorMessage(error, '移除学员失败'))
}

export async function updateClassMember(memberId, patch) {
  const { data, error } = await supabase
    .from(TABLES.classMembers)
    .update(patch)
    .eq('id', memberId)
    .select()
    .single()
  if (error) throw new Error(errorMessage(error, '更新成员失败'))
  return data
}
