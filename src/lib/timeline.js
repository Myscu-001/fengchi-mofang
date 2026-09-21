/**
 * 学员成长时间线 —— 把散落在各表里的数据算成一条按时间倒序的事件流。
 *
 * 设计要点：
 *  1. **零依赖**：本文件不 import 任何模块（常量与段位阈值全部由调用方传入），
 *     因此可以用 node 直接跑单测 —— 这里的「首次/跨线/去重」判定最容易算错，
 *     必须能脱离浏览器验证。
 *  2. **不改数据库**：所有事件都是从已有数据推导出来的，老师不需要多录任何东西。
 *       · 成绩   → student_scores（首次记录 / 破 PB / 段位晋级 / 目标达成）
 *       · 上课   → student_learning_logs
 *       · CFOP   → cfop_progress（按 F2L/OLL/PLL 三个阶段算里程碑）
 *       · 入班   → students.joined_at
 */

/* ============================ 基础工具 ============================ */

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** 从任意时间值里取 `YYYY-MM-DD`；取不到返回空串 */
export function dayOf(v) {
  const s = String(v ?? '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''
}

/** 日期串 → 可比较的数字（20260919），比 Date 解析更快也更稳 */
function dayNum(day) {
  return Number(day.replace(/-/g, ''))
}

/** 本地「今天」的日期串 */
export function todayOf(now = new Date()) {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

/** N 个月前的日期串（用于「默认只加载最近 12 个月」） */
export function monthsAgoDay(months, now = new Date()) {
  const d = new Date(now)
  d.setMonth(d.getMonth() - months)
  return todayOf(d)
}

/** 相差天数（a - b） */
export function diffDays(a, b) {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000)
}

/** 天数 → 「3 个月 7 天」这样的中文跨度 */
export function humanSpan(days) {
  if (!Number.isFinite(days)) return ''
  if (days <= 0) return '当天'
  if (days < 31) return `${days} 天`
  const y = Math.floor(days / 365)
  const restAfterYear = days - y * 365
  const mo = Math.floor(restAfterYear / 30)
  const d = restAfterYear - mo * 30
  const parts = []
  if (y) parts.push(`${y} 年`)
  if (mo) parts.push(`${mo} 个月`)
  // 只有「年 + 月」都齐了才省略天数，否则「1 年」会丢掉 16 天这种有用信息
  if (d && !(y && mo)) parts.push(`${d} 天`)
  return parts.join(' ') || `${days} 天`
}

/** 秒 → 「13.76s」 */
export function fmtSec(v) {
  return `${Number(v).toFixed(2)}s`
}

export function monthKeyOf(day) {
  return day.slice(0, 7)
}

export function monthLabelOf(ym) {
  const [y, m] = ym.split('-')
  return `${y} 年 ${Number(m)} 月`
}

export function yearOf(day) {
  return day.slice(0, 4)
}

/* ============================ 事件类型 ============================ */

/** 可筛选的事件类型（顺序 = 筛选条顺序） */
export const TIMELINE_TYPES = [
  { key: 'pb', label: '成绩', color: '#E8564F', tint: '#FFE5E3' },
  { key: 'class', label: '上课', color: '#34B4E2', tint: '#E4F4F8' },
  { key: 'rank', label: '晋级', color: '#F2A024', tint: '#FDF3E1' },
  { key: 'goal', label: '目标', color: '#93BC37', tint: '#EAF3E0' },
  { key: 'cfop', label: 'CFOP', color: '#9B6FE0', tint: '#EEEBFD' },
]

/** 「加入机构」自成一类，不在筛选条里，但「全部」会显示 */
export const TIMELINE_START = { key: 'start', label: '入班', color: '#64748B', tint: '#EEF0F3' }

export function typeMeta(key) {
  return TIMELINE_TYPES.find((t) => t.key === key) || (key === 'start' ? TIMELINE_START : TIMELINE_TYPES[0])
}

/** 同一天多条事件时的排列权重（里程碑在前） */
const SAME_DAY_ORDER = { rank: 0, goal: 1, pb: 2, cfop: 3, class: 4, start: 9 }

/* ============================ 主算法 ============================ */

/**
 * @param {Object}   opts
 * @param {Object}   opts.student       学员行（读 joined_at / level）
 * @param {Array}    opts.scores        student_scores 全量（跨项目）
 * @param {Array}    opts.logs          student_learning_logs
 * @param {Object}   opts.cfopLearned   { "oll:12": "2026-09-15", ... }
 * @param {Object}   opts.goals         { "3x3": { type, target, baseline, due, note } }
 * @param {Array}    opts.projects      CUBE_PROJECTS（外部注入，保持零依赖）
 * @param {Array}    opts.cfopGroups    CFOP_GROUPS
 * @param {Function} opts.tiersOf       (project) => 段位数组（由易到难）
 * @param {Date}     opts.now
 * @returns {{ events: Array, summary: Object }}
 */
export function buildTimeline(opts = {}) {
  const {
    student = null,
    scores = [],
    logs = [],
    cfopLearned = {},
    goals = {},
    projects = [],
    cfopGroups = [],
    tiersOf = () => [],
    now = new Date(),
  } = opts

  const events = []
  const projMeta = (v) => projects.find((p) => p.value === v) || null
  const projLabel = (v) => projMeta(v)?.label || '该项目'

  let pbCount = 0
  let rankCount = 0

  /* ---------- 1. 成绩：首次记录 / 破 PB / 晋级 / 目标达成 ---------- */

  const byProject = {}
  for (const row of scores) {
    const p = row?.project
    if (!p) continue
    if (!byProject[p]) byProject[p] = []
    byProject[p].push(row)
  }

  for (const [proj, rows] of Object.entries(byProject)) {
    const label = projLabel(proj)
    const tiers = tiersOf(proj) || []
    const goal = goals?.[proj] || null

    const sorted = rows
      .map((r) => ({ row: r, day: dayOf(r.recorded_at) }))
      .filter((x) => x.day)
      .sort((a, b) => dayNum(a.day) - dayNum(b.day))

    let bestSingle = null
    let bestAvg = null
    let firstAvg = null
    let firstAvgDay = ''
    let firstLogged = false
    let maxTierIdx = -1
    let lastRankDay = ''
    let goalDone = false

    for (const { row, day } of sorted) {
      const single =
        !row.single_is_dnf && Number(row.single_best_seconds) > 0 ? Number(row.single_best_seconds) : null
      const avg = !row.avg_is_dnf && Number(row.avg_seconds) > 0 ? Number(row.avg_seconds) : null
      if (single == null && avg == null) continue

      /* 首次成绩记录（时间线起点） */
      if (!firstLogged) {
        firstLogged = true
        const desc = []
        if (avg != null) {
          desc.push({ t: `${label}平均 ` }, { t: fmtSec(avg), b: true }, { t: ' —— 这是时间线的起点成绩。' })
        } else {
          desc.push({ t: `${label}单次 ` }, { t: fmtSec(single), b: true }, { t: ' —— 这是时间线的起点成绩。' })
        }
        events.push({
          type: 'pb',
          date: day,
          project: proj,
          big: true,
          milestone: false,
          title: '首次成绩记录',
          desc,
          tags: [label, '起点'],
        })
      }

      /* 破 PB（单次） */
      if (single != null && (bestSingle == null || single < bestSingle)) {
        const prev = bestSingle
        bestSingle = single
        if (prev != null) {
          pbCount += 1
          events.push({
            type: 'pb',
            date: day,
            project: proj,
            big: true,
            milestone: false,
            title: `破 PB · 单次 ${fmtSec(single)}`,
            desc: [
              { t: '比上次 ' },
              { t: fmtSec(prev) },
              { t: ' 快了 ' },
              { t: `${(prev - single).toFixed(2)}s`, hl: true },
              { t: '。' },
            ],
            tags: [label],
          })
        }
      }

      if (avg == null) continue

      if (bestAvg == null || avg < bestAvg) bestAvg = avg
      if (firstAvg == null) {
        firstAvg = avg
        firstAvgDay = day
      }

      /* 段位晋级：按「最佳平均」跨过阈值 */
      let idx = -1
      for (let i = 0; i < tiers.length; i += 1) {
        if (bestAvg < Number(tiers[i].max)) idx = i
      }
      if (idx > maxTierIdx) {
        const tier = tiers[idx]
        const next = tiers[idx + 1] || null
        const desc = [
          { t: `${label}最佳平均 ` },
          { t: fmtSec(bestAvg), b: true },
          { t: `，跨过 ${tier.max}s 门槛。` },
        ]
        if (lastRankDay && lastRankDay !== day) {
          desc.push({ t: ` 从上一段位到这一段用了 ` }, { t: humanSpan(diffDays(day, lastRankDay)), hl: true }, { t: '。' })
        }
        events.push({
          type: 'rank',
          date: day,
          project: proj,
          big: true,
          milestone: true,
          accent: tier.color,
          title: `晋级 · ${tier.label}`,
          desc,
          tags: [
            label,
            next
              ? `距「${next.label}」还差 ${Math.max(0, bestAvg - Number(next.max)).toFixed(2)}s`
              : '已达最高段位',
          ],
        })
        maxTierIdx = idx
        lastRankDay = day
        rankCount += 1
      }

      /* 目标达成：最佳平均首次达到目标值 */
      if (goal && !goalDone && goal.type === 'time') {
        const target = Number(goal.target)
        if (target > 0 && bestAvg <= target) {
          goalDone = true
          const base = Number(goal.baseline) > 0 ? Number(goal.baseline) : firstAvg
          const desc = [
            { t: '起始 ' },
            { t: fmtSec(base) },
            { t: ' → 现在 ' },
            { t: fmtSec(bestAvg), b: true },
          ]
          const due = dayOf(goal.due)
          if (due) {
            const ahead = diffDays(due, day)
            if (ahead > 0) desc.push({ t: '，' }, { t: `提前 ${ahead} 天`, hl: true }, { t: '完成' })
            else if (ahead === 0) desc.push({ t: '，正好按期完成' })
            else desc.push({ t: '，比预期晚了 ' }, { t: `${-ahead} 天`, hl: true })
          }
          if (firstAvgDay) desc.push({ t: `，历时 ${humanSpan(diffDays(day, firstAvgDay))}` })
          desc.push({ t: '。' })
          events.push({
            type: 'goal',
            date: day,
            project: proj,
            big: true,
            milestone: true,
            title: `目标达成 · ${label}平均 SUB${target}`,
            desc,
            tags: [label],
          })
        }
      }
    }
  }

  /* ---------- 2. CFOP 里程碑（按阶段） ---------- */

  for (const g of cfopGroups) {
    const days = []
    for (let i = 1; i <= g.count; i += 1) {
      const d = dayOf(cfopLearned[`${g.key}:${i}`])
      if (d) days.push(d)
    }
    if (!days.length) continue
    days.sort((a, b) => dayNum(a) - dayNum(b))
    const first = days[0]
    const last = days[days.length - 1]
    const done = days.length >= g.count

    events.push({
      type: 'cfop',
      date: first,
      project: null,
      big: false,
      milestone: false,
      title: `开始学 ${g.title}`,
      desc: [{ t: `${g.desc} —— 从这里开始逐个记录掌握情况。` }],
      tags: [`CFOP · ${g.title}`],
    })

    for (const pct of [25, 50, 75]) {
      const need = Math.ceil((g.count * pct) / 100)
      if (need <= 1 || days.length < need) continue
      const d = days[need - 1]
      if (d === first) continue
      if (done && d === last) continue
      events.push({
        type: 'cfop',
        date: d,
        project: null,
        big: false,
        milestone: false,
        title: `${g.title} 掌握 ${need} / ${g.count}`,
        desc: [{ t: `累计掌握 ${need} 个，占 ${g.title} 全部情况的 ${pct}%。` }],
        tags: [`CFOP · ${g.title}`],
      })
    }

    if (done) {
      events.push({
        type: 'cfop',
        date: last,
        project: null,
        big: true,
        milestone: false,
        title: `${g.title} 全部掌握 ${g.count} / ${g.count}`,
        desc: [{ t: `${g.title} 阶段完成，${g.count} 个情况全部掌握。` }],
        tags: [`CFOP · ${g.title}`],
      })
    }
  }

  /* ---------- 3. 上课记录（按时间正序编号，「第 N 课」） ---------- */

  const logRows = logs
    .map((l, i) => ({ log: l, idx: i, day: dayOf(l.learned_on) || dayOf(l.created_at) }))
    .filter((x) => x.day)
    .sort((a, b) => dayNum(a.day) - dayNum(b.day) || a.idx - b.idx)

  logRows.forEach(({ log, day }, i) => {
    const meta = projMeta(log.project)
    const tags = []
    if (meta) tags.push(meta.label)
    for (const t of Array.isArray(log.tags) ? log.tags : []) {
      if (t && !tags.includes(t)) tags.push(t)
    }
    const content = String(log.content || '').trim()
    events.push({
      type: 'class',
      date: day,
      project: log.project || null,
      big: false,
      milestone: false,
      title: `第 ${i + 1} 课`,
      desc: content ? [{ t: content }] : [],
      tags,
    })
  })

  /* ---------- 4. 加入机构 ---------- */

  const joined = dayOf(student?.joined_at)
  if (joined) {
    events.push({
      type: 'start',
      date: joined,
      project: null,
      big: false,
      milestone: false,
      title: '加入风驰思维',
      desc: [{ t: '入学时水平：' }, { t: student?.level || '未填写', b: true }],
      tags: ['起点'],
    })
  }

  /* ---------- 排序 + 编号 ---------- */

  events.sort(
    (a, b) =>
      dayNum(b.date) - dayNum(a.date) ||
      (SAME_DAY_ORDER[a.type] ?? 9) - (SAME_DAY_ORDER[b.type] ?? 9),
  )
  events.forEach((e, i) => {
    e.id = `${e.type}-${i}`
  })

  /* ---------- 全程小结 ---------- */

  const today = todayOf(now)
  const progress = Object.entries(byProject)
    .map(([proj]) => proj)
    .sort((a, b) => projects.findIndex((p) => p.value === a) - projects.findIndex((p) => p.value === b))
    .map((proj) => {
      const rows = byProject[proj]
        .map((r) => ({
          day: dayOf(r.recorded_at),
          avg: !r.avg_is_dnf && Number(r.avg_seconds) > 0 ? Number(r.avg_seconds) : null,
        }))
        .filter((r) => r.day && r.avg != null)
        .sort((a, b) => dayNum(a.day) - dayNum(b.day))
      if (!rows.length) return null
      const from = rows[0].avg
      const to = Math.min(...rows.map((r) => r.avg))
      if (!(from > to)) return null
      // 秒数保留两位，顺手消掉 58.3 - 22.1 = 36.199999999999996 这类浮点尾差
      const r2 = (n) => Math.round(n * 100) / 100
      return { project: proj, label: projLabel(proj), from: r2(from), to: r2(to), delta: r2(to - from) }
    })
    .filter(Boolean)

  const summary = {
    total: events.length,
    milestoneCount: events.filter((e) => e.milestone).length,
    classCount: logRows.length,
    scoreCount: scores.filter((r) => dayOf(r?.recorded_at)).length,
    pbCount,
    rankCount,
    monthsFromJoin: joined ? humanSpan(diffDays(today, joined)) : '',
    progress,
    years: [...new Set(events.map((e) => yearOf(e.date)))].sort((a, b) => b.localeCompare(a)),
  }

  return { events, summary }
}

/** 事件流 → 按月分组（保持倒序） */
export function groupByMonth(events = []) {
  const out = []
  let cur = null
  for (const e of events) {
    const key = monthKeyOf(e.date)
    if (!cur || cur.key !== key) {
      cur = { key, label: monthLabelOf(key), items: [] }
      out.push(cur)
    }
    cur.items.push(e)
  }
  return out
}
