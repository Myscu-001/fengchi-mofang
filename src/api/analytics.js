import { supabase, errorMessage, TABLES } from '@/lib/supabase'

/**
 * 统计分析聚合查询。
 * 一次性拉取「指定时间范围」内的成绩，前端再做排名 / 对比 / 跨项目矩阵计算。
 * project 传空则跨全部魔方项目（用于「跨项目总览」与「PB 荣誉墙」）。
 * 数据量可控（全量成绩通常数百条），故本地聚合比在服务端写聚合视图更灵活。
 */
export async function listScoresForAnalysis({ project, start, end, limit = 8000 } = {}) {
  let query = supabase
    .from(TABLES.scores)
    .select(
      'id, student_id, project, avg_seconds, avg_is_dnf, single_best_seconds, single_is_dnf, recorded_at',
    )

  if (project) query = query.eq('project', project)
  if (start) query = query.gte('recorded_at', start)
  if (end) query = query.lte('recorded_at', end)

  query = query.order('recorded_at', { ascending: true }).limit(limit)

  const { data, error } = await query
  if (error) throw new Error(errorMessage(error, '加载成绩数据失败'))
  return data || []
}
