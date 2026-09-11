/**
 * 魔方段位体系（可后台编辑版）。
 *
 * 默认阈值写在 dict.js 的 CUBE_RANKS 中作为兜底；
 * 一旦管理员在「站点配置」保存过，则以 site_settings 的 `cube.ranks` 为准。
 * 全站（统计分析、学员详情）的段位展示都从这里读取，保证编辑后立即生效。
 */
import { ref } from 'vue'
import { CUBE_RANKS } from '@/lib/dict'
import { getSetting, saveSetting } from '@/api/settings'

/** 深拷贝默认段位，作为未配置时的兜底数据 */
function cloneDefault() {
  const out = {}
  for (const k of Object.keys(CUBE_RANKS)) {
    out[k] = CUBE_RANKS[k].map((t) => ({ ...t }))
  }
  return out
}

/** 机构可自定义的段位默认值（供「恢复默认」使用） */
export const DEFAULT_RANKS = cloneDefault()

const ranksRef = ref(cloneDefault())
let loaded = false

/** 应用启动时调用一次：从 site_settings 读取 cube.ranks，存在则覆盖默认 */
export function ensureRanksLoaded() {
  if (loaded) return Promise.resolve(ranksRef.value)
  loaded = true
  return getSetting('cube.ranks', null)
    .then((db) => {
      if (db && typeof db === 'object' && Object.keys(db).length) {
        const merged = cloneDefault()
        for (const k of Object.keys(merged)) {
          if (Array.isArray(db[k]) && db[k].length) {
            merged[k] = db[k].map((t, i) => ({
              key: t.key || `r${i + 1}`,
              label: (t.label ?? '').trim() || '段位',
              max: Number(t.max) || 0,
              color: t.color || '#93BC37',
            }))
          }
        }
        ranksRef.value = merged
      }
      return ranksRef.value
    })
    .catch(() => ranksRef.value)
}

/** 某项目的全部段位（由易到难），用于展示进度条 / 编辑 */
export function rankTiers(project) {
  return ranksRef.value[project] || []
}

/** 根据某项目最佳平均成绩(秒)返回达到的最高段位，未达标返回 null */
export function rankForProject(project, bestAvgSeconds) {
  if (bestAvgSeconds == null || Number.isNaN(Number(bestAvgSeconds))) return null
  const v = Number(bestAvgSeconds)
  const tiers = rankTiers(project)
  let met = null
  for (const t of tiers) {
    if (v < t.max) met = t
  }
  return met
}

/** 返回下一段位（展示「还差多少秒」），已是最高或未达到任何段位时返回 null */
export function nextRank(project, bestAvgSeconds) {
  const tiers = rankTiers(project)
  const current = rankForProject(project, bestAvgSeconds)
  if (!tiers.length) return null
  const idx = current ? tiers.findIndex((t) => t.key === current.key) : -1
  if (idx >= 0 && idx < tiers.length - 1) return tiers[idx + 1]
  return null
}

/** 清洗为可持久化结构（名称/秒数/颜色） */
function cleanRanks(ranks) {
  const out = {}
  for (const k of Object.keys(ranks)) {
    out[k] = (ranks[k] || []).map((t, i) => ({
      key: t.key || `r${i + 1}`,
      label: (t.label ?? '').trim() || '段位',
      max: Number(t.max) || 0,
      color: t.color || '#93BC37',
    }))
  }
  return out
}

/** 保存段位到 site_settings，并同步全局响应式数据 */
export async function saveRanks(ranks) {
  const clean = cleanRanks(ranks)
  await saveSetting('cube.ranks', clean, '魔方段位阈值（按项目最佳平均成绩 Ao5 的秒数）')
  ranksRef.value = cloneDefault()
  for (const k of Object.keys(ranksRef.value)) {
    if (clean[k]?.length) ranksRef.value[k] = clean[k]
  }
  return clean
}
