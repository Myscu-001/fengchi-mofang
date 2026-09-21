<template>
  <section class="tl-card" :class="bare ? 'tl-bare' : 'fc-card'">
    <header v-if="!bare" class="tl-head">
      <h3 class="tl-title">
        <Clock class="size-4" />
        成长时间线
      </h3>
      <span class="tl-count">
        <template v-if="summary.total">共 {{ summary.total }} 条 · 按时间倒序</template>
        <template v-else>暂无记录</template>
      </span>
    </header>

    <!-- 筛选 -->
    <div class="tl-chips">
      <button
        v-for="c in chips"
        :key="c.key"
        type="button"
        class="tl-chip"
        :class="{ on: filter === c.key }"
        @click="filter = c.key"
      >
        <span v-if="c.color" class="tl-chip-d" :style="{ background: c.color }" />
        {{ c.label }}
      </button>
    </div>

    <div class="tl-wrap">
      <!-- ============ 主列：时间线 ============ -->
      <div class="tl-main">
        <div v-if="loading" class="tl-note">正在整理成长轨迹…</div>

        <div v-else-if="!matched.length" class="tl-note">
          {{
            summary.total
              ? '这一类还没有记录，换个筛选看看。'
              : '还没有可展示的记录 —— 录入成绩、学习记录或 CFOP 掌握情况后，这里会自动生成成长轨迹。'
          }}
        </div>

        <template v-else>
          <ul class="tl-list">
            <template v-for="m in months" :key="m.key">
              <li :id="`tl-m-${m.key}`" class="tl-month">{{ m.label }}</li>

              <li
                v-for="e in m.items"
                :key="e.id"
                class="tl-item"
                :class="{ big: e.big }"
                :style="{ '--c': colorOf(e), '--t': tintOf(e) }"
              >
                <span class="tl-dot"><component :is="ICONS[e.type]" /></span>

                <div class="tl-ev">
                  <div class="tl-ev-top">
                    <span class="tl-ev-title">{{ e.title }}</span>
                    <span class="tl-ev-date">
                      <span class="tl-md">{{ shortDate(e.date) }}</span>
                      <span class="tl-lg">{{ e.date }}</span>
                    </span>
                  </div>

                  <p v-if="e.desc && e.desc.length" class="tl-ev-desc">
                    <span
                      v-for="(d, i) in e.desc"
                      :key="i"
                      :class="d.b ? 'b' : d.hl ? 'hl' : ''"
                    >{{ d.t }}</span>
                  </p>

                  <div v-if="e.tags && e.tags.length" class="tl-tags">
                    <span v-for="t in e.tags" :key="t" class="tl-tag">{{ t }}</span>
                  </div>
                </div>
              </li>
            </template>
          </ul>

          <button v-if="hiddenCount" type="button" class="tl-more" @click="monthsLimit += 12">
            加载更早的记录（还有 {{ hiddenCount }} 条）
          </button>
        </template>
      </div>

      <!-- ============ 侧栏：仅桌面端显示 ============ -->
      <aside class="tl-side">
        <div class="tl-panel">
          <h4><Activity class="size-3.5" />全程小结</h4>
          <div class="tl-stat"><span>入班至今</span><b>{{ summary.monthsFromJoin || '—' }}</b></div>
          <div class="tl-stat"><span>上课次数</span><b>{{ summary.classCount }} 次</b></div>
          <div class="tl-stat"><span>成绩记录</span><b>{{ summary.scoreCount }} 条</b></div>
          <div class="tl-stat"><span>破 PB</span><b>{{ summary.pbCount }} 次</b></div>
          <div class="tl-stat"><span>段位晋级</span><b>{{ summary.rankCount }} 次</b></div>
          <div v-for="p in summary.progress" :key="p.project" class="tl-stat">
            <span>{{ p.label }}总进步</span>
            <b class="up">{{ p.delta.toFixed(2) }}s</b>
          </div>
        </div>

        <div v-if="yearJumps.length > 1" class="tl-panel">
          <h4><CalendarDays class="size-3.5" />按年份跳转</h4>
          <div class="tl-years">
            <button v-for="y in yearJumps" :key="y.year" type="button" @click="jumpTo(y.key)">
              {{ y.year }} 年<span>{{ y.count }} 条 ›</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  Activity,
  BookOpen,
  CalendarDays,
  Clock,
  Flag,
  ListChecks,
  Medal,
  Target,
  Trophy,
} from 'lucide-vue-next'
import { CFOP_GROUPS } from '@/lib/cfop'
import { CUBE_PROJECTS } from '@/lib/dict'
import { rankTiers } from '@/lib/ranks'
import {
  TIMELINE_TYPES,
  buildTimeline,
  groupByMonth,
  monthsAgoDay,
  typeMeta,
} from '@/lib/timeline'

const props = defineProps({
  /** 学员行（读 joined_at / level） */
  student: { type: Object, default: null },
  /** student_scores 全量（跨项目） */
  scores: { type: Array, default: () => [] },
  /** student_learning_logs */
  logs: { type: Array, default: () => [] },
  /** { "oll:12": "2026-09-15", ... } */
  cfopLearned: { type: Object, default: () => ({}) },
  /** { "3x3": { type, target, baseline, due, note } } */
  goals: { type: Object, default: () => ({}) },
  loading: Boolean,
  /**
   * 嵌在弹层（UiSheet）里时：隐藏自身标题头、去掉卡片外壳，
   * 并放开 overflow —— 否则侧栏的 position:sticky 会被 overflow:hidden 截断而失效。
   */
  bare: Boolean,
})

/** 事件类型 → 图标（与模拟稿一致：奖杯 / 奖牌 / 靶心 / 书 / 清单 / 旗） */
const ICONS = {
  pb: Trophy,
  rank: Medal,
  goal: Target,
  class: BookOpen,
  cfop: ListChecks,
  start: Flag,
}

const filter = ref('all')
/** 默认只展开最近 12 个月，点「加载更早」每次再放 12 个月 */
const monthsLimit = ref(12)

const built = computed(() =>
  buildTimeline({
    student: props.student,
    scores: props.scores,
    logs: props.logs,
    cfopLearned: props.cfopLearned,
    goals: props.goals,
    projects: CUBE_PROJECTS,
    cfopGroups: CFOP_GROUPS,
    tiersOf: (p) => rankTiers(p),
  }),
)
const events = computed(() => built.value.events)
const summary = computed(() => built.value.summary)

const chips = computed(() => [{ key: 'all', label: '全部', color: '' }, ...TIMELINE_TYPES])

const cutoff = computed(() => monthsAgoDay(monthsLimit.value))
const matched = computed(() =>
  events.value.filter((e) => filter.value === 'all' || e.type === filter.value),
)
const visible = computed(() => matched.value.filter((e) => e.date >= cutoff.value))
const hiddenCount = computed(() => matched.value.length - visible.value.length)
const months = computed(() => groupByMonth(visible.value))

/** 可见范围里的年份集合，用于「按年份跳转」 */
const yearJumps = computed(() => {
  const out = []
  const seen = {}
  for (const m of months.value) {
    const y = m.key.slice(0, 4)
    if (!seen[y]) {
      seen[y] = { year: y, key: m.key, count: 0 }
      out.push(seen[y])
    }
    seen[y].count += m.items.length
  }
  return out
})

function colorOf(e) {
  return e.accent || typeMeta(e.type).color
}
function tintOf(e) {
  return typeMeta(e.type).tint
}
function shortDate(d) {
  return d.slice(5)
}
function jumpTo(key) {
  const el = document.getElementById(`tl-m-${key}`)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
</script>

<style scoped>
.tl-card {
  overflow: hidden;
}
/* 弹层内：放开 overflow，让侧栏 sticky 相对弹层滚动容器生效 */
.tl-card.tl-bare {
  overflow: visible;
}

/* 弹层内：筛选条吸顶 —— 长列表滚到下面也能随时切筛选 */
.tl-card.tl-bare .tl-chips {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #fff;
  border-bottom: 1px solid var(--color-ink-100, #f1f2f0);
}

/* ---------- 头部 ---------- */
.tl-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 15px 0;
}
.tl-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-ink-900, #14170f);
}
.tl-count {
  flex: none;
  font-size: 11px;
  color: var(--color-ink-400, #8b918a);
}

/* ---------- 筛选 ---------- */
.tl-chips {
  display: flex;
  gap: 6px;
  padding: 11px 15px 13px;
  overflow-x: auto;
  scrollbar-width: none;
}
.tl-chips::-webkit-scrollbar {
  display: none;
}
.tl-chip {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 5px;
  height: 27px;
  padding: 0 11px;
  border: 1px solid var(--color-ink-200, #e3e5e2);
  border-radius: 999px;
  background: #fff;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-ink-600, #545a51);
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.tl-chip.on {
  border-color: var(--color-ink-900, #14170f);
  background: var(--color-ink-900, #14170f);
  color: #fff;
}
.tl-chip-d {
  width: 6px;
  height: 6px;
  flex: none;
  border-radius: 50%;
}
.tl-chip.on .tl-chip-d {
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.35);
}

/* ---------- 布局：手机单列 / 桌面「时间线 + 侧栏」 ---------- */
.tl-wrap {
  padding: 0 15px 16px;
}
@media (min-width: 1024px) {
  .tl-wrap {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 216px;
    gap: 20px;
    align-items: start;
    padding: 0 22px 22px;
  }
}

.tl-note {
  padding: 6px 0 10px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--color-ink-400, #8b918a);
}

/* ---------- 时间线 ---------- */
.tl-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.tl-month {
  position: relative;
  padding: 3px 0 9px 42px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.3px;
  color: var(--color-ink-400, #8b918a);
}
.tl-month::after {
  display: block;
  width: 44px;
  height: 1px;
  margin-top: 5px;
  background: var(--color-ink-200, #e3e5e2);
  content: '';
}

.tl-item {
  position: relative;
  padding-bottom: 14px;
  padding-left: 42px;
}
.tl-item::before {
  position: absolute;
  top: 30px;
  bottom: -2px;
  left: 15px;
  width: 2px;
  background: var(--color-ink-200, #e3e5e2);
  content: '';
}
.tl-item:last-child::before {
  display: none;
}

.tl-dot {
  position: absolute;
  top: 1px;
  left: 2px;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--t);
  color: var(--c);
}
.tl-dot :deep(svg) {
  width: 15px;
  height: 15px;
}

/* 里程碑：图标圈放大 + 外圈光晕，卡片淡色渐变 */
.tl-item.big {
  padding-left: 46px;
}
.tl-item.big .tl-dot {
  top: 0;
  left: 0;
  width: 32px;
  height: 32px;
  box-shadow: 0 0 0 4px #fff, 0 0 0 6px var(--t);
}
.tl-item.big .tl-dot :deep(svg) {
  width: 17px;
  height: 17px;
}
.tl-item.big::before {
  top: 34px;
  left: 15.5px;
}

.tl-ev {
  padding: 10px 12px;
  border: 1px solid var(--color-ink-200, #e3e5e2);
  border-radius: 12px;
  background: #fff;
}
.tl-item.big .tl-ev {
  border-color: var(--t);
  background: linear-gradient(180deg, var(--t), #fff);
}

.tl-ev-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.tl-ev-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--color-ink-900, #14170f);
}
.tl-ev-date {
  flex: none;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink-400, #8b918a);
}
.tl-lg {
  display: none;
}

.tl-ev-desc {
  margin: 4px 0 0;
  font-size: 12.2px;
  line-height: 1.65;
  color: var(--color-ink-600, #545a51);
}
.tl-ev-desc .b {
  font-weight: 700;
  color: var(--color-ink-900, #14170f);
}
.tl-ev-desc .hl {
  font-weight: 700;
  color: var(--c);
}

.tl-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}
.tl-tag {
  padding: 2px 7px;
  border-radius: 6px;
  background: var(--color-ink-100, #eff1ee);
  font-size: 10.5px;
  font-weight: 600;
  color: var(--color-ink-500, #6b7268);
}

.tl-more {
  width: 100%;
  height: 38px;
  margin-top: 2px;
  border: 1px dashed var(--color-ink-300, #c9cfc6);
  border-radius: 11px;
  background: #fff;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-ink-500, #6b7268);
}
.tl-more:active {
  background: var(--color-ink-50, #f8f8f7);
}

/* ---------- 侧栏 ---------- */
.tl-side {
  display: none;
}
@media (min-width: 1024px) {
  .tl-side {
    position: sticky;
    top: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .tl-lg {
    display: inline;
  }
  .tl-md {
    display: none;
  }
}

.tl-panel {
  padding: 13px 14px;
  border: 1px solid var(--color-ink-200, #e3e5e2);
  border-radius: 12px;
  background: #fff;
}
.tl-panel + .tl-panel {
  margin-top: 0;
}
.tl-panel h4 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 8px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--color-ink-800, #262a24);
}
.tl-stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px dashed var(--color-ink-100, #eff1ee);
  font-size: 12.2px;
  color: var(--color-ink-600, #545a51);
}
.tl-stat:last-child {
  border-bottom: 0;
}
.tl-stat b {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink-900, #14170f);
}
.tl-stat b.up {
  color: var(--color-brand-500, #e8564f);
}

.tl-years {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.tl-years button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 9px;
  border: 0;
  border-radius: 8px;
  background: var(--color-ink-50, #f8f8f7);
  font-size: 12px;
  color: var(--color-ink-600, #545a51);
  transition: background 0.15s;
}
.tl-years button:hover {
  background: var(--color-ink-100, #eff1ee);
}
.tl-years button span {
  font-variant-numeric: tabular-nums;
}
</style>
