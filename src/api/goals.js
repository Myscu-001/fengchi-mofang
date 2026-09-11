import { getSetting, saveSetting } from '@/api/settings'

/**
 * 学员训练目标。
 * 存储位置：site_settings 的 `student.goals`（key-value 存储，无需新增数据表）。
 * 结构：{ [studentId]: { [project]: { type:'time'|'rank', target, baseline, due, note } } }
 *   - type='time'：target 为目标平均成绩(秒)，baseline 为设定时的起始成绩(秒)
 *   - type='rank'：target 为目标段位 key（见 CUBE_RANKS）
 * 读取对所有登录用户开放；写入需要 settings.manage 权限（即超级管理员）。
 */
export const GOALS_KEY = 'student.goals'

export async function loadGoals() {
  const v = await getSetting(GOALS_KEY, {})
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
}

export async function saveGoals(map) {
  return saveSetting(GOALS_KEY, map || {}, '学员训练目标（按学员与魔方项目）')
}
