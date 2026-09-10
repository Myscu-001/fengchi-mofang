import { supabase, errorMessage, TABLES } from '@/lib/supabase'

function clean(kw) {
  return String(kw || '')
    .replace(/[,()]/g, ' ')
    .trim()
}

const ASSESSMENT_SELECT = `
  id, title, type, max_score, pass_score, assessed_at, description, created_at,
  course_id, class_id,
  course:courses(id, title, category),
  class:classes(id, name),
  grades(count)
`

function normalize(row) {
  return {
    ...row,
    grade_count: row.grades?.[0]?.count ?? 0,
    grades: undefined,
  }
}

export async function listAssessments(params = {}) {
  const { keyword = '', courseId = '', classId = '', type = '', page = 1, pageSize = 20 } = params

  let query = supabase.from(TABLES.assessments).select(ASSESSMENT_SELECT, { count: 'exact' })

  const kw = clean(keyword)
  if (kw) query = query.ilike('title', `%${kw}%`)
  if (courseId) query = query.eq('course_id', courseId)
  if (classId) query = query.eq('class_id', classId)
  if (type) query = query.eq('type', type)

  query = query.order('assessed_at', { ascending: false }).order('created_at', { ascending: false })

  const from = (Math.max(1, page) - 1) * pageSize
  query = query.range(from, from + pageSize - 1)

  const { data, error, count } = await query
  if (error) throw new Error(errorMessage(error, '加载测评列表失败'))
  return { items: (data || []).map(normalize), total: count ?? 0 }
}

export async function getAssessment(id) {
  const { data, error } = await supabase
    .from(TABLES.assessments)
    .select(ASSESSMENT_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(errorMessage(error, '加载测评失败'))
  return data ? normalize(data) : null
}

export async function createAssessment(payload) {
  const { data: auth } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from(TABLES.assessments)
    .insert({ ...payload, created_by: auth?.user?.id ?? null })
    .select()
    .single()
  if (error) throw new Error(errorMessage(error, '创建测评失败'))
  return data
}

export async function updateAssessment(id, payload) {
  const { data, error } = await supabase
    .from(TABLES.assessments)
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(errorMessage(error, '保存测评失败'))
  return data
}

export async function deleteAssessment(id) {
  const { error } = await supabase.from(TABLES.assessments).delete().eq('id', id)
  if (error) throw new Error(errorMessage(error, '删除测评失败'))
}

// ---------------------------------------------------------------------------
// 成绩
// ---------------------------------------------------------------------------
export async function listGrades(assessmentId) {
  const { data, error } = await supabase
    .from(TABLES.studentGrades)
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('score', { ascending: false, nullsFirst: false })
  if (error) throw new Error(errorMessage(error, '加载成绩失败'))
  return data || []
}

/** 批量保存成绩（按 测评 + 学员 去重覆盖） */
export async function saveGrades(assessmentId, rows) {
  if (!rows?.length) return []
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id ?? null
  const payload = rows.map((r) => ({
    assessment_id: assessmentId,
    student_id: r.student_id,
    score: r.score === '' || r.score === null || r.score === undefined ? null : Number(r.score),
    duration_ms: r.duration_ms === '' || r.duration_ms === null || r.duration_ms === undefined ? null : Number(r.duration_ms),
    rank: r.rank === '' || r.rank === null || r.rank === undefined ? null : Number(r.rank),
    level: r.level || null,
    is_pass: r.is_pass ?? null,
    comment: r.comment || null,
    recorded_by: uid,
  }))

  const { data, error } = await supabase
    .from(TABLES.grades)
    .upsert(payload, { onConflict: 'assessment_id,student_id' })
    .select()
  if (error) throw new Error(errorMessage(error, '保存成绩失败'))
  return data || []
}

export async function deleteGrade(id) {
  const { error } = await supabase.from(TABLES.grades).delete().eq('id', id)
  if (error) throw new Error(errorMessage(error, '删除成绩失败'))
}

/** 最近成绩（用于首页/看板） */
export async function recentGrades(limit = 8) {
  const { data, error } = await supabase
    .from(TABLES.studentGrades)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(errorMessage(error, '加载最近成绩失败'))
  return data || []
}

/** 按课程统计平均分与记录数 */
export async function gradeSummaryByCourse() {
  const { data, error } = await supabase
    .from(TABLES.studentGrades)
    .select('course_id, course_title, score, max_score')
  if (error) throw new Error(errorMessage(error, '加载成绩汇总失败'))

  const map = new Map()
  for (const row of data || []) {
    const key = row.course_id || 'unknown'
    const entry = map.get(key) || {
      course_id: row.course_id,
      course_title: row.course_title || '未关联课程',
      count: 0,
      scoreSum: 0,
      maxSum: 0,
    }
    if (row.score !== null && row.score !== undefined) {
      entry.count += 1
      entry.scoreSum += Number(row.score) || 0
      entry.maxSum += Number(row.max_score) || 0
    }
    map.set(key, entry)
  }

  return [...map.values()]
    .map((e) => ({
      course_id: e.course_id,
      course_title: e.course_title,
      count: e.count,
      avg_score: e.count ? Number((e.scoreSum / e.count).toFixed(1)) : 0,
      avg_rate: e.maxSum ? Number(((e.scoreSum / e.maxSum) * 100).toFixed(1)) : 0,
    }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count)
}
