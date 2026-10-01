<template>
  <div>
    <PageHeader title="CFOP 学习总览" :description="headerDesc">
      <UiButton variant="outline" @click="load">
        <template #icon><RefreshCw class="size-3.5" :class="loading ? 'animate-spin' : ''" /></template>
        刷新
      </UiButton>
    </PageHeader>

    <div class="fc-container space-y-4 py-6">
      <!-- 筛选 / 统计条 -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <label class="inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink-600">
          <input v-model="onlyStarted" type="checkbox" class="size-4 accent-[#e8564f]" />
          只看已开启 CFOP 学习的学员
        </label>
        <span class="text-[13px] text-ink-400">
          全机构 {{ totalStudents }} 名学员 · 已开展 {{ startedCount }} 名
        </span>
      </div>

      <p v-if="errMsg" class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
        {{ errMsg }}
      </p>

      <div v-if="loading && !rows.length" class="py-16 text-center text-[13px] text-ink-400">
        正在汇总各学员的 CFOP 进度…
      </div>

      <p v-else-if="!displayRows.length" class="py-16 text-center text-[13px] text-ink-400">
        还没有学员开展 CFOP 学习记录。在学员档案中打开「CFOP 学习」并勾选掌握情况后，这里会自动出现。
      </p>

      <!-- 学员行 -->
      <ul v-else class="space-y-2.5">
        <li v-for="r in displayRows" :key="r.id">
          <RouterLink
            :to="{ name: 'student-cfop', params: { id: r.id } }"
            class="fc-card flex flex-wrap items-center gap-3.5 p-3.5 transition hover:border-brand-300 hover:shadow-lift"
          >
            <UiAvatar :src="r.avatar_url" :name="r.name" size="md" />

            <div class="min-w-[120px] flex-1">
              <div class="flex items-center gap-2">
                <span class="text-[14.5px] font-semibold text-ink-900">{{ r.name }}</span>
                <span
                  v-if="r.nickname"
                  class="rounded bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-500"
                >{{ r.nickname }}</span>
                <span
                  class="rounded border px-1.5 py-0.5 text-[11px] font-medium"
                  :class="statusStyle(r.status)"
                >{{ statusLabel(r.status) }}</span>
              </div>
              <p class="mt-0.5 text-[12px] text-ink-400">
                {{ r.total ? `已掌握 ${r.total} / ${CFOP_TOTAL} 个情况` : '尚未记录任何掌握情况' }}
                <span v-if="r.updatedAt" class="ml-1">· 最近更新 {{ relativeTime(r.updatedAt) }}</span>
              </p>
            </div>

            <!-- 三组进度 -->
            <div class="flex flex-1 flex-wrap items-center gap-x-4 gap-y-2 sm:justify-end">
              <div v-for="g in CFOP_GROUPS" :key="g.key" class="min-w-[120px]">
                <div class="flex items-baseline justify-between text-[12px]">
                  <span class="font-medium text-ink-600">{{ g.title }}</span>
                  <span class="tabular-nums text-ink-800">{{ r.group[g.key] }} / {{ g.count }}</span>
                </div>
                <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
                  <i
                    class="block h-full rounded-full transition-all"
                    :style="{ width: pct(r.group[g.key], g.count) + '%', background: g.color }"
                  />
                </div>
              </div>

              <!-- 总进度 -->
              <div class="min-w-[120px]">
                <div class="flex items-baseline justify-between text-[12px]">
                  <span class="font-medium text-ink-600">总进度</span>
                  <span class="tabular-nums text-brand-600">{{ pct(r.total, CFOP_TOTAL) }}%</span>
                </div>
                <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
                  <i
                    class="block h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all"
                    :style="{ width: pct(r.total, CFOP_TOTAL) + '%' }"
                  />
                </div>
              </div>
            </div>
          </RouterLink>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { RefreshCw } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import UiButton from '@/components/UiButton.vue'
import UiAvatar from '@/components/UiAvatar.vue'
import { supabase, errorMessage, TABLES } from '@/lib/supabase'
import { listStudentOptions } from '@/api/students'
import { CFOP_GROUPS, CFOP_TOTAL } from '@/lib/cfop'
import { STUDENT_STATUS } from '@/lib/dict'
import { relativeTime } from '@/lib/format'

const loading = ref(false)
const errMsg = ref('')
const onlyStarted = ref(false)
/** 合并后的学员行：{ id, name, nickname, status, avatar_url, learned, updatedAt, total, group } */
const rows = ref([])

const totalStudents = ref(0)
const startedCount = computed(() => rows.value.filter((r) => r.total > 0).length)
/** 按「只看已开启」过滤后的展示列表 */
const displayRows = computed(() =>
  onlyStarted.value ? rows.value.filter((r) => r.total > 0) : rows.value,
)
const headerDesc = computed(() =>
  onlyStarted.value
    ? '仅显示已开启 CFOP 学习的学员，按最近记录时间倒序'
    : '跨学员汇总 F2L / OLL / PLL 进度，最近记录过的学员排在最前',
)

function pct(n, total) {
  const t = Number(total) || 1
  return Math.round((Number(n) || 0) / t * 100)
}
function statusLabel(s) {
  return STUDENT_STATUS[s]?.label || '在读'
}
function statusStyle(s) {
  return STUDENT_STATUS[s]?.style || 'bg-ink-100 text-ink-600 border-ink-200'
}

/** 解析一个学员的 learned 对象 → 各组计数 + 总数 */
function tally(learned) {
  const group = { f2l: 0, oll: 0, pll: 0 }
  let total = 0
  if (learned && typeof learned === 'object') {
    for (const k of Object.keys(learned)) {
      const g = k.split(':')[0]
      if (g in group) group[g] += 1
      total += 1
    }
  }
  return { group, total }
}

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    // 两张表并行取：学员基础信息（轻量全量）+ 各学员 CFOP 掌握情况
    const [students, cfopRes] = await Promise.all([
      listStudentOptions(),
      supabase.from(TABLES.cfopProgress).select('student_id, learned, updated_at'),
    ])
    if (cfopRes.error) throw new Error(errorMessage(cfopRes.error, '加载 CFOP 进度失败'))

    const byId = new Map((cfopRes.data || []).map((r) => [r.student_id, r]))
    totalStudents.value = students.length

    const merged = students.map((s) => {
      const row = byId.get(s.id)
      const learned = row?.learned
      const { group, total } = tally(learned)
      return {
        id: s.id,
        name: s.name,
        nickname: s.nickname || '',
        status: s.status,
        avatar_url: s.avatar_url,
        learned,
        updatedAt: row?.updated_at || null,
        total,
        group,
      }
    })

    // 排序：有记录（updatedAt 非空）的按时间倒序在前，未开始的排后面
    merged.sort((a, b) => {
      if (a.updatedAt && b.updatedAt) return new Date(b.updatedAt) - new Date(a.updatedAt)
      if (a.updatedAt) return -1
      if (b.updatedAt) return 1
      return (a.name || '').localeCompare(b.name || '', 'zh-CN')
    })

    rows.value = merged
  } catch (err) {
    errMsg.value = err.message || '加载失败，请重试'
    rows.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
