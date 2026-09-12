import { supabase, errorMessage, TABLES } from '@/lib/supabase'

/**
 * 魔方成绩 API。
 * 数据模型见 supabase/08_scores.sql：每条记录归属某个学员 + 某个魔方项目，
 * 支持「简单模式」(直接录入平均成绩/单次最佳) 与「详细模式」(5 次单次时间，按 Ao5 + DNF 规则计算)。
 */

const round3 = (n) => Math.round(Number(n) * 1000) / 1000

/**
 * 根据 5 次单次时间计算 Ao5 平均成绩与单次最佳（含 DNF 规则，见 PRD 4.3）。
 * @param {Array<{value:number|null,is_dnf:boolean}>} attempts
 */
export function computeAo5(attempts) {
  const list = Array.isArray(attempts) ? attempts : []
  const valid = list
    .filter((a) => !a.is_dnf && typeof a.value === 'number' && a.value > 0)
    .map((a) => Number(a.value))
  const dnfCount = list.filter((a) => a.is_dnf).length

  // 平均成绩
  let avgSeconds = null
  let avgIsDnf = false
  if (dnfCount >= 2) {
    avgIsDnf = true
  } else if (valid.length >= 3) {
    const sorted = [...valid].sort((a, b) => a - b)
    // 0 个 DNF：去掉最快与最慢；1 个 DNF：DNF 已自动为最慢，再去掉最快的有效时间
    const pool = dnfCount === 1 ? sorted.slice(1) : sorted.slice(1, -1)
    const sum = pool.reduce((s, v) => s + v, 0)
    avgSeconds = round3(sum / pool.length)
  } else {
    avgIsDnf = true
  }

  // 单次最佳（仅取有效时间的最小值）
  let singleBestSeconds = null
  let singleIsDnf = false
  if (valid.length > 0) {
    singleBestSeconds = round3(Math.min(...valid))
  } else {
    singleIsDnf = true
  }

  return { avgSeconds, avgIsDnf, singleBestSeconds, singleIsDnf }
}

/** 列表（按项目分页，日期倒序） */
export async function listScores({ studentId, project, page = 1, pageSize = 20 }) {
  let query = supabase
    .from(TABLES.scores)
    .select('*', { count: 'exact' })
    .eq('student_id', studentId)
    .eq('project', project)
    .order('recorded_at', { ascending: false })
    .order('created_at', { ascending: false })

  const from = (Math.max(1, page) - 1) * pageSize
  query = query.range(from, from + pageSize - 1)

  const { data, error, count } = await query
  if (error) throw new Error(errorMessage(error, '加载成绩失败'))
  return { items: data || [], total: count ?? (data || []).length }
}

/** 统计：次数 / 最佳平均 / 最佳单次 / 最后测试时间（按当前项目） */
export async function scoreStats({ studentId, project }) {
  const { data, error } = await supabase
    .from(TABLES.scores)
    .select('avg_seconds,avg_is_dnf,single_best_seconds,single_is_dnf,recorded_at')
    .eq('student_id', studentId)
    .eq('project', project)

  if (error) throw new Error(errorMessage(error, '统计成绩失败'))

  const rows = data || []
  const avgVals = rows.filter((r) => !r.avg_is_dnf && r.avg_seconds != null).map((r) => Number(r.avg_seconds))
  const singleVals = rows.filter((r) => !r.single_is_dnf && r.single_best_seconds != null).map((r) => Number(r.single_best_seconds))
  const dates = rows.map((r) => r.recorded_at).filter(Boolean)

  return {
    count: rows.length,
    bestAvg: avgVals.length ? Math.min(...avgVals) : null,
    bestSingle: singleVals.length ? Math.min(...singleVals) : null,
    lastRecordedAt: dates.length ? dates.sort().slice(-1)[0] : null,
  }
}

function buildRow(payload) {
  const row = {
    student_id: payload.studentId,
    project: payload.project,
    recorded_at: payload.recordedAt || new Date().toISOString().slice(0, 10),
    mode: payload.mode || 'detail',
    note: payload.note || null,
  }
  if (row.mode === 'detail') {
    const calc = computeAo5(payload.attempts || [])
    row.attempts = payload.attempts || null
    row.avg_seconds = calc.avgSeconds
    row.avg_is_dnf = calc.avgIsDnf
    row.single_best_seconds = calc.singleBestSeconds
    row.single_is_dnf = calc.singleIsDnf
  } else {
    row.attempts = null
    row.avg_seconds = payload.avgSeconds != null && payload.avgSeconds !== '' ? Number(payload.avgSeconds) : null
    row.avg_is_dnf = false
    row.single_best_seconds = payload.singleBestSeconds != null && payload.singleBestSeconds !== '' ? Number(payload.singleBestSeconds) : null
    row.single_is_dnf = false
  }
  return row
}

/** 新增 */
export async function createScore(payload) {
  const { data: auth } = await supabase.auth.getUser()
  const row = buildRow(payload)
  row.created_by = auth?.user?.id ?? null

  const { data, error } = await supabase.from(TABLES.scores).insert(row).select().single()
  if (error) throw new Error(errorMessage(error, '保存成绩失败'))
  return data
}

/** 修改 */
export async function updateScore(id, payload) {
  const row = buildRow(payload)
  const { data, error } = await supabase.from(TABLES.scores).update(row).eq('id', id).select().single()
  if (error) throw new Error(errorMessage(error, '保存成绩失败'))
  return data
}

/** 删除单条 */
export async function deleteScore(id) {
  const { error } = await supabase.from(TABLES.scores).delete().eq('id', id)
  if (error) throw new Error(errorMessage(error, '删除成绩失败'))
}

/**
 * 某学员的全部成绩（跨所有项目，按日期升序）。
 * 供「成长报告」统计测试次数、覆盖项目、里程碑与趋势使用。
 */
export async function listAllStudentScores(studentId) {
  const { data, error } = await supabase
    .from(TABLES.scores)
    .select('project,recorded_at,avg_seconds,avg_is_dnf,single_best_seconds,single_is_dnf,mode,note')
    .eq('student_id', studentId)
    .order('recorded_at', { ascending: true })
  if (error) throw new Error(errorMessage(error, '加载成绩失败'))
  return data || []
}

/** 聚合某学员在各魔方项目上的最佳平均成绩 / 最佳单次（用于段位评定与概览） */
export async function studentProjectBests({ studentId }) {
  const { data, error } = await supabase
    .from(TABLES.scores)
    .select('project,avg_seconds,avg_is_dnf,single_best_seconds,single_is_dnf')
    .eq('student_id', studentId)

  if (error) throw new Error(errorMessage(error, '加载成绩概览失败'))

  const map = {}
  for (const r of data || []) {
    const p = r.project
    map[p] = map[p] || { bestAvg: null, bestSingle: null }
    if (!r.avg_is_dnf && r.avg_seconds != null) {
      map[p].bestAvg = map[p].bestAvg == null ? Number(r.avg_seconds) : Math.min(map[p].bestAvg, Number(r.avg_seconds))
    }
    if (!r.single_is_dnf && r.single_best_seconds != null) {
      map[p].bestSingle = map[p].bestSingle == null ? Number(r.single_best_seconds) : Math.min(map[p].bestSingle, Number(r.single_best_seconds))
    }
  }
  return map
}

/** 批量删除（清空该学员该项目的全部成绩），返回被删条数 */
export async function bulkDeleteScores({ studentId, project }) {
  const { data, error } = await supabase
    .from(TABLES.scores)
    .delete({ count: 'exact' })
    .eq('student_id', studentId)
    .eq('project', project)
    .select('id')
  if (error) throw new Error(errorMessage(error, '清空成绩失败'))
  return (data || []).length
}

/** 生成 CSV 文本（含 BOM，便于 Excel 正确识别中文） */
export function buildScoreCsv(rows, studentName, projectLabel) {
  const head = ['学员姓名', '魔方项目', '日期', '平均成绩(秒)', '单次最佳(秒)', '模式', '备注']
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [head.join(',')]
  for (const r of rows || []) {
    const avg = r.avg_is_dnf ? 'DNF' : (r.avg_seconds != null ? Number(r.avg_seconds).toFixed(2) : '')
    const single = r.single_is_dnf ? 'DNF' : (r.single_best_seconds != null ? Number(r.single_best_seconds).toFixed(2) : '')
    lines.push([
      studentName,
      projectLabel,
      r.recorded_at,
      avg,
      single,
      r.mode === 'detail' ? '详细' : '简单',
      r.note || '',
    ].map(esc).join(','))
  }
  return '﻿' + lines.join('\n')
}
