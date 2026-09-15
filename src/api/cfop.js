import { supabase, errorMessage, TABLES } from '@/lib/supabase'
import { saveSetting } from '@/api/settings'
import { useSiteStore } from '@/stores/site'

/** 图案存放在 site_settings：读=所有登录用户，写=仅超级管理员（settings.manage） */
export const CFOP_PATTERNS_KEY = 'cfop.patterns'

/** 判断是否为「表尚未创建」类错误，用于给出友好指引 */
export function isMissingTableError(err) {
  return /does not exist|PGRST205|schema cache|relation/i.test(err?.message || '')
}

/* ---------------- 图案（全局共享） ---------------- */

/**
 * 读取全局图案。
 * 直接复用 site store 已缓存的整份 site_settings —— 该 store 在应用启动时
 * 已把全表拉下来，这里再单独 getSetting 会多一次往返（Supabase 在新加坡，
 * 一次往返约 200~400ms）。store 未加载时会自动触发加载。
 */
export async function loadCfopPatterns() {
  try {
    const site = useSiteStore()
    const settings = await site.load()
    const v = settings?.[CFOP_PATTERNS_KEY]
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
  } catch {
    return {}
  }
}

/**
 * 保存全局图案。
 * 写库后必须同步 site store 的缓存，否则超管保存完图案，页面仍显示旧图。
 */
export async function saveCfopPatterns(patterns) {
  const next = patterns || {}
  await saveSetting(CFOP_PATTERNS_KEY, next)
  try {
    useSiteStore().patch(CFOP_PATTERNS_KEY, next)
  } catch {
    // 缓存同步失败不影响已经写入的结果
  }
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

/**
 * 只改动「某一个情况」的学习状态。
 *
 * 为什么不直接整份覆盖：如果两个老师同时开着同一个学员的页面，各自基于进页时的
 * 旧快照整份 upsert，后保存的那份会静默吞掉先保存的全部改动。
 *
 * 这里先读服务端最新值，只把自己要改的这一个 key 合并进去再写回，
 * 别人同时新增/修改的其他情况得以保留。
 *
 * @param {string} studentId
 * @param {string} key        形如 "oll:12"
 * @param {string|null} date  日期字符串；传 null 表示取消掌握（删除该 key）
 * @returns {Promise<Object>} 写回后的完整 learned，供调用方同步本地状态
 */
export async function setCfopLearned(studentId, key, date) {
  const current = await loadCfopProgress(studentId)
  const next = { ...current }
  if (date == null || date === '') delete next[key]
  else next[key] = date
  await saveCfopProgress(studentId, next)
  return next
}
