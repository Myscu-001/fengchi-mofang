import { supabase, errorMessage, TABLES, BUCKETS } from '@/lib/supabase'
import { safeStoragePath } from '@/lib/format'

const VIEW = TABLES.courseOverview

/** 去掉会破坏 PostgREST or 语法的字符 */
function clean(kw) {
  return String(kw || '')
    .replace(/[,()]/g, ' ')
    .trim()
}

/**
 * 课程列表（走 v_course_overview，已带课时数 / 学员数 / 资源数）
 */
export async function listCourses(params = {}) {
  const {
    keyword = '',
    category = '',
    status = '',
    level = '',
    page = 1,
    pageSize = 24,
    paged = true,
  } = params

  let query = supabase.from(VIEW).select('*', { count: 'exact' })

  const kw = clean(keyword)
  if (kw) query = query.or(`title.ilike.%${kw}%,subtitle.ilike.%${kw}%,summary.ilike.%${kw}%`)
  if (category) query = query.eq('category', category)
  if (status) query = query.eq('status', status)
  if (level) query = query.eq('level', Number(level))

  query = query.order('sort_order', { ascending: true }).order('created_at', { ascending: false })

  if (paged) {
    const from = (Math.max(1, page) - 1) * pageSize
    query = query.range(from, from + pageSize - 1)
  }

  const { data, error, count } = await query
  if (error) throw new Error(errorMessage(error, '加载课程列表失败'))
  return { items: data || [], total: count ?? (data || []).length }
}

/** 简单列表：用于下拉选择 */
export async function listCourseOptions() {
  const { data, error } = await supabase
    .from(TABLES.courses)
    .select('id,title,category,level,status')
    .order('sort_order', { ascending: true })
  if (error) throw new Error(errorMessage(error, '加载课程选项失败'))
  return data || []
}

export async function getCourse(id) {
  const { data, error } = await supabase.from(TABLES.courses).select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(errorMessage(error, '加载课程失败'))
  return data
}

export async function createCourse(payload) {
  const { data: auth } = await supabase.auth.getUser()
  const body = { ...payload }
  if (!body.slug) body.slug = null
  if (body.status === 'published') body.published_at = new Date().toISOString()

  const { data, error } = await supabase
    .from(TABLES.courses)
    .insert({ ...body, created_by: auth?.user?.id ?? null })
    .select()
    .single()
  if (error) throw new Error(errorMessage(error, '新建课程失败'))
  return data
}

export async function updateCourse(id, payload) {
  const body = { ...payload }
  if (body.slug === '') body.slug = null
  if (body.status === 'published' && !body.published_at) {
    body.published_at = new Date().toISOString()
  }
  const { data, error } = await supabase
    .from(TABLES.courses)
    .update(body)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(errorMessage(error, '保存课程失败'))
  return data
}

export async function updateCourseStatus(id, status) {
  const patch = { status }
  if (status === 'published') patch.published_at = new Date().toISOString()
  return updateCourse(id, patch)
}

export async function deleteCourse(id) {
  const { error } = await supabase.from(TABLES.courses).delete().eq('id', id)
  if (error) throw new Error(errorMessage(error, '删除课程失败'))
}

/** 上传课程封面（covers 公开桶） */
export async function uploadCover(file) {
  const path = `course/${safeStoragePath(file.name)}`
  const { error } = await supabase.storage.from(BUCKETS.covers).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw new Error(errorMessage(error, '封面上传失败'))
  const { data } = supabase.storage.from(BUCKETS.covers).getPublicUrl(path)
  return data.publicUrl
}

// ---------------------------------------------------------------------------
// 课时
// ---------------------------------------------------------------------------
export async function listLessons(courseId) {
  const { data, error } = await supabase
    .from(TABLES.lessons)
    .select('*')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true })
  if (error) throw new Error(errorMessage(error, '加载课时失败'))
  return data || []
}

export async function createLesson(courseId, payload) {
  let orderIndex = payload.order_index
  if (!orderIndex) {
    const { data: last } = await supabase
      .from(TABLES.lessons)
      .select('order_index')
      .eq('course_id', courseId)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle()
    orderIndex = (last?.order_index || 0) + 1
  }

  const { data, error } = await supabase
    .from(TABLES.lessons)
    .insert({ ...payload, course_id: courseId, order_index: orderIndex })
    .select()
    .single()
  if (error) throw new Error(errorMessage(error, '新增课时失败'))
  await syncLessonCount(courseId)
  return data
}

export async function updateLesson(id, payload) {
  const { data, error } = await supabase
    .from(TABLES.lessons)
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(errorMessage(error, '保存课时失败'))
  if (data?.course_id) await syncLessonCount(data.course_id)
  return data
}

export async function deleteLesson(id) {
  const { data: row } = await supabase
    .from(TABLES.lessons)
    .select('course_id')
    .eq('id', id)
    .maybeSingle()
  const { error } = await supabase.from(TABLES.lessons).delete().eq('id', id)
  if (error) throw new Error(errorMessage(error, '删除课时失败'))
  if (row?.course_id) await syncLessonCount(row.course_id)
}

/** 批量调整课时顺序：ids 按目标顺序传入 */
export async function reorderLessons(ids) {
  const tasks = ids.map((id, index) =>
    supabase
      .from(TABLES.lessons)
      .update({ order_index: index + 1 })
      .eq('id', id),
  )
  const results = await Promise.all(tasks)
  const failed = results.find((r) => r.error)
  if (failed) throw new Error(errorMessage(failed.error, '调整顺序失败'))
}

/** 让 courses.total_lessons 与课时表保持一致 */
export async function syncLessonCount(courseId) {
  const { count } = await supabase
    .from(TABLES.lessons)
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId)
  await supabase
    .from(TABLES.courses)
    .update({ total_lessons: count || 0 })
    .eq('id', courseId)
}
