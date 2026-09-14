/**
 * CFOP 知识点清单：常量与图形渲染。
 *
 * 与「图案编辑器」共用同一套渲染逻辑，保证编辑时所见 = 清单里所得。
 * 三种视图模板：
 *   - top9  顶面 3×3（9 格）
 *   - top21 顶面 3×3 + 一圈侧面长条（21 格）
 *   - f2l   立体魔方（顶面 9 + 左面 9 + 右面 9 = 27 格）
 *
 * 颜色以「颜色名」存储（yellow/white/red/orange/blue/green/grey），
 * 因此调整色值不会影响已保存的图案数据。
 */

export const CFOP_GREY = '#888888'

export const CFOP_COLORS = [
  { key: 'yellow', hex: '#FFFF00', name: '黄' },
  { key: 'white', hex: '#FFFFFF', name: '白' },
  { key: 'red', hex: '#C41E3A', name: '红' },
  { key: 'orange', hex: '#FF7A00', name: '橙' },
  { key: 'blue', hex: '#0051BA', name: '蓝' },
  { key: 'green', hex: '#009E60', name: '绿' },
  { key: 'grey', hex: CFOP_GREY, name: '灰/空' },
]

export const CFOP_HEX = CFOP_COLORS.reduce((m, c) => {
  m[c.key] = c.hex
  return m
}, {})

/** PLL 21 个情况的标准名称 */
export const PLL_NAMES = [
  'Aa', 'Ab', 'E', 'Ua', 'Ub', 'H', 'Z', 'T', 'F', 'Ja', 'Jb',
  'Ra', 'Rb', 'Ga', 'Gb', 'Gc', 'Gd', 'Na', 'Nb', 'V', 'Y',
]

export const CFOP_GROUPS = [
  { key: 'f2l', title: 'F2L', desc: '第一层与第二层一次完成', count: 41, color: '#34B4E2', tpl: 'f2l' },
  { key: 'oll', title: 'OLL', desc: '顶层朝向 — 让黄面朝上', count: 57, color: '#F2A024', tpl: 'top21' },
  { key: 'pll', title: 'PLL', desc: '顶层顺序 — 让顶面完全归位', count: 21, color: '#EA625F', tpl: 'top21' },
]

export const CFOP_TOTAL = CFOP_GROUPS.reduce((s, g) => s + g.count, 0)

/* ---------- 全部情况（共 119 个） ---------- */
export const CFOP_CASES = (() => {
  const list = []
  for (const g of CFOP_GROUPS) {
    for (let i = 0; i < g.count; i++) {
      const label = g.key === 'pll' ? PLL_NAMES[i] : String(i + 1)
      list.push({
        key: `${g.key}:${i + 1}`,
        group: g.key,
        index: i,
        label,
        title: `${g.title} ${label}`,
        defaultTpl: g.tpl,
      })
    }
  }
  return list
})()

const CASE_MAP = CFOP_CASES.reduce((m, c) => {
  m[c.key] = c
  return m
}, {})

export function cfopCaseByKey(key) {
  return CASE_MAP[key] || null
}

export function cfopSlot(groupKey, index) {
  return `${groupKey}:${index + 1}`
}

/* ---------- 模板 ---------- */
export function tplCellCount(tpl) {
  return tpl === 'f2l' ? 27 : tpl === 'top21' ? 21 : 9
}

export function blankCells(tpl) {
  return new Array(tplCellCount(tpl)).fill('grey')
}

export function defaultCells(tpl) {
  const cells = blankCells(tpl)
  if (tpl === 'top9') {
    for (let i = 0; i < 9; i++) cells[i] = 'yellow'
  }
  return cells
}

/* top21：5×5 轨道中的 21 个有效格；四角为留空 */
export const TOP21_POS = [
  [1, 1], [1, 2], [1, 3], [2, 1], [2, 2], [2, 3], [3, 1], [3, 2], [3, 3],
  [0, 1], [0, 2], [0, 3],
  [1, 4], [2, 4], [3, 4],
  [4, 1], [4, 2], [4, 3],
  [1, 0], [2, 0], [3, 0],
]

/** 未涂自定义图案时的占位示意（侧面留灰，避免误导） */
export function placeholderCells(seed, tpl) {
  const n = tplCellCount(tpl)
  if (tpl === 'f2l') return new Array(n).fill('grey')
  let s = (seed * 2654435761) % 2147483647
  if (s <= 0) s += 2147483646
  const rnd = () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
  const out = []
  for (let i = 0; i < n; i++) {
    const isTop = tpl === 'top21' ? i < 9 : true
    if (!isTop) {
      out.push('grey')
      continue
    }
    out.push(i === 4 ? 'yellow' : rnd() < 0.5 ? 'yellow' : 'grey')
  }
  return out
}

/* ---------- 外观参数 ---------- */
const LINE = '#111' /* 格子之间的分隔线 */
const NOTCH = '#fff' /* 四角留空（与卡片底色一致） */

export function cfopSideThickness(base) {
  return Math.max(2, Math.round(base / 3))
}
function gapPx(base) {
  return base >= 24 ? 1.5 : 1
}
function insetPx(base) {
  return base >= 24 ? 0.8 : 0.5
}
function radiusTop(base) {
  return Math.max(2, Math.round(base * 0.24))
}
function radiusSide(base) {
  return Math.max(1, Math.round(cfopSideThickness(base) * 0.32))
}

function top21Style(base) {
  const s = cfopSideThickness(base)
  return (
    `display:grid;gap:${gapPx(base)}px;width:fit-content;background:${LINE};--inset:${insetPx(base)}px;` +
    `grid-template-columns:${s}px ${base}px ${base}px ${base}px ${s}px;` +
    `grid-template-rows:${s}px ${base}px ${base}px ${base}px ${s}px;`
  )
}
function flatGridStyle(base) {
  return (
    `display:grid;gap:${gapPx(base)}px;grid-template-columns:repeat(3,${base}px);grid-auto-rows:${base}px;` +
    `width:fit-content;background:${LINE};--inset:${insetPx(base)}px;`
  )
}
function stickerDiv(colorKey, radius) {
  const hex = CFOP_HEX[colorKey] || CFOP_GREY
  return `<div class="stk" style="background:${hex};border-radius:${radius == null ? 2 : radius}px"></div>`
}
function notchCell() {
  return `<div style="background:${NOTCH}"></div>`
}

/* ---------- 立体魔方（等轴测投影） ---------- */
export function cubeSVG(cells, base, opts = {}) {
  const bw = opts.border == null ? 1 : opts.border
  const R = { x: base * 0.866, y: base * 0.5 }
  const L = { x: -base * 0.866, y: base * 0.5 }
  const D = { x: 0, y: base }
  const m = 1.5
  const O = { x: m + 3 * base * 0.866, y: m }
  const W = 6 * base * 0.866 + 2 * m
  const H = 6 * base + 2 * m

  const poly = (o, v1, v2, idx) => {
    const a = o
    const b = { x: o.x + v1.x, y: o.y + v1.y }
    const c = { x: b.x + v2.x, y: b.y + v2.y }
    const d = { x: o.x + v2.x, y: o.y + v2.y }
    const hex = CFOP_HEX[cells[idx]] || CFOP_GREY
    return (
      `<polygon ${opts.interactive ? `class="po" data-i="${idx}" ` : ''}` +
      `points="${a.x.toFixed(1)},${a.y.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)} ` +
      `${c.x.toFixed(1)},${c.y.toFixed(1)} ${d.x.toFixed(1)},${d.y.toFixed(1)}" ` +
      `fill="${hex}" stroke="#111" stroke-width="${bw}" stroke-linejoin="round"/>`
    )
  }

  let out = `<svg width="${Math.round(W)}" height="${Math.round(H)}" viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}" xmlns="http://www.w3.org/2000/svg">`
  let i
  let j
  /* 顶面 0-8 */
  for (i = 0; i < 3; i++) {
    for (j = 0; j < 3; j++) {
      out += poly({ x: O.x + i * L.x + j * R.x, y: O.y + i * L.y + j * R.y }, R, L, i * 3 + j)
    }
  }
  /* 左面 9-17 */
  for (i = 0; i < 3; i++) {
    for (j = 0; j < 3; j++) {
      const o = { x: O.x + 3 * L.x + i * R.x + j * D.x, y: O.y + 3 * L.y + i * R.y + j * D.y }
      out += poly(o, R, D, 9 + i * 3 + j)
    }
  }
  /* 右面 18-26 */
  for (i = 0; i < 3; i++) {
    for (j = 0; j < 3; j++) {
      const o = { x: O.x + 3 * R.x + i * L.x + j * D.x, y: O.y + 3 * R.y + i * L.y + j * D.y }
      out += poly(o, L, D, 18 + i * 3 + j)
    }
  }
  return out + '</svg>'
}

/** 只读图形（清单展示用） */
export function figureHTML(tpl, cells, px) {
  if (tpl === 'f2l') {
    return `<div class="fig">${cubeSVG(cells, Math.max(8, px - 1), { border: 1 })}</div>`
  }
  if (tpl === 'top21') {
    const map = {}
    for (let m = 0; m < 21; m++) {
      map[`${TOP21_POS[m][0]},${TOP21_POS[m][1]}`] = { i: m, c: cells[m] || 'grey' }
    }
    let html = `<div class="fig"><div style="${top21Style(px)}">`
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const k = map[`${r},${c}`]
        if (!k) {
          html += notchCell()
          continue
        }
        html += stickerDiv(k.c, k.i < 9 ? radiusTop(px) : radiusSide(px))
      }
    }
    return html + '</div></div>'
  }
  let out = `<div class="fig"><div style="${flatGridStyle(px)}">`
  for (let i = 0; i < 9; i++) out += stickerDiv(cells[i] || 'grey', radiusTop(px))
  return out + '</div></div>'
}

/** 可交互涂色区（编辑器用） */
export function painterHTML(tpl, cells, base) {
  if (tpl === 'f2l') {
    return `<div class="fig">${cubeSVG(cells, base, { interactive: true, border: 1.3 })}</div>`
  }
  if (tpl === 'top21') {
    const map = {}
    for (let m = 0; m < 21; m++) {
      map[`${TOP21_POS[m][0]},${TOP21_POS[m][1]}`] = { i: m, c: cells[m] || 'grey' }
    }
    let html = `<div style="${top21Style(base)}">`
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const k = map[`${r},${c}`]
        if (!k) {
          html += notchCell()
          continue
        }
        const radius = k.i < 9 ? radiusTop(base) : radiusSide(base)
        const hex = CFOP_HEX[k.c] || CFOP_GREY
        html += `<div class="pcell" data-i="${k.i}" style="background:${hex};border-radius:${radius}px"></div>`
      }
    }
    return html + '</div>'
  }
  let out = `<div style="${flatGridStyle(base)}">`
  for (let i = 0; i < 9; i++) {
    const hex = CFOP_HEX[cells[i]] || CFOP_GREY
    out += `<div class="pcell" data-i="${i}" style="background:${hex};border-radius:${radiusTop(base)}px"></div>`
  }
  return out + '</div>'
}

/** 编辑器用的三档视图模板 */
export const CFOP_TEMPLATES = [
  { value: 'top9', label: '顶面 3×3', hint: '9 格' },
  { value: 'top21', label: '顶面 + 一圈侧面', hint: '21 格（侧面为长条）' },
  { value: 'f2l', label: '立体魔方（顶+左+右）', hint: '27 格' },
]
