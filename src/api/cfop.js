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

/**
 * 读取某学员的 CFOP 掌握情况
 * @returns {Promise<Object>} { "oll:12": "2026-09-15", ... }（旧数据可能为空字符串）
 */
export async function loadCfopProgress(studentId) {
  const { data, error } = await supabase
    .from(TABLES.cfopProgress)
    .select('learned')
    .eq('student_id', studentId)
    .maybeSingle()
  if (error) throw new Error(errorMessage(error, '加载 CFOP 学习进度失败'))

  const out = {}
  const learned = data?.learned
  if (learned && typeof learned === 'object' && !Array.isArray(learned)) {
    for (const [k, v] of Object.entries(learned)) {
      out[k] = typeof v === 'string' ? v : ''
    }
  }
  return out
}

/** 保存某学员的 CFOP 掌握情况（整份覆盖） */
export async function saveCfopProgress(studentId, learned) {
  const { data: auth } = await supabase.auth.getUser()
  const { error } = await supabase.from(TABLES.cfopProgress).upsert(
    {
      student_id: studentId,
      learned: learned || {},
      updated_by: auth?.user?.id ?? null,
    },
    { onConflict: 'student_id' },
  )
  if (error) throw new Error(errorMessage(error, '保存 CFOP 学习进度失败'))
}
