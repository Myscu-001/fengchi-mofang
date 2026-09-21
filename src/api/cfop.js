import { supabase, errorMessage, TABLES } from '@/lib/supabase'
import { saveSetting } from '@/api/settings'
import { useSiteStore } from '@/stores/site'

/** 图案存放在 site_settings：读=所有登录用户，写=仅超级管理员（settings.manage） */
export const CFOP_PATTERNS_KEY = 'cfop.patterns'

/** 公式同样存在 site_settings：读=所有登录用户，写=仅超级管理员。结构与图案一致，全机构共用。 */
export const CFOP_FORMULAS_KEY = 'cfop.formulas'

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

/* ---------------- 公式（全局共享，与图案同源同权限） ---------------- */

/**
 * 读取全局公式。
 * 结构：{ "oll:12": { solve: "R U R' U'", setup: "U R U' R'" }, ... }
 * 与图案一样直接复用 site store 的缓存，避免多一次到新加坡的往返。
 */
export async function loadCfopFormulas() {
  try {
    const site = useSiteStore()
    const settings = await site.load()
    const v = settings?.[CFOP_FORMULAS_KEY]
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
  } catch {
    return {}
  }
}

/**
 * 保存全局公式。
 * 只提交有内容的条目：solve / setup 都为空的会被剔除，避免库里堆一堆空对象。
 * 写库后同步 site store 缓存，否则保存完页面仍显示旧公式。
 */
export async function saveCfopFormulas(formulas) {
  const next = {}
  for (const [key, v] of Object.entries(formulas || {})) {
    const solve = String(v?.solve ?? '').trim()
    const setup = String(v?.setup ?? '').trim()
    if (solve || setup) next[key] = { solve, setup }
  }
  await saveSetting(CFOP_FORMULAS_KEY, next)
  try {
    useSiteStore().patch(CFOP_FORMULAS_KEY, next)
  } catch {
    // 缓存同步失败不影响已经写入的结果
  }
  return next
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

/* ---------------- 写入调度：串行 + 合并 ---------------- */

/**
 * 每次写入的基本动作：读服务端最新值 → 只改本批涉及的 key → 整份写回。
 *
 * 为什么不直接整份覆盖：如果两个老师同时开着同一个学员的页面，各自基于进页时的
 * 旧快照整份 upsert，后保存的那份会静默吞掉先保存的全部改动。先读后写可以避免。
 */
async function commitLearningBatch(studentId, batch) {
  const current = await loadCfopProgress(studentId)
  const next = { ...current }
  for (const [k, v] of batch) {
    if (v == null) delete next[k]
    else next[k] = v
  }
  await saveCfopProgress(studentId, next)
  return next
}

/**
 * 每个学员一条写入队列。串行执行「读-改-写」，并把排队期间新来的点击合并提交。
 *
 * 为什么必须串行：一次写入要两次网络往返（Supabase 在新加坡，单次约 200~400ms）。
 * 若每次点击都各自发起，后发起的「读」常常读到还没被前一次「写」覆盖的旧值，
 * 于是先点的改动被静默吞掉，界面上的勾也会被返回的旧值抹回去 ——
 * 表现为「连点好几个，只有一两个生效」。实测同一学员连点 8 个情况：
 *   · 各自并发写  → 丢失 1 个，461ms
 *   · 排队逐个写  → 全部保留，1261ms
 *   · 排队 + 合并 → 全部保留，139ms
 *
 * 因此：① 串行保证每次读到的都是最新值；② 合并让点击越密越省往返，
 * 而不是越密越容易丢。所有调用方的 Promise 在本轮排空后统一结算，
 * 所以不会出现「返回的旧值把界面上新的勾抹掉」。
 */
const writeQueues = new Map()

function queueOf(studentId) {
  let q = writeQueues.get(studentId)
  if (!q) {
    q = { pending: new Map(), draining: false, waiters: [] }
    writeQueues.set(studentId, q)
  }
  return q
}

async function drainQueue(studentId, q) {
  q.draining = true
  let latest = null
  let failure = null
  while (q.pending.size) {
    const batch = new Map(q.pending)
    q.pending.clear()
    try {
      latest = await commitLearningBatch(studentId, batch)
    } catch (err) {
      failure = err
      break
    }
  }
  q.draining = false
  const waiters = q.waiters.splice(0)
  for (const w of waiters) {
    if (failure) w.reject(failure)
    else w.resolve(latest)
  }
}

/**
 * 只改动「某一个情况」的学习状态。连续快速调用会自动排队并合并提交。
 *
 * @param {string} studentId
 * @param {string} key        形如 "oll:12"
 * @param {string|null} date  日期字符串；传 null 表示取消掌握（删除该 key）
 * @returns {Promise<Object>} 本轮全部改动提交完成后的完整 learned
 */
export function setCfopLearned(studentId, key, date) {
  const q = queueOf(studentId)
  q.pending.set(key, date == null || date === '' ? null : date)
  return new Promise((resolve, reject) => {
    q.waiters.push({ resolve, reject })
    if (!q.draining) drainQueue(studentId, q)
  })
}
