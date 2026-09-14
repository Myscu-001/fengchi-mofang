import { supabase, errorMessage, TABLES } from '@/lib/supabase'

/** 判断是否为「表尚未创建」类错误，用于给出友好指引 */
export function isMissingTableError(err) {
  return /does not exist|PGRST205|schema cache|relation/i.test(err?.message || '')
}

/** 某学员的学习记录（按学习日期倒序） */
export async function listLearningLogs(studentId) {
  const { data, error } = await supabase
    .from(TABLES.learningLogs)
    .select('*')
    .eq('student_id', studentId)
    .order('learned_on', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(errorMessage(error, '加载学习记录失败'))
  return data || []
}

export async function createLearningLog(payload) {
  const { data: auth } = await supabase.auth.getUser()
  const row = {
    student_id: payload.studentId,
    learned_on: payload.learnedOn || new Date().toISOString().slice(0, 10),
    project: payload.project || null,
    content: String(payload.content || '').trim(),
    tags: payload.tags || [],
    created_by: auth?.user?.id ?? null,
  }
  const { data, error } = await supabase.from(TABLES.learningLogs).insert(row).select().single()
  if (error) throw new Error(errorMessage(error, '保存学习记录失败'))
  return data
}

export async function updateLearningLog(id, payload) {
  const patch = {
    learned_on: payload.learnedOn,
    project: payload.project || null,
    content: String(payload.content || '').trim(),
    tags: payload.tags || [],
  }
  const { data, error } = await supabase
    .from(TABLES.learningLogs)
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(errorMessage(error, '保存学习记录失败'))
  return data
}

export async function deleteLearningLog(id) {
  const { error } = await supabase.from(TABLES.learningLogs).delete().eq('id', id)
  if (error) throw new Error(errorMessage(error, '删除学习记录失败'))
}
