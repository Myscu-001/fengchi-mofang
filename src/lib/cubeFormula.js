/**
 * 魔方公式记号（Singmaster notation）的解析与求逆。
 *
 * 只做纯文本处理，不涉及任何魔方状态模拟：
 *   · tokenizeFormula —— 把 "R U R' U'" 拆成 [{base:'R',mod:''}, ...]
 *   · formatFormula   —— 规范成单空格分隔，去掉多余空白与换行
 *   · invertFormula   —— 逆公式：整体倒序 + 每步取逆（X→X'、X'→X、X2→X2）
 *   · formulaSteps    —— 步数（不含整体旋转 x/y/z）
 *
 * 识别不了的字符（如括号、逗号、中文注释）会被原样保留为 literal token，
 * 保证用户随手写的格式不会因为解析失败而丢内容。
 */

/* 面 R L U D F B；宽层 Rw/Lw… 与 r/l/u…；中层 M E S；整体旋转 x y z。
   修饰符 2 / ' / 2'（2' 等价于 2）。
   注意 [RLUDFB]w 必须排在 [RLUDFB] 之前，否则 "Rw" 会被拆成 "R" + 未知字符 w。 */
const TOKEN_RE = /([RLUDFB]w|[rludfb]|[MES]|[RLUDFB]|[xyz])(2'?|')?/g

/** 是否为整体旋转（x y z）—— 它不影响步数统计 */
function isRotation(base) {
  return base === 'x' || base === 'y' || base === 'z'
}

/**
 * 拆分为 token 序列。
 * @returns {Array<{raw:string, base?:string, mod?:string, literal?:boolean}>}
 */
export function tokenizeFormula(input) {
  const s = String(input ?? '')
  const out = []
  let last = 0
  let m
  TOKEN_RE.lastIndex = 0
  while ((m = TOKEN_RE.exec(s)) !== null) {
    // 两次命中之间的内容（空格、括号、换行、中文）原样保留，避免丢信息
    const gap = s.slice(last, m.index)
    if (gap.trim()) out.push({ raw: gap.trim(), literal: true })

    const base = m[1]
    const mod = m[2] || ''
    out.push({ raw: base + mod, base, mod })
    last = m.index + m[0].length
  }
  const tail = s.slice(last)
  if (tail.trim()) out.push({ raw: tail.trim(), literal: true })
  return out
}

/** 规范成单空格分隔；识别不了的片段也照原样留着 */
export function formatFormula(input) {
  return tokenizeFormula(input)
    .map((t) => t.raw)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 求逆公式：R U R' U' → U R U' R'
 * 空输入返回空字符串；只有 literal（无法识别的记号）时返回原文，不做伪逆。
 */
export function invertFormula(input) {
  const tokens = tokenizeFormula(input)
  const moves = tokens.filter((t) => !t.literal)
  if (!moves.length) return ''

  const out = []
  for (let i = moves.length - 1; i >= 0; i--) {
    const t = moves[i]
    if (t.mod.startsWith('2')) out.push(t.base + '2')
    else if (t.mod.includes("'")) out.push(t.base)
    else out.push(t.base + "'")
  }
  return out.join(' ')
}

/** 步数统计（不含整体旋转；literal 不计入） */
export function formulaSteps(input) {
  return tokenizeFormula(input).filter((t) => !t.literal && !isRotation(t.base)).length
}
