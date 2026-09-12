import { supabase, errorMessage, TABLES } from '@/lib/supabase'

async function countOf(table, apply) {
  let query = supabase.from(table).select('id', { count: 'exact', head: true })
  if (apply) query = apply(query)
  const { count, error } = await query
  if (error) throw new Error(errorMessage(error, '统计数据读取失败'))
  return count || 0
}

/** 首页 / 看板核心指标 */
export async function dashboardStats() {
  const [
    courseTotal,
    coursePublished,
    studentTotal,
    studentActive,
    scoreTotal,
    resourceTotal,
    staffTotal,
  ] = await Promise.all([
    countOf(TABLES.courses),
    countOf(TABLES.courses, (q) => q.eq('status', 'published')),
    countOf(TABLES.students),
    countOf(TABLES.students, (q) => q.eq('status', 'active')),
    countOf(TABLES.scores),
    countOf(TABLES.resources),
    countOf(TABLES.profiles, (q) => q.eq('status', 'active')),
  ])

  return {
    courseTotal,
    coursePublished,
    studentTotal,
    studentActive,
    scoreTotal,
    resourceTotal,
    staffTotal,
  }
}

/** 资源总下载量 */
export async function totalDownloads() {
  const { data, error } = await supabase.from(TABLES.resources).select('download_count')
  if (error) throw new Error(errorMessage(error, '下载量统计失败'))
  return (data || []).reduce((sum, r) => sum + (r.download_count || 0), 0)
}

/** 最近新增课程 */
export async function recentCourses(limit = 5) {
  const { data, error } = await supabase
    .from(TABLES.courses)
    .select('id, title, category, status, cover_url, level, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(errorMessage(error, '加载最近课程失败'))
  return data || []
}

/** 最近上传资源 */
export async function recentResources(limit = 5) {
  const { data, error } = await supabase
    .from(TABLES.resources)
    .select('id, title, file_name, file_size, file_type, download_count, created_at, category:resource_categories(name, color)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(errorMessage(error, '加载最近资源失败'))
  return data || []
}

const isoDate = (d) => d.toISOString().slice(0, 10)

/** 本周（最近 7 天）新增成绩，并与上一个 7 天对比 */
export async function weeklyScoreStats() {
  const now = new Date()
  const d7 = new Date(now)
  d7.setDate(now.getDate() - 6)
  const d14 = new Date(now)
  d14.setDate(now.getDate() - 13)

  const [thisWeek, lastWeek] = await Promise.all([
    countOf(TABLES.scores, (q) => q.gte('recorded_at', isoDate(d7))),
    countOf(TABLES.scores, (q) => q.gte('recorded_at', isoDate(d14)).lt('recorded_at', isoDate(d7))),
  ])
  return { thisWeek, lastWeek, delta: thisWeek - lastWeek }
}

/**
 * 待关注学员：最近一次测试距今 ≥ days 天（含从未测试）的在读学员。
 * 用于首页看板提醒老师及时安排测评。
 */
export async function attentionStudents({ days = 30, limit = 8 } = {}) {
  const [{ data: students, error: sErr }, { data: scores, error: scErr }] = await Promise.all([
    supabase.from(TABLES.students).select('id, name, avatar_url, status').eq('status', 'active'),
    supabase.from(TABLES.scores).select('student_id, recorded_at'),
  ])
  if (sErr) throw new Error(errorMessage(sErr, '加载学员失败'))
  if (scErr) throw new Error(errorMessage(scErr, '加载成绩失败'))

  const last = new Map()
  for (const s of scores || []) {
    const d = s.recorded_at
    if (!d) continue
    if (!last.has(s.student_id) || d > last.get(s.student_id)) last.set(s.student_id, d)
  }

  const today = Date.now()
  const rows = (students || [])
    .map((st) => {
      const d = last.get(st.id) || null
      const diff = d ? Math.floor((today - new Date(d).getTime()) / 86400000) : null
      return { ...st, lastDate: d, days: diff }
    })
    .filter((r) => r.days == null || r.days >= days)
    .sort((a, b) => (b.days ?? 9999) - (a.days ?? 9999))

  return { total: rows.length, items: rows.slice(0, limit) }
}
