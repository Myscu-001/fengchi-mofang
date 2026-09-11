<template>
  <div>
    <PageHeader title="PB 荣誉墙" description="全机构个人最好成绩榜，按魔方项目展示最佳平均（Ao5）与最佳单次，记录每一份突破">
      <UiButton variant="outline" @click="load">
        <template #icon><RotateCcw class="size-3.5" /></template>
        刷新
      </UiButton>
    </PageHeader>

    <div class="fc-container space-y-5 py-7">
      <!-- 筛选 -->
      <div class="fc-card flex flex-wrap items-end gap-4 p-4">
        <div>
          <label class="mb-1.5 block text-[12px] font-medium text-ink-500">魔方项目</label>
          <select v-model="projectFilter" class="fc-input w-auto min-w-[130px]">
            <option value="">全部项目</option>
            <option v-for="p in CUBE_PROJECTS" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1.5 block text-[12px] font-medium text-ink-500">学员状态</label>
          <select v-model="statusFilter" class="fc-input w-auto min-w-[120px]">
            <option value="">全部状态</option>
            <option v-for="o in STUDENT_STATUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div class="ml-auto text-right text-[12.5px] text-ink-400">
          <div>共 <span class="font-semibold text-ink-600">{{ allScores.length }}</span> 条成绩</div>
          <div>上榜 <span class="font-semibold text-ink-600">{{ totalStars }}</span> 人次</div>
        </div>
      </div>

      <UiLoading v-if="loading" text="正在统计全机构最好成绩…" />

      <UiEmpty
        v-else-if="!hasData"
        :icon="Trophy"
        title="暂无成绩记录"
        description="录入学员成绩后，机构最好成绩榜会在这里点亮。"
      />

      <template v-else>
        <section
          v-for="p in visibleProjects"
          :key="p.value"
          class="fc-card overflow-hidden"
        >
          <div class="flex items-center gap-2 border-b border-ink-200 px-4 py-3">
            <span class="size-3 rounded" :style="{ backgroundColor: p.color }" />
            <h3 class="text-[14px] font-semibold text-ink-800">{{ p.label }}</h3>
            <span class="text-[12px] text-ink-400">{{ p.short }}</span>
          </div>

          <div class="grid gap-0 md:grid-cols-2 md:divide-x md:divide-ink-100">
            <!-- 最佳平均 -->
            <div class="p-4">
              <div class="mb-3 flex items-center gap-1.5 text-[12.5px] font-medium text-ink-600">
                <Timer class="size-3.5 text-brand-500" />最佳平均成绩 (Ao5)
              </div>
              <ul v-if="board[p.value].avg.length" class="space-y-1.5">
                <li
                  v-for="(row, i) in board[p.value].avg"
                  :key="row.student.id"
                  class="flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition"
                  :class="i === 0 ? 'bg-amber-50' : 'hover:bg-ink-50'"
                  @click="goStudent(row.student.id)"
                >
                  <span
                    class="flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
                    :class="placeClass(i)"
                  >
                    <Crown v-if="i === 0" class="size-3.5" />
                    <template v-else>{{ i + 1 }}</template>
                  </span>
                  <UiAvatar :src="row.student.avatar_url" :name="row.student.name" size="xs" />
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-[13px] font-medium text-ink-800">{{ row.student.name }}</p>
                    <p class="text-[11px] text-ink-400">{{ formatDate(row.date) }}</p>
                  </div>
                  <span class="shrink-0 text-[14px] font-bold tabular-nums text-brand-700">{{ fmtSec(row.value) }}</span>
                </li>
              </ul>
              <p v-else class="py-4 text-center text-[12.5px] text-ink-400">暂无有效平均成绩</p>
            </div>

            <!-- 最佳单次 -->
            <div class="p-4">
              <div class="mb-3 flex items-center gap-1.5 text-[12.5px] font-medium text-ink-600">
                <Zap class="size-3.5 text-orange-500" />最佳单次成绩
              </div>
              <ul v-if="board[p.value].single.length" class="space-y-1.5">
                <li
                  v-for="(row, i) in board[p.value].single"
                  :key="row.student.id"
                  class="flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition"
                  :class="i === 0 ? 'bg-amber-50' : 'hover:bg-ink-50'"
                  @click="goStudent(row.student.id)"
                >
                  <span
                    class="flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
                    :class="placeClass(i)"
                  >
                    <Crown v-if="i === 0" class="size-3.5" />
                    <template v-else>{{ i + 1 }}</template>
                  </span>
                  <UiAvatar :src="row.student.avatar_url" :name="row.student.name" size="xs" />
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-[13px] font-medium text-ink-800">{{ row.student.name }}</p>
                    <p class="text-[11px] text-ink-400">{{ formatDate(row.date) }}</p>
                  </div>
                  <span class="shrink-0 text-[14px] font-bold tabular-nums text-orange-600">{{ fmtSec(row.value) }}</span>
                </li>
              </ul>
              <p v-else class="py-4 text-center text-[12.5px] text-ink-400">暂无有效单次成绩</p>
            </div>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Crown, RotateCcw, Timer, Trophy, Zap } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import UiButton from '@/components/UiButton.vue'
import UiAvatar from '@/components/UiAvatar.vue'
import UiLoading from '@/components/UiLoading.vue'
import UiEmpty from '@/components/UiEmpty.vue'
import { CUBE_PROJECTS, STUDENT_STATUS_OPTIONS } from '@/lib/dict'
import { formatDate } from '@/lib/format'
import { listStudents } from '@/api/students'
import { listScoresForAnalysis } from '@/api/analytics'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
const router = useRouter()

const TOP_N = 5

const loading = ref(true)
const allScores = ref([])
const students = ref([])
const projectFilter = ref('')
const statusFilter = ref('')

function fmtSec(v) {
  if (v == null) return '—'
  const n = Number(v)
  const m = Math.floor(n / 60)
  const s = n - m * 60
  if (m > 0) return `${m}:${s.toFixed(2).padStart(5, '0')}`
  return `${n.toFixed(2)}s`
}

function placeClass(i) {
  return i === 0
    ? 'bg-amber-400 text-white'
    : i === 1
      ? 'bg-ink-300 text-white'
      : i === 2
        ? 'bg-orange-300 text-white'
        : 'bg-ink-100 text-ink-500'
}

const filteredStudents = computed(() =>
  students.value.filter((st) => !statusFilter.value || st.status === statusFilter.value),
)

/** 每个项目的 最佳平均 / 最佳单次 榜单（按学员取 PB，升序取前 N） */
const board = computed(() => {
  const studentMap = new Map(filteredStudents.value.map((s) => [s.id, s]))
  const buckets = {}
  for (const p of CUBE_PROJECTS) buckets[p.value] = { avg: new Map(), single: new Map() }

  const put = (map, sid, value, date) => {
    if (!studentMap.has(sid)) return
    const cur = map.get(sid)
    if (cur == null || value < cur.value) map.set(sid, { value, date })
  }

  for (const s of allScores.value) {
    const b = buckets[s.project]
    if (!b) continue
    if (!studentMap.has(s.student_id)) continue
    if (!s.avg_is_dnf && s.avg_seconds != null) put(b.avg, s.student_id, Number(s.avg_seconds), s.recorded_at)
    if (!s.single_is_dnf && s.single_best_seconds != null) {
      put(b.single, s.student_id, Number(s.single_best_seconds), s.recorded_at)
    }
  }

  const toList = (map) =>
    [...map.entries()]
      .map(([sid, d]) => ({ student: studentMap.get(sid), value: d.value, date: d.date }))
      .filter((r) => r.student)
      .sort((a, b) => a.value - b.value)
      .slice(0, TOP_N)

  const result = {}
  for (const p of CUBE_PROJECTS) {
    result[p.value] = { avg: toList(buckets[p.value].avg), single: toList(buckets[p.value].single) }
  }
  return result
})

const visibleProjects = computed(() =>
  CUBE_PROJECTS.filter((p) => !projectFilter.value || p.value === projectFilter.value),
)

const hasData = computed(() =>
  visibleProjects.value.some((p) => board.value[p.value].avg.length || board.value[p.value].single.length),
)

const totalStars = computed(() =>
  visibleProjects.value.reduce(
    (sum, p) => sum + board.value[p.value].avg.length + board.value[p.value].single.length,
    0,
  ),
)

function goStudent(id) {
  router.push({ name: 'student-detail', params: { id } })
}

async function load() {
  loading.value = true
  try {
    const [{ items }, scores] = await Promise.all([
      listStudents({ paged: false }),
      listScoresForAnalysis({}),
    ])
    students.value = items || []
    allScores.value = scores || []
  } catch (err) {
    toast.error(err.message)
    students.value = []
    allScores.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
