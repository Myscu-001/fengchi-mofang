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
