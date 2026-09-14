import { supabase, errorMessage, TABLES } from '@/lib/supabase'
import { getSetting, saveSetting } from '@/api/settings'

/** 图案存放在 site_settings：读=所有登录用户，写=仅超级管理员（settings.manage） */
export const CFOP_PATTERNS_KEY = 'cfop.patterns'

/** 判断是否为「表尚未创建」类错误，用于给出友好指引 */
export function isMissingTableError(err) {
  return /does not exist|PGRST205|schema cache|relation/i.test(err?.message || '')
}

/* ---------------- 图案（全局共享） ---------------- */

export async function loadCfopPatterns() {
  try {
    const v = await getSetting(CFOP_PATTERNS_KEY, null)
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
  } catch {
    return {}
  }
}

export async function saveCfopPatterns(patterns) {
  await saveSetting(CFOP_PATTERNS_KEY, patterns || {})
}

/* ---------------- 学习进度（按学员） ---------------- */

export async function loadCfopProgress(studentId) {
  const { data, error } = await supabase
    .from(TABLES.cfopProgress)
    .select('learned_keys')
    .eq('student_id', studentId)
    .maybeSingle()
  if (error) throw new Error(errorMessage(error, '加载 CFOP 学习进度失败'))
  return new Set(data?.learned_keys || [])
}

export async function saveCfopProgress(studentId, keys) {
  const { data: auth } = await supabase.auth.getUser()
  const { error } = await supabase.from(TABLES.cfopProgress).upsert(
    {
      student_id: studentId,
      learned_keys: Array.from(keys || []),
      updated_by: auth?.user?.id ?? null,
    },
    { onConflict: 'student_id' },
  )
  if (error) throw new Error(errorMessage(error, '保存 CFOP 学习进度失败'))
}
