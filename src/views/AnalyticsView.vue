<template>
  <div>
    <PageHeader title="统计分析" description="按魔方项目与时间范围，查看学员平均成绩 / 单次成绩排名，并支持多人成绩对比">
      <UiButton variant="outline" @click="resetFilters">
        <template #icon><RotateCcw class="size-3.5" /></template>
        重置筛选
      </UiButton>
    </PageHeader>

    <div class="fc-container space-y-5 py-7">
      <!-- 视图切换 -->
      <div class="flex w-fit rounded-lg bg-ink-100 p-0.5">
        <button
          type="button"
          class="rounded-md px-4 py-1.5 text-[13px] font-medium transition"
          :class="viewMode === 'single' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'"
          @click="viewMode = 'single'"
        >
          单项目分析
        </button>
        <button
          type="button"
          class="rounded-md px-4 py-1.5 text-[13px] font-medium transition"
          :class="viewMode === 'matrix' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'"
          @click="viewMode = 'matrix'"
        >
          跨项目总览
        </button>
      </div>

      <!-- 筛选条 -->
      <div class="fc-card flex flex-wrap items-end gap-4 p-4">
        <div v-if="viewMode === 'single'">
          <label class="mb-1.5 block text-[12px] font-medium text-ink-500">魔方项目</label>
          <select v-model="project" class="fc-input w-auto min-w-[130px]">
            <option v-for="p in CUBE_PROJECTS" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1.5 block text-[12px] font-medium text-ink-500">起始日期</label>
          <input v-model="rangeStart" type="date" class="fc-input w-auto" :max="rangeEnd || undefined" />
        </div>
        <div>
          <label class="mb-1.5 block text-[12px] font-medium text-ink-500">结束日期</label>
          <input v-model="rangeEnd" type="date" class="fc-input w-auto" :min="rangeStart || undefined" />
        </div>
        <div>
          <label class="mb-1.5 block text-[12px] font-medium text-ink-500">学员状态</label>
          <select v-model="statusFilter" class="fc-input w-auto min-w-[120px]">
            <option value="">全部状态</option>
            <option v-for="o in STUDENT_STATUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div class="ml-auto text-right text-[12.5px] text-ink-400">
          <div>共 <span class="font-semibold text-ink-600">{{ viewMode === 'single' ? scores.length : allScores.length }}</span> 条成绩</div>
          <div>覆盖 <span class="font-semibold text-ink-600">{{ rankedCount }}</span> / {{ filteredStudents.length }} 名学员</div>
        </div>
      </div>
      <p class="text-[12px] text-ink-400">
        （班级功能已下线，原「班级内排名」已适配为按「学员状态」区分的全体排名；无成绩学员显示在最后。）
      </p>

      <UiLoading v-if="loading" text="正在计算统计数据…" />

      <!-- 跨项目总览：热力矩阵 -->
      <template v-else-if="viewMode === 'matrix'">
        <section class="fc-card overflow-hidden">
          <div class="flex flex-wrap items-center gap-3 border-b border-ink-200 px-4 py-3">
            <h3 class="text-[14px] font-semibold text-ink-800">跨项目成绩矩阵</h3>
            <div class="flex rounded-lg bg-ink-100 p-0.5">
              <button
                type="button"
                class="rounded-md px-3 py-1.5 text-[12.5px] font-medium transition"
                :class="rankMetric === 'avg' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'"
                @click="rankMetric = 'avg'"
              >
                最佳平均
              </button>
              <button
                type="button"
                class="rounded-md px-3 py-1.5 text-[12.5px] font-medium transition"
                :class="rankMetric === 'single' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'"
                @click="rankMetric = 'single'"
              >
                最佳单次
              </button>
            </div>
            <span class="ml-auto text-[12px] text-ink-400">颜色代表段位，越靠下颜色越「高级」；「—」表示暂无该项目成绩</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full min-w-[760px] text-left text-[13px]">
              <thead class="border-b border-ink-200 bg-ink-50 text-[12px] text-ink-500">
                <tr>
                  <th class="sticky left-0 z-10 bg-ink-50 px-4 py-3 font-medium">学员</th>
                  <th
                    v-for="p in CUBE_PROJECTS"
                    :key="p.value"
                    class="px-2 py-3 text-center font-medium"
                  >
                    <span class="inline-flex items-center gap-1">
                      <span class="size-2 rounded-sm" :style="{ backgroundColor: p.color }" />
                      {{ p.label }}
                    </span>
                  </th>
                  <th class="px-3 py-3 text-center font-medium">覆盖</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-ink-100">
                <tr v-for="row in matrix" :key="row.student.id" class="transition hover:bg-ink-50/60">
                  <td class="sticky left-0 z-10 bg-white px-4 py-2.5">
                    <button
                      type="button"
                      class="flex items-center gap-2.5 text-left"
                      @click="goStudent(row.student.id)"
                    >
                      <UiAvatar :src="row.student.avatar_url" :name="row.student.name" size="xs" />
                      <span class="font-medium text-ink-800 hover:text-brand-700">{{ row.student.name }}</span>
                    </button>
                  </td>
                  <td v-for="cell in row.cells" :key="cell.project" class="px-1.5 py-2">
                    <div
                      v-if="cell.value != null"
                      class="flex min-w-[56px] flex-col items-center rounded-lg px-2 py-1.5"
                      :style="cell.rank
                        ? { backgroundColor: cell.rank.color + '20', color: cell.rank.color }
                        : { backgroundColor: '#F1F3F5', color: '#8A9199' }"
                      :title="`${cubeLabel(cell.project)} · ${fmtSec(cell.value)}${cell.rank ? ' · ' + cell.rank.label : ''}`"
                    >
                      <span class="text-[13px] font-semibold tabular-nums">{{ fmtSecShort(cell.value) }}</span>
                      <span v-if="cell.rank" class="text-[10px] font-medium">{{ cell.rank.label }}</span>
                      <span v-else class="text-[10px] opacity-70">未达标</span>
                    </div>
                    <div v-else class="flex min-w-[56px] items-center justify-center rounded-lg bg-ink-50 px-2 py-1.5 text-[13px] text-ink-300">—</div>
                  </td>
                  <td class="px-3 py-2.5 text-center text-[12px] tabular-nums text-ink-500">{{ row.covered }}/6</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <template v-else>
        <!-- 排名 -->
        <section class="fc-card overflow-hidden">
          <div class="flex flex-wrap items-center gap-3 border-b border-ink-200 px-4 py-3">
            <h3 class="text-[14px] font-semibold text-ink-800">成绩排名</h3>
            <div class="flex rounded-lg bg-ink-100 p-0.5">
              <button
                type="button"
                class="rounded-md px-3 py-1.5 text-[12.5px] font-medium transition"
                :class="rankMetric === 'avg' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'"
                @click="rankMetric = 'avg'"
              >
                平均成绩排名
              </button>
              <button
                type="button"
                class="rounded-md px-3 py-1.5 text-[12.5px] font-medium transition"
                :class="rankMetric === 'single' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'"
                @click="rankMetric = 'single'"
              >
                单次成绩排名
              </button>
            </div>
            <span class="ml-auto text-[12px] text-ink-400">
              按{{ rankMetric === 'avg' ? '最佳平均成绩' : '最佳单次成绩' }}从低到高排列
            </span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full min-w-[640px] text-left text-[13px]">
              <thead class="border-b border-ink-200 bg-ink-50 text-[12px] text-ink-500">
                <tr>
                  <th class="w-14 px-4 py-3 font-medium">名次</th>
                  <th class="px-4 py-3 font-medium">学员</th>
                  <th class="px-4 py-3 font-medium">水平</th>
                  <th class="px-4 py-3 font-medium">段位</th>
                  <th class="px-4 py-3 font-medium">{{ rankMetric === 'avg' ? '最佳平均成绩' : '最佳单次成绩' }}</th>
                  <th class="px-4 py-3 text-right font-medium">记录数</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-ink-100">
                <tr
                  v-for="(row, i) in ranking"
                  :key="row.student.id"
                  class="cursor-pointer transition hover:bg-ink-50/70"
                  @click="goStudent(row.student.id)"
                >
                  <td class="px-4 py-3">
                    <span
                      class="inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold"
                      :class="i < 3 ? rankBadgeClass(i) : 'bg-ink-100 text-ink-500'"
                    >
                      {{ i + 1 }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2.5">
                      <UiAvatar :src="row.student.avatar_url" :name="row.student.name" size="sm" />
                      <span class="font-medium text-ink-800">{{ row.student.name }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <UiBadge
                      v-if="row.student.level"
                      :label="row.student.level"
                      custom-class="bg-brand-50 text-brand-700 border-brand-200"
                    />
                    <span v-else class="text-ink-400">—</span>
                  </td>
                  <td class="px-4 py-3">
                    <span
                      v-if="row.best != null && rankForProject(project, row.best)"
                      class="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white"
                      :style="{ backgroundColor: rankForProject(project, row.best).color }"
                    >{{ rankForProject(project, row.best).label }}</span>
                    <span v-else class="text-ink-400">—</span>
                  </td>
                  <td class="px-4 py-3 font-medium tabular-nums" :class="row.best == null ? 'text-ink-400' : 'text-ink-800'">
                    {{ row.best == null ? '暂无成绩' : fmtSec(row.best) }}
                  </td>
                  <td class="px-4 py-3 text-right tabular-nums text-ink-500">{{ row.count }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- 成绩对比 -->
        <section class="fc-card p-4">
          <h3 class="text-[14px] font-semibold text-ink-800">成绩对比</h3>
          <p class="mt-1 text-[12.5px] text-ink-400">
            选择 2–5 名学员，对比其在「{{ projectLabel }}」项目下的平均成绩趋势（最多 5 名）。
          </p>

          <div class="mt-3 flex flex-wrap gap-2">
            <button
              v-for="st in students"
              :key="st.id"
              type="button"
              class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] transition"
              :class="
                isSelected(st.id)
                  ? 'border-brand-300 bg-brand-50 font-medium text-brand-700'
                  : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
              "
              @click="toggleSelect(st.id)"
            >
              <UiAvatar :src="st.avatar_url" :name="st.name" size="xs" />
              {{ st.name }}
            </button>
          </div>
          <p class="mt-2 text-[12px]" :class="selectedIds.length < 2 ? 'text-ink-400' : 'text-ink-500'">
            已选 {{ selectedIds.length }} / 5
          </p>

          <div v-if="selectedIds.length >= 2" class="mt-4">
            <div class="mb-2 flex flex-wrap gap-3 text-[12px]">
              <span v-for="s in compareSeries" :key="s.st.id" class="inline-flex items-center gap-1.5 text-ink-600">
                <span class="size-2.5 rounded-full" :style="{ background: s.color }" />
                {{ s.st.name }}
              </span>
            </div>

            <svg v-if="compareChart.points.length" :viewBox="`0 0 ${CW} ${CH}`" class="w-full" preserveAspectRatio="xMidYMid meet">
              <g v-for="t in compareChart.yTicks" :key="'y' + t.label">
                <line :x1="padL" :y1="t.y" :x2="CW - padR" :y2="t.y" stroke="#EEF0F2" stroke-width="1" />
                <text :x="padL - 6" :y="t.y + 3" text-anchor="end" font-size="10" fill="#9aa0a6">{{ t.label }}</text>
              </g>
              <g v-for="(t, i) in compareChart.xTicks" :key="'x' + i">
                <text :x="t.x" :y="CH - padB + 14" text-anchor="middle" font-size="9" fill="#9aa0a6">{{ t.label }}</text>
              </g>
              <polyline
                v-for="(l, i) in compareChart.lines"
                v-show="l.has"
                :key="'l' + i"
                :points="l.points"
                fill="none"
                :stroke="l.color"
                stroke-width="2"
                stroke-linejoin="round"
              />
              <circle
                v-for="(p, i) in compareChart.points"
                :key="'p' + i"
                :cx="p.x"
                :cy="p.y"
                r="3.5"
                :fill="p.color"
                stroke="#fff"
                stroke-width="1.5"
              >
                <title>{{ p.name }} · {{ p.date }} · {{ fmtSec(p.v) }}</title>
              </circle>
            </svg>
            <p v-else class="py-8 text-center text-[13px] text-ink-400">
              所选学员在「{{ projectLabel }}」下暂无足够成绩记录，无法绘制对比曲线
            </p>

            <div class="mt-4 overflow-x-auto">
              <table class="w-full min-w-[560px] text-left text-[13px]">
                <thead class="border-b border-ink-200 bg-ink-50 text-[12px] text-ink-500">
                  <tr>
                    <th class="px-4 py-2.5 font-medium">学员</th>
                    <th class="px-4 py-2.5 text-right font-medium">记录数</th>
                    <th class="px-4 py-2.5 text-right font-medium">最高</th>
                    <th class="px-4 py-2.5 text-right font-medium">最低</th>
                    <th class="px-4 py-2.5 text-right font-medium">平均</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-ink-100">
                  <tr v-for="s in compareSeries" :key="s.st.id">
                    <td class="px-4 py-2.5">
                      <div class="flex items-center gap-2.5">
                        <span class="size-2.5 rounded-full" :style="{ background: s.color }" />
                        <UiAvatar :src="s.st.avatar_url" :name="s.st.name" size="xs" />
                        <span class="font-medium text-ink-800">{{ s.st.name }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-2.5 text-right tabular-nums text-ink-500">{{ s.pts.length }}</td>
                    <td class="px-4 py-2.5 text-right tabular-nums text-ink-700">{{ s.max == null ? '—' : fmtSec(s.max) }}</td>
                    <td class="px-4 py-2.5 text-right tabular-nums text-ink-700">{{ s.min == null ? '—' : fmtSec(s.min) }}</td>
                    <td class="px-4 py-2.5 text-right font-medium tabular-nums text-ink-800">{{ s.mean == null ? '—' : fmtSec(s.mean) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p v-else class="mt-4 text-[13px] text-ink-400">请至少选择 2 名学员开始对比。</p>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { RotateCcw } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import UiButton from '@/components/UiButton.vue'
import UiBadge from '@/components/UiBadge.vue'
import UiAvatar from '@/components/UiAvatar.vue'
import UiLoading from '@/components/UiLoading.vue'
import { CUBE_PROJECTS, STUDENT_STATUS_OPTIONS } from '@/lib/dict'
import { rankForProject } from '@/lib/ranks'
import { formatDate } from '@/lib/format'
import { listStudents } from '@/api/students'
import { listScoresForAnalysis } from '@/api/analytics'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
const router = useRouter()

// ===== 图表尺寸（手写 SVG，与 StudentDetailView 风格一致）=====
const CW = 760
const CH = 320
const padL = 46
const padR = 18
const padT = 18
const padB = 36
const PALETTE = ['#EA625F', '#F2A024', '#34B4E2', '#9B6FE0', '#93BC37']

const project = ref('3x3')
const rangeStart = ref('')
const rangeEnd = ref('')
const statusFilter = ref('')
const rankMetric = ref('avg') // 'avg' | 'single'
const viewMode = ref('single') // 'single' | 'matrix'

const loading = ref(false)
const allScores = ref([])
// 单项目分析所用的成绩（按当前项目过滤）
const scores = computed(() => allScores.value.filter((s) => s.project === project.value))
const students = ref([])
const selectedIds = ref([])

const projectLabel = computed(() => cubeLabel(project.value))
function cubeLabel(value) {
  return CUBE_PROJECTS.find((p) => p.value === value)?.label || value
}

const filteredStudents = computed(() =>
  students.value.filter((st) => !statusFilter.value || st.status === statusFilter.value),
)

function fmtSec(v) {
  return v == null ? '—' : `${Number(v).toFixed(2)}s`
}

/** 矩阵内紧凑显示：≥60 秒折叠为 m:ss.xx，便于窄单元格展示 */
function fmtSecShort(v) {
  if (v == null) return '—'
  const n = Number(v)
  const m = Math.floor(n / 60)
  const s = n - m * 60
  if (m > 0) return `${m}:${s.toFixed(2).padStart(5, '0')}`
  return n.toFixed(2)
}

// ===== 排名（按项目 + 时间范围聚合）=====
const ranking = computed(() => {
  const metric = rankMetric.value
  const bestMap = new Map()
  for (const s of scores.value) {
    const isDnf = metric === 'avg' ? s.avg_is_dnf : s.single_is_dnf
    const val = metric === 'avg' ? s.avg_seconds : s.single_best_seconds
    if (isDnf || val == null) continue
    const v = Number(val)
    const cur = bestMap.get(s.student_id)
    if (!cur) bestMap.set(s.student_id, { best: v, count: 1 })
    else {
      cur.best = Math.min(cur.best, v)
      cur.count += 1
    }
  }
  const rows = filteredStudents.value.map((st) => {
    const m = bestMap.get(st.id)
    return { student: st, best: m ? m.best : null, count: m ? m.count : 0 }
  })
  rows.sort((a, b) => {
    if (a.best == null && b.best == null) return a.student.name.localeCompare(b.student.name, 'zh')
    if (a.best == null) return 1
    if (b.best == null) return -1
    return a.best - b.best
  })
  return rows
})

const rankedCount = computed(() => ranking.value.filter((r) => r.count > 0).length)

// ===== 跨项目矩阵（学员 × 6 项目 最佳成绩，按段位着色）=====
const matrix = computed(() => {
  const metric = rankMetric.value
  const best = new Map() // studentId -> { project: value }
  for (const s of allScores.value) {
    const isDnf = metric === 'avg' ? s.avg_is_dnf : s.single_is_dnf
    const val = metric === 'avg' ? s.avg_seconds : s.single_best_seconds
    if (isDnf || val == null) continue
    const v = Number(val)
    let m = best.get(s.student_id)
    if (!m) {
      m = {}
      best.set(s.student_id, m)
    }
    m[s.project] = m[s.project] == null ? v : Math.min(m[s.project], v)
  }
  const rows = filteredStudents.value.map((st) => {
    const m = best.get(st.id) || {}
    const cells = CUBE_PROJECTS.map((p) => {
      const v = m[p.value] ?? null
      return { project: p.value, value: v, rank: v == null ? null : rankForProject(p.value, v) }
    })
    return { student: st, cells, covered: cells.filter((c) => c.value != null).length }
  })
  rows.sort((a, b) => {
    if (b.covered !== a.covered) return b.covered - a.covered
    return a.student.name.localeCompare(b.student.name, 'zh')
  })
  return rows
})

function rankBadgeClass(i) {
  return i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-ink-300 text-white' : 'bg-orange-300 text-white'
}

// ===== 对比 =====
function isSelected(id) {
  return selectedIds.value.includes(id)
}
function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else {
    if (selectedIds.value.length >= 5) {
      toast.warning('最多对比 5 名学员')
      return
    }
    selectedIds.value.push(id)
  }
}

const compareSeries = computed(() =>
  selectedIds.value
    .map((id, i) => {
      const st = students.value.find((s) => s.id === id)
      if (!st) return null
      const pts = scores.value
        .filter((s) => s.student_id === id && !s.avg_is_dnf && s.avg_seconds != null)
        .map((s) => ({ date: s.recorded_at, t: new Date(s.recorded_at).getTime(), v: Number(s.avg_seconds) }))
        .sort((a, b) => a.t - b.t)
      const vals = pts.map((p) => p.v)
      const max = vals.length ? Math.max(...vals) : null
      const min = vals.length ? Math.min(...vals) : null
      const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
      return { st, pts, color: PALETTE[i % PALETTE.length], max, min, mean }
    })
    .filter(Boolean),
)

const compareChart = computed(() => {
  const series = compareSeries.value
  const allPts = series.flatMap((s) => s.pts)
  if (!allPts.length) return { lines: [], yTicks: [], xTicks: [], points: [] }

  const ts = allPts.map((p) => p.t)
  const xMin = Math.min(...ts)
  const xMax = Math.max(...ts)
  const vs = allPts.map((p) => p.v)
  let yMin = Math.floor(Math.min(...vs))
  let yMax = Math.ceil(Math.max(...vs))
  if (yMax - yMin <= 4) {
    yMin = Math.max(0, yMin - 1)
    yMax = yMax + 1
  }
  if (yMin < 0) yMin = 0

  const xOf = (t) => (xMin === xMax ? (padL + CW - padR) / 2 : padL + ((t - xMin) / (xMax - xMin)) * (CW - padL - padR))
  const yOf = (v) => padT + (1 - (v - yMin) / (yMax - yMin || 1)) * (CH - padT - padB)

  const ySpan = yMax - yMin || 1
  const yStep = ySpan <= 6 ? 1 : Math.ceil(ySpan / 5)
  const yTicks = []
  for (let v = yMin; v <= yMax; v += yStep) yTicks.push({ y: yOf(v), label: String(v) })

  const xTicks = []
  const n = 5
  for (let i = 0; i < n; i += 1) {
    const t = xMin + (xMax - xMin) * (i / (n - 1))
    xTicks.push({ x: xOf(t), label: formatDate(new Date(t)) })
  }

  const lines = series.map((s) => ({
    color: s.color,
    has: s.pts.length >= 2,
    points: s.pts.map((p) => `${xOf(p.t).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' '),
  }))

  const points = series.flatMap((s) =>
    s.pts.map((p) => ({
      x: xOf(p.t),
      y: yOf(p.v),
      color: s.color,
      name: s.st.name,
      date: formatDate(new Date(p.t)),
      v: p.v,
    })),
  )

  return { lines, yTicks, xTicks, points }
})

// ===== 交互 =====
function goStudent(id) {
  router.push({ name: 'student-detail', params: { id } })
}

function resetFilters() {
  rangeStart.value = ''
  rangeEnd.value = ''
  statusFilter.value = ''
}

async function loadStudents() {
  try {
    const { items } = await listStudents({ paged: false })
    students.value = items || []
  } catch (err) {
    toast.error(err.message)
    students.value = []
  }
}

async function loadScores() {
  if (rangeStart.value && rangeEnd.value && rangeEnd.value < rangeStart.value) {
    toast.error('结束日期不能早于起始日期')
    return
  }
  loading.value = true
  try {
    // 一次拉取时间范围内全部项目的成绩；单项目视图在内存中过滤，跨项目视图直接使用全量
    allScores.value = await listScoresForAnalysis({
      start: rangeStart.value || null,
      end: rangeEnd.value || null,
    })
  } catch (err) {
    toast.error(err.message)
    allScores.value = []
  } finally {
    loading.value = false
  }
}

watch([rangeStart, rangeEnd], loadScores)

onMounted(() => {
  loadStudents()
  loadScores()
})
</script>
