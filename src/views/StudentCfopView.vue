<template>
  <div class="cfop-scope">
    <PageHeader title="CFOP 学习" :description="headerDesc">
      <UiButton variant="outline" @click="goBack">
        <template #icon><ArrowLeft class="size-3.5" /></template>
        返回学习记录
      </UiButton>
      <UiButton :variant="formulaMode ? 'primary' : 'outline'" @click="toggleFormulaMode">
        <template #icon><Sigma class="size-3.5" /></template>
        切换公式
      </UiButton>
      <UiButton v-if="canEditPatterns" variant="outline" @click="toggleEditor">
        <template #icon><Palette class="size-3.5" /></template>
        {{ editorOpen ? '收起图案编辑' : '图案编辑' }}
      </UiButton>
    </PageHeader>

    <div class="fc-container space-y-5 py-7">
      <!-- 公式模式说明条：只是加一条提示，进度 / 筛选 / 图案 / 日期等其它信息原样不动 -->
      <div v-if="formulaMode" class="fc-formula-bar">
        <Sigma class="size-4 shrink-0" />
        <span>
          公式模式：点任意情况可查看<b>复原公式</b>与<b>构造公式</b>；此模式下勾选已暂停。
          <template v-if="formulaCount">已录入 {{ formulaCount }} / {{ CFOP_TOTAL }} 个</template>
        </span>
        <button type="button" class="fc-formula-bar-x" @click="toggleFormulaMode">退出</button>
      </div>

      <!-- ============ 图案编辑（仅超级管理员） ============ -->
      <section v-if="editorOpen && canEditPatterns" class="fc-card p-5">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-ink-200 pb-3.5">
          <h2 class="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
            <Palette class="size-4 text-brand-500" />图案编辑
            <span class="text-[12px] font-normal text-ink-400">已涂 {{ patternCount }} / {{ CFOP_TOTAL }}</span>
          </h2>
          <div class="flex items-center gap-2">
            <span v-if="dirty" class="text-[12px] font-medium text-amber-600">有未保存的改动</span>
            <span v-else-if="savedTip" class="text-[12px] font-medium text-emerald-600">{{ savedTip }}</span>
            <UiButton size="sm" variant="outline" :disabled="!dirty" @click="resetDraft">放弃改动</UiButton>
            <UiButton size="sm" variant="primary" :loading="savingPatterns" :disabled="!dirty" @click="savePatterns">
              保存图案
            </UiButton>
          </div>
        </div>

        <p class="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-[12.5px] leading-relaxed text-amber-700">
          图案是<b>全机构共用</b>的：这里改完保存后，<b>所有学员</b>看到的情况图案都会一起更新。未涂的情况显示占位示意。
        </p>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <label class="text-[12.5px] text-ink-600">正在编辑</label>
          <select v-model="edKey" class="fc-input w-auto min-w-[150px]">
            <optgroup v-for="g in CFOP_GROUPS" :key="g.key" :label="g.title">
              <option v-for="c in casesOf(g.key)" :key="c.key" :value="c.key">{{ c.title }}</option>
            </optgroup>
          </select>
          <UiButton size="sm" variant="outline" @click="stepCase(-1)">上一个</UiButton>
          <UiButton size="sm" variant="outline" @click="stepCase(1)">下一个</UiButton>
          <UiButton size="sm" variant="outline" @click="jumpToUnpainted">跳到未涂的</UiButton>
        </div>

        <div class="mt-5 flex flex-wrap gap-8">
          <div class="min-w-[300px] flex-1">
            <p class="lbl"><b>① 选颜色</b>（选中后点格子涂色，可按住鼠标拖动连续涂）</p>
            <div class="flex flex-wrap gap-2 pb-5">
              <button
                v-for="col in CFOP_COLORS"
                :key="col.key"
                type="button"
                class="sw"
                :class="{ on: activeColor === col.key }"
                :style="{ background: col.hex }"
                :title="col.name"
                @click="activeColor = col.key"
              >
                <span>{{ col.name }}</span>
              </button>
            </div>

            <p class="lbl"><b>② 选视图</b></p>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="t in CFOP_TEMPLATES"
                :key="t.value"
                type="button"
                class="tpl"
                :class="{ on: edTpl === t.value }"
                :title="t.hint"
                v-feedback
                @click="setTemplate(t.value)"
              >
                {{ t.label }}
              </button>
            </div>

            <div class="mt-4 flex flex-wrap gap-1.5">
              <UiButton size="sm" variant="outline" @click="fillAll('grey')">全部填灰</UiButton>
              <UiButton size="sm" variant="outline" @click="fillTop('yellow')">顶面填黄</UiButton>
              <UiButton size="sm" variant="outline" @click="removeCustom">删除该情况的自定义</UiButton>
            </div>
          </div>

          <div class="flex flex-wrap items-start gap-7">
            <div>
              <p class="lbl"><b>③ 涂色区</b></p>
              <div
                ref="painterEl"
                v-html="painterHtml"
                @mousedown="onPaintStart"
                @mouseover="onPaintOver"
              />
            </div>
            <div>
              <p class="lbl"><b>清单里的效果</b></p>
              <div class="flex inline-flex flex-col items-center gap-1.5 rounded-xl border-[1.5px] border-ink-200 p-3">
                <div v-html="previewHtml" />
                <span class="text-[11.5px] font-semibold text-ink-500">{{ edCase?.title }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ============ 进度 / 筛选 ============ -->
      <section class="fc-card p-4">
        <div class="flex flex-wrap items-center gap-3.5">
          <div class="text-[13px] text-ink-500">
            <b class="mr-0.5 text-[26px] text-brand-600 tabular-nums">{{ learnedCount }}</b>
            / {{ CFOP_TOTAL }}
          </div>
          <div class="h-2 min-w-[180px] flex-1 overflow-hidden rounded-full bg-ink-100">
            <i class="block h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all" :style="{ width: totalPct + '%' }" />
          </div>
          <div class="min-w-[52px] text-right text-[13px] text-ink-500">{{ totalPct }}%</div>
          <div class="ml-auto inline-flex gap-0.5 rounded-[9px] bg-ink-100 p-0.5">
            <button
              v-for="f in FILTERS"
              :key="f.value"
              type="button"
              class="h-7 rounded-[7px] px-3 text-[12.5px] transition"
              :class="filter === f.value ? 'bg-white font-semibold text-brand-600 shadow-sm' : 'text-ink-600'"
              @click="filter = f.value"
            >
              {{ f.label }}
            </button>
          </div>
        </div>

        <div class="mt-3.5 grid gap-2.5 sm:grid-cols-3">
          <div v-for="g in CFOP_GROUPS" :key="g.key" class="rounded-[10px] border border-ink-100 bg-ink-50/40 px-3 py-2.5">
            <div class="flex items-baseline justify-between">
              <span class="text-[12.5px] font-semibold text-ink-600">{{ g.title }}</span>
              <span class="text-[13px] tabular-nums text-ink-800">{{ groupDone(g.key) }} / {{ g.count }}</span>
            </div>
            <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
              <i class="block h-full rounded-full transition-all" :style="{ width: groupPct(g.key) + '%', background: g.color }" />
            </div>
          </div>
        </div>
      </section>

      <!-- ============ 数据表未创建 ============ -->
      <div v-if="tableMissing" class="fc-card p-8 text-center">
        <TriangleAlert class="mx-auto size-7 text-amber-500" />
        <h3 class="mt-3 text-[15px] font-semibold text-ink-900">CFOP 学习进度数据表尚未创建</h3>
        <p class="mx-auto mt-2 max-w-xl text-[13px] leading-relaxed text-ink-500">
          请在 Supabase 后台的 SQL 编辑器中执行项目里的
          <code class="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[12px]">supabase/11_cfop_progress.sql</code>
          ，之后即可勾选。图案部分不受影响。
        </p>
      </div>

      <!-- ============ 三组情况 ============ -->
      <template v-else>
        <section v-for="g in CFOP_GROUPS" :key="g.key" class="fc-card overflow-hidden">
          <header class="flex flex-wrap items-center gap-3 border-b border-ink-100 px-4 py-3.5">
            <h2 class="flex items-center gap-2 text-[15px] font-bold text-ink-900">
              <span class="size-2.5 rounded-sm" :style="{ background: g.color }" />{{ g.title }}
            </h2>
            <span class="text-[12px] text-ink-400">{{ g.desc }}</span>
            <span class="ml-auto text-[12.5px] tabular-nums text-ink-500">{{ groupDone(g.key) }} / {{ g.count }}</span>
            <div class="h-1.5 w-[92px] overflow-hidden rounded-full bg-ink-100">
              <i class="block h-full rounded-full bg-emerald-500 transition-all" :style="{ width: groupPct(g.key) + '%' }" />
            </div>
          </header>

          <div class="flex flex-wrap gap-2 p-3.5">
            <div
              v-for="c in visibleCases(g.key)"
              :key="c.key"
              class="cfop-case"
              :class="{ done: hasLearned(c.key), 'formula-on': formulaMode }"
              role="button"
              tabindex="0"
              :title="formulaMode ? `${c.title} · 查看公式` : c.title"
              @click="onCaseClick(c)"
              @keydown.enter.prevent="onCaseClick(c)"
            >
              <div v-html="figureFor(c)" />
              <span class="cl">{{ c.label }}</span>
              <!-- 公式模式下日期不可点：整张卡片让给「查看公式」 -->
              <span class="date-row" :class="{ 'pointer-events-none': formulaMode }">
                <template v-if="hasLearned(c.key)">
                  <span class="date-text" :class="{ ph: !learned[c.key] }">
                    {{ learned[c.key] || '补填日期' }}
                  </span>
                  <input
                    type="date"
                    class="date-input"
                    :value="learned[c.key] || ''"
                    :title="learned[c.key] ? '点击可修改学习日期' : '未记录日期，点击可补填'"
                    @click.stop
                    @keydown.stop
                    @change="setDate(c.key, $event.target.value)"
                  />
                </template>
              </span>
              <span class="tick">✓</span>
              <span v-if="patterns[c.key]" class="cfg" />
              <!-- 已录公式的标记：公式模式下才显示，方便一眼看出哪些还没录 -->
              <span v-if="formulaMode && formulas[c.key]" class="fml" />
            </div>
          </div>

          <p v-if="!visibleCases(g.key).length" class="px-4 pb-4 text-[12.5px] text-ink-400">
            没有符合筛选条件的情况
          </p>
        </section>
      </template>
    </div>

    <!-- 公式详情子页面：手机从底部升起，桌面居中弹窗 -->
    <CfopFormulaSheet
      :open="!!formulaCase"
      :item="formulaCase"
      :figure="formulaCase ? figureFor(formulaCase) : ''"
      :formula="formulaCase ? formulas[formulaCase.key] || {} : {}"
      :learned="formulaCase ? hasLearned(formulaCase.key) : false"
      :learned-date="formulaCase ? learned[formulaCase.key] || '' : ''"
      :can-edit="canEditPatterns"
      :saving="savingFormula"
      :saved-tick="formulaSavedTick"
      @close="formulaCase = null"
      @save="saveFormula"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Palette, Sigma, TriangleAlert } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import UiButton from '@/components/UiButton.vue'
import CfopFormulaSheet from '@/components/CfopFormulaSheet.vue'
import { getStudent } from '@/api/students'
import {
  CFOP_GROUPS,
  CFOP_TOTAL,
  CFOP_CASES,
  CFOP_COLORS,
  CFOP_TEMPLATES,
  cfopCaseByKey,
  tplCellCount,
  blankCells,
  defaultCells,
  placeholderCells,
  figureHTML,
  painterHTML,
} from '@/lib/cfop'
import {
  loadCfopPatterns,
  saveCfopPatterns,
  loadCfopFormulas,
  saveCfopFormulas,
  loadCfopProgress,
  setCfopLearned,
  isMissingTableError,
} from '@/api/cfop'
import { recordAudit } from '@/lib/audit'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'todo', label: '未掌握' },
  { value: 'done', label: '已掌握' },
]

const canEditPatterns = computed(() => auth.can('settings.manage'))
const canCheck = computed(() => auth.can('student.manage'))

const student = ref(null)
/** { "oll:12": "2026-09-15", ... } */
const learned = ref({})
const patterns = ref({})
/** { "oll:12": { solve: "R U R' U'", setup: "U R U' R'" }, ... }（全机构共用） */
const formulas = ref({})
const tableMissing = ref(false)
const loading = ref(true)
const filter = ref('all')

/** 本地日期(不能用 toISOString:东八区凌晨会算成前一天) */
function todayStr() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 是否已掌握(空字符串的旧数据也算已掌握) */
function hasLearned(key) {
  return Object.prototype.hasOwnProperty.call(learned.value, key)
}

const headerDesc = computed(() => {
  const name = student.value?.name || '学员'
  return `${name} · 已掌握 ${learnedCount.value} / ${CFOP_TOTAL} 个 CFOP 情况`
})

/* ---------- 统计 ---------- */
const learnedCount = computed(() => {
  let n = 0
  for (const c of CFOP_CASES) if (hasLearned(c.key)) n++
  return n
})
const totalPct = computed(() => Math.round((learnedCount.value / CFOP_TOTAL) * 100))
function groupDone(key) {
  return CFOP_CASES.filter((c) => c.group === key && hasLearned(c.key)).length
}
function groupPct(key) {
  const g = CFOP_GROUPS.find((x) => x.key === key)
  return g ? Math.round((groupDone(key) / g.count) * 100) : 0
}
function casesOf(key) {
  return CFOP_CASES.filter((c) => c.group === key)
}
/**
 * 各组的可见列表缓存。
 * 原来是普通函数，而模板里调用了两次（v-for + 空列表提示），同一份数据要过滤两遍；
 * 改成按 group 的 computed 后，筛选条件不变时只算一次。
 */
const visibleByGroup = computed(() => {
  const out = {}
  for (const g of CFOP_GROUPS) {
    const list = casesOf(g.key)
    out[g.key] =
      filter.value === 'all'
        ? list
        : list.filter((c) => (filter.value === 'done' ? hasLearned(c.key) : !hasLearned(c.key)))
  }
  return out
})
function visibleCases(key) {
  return visibleByGroup.value[key] || []
}

/* ---------- 图形 ---------- */
function tplOf(c) {
  return patterns.value[c.key]?.tpl || c.defaultTpl
}
function cellsOf(c) {
  const img = patterns.value[c.key]
  if (img && Array.isArray(img.cells)) return img.cells
  return placeholderCells(c.index + 1 + (c.group === 'oll' ? 100 : c.group === 'pll' ? 200 : 0), c.defaultTpl)
}

/**
 * 119 张卡片的图形缓存。
 * 原来每张卡片各调一次 figureHTML 拼 SVG 字符串，且没有缓存——勾一个勾选、切一次筛选
 * 都会让 119 张全部重算。这里按 case 一次性算好；它只依赖 patterns，
 * 勾选状态（learned）变化不会触发重算。
 */
const figures = computed(() => {
  const out = {}
  for (const c of CFOP_CASES) out[c.key] = figureHTML(tplOf(c), cellsOf(c), 13)
  return out
})
function figureFor(c) {
  return figures.value[c.key] || ''
}

/* ---------- 加载 ---------- */
async function loadStudent() {
  try {
    student.value = await getStudent(route.params.id)
  } catch {
    student.value = null
  }
}

async function loadProgress() {
  loading.value = true
  try {
    learned.value = await loadCfopProgress(route.params.id)
    tableMissing.value = false
  } catch (err) {
    learned.value = {}
    tableMissing.value = isMissingTableError(err)
    if (!tableMissing.value) toast.error(err.message)
  } finally {
    loading.value = false
  }
}

async function loadAll() {
  // 四个请求并发：Supabase 在新加坡，串行会多出一趟往返（约 200~400ms）
  await Promise.all([
    loadStudent(),
    loadProgress(),
    loadCfopPatterns().then((p) => {
      patterns.value = p
      draft.value = JSON.parse(JSON.stringify(p))
    }),
    loadCfopFormulas().then((f) => {
      formulas.value = f
    }),
  ])
}

/* ---------- 勾选 ---------- */
async function toggleCase(c) {
  if (!canCheck.value) {
    toast.error('没有编辑学员的权限，无法勾选')
    return
  }
  const done = hasLearned(c.key)
  const today = todayStr()
  const prevDate = learned.value[c.key]

  // 先乐观更新，点下去立刻有反馈，不等网络
  const optimistic = { ...learned.value }
  if (done) delete optimistic[c.key]
  else optimistic[c.key] = today
  learned.value = optimistic

  try {
    // 提交会按学员排队、并把排队期间的连点合并成一次请求（见 api/cfop.js）。
    // 返回值是本轮排空后的完整状态，必定包含期间点过的所有情况，可直接采用。
    learned.value = await setCfopLearned(route.params.id, c.key, done ? null : today)
  } catch (err) {
    toast.error(err.message)
    // 只回滚这一个情况：连点期间成功提交的其它情况不能被一起抹掉
    const rollback = { ...learned.value }
    if (prevDate) rollback[c.key] = prevDate
    else delete rollback[c.key]
    learned.value = rollback
  }
}

/** 修正某个情况的「学习日期」 */
async function setDate(key, value) {
  if (!canCheck.value) return
  if (!hasLearned(key)) return
  const prevDate = learned.value[key]
  const nextDate = value || todayStr()

  learned.value = { ...learned.value, [key]: nextDate }
  try {
    learned.value = await setCfopLearned(route.params.id, key, nextDate)
    toast.success('日期已更新')
  } catch (err) {
    toast.error(err.message)
    // 同上：只回滚这一个情况
    const rollback = { ...learned.value }
    if (prevDate) rollback[key] = prevDate
    else delete rollback[key]
    learned.value = rollback
  }
}

/* ---------- 图案编辑 ---------- */
const editorOpen = ref(false)
const draft = ref({})
const edKey = ref('f2l:1')
const activeColor = ref('yellow')
const savingPatterns = ref(false)
const dirty = ref(false)
const savedTip = ref('')
const painting = ref(false)
const painterEl = ref(null)

const patternCount = computed(() => Object.keys(draft.value || {}).length)
const edCase = computed(() => cfopCaseByKey(edKey.value))
const edTpl = computed(() => draft.value[edKey.value]?.tpl || edCase.value?.defaultTpl || 'top9')
const edCells = computed(() => {
  const n = tplCellCount(edTpl.value)
  const img = draft.value[edKey.value]
  let out
  if (img && Array.isArray(img.cells)) {
    out = img.cells.slice(0, n)
  } else {
    const c = edCase.value
    out = c ? cellsOf(c).slice(0, n) : defaultCells(edTpl.value).slice(0, n)
  }
  while (out.length < n) out.push('grey')
  return out
})
const painterHtml = computed(() => painterHTML(edTpl.value, edCells.value, 40))
const previewHtml = computed(() => figureHTML(edTpl.value, edCells.value, 13))

function toggleEditor() {
  editorOpen.value = !editorOpen.value
  if (editorOpen.value) {
    draft.value = JSON.parse(JSON.stringify(patterns.value))
    dirty.value = false
    // 与公式模式互斥：两块面板同时开着，卡片点击的语义就连自己都说不清了
    formulaMode.value = false
    formulaCase.value = null
  }
}

function markDirty() {
  dirty.value = true
  savedTip.value = ''
}

function ensureCase(key) {
  if (!draft.value[key]) {
    const c = cfopCaseByKey(key)
    const tpl = c?.defaultTpl || 'top9'
    draft.value[key] = { tpl, cells: cellsOf(c).slice(0, tplCellCount(tpl)) }
    while (draft.value[key].cells.length < tplCellCount(tpl)) draft.value[key].cells.push('grey')
  }
  return draft.value[key]
}

function setTemplate(tpl) {
  const img = ensureCase(edKey.value)
  const n = tplCellCount(tpl)
  const cells = (img.cells || []).slice(0, n)
  while (cells.length < n) cells.push('grey')
  draft.value[edKey.value] = { tpl, cells }
  markDirty()
}

function fillAll(color) {
  const img = ensureCase(edKey.value)
  draft.value[edKey.value] = { tpl: img.tpl, cells: new Array(tplCellCount(img.tpl)).fill(color) }
  markDirty()
}

function fillTop(color) {
  const img = ensureCase(edKey.value)
  const cells = (img.cells || []).slice()
  while (cells.length < tplCellCount(img.tpl)) cells.push('grey')
  for (let i = 0; i < 9 && i < cells.length; i++) cells[i] = color
  draft.value[edKey.value] = { tpl: img.tpl, cells }
  markDirty()
}

function removeCustom() {
  delete draft.value[edKey.value]
  markDirty()
}

function stepCase(delta) {
  const idx = CFOP_CASES.findIndex((c) => c.key === edKey.value)
  const next = (idx + delta + CFOP_CASES.length) % CFOP_CASES.length
  edKey.value = CFOP_CASES[next].key
}

function jumpToUnpainted() {
  const idx = CFOP_CASES.findIndex((c) => c.key === edKey.value)
  for (let i = 1; i <= CFOP_CASES.length; i++) {
    const c = CFOP_CASES[(idx + i) % CFOP_CASES.length]
    if (!draft.value[c.key]) {
      edKey.value = c.key
      return
    }
  }
  toast.success('全部情况都已经涂过了')
}

function paintAt(i, color) {
  const img = ensureCase(edKey.value)
  if (img.cells[i] === color) return
  img.cells[i] = color
  markDirty()
  const el = painterEl.value?.querySelector(`[data-i="${i}"]`)
  if (el) {
    if (el.tagName.toLowerCase() === 'polygon') el.setAttribute('fill', CFOP_COLORS.find((c) => c.key === color)?.hex || '#888')
    else el.style.background = CFOP_COLORS.find((c) => c.key === color)?.hex || '#888'
  }
}

function targetIndex(e) {
  const el = e.target?.closest?.('[data-i]')
  return el ? parseInt(el.getAttribute('data-i'), 10) : null
}

function onPaintStart(e) {
  const i = targetIndex(e)
  if (i == null) return
  e.preventDefault()
  painting.value = true
  paintAt(i, activeColor.value)
}

function onPaintOver(e) {
  if (!painting.value) return
  const i = targetIndex(e)
  if (i == null) return
  paintAt(i, activeColor.value)
}

async function savePatterns() {
  savingPatterns.value = true
  try {
    await saveCfopPatterns(draft.value)
    patterns.value = JSON.parse(JSON.stringify(draft.value))
    dirty.value = false
    savedTip.value = `已保存 · ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
    recordAudit({
      action: 'settings',
      targetType: 'settings',
      targetId: 'cfop.patterns',
      summary: `保存 CFOP 情况图案（${patternCount.value} 个自定义）`,
    })
    toast.success('图案已保存，所有学员都会看到新图案')
  } catch (err) {
    toast.error(err.message)
  } finally {
    savingPatterns.value = false
  }
}

function resetDraft() {
  draft.value = JSON.parse(JSON.stringify(patterns.value))
  dirty.value = false
  toast.success('已放弃未保存的改动')
}

/* ---------- 公式模式（查看 / 录入每个情况的复原公式与构造公式） ---------- */
const formulaMode = ref(false)
/** 当前打开公式弹层的情况；null 表示弹层关闭 */
const formulaCase = ref(null)
const savingFormula = ref(false)
/** 每次保存成功 +1，通知弹层把「已保存」基准刷新，这样才能连续改同一条并再次保存 */
const formulaSavedTick = ref(0)

const formulaCount = computed(() => Object.keys(formulas.value).length)

/**
 * 开关公式模式。
 * 打开时收起图案编辑：两块面板同时开着，卡片上就分不清点击是弹公式还是涂色了。
 */
function toggleFormulaMode() {
  formulaMode.value = !formulaMode.value
  formulaCase.value = null
  if (formulaMode.value && editorOpen.value) editorOpen.value = false
}

/** 卡片点击分流：公式模式下弹公式详情，否则维持原来的「勾选 / 取消掌握」 */
function onCaseClick(c) {
  if (formulaMode.value) {
    formulaCase.value = c
    return
  }
  toggleCase(c)
}

/**
 * 保存某个情况的公式。
 * 与图案同一套读写方式：把这一条并回整份，再整份提交（只有超管能写，冲突面很小）。
 * api 层会把 solve/setup 都为空的情况剔除，所以清空输入 = 删除该条。
 */
async function saveFormula({ key, solve, setup }) {
  if (!key) return
  savingFormula.value = true
  const prev = formulas.value

  const next = { ...prev }
  if (solve || setup) next[key] = { solve, setup }
  else delete next[key]

  try {
    formulas.value = await saveCfopFormulas(next)
    formulaSavedTick.value += 1
    recordAudit({
      action: 'settings',
      targetType: 'settings',
      targetId: 'cfop.formulas',
      summary: `保存 CFOP 公式（${cfopCaseByKey(key)?.title || key}）`,
    })
    toast.success(solve || setup ? '公式已保存' : '已清空该情况的公式')
  } catch (err) {
    formulas.value = prev
    toast.error(err.message)
  } finally {
    savingFormula.value = false
  }
}

/* ---------- 其它 ---------- */
function goBack() {
  router.push({ name: 'student-learning', params: { id: route.params.id } })
}

watch(
  () => route.params.id,
  (id) => {
    if (id) loadAll()
  },
)

onMounted(() => {
  window.addEventListener('mouseup', () => {
    painting.value = false
  })
  loadAll()
})
</script>

<style>
/* 图形样式（生成的是 innerHTML，故用非 scoped 样式 + .cfop-scope 前缀隔离） */
.cfop-scope .fig svg {
  display: block;
}
.cfop-scope .stk {
  border-radius: 2px;
}
.cfop-scope .stk,
.cfop-scope .pcell {
  box-shadow: inset 0 0 0 var(--inset, 1px) rgba(0, 0, 0, 0.45);
}
.cfop-scope .pcell {
  cursor: pointer;
  border-radius: 3px;
}
.cfop-scope polygon.po {
  cursor: pointer;
}
/* 悬停反馈只在真正支持悬停的设备（鼠标）上生效。
   触屏点一下会把 :hover「粘」住，图案会一直保持高亮不褪。 */
@media (hover: hover) {
  .cfop-scope polygon.po:hover {
    stroke: #ea625f !important;
    stroke-width: 2.5 !important;
  }
}
.cfop-scope .lbl {
  margin-bottom: 8px;
  font-size: 12px;
  color: #6b7280;
}
.cfop-scope .lbl b {
  color: #1f2937;
}
.cfop-scope .sw {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 2px solid #e5e7eb;
  transition: all 0.12s;
}
@media (hover: hover) {
  .cfop-scope .sw:hover {
    transform: translateY(-1px);
  }
}
.cfop-scope .sw.on {
  border-color: #ea625f;
  box-shadow: 0 0 0 3px rgba(234, 98, 95, 0.18);
}
.cfop-scope .sw span {
  position: absolute;
  bottom: -16px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 10.5px;
  color: #9aa0a6;
}
.cfop-scope .tpl {
  height: 30px;
  padding: 0 10px;
  border: 1px solid #d5d8dd;
  border-radius: 8px;
  background: #fff;
  font-size: 12.5px;
  color: #4b5563;
}
.cfop-scope .tpl.on {
  border-color: #ea625f;
  background: #fff5f5;
  color: #ea625f;
  font-weight: 600;
}
.cfop-scope .cfop-case {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 82px;
  padding: 7px 5px 6px;
  border: 1.5px solid #e5e7eb;
  border-radius: 11px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
}
/* 悬停反馈只在鼠标设备上生效：触屏「点一下」会把 :hover 粘住，
   卡片会一直保持浮起 + 阴影，看起来像被选中了。 */
@media (hover: hover) {
  .cfop-scope .cfop-case:hover {
    border-color: #c9cdd4;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(17, 24, 39, 0.06);
  }
}

/* 触屏设备改用按压反馈：按住时变底色，松手即恢复，不会残留 */
@media (hover: none) {
  .cfop-scope .cfop-case:active {
    border-color: #c9cdd4;
    background: #fafafa;
  }
}
/* 日期行：文字用 span 居中渲染（原生 date input 的文本靠左，text-align 对其无效），
   input 做成透明覆盖层，点击整格即可弹出日历 */
.cfop-scope .cfop-case .date-row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 16px;
}
.cfop-scope .cfop-case .date-text {
  padding: 0 4px;
  border-radius: 5px;
  font-size: 10px;
  line-height: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: #059669;
  transition: background 0.12s, color 0.12s;
}
.cfop-scope .cfop-case .date-text.ph {
  font-weight: 400;
  color: #c2c7cd;
}
@media (hover: hover) {
  .cfop-scope .cfop-case:hover .date-text {
    background: #ecfdf5;
  }
  .cfop-scope .cfop-case:hover .date-text.ph {
    background: #f4f5f7;
    color: #9aa0a6;
  }
}
/* 手机上日期行原本只有 16px 高，手指点不准；加高到 26px。
   卡片会随之变高，网格布局不受影响。 */
@media (max-width: 640px) {
  .cfop-scope .cfop-case .date-row {
    min-height: 26px;
  }
  .cfop-scope .cfop-case .date-text {
    font-size: 11px;
    line-height: 20px;
  }
}
.cfop-scope .cfop-case .date-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  opacity: 0;
  cursor: pointer;
}
/* 让日历图标铺满整格：Chrome 点 input 主体不弹日历，只有点 indicator 才会 */
.cfop-scope .cfop-case .date-input::-webkit-calendar-picker-indicator {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  opacity: 0;
  cursor: pointer;
}
.cfop-scope .cfop-case .cl {
  font-size: 11.5px;
  font-weight: 600;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
}
.cfop-scope .cfop-case .tick {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #10b981;
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.15s;
}
.cfop-scope .cfop-case .cfg {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ea625f;
}
.cfop-scope .cfop-case.done {
  border-color: #34d399;
  background: #f0fdf6;
}
.cfop-scope .cfop-case.done .cl {
  color: #059669;
}
.cfop-scope .cfop-case.done .tick {
  opacity: 1;
  transform: scale(1);
}

/* ---------- 公式模式 ---------- */
.cfop-scope .fc-formula-bar {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 14px;
  border: 1px solid #ffd9d7;
  border-radius: 12px;
  background: #fff5f5;
  font-size: 12.5px;
  line-height: 1.6;
  color: #b3403a;
}
.cfop-scope .fc-formula-bar b {
  font-weight: 600;
  color: #ae2c27;
}
.cfop-scope .fc-formula-bar-x {
  flex: none;
  margin-left: auto;
  padding: 3px 10px;
  border: 1px solid #f3bdb9;
  border-radius: 8px;
  background: #fff;
  font-size: 12px;
  font-weight: 600;
  color: #ae2c27;
}
.cfop-scope .fc-formula-bar-x:active {
  background: #ffeceb;
}

/* 公式模式下整卡变成「查看公式」：边框转成品牌色，手感上区别于勾选 */
.cfop-scope .cfop-case.formula-on {
  border-color: #ffd9d7;
}
.cfop-scope .cfop-case.formula-on.done {
  border-color: #34d399;
}

/* 「已录公式」标记：只在公式模式显示，一眼看出哪些情况还没录 */
.cfop-scope .cfop-case .fml {
  position: absolute;
  right: 5px;
  bottom: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34b4e2;
}
</style>
