<template>
  <div>
    <!-- ============ 首屏 ============ -->
    <section class="fc-cube-bg border-b border-ink-200 bg-white">
      <div class="fc-container py-14 lg:py-20">
        <div class="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
          <div class="fc-anim-in">
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[12px] font-medium text-brand-700"
            >
              <Sparkles class="size-3.5" />
              机构内部教学管理系统
            </span>

            <h1 class="mt-5 text-[34px] leading-[1.15] font-bold tracking-tight text-ink-900 lg:text-[46px]">
              {{ hero.title || '风驰思维魔方' }}
            </h1>
            <p class="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-600">
              {{ hero.subtitle || '以魔方为载体，训练观察力、记忆力、空间想象力与专注力。' }}
            </p>

            <div class="mt-7 flex flex-wrap items-center gap-3">
              <template v-if="auth.isLoggedIn">
                <RouterLink
                  :to="{ name: 'courses' }"
                  class="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-medium text-white shadow-soft transition hover:bg-brand-700"
                >
                  <Boxes class="size-4" />
                  开始管理课程
                </RouterLink>
                <RouterLink
                  :to="{ name: 'resources' }"
                  class="inline-flex h-11 items-center gap-2 rounded-xl border border-ink-200 bg-white px-5 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
                >
                  <FolderOpen class="size-4" />
                  资源中心
                </RouterLink>
              </template>

              <template v-else>
                <RouterLink
                  :to="{ name: 'login' }"
                  class="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-medium text-white shadow-soft transition hover:bg-brand-700"
                >
                  <LogIn class="size-4" />
                  {{ hero.primary_cta || '进入教学管理' }}
                </RouterLink>
                <button
                  type="button"
                  class="inline-flex h-11 items-center gap-2 rounded-xl border border-ink-200 bg-white px-5 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
                  @click="scrollTo('highlights')"
                >
                  {{ hero.secondary_cta || '了解课程体系' }}
                  <ArrowDown class="size-4" />
                </button>
              </template>
            </div>

            <!-- 对外累计数据 -->
            <div v-if="baselineStats.length" class="mt-9 grid max-w-lg grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <div v-for="s in baselineStats" :key="s.label">
                <p class="text-[24px] leading-none font-semibold text-brand-700 tabular-nums">{{ s.value }}</p>
                <p class="mt-1 text-xs text-ink-500">{{ s.label }}</p>
              </div>
            </div>
          </div>

          <!-- 魔方视觉 -->
          <div class="fc-anim-in hidden justify-center lg:flex">
            <div class="relative">
              <div class="absolute -inset-6 rounded-[36px] bg-brand-100/50 blur-2xl" />
              <svg viewBox="0 0 240 240" class="relative w-[280px] drop-shadow-xl">
                <g v-for="(row, r) in cubeGrid" :key="r">
                  <rect
                    v-for="(color, c) in row"
                    :key="`${r}-${c}`"
                    :x="30 + c * 62"
                    :y="30 + r * 62"
                    width="54"
                    height="54"
                    rx="10"
                    :fill="color"
                  />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 登录后数据看板 ============ -->
    <section v-if="auth.isLoggedIn" class="fc-container py-10">
      <div class="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 class="text-[19px] font-semibold text-ink-900">教学概览</h2>
          <p class="mt-1 text-[13px] text-ink-500">实时统计你在机构内的教学数据</p>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-600 transition hover:text-brand-700"
          @click="loadDashboard"
        >
          <RefreshCw class="size-3.5" :class="loadingStats ? 'animate-spin' : ''" />
          刷新
        </button>
      </div>

      <div class="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <UiStat label="课程总数" :value="stats.courseTotal" :hint="`已上架 ${stats.coursePublished} 门`" :icon="Boxes" tone="brand" />
        <UiStat label="在读学员" :value="stats.studentActive" :hint="`档案共 ${stats.studentTotal} 人`" :icon="Users" tone="green" />
        <UiStat label="进行中班级" :value="stats.classActive" :hint="`累计开班 ${stats.classTotal} 个`" :icon="GraduationCap" tone="orange" />
        <UiStat label="教学资源" :value="stats.resourceTotal" :hint="`测评 ${stats.assessmentTotal} 次`" :icon="FolderOpen" tone="violet" />
      </div>

      <div class="mt-5 grid gap-4 lg:grid-cols-3">
        <!-- 最近课程 -->
        <div class="fc-card p-4.5">
          <div class="flex items-center justify-between">
            <h3 class="flex items-center gap-1.5 text-[14px] font-semibold text-ink-800">
              <Boxes class="size-4 text-brand-500" />最近课程
            </h3>
            <RouterLink :to="{ name: 'courses' }" class="text-xs text-brand-600 hover:underline">全部</RouterLink>
          </div>
          <ul v-if="recentCourseList.length" class="mt-3 divide-y divide-ink-100">
            <li v-for="c in recentCourseList" :key="c.id" class="flex items-center gap-3 py-2.5">
              <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                <Boxes class="size-4 text-brand-500" />
              </div>
              <div class="min-w-0 flex-1">
                <RouterLink
                  :to="{ name: 'course-detail', params: { id: c.id } }"
                  class="line-clamp-1 text-[13px] font-medium text-ink-800 hover:text-brand-600"
                >
                  {{ c.title }}
                </RouterLink>
                <p class="text-[11.5px] text-ink-400">{{ c.category || '未分类' }} · {{ relativeTime(c.created_at) }}</p>
              </div>
              <UiBadge :label="COURSE_STATUS[c.status]?.label" :custom-class="COURSE_STATUS[c.status]?.style" />
            </li>
          </ul>
          <p v-else class="py-6 text-center text-[13px] text-ink-400">暂无课程</p>
        </div>

        <!-- 最近资源 -->
        <div class="fc-card p-4.5">
          <div class="flex items-center justify-between">
            <h3 class="flex items-center gap-1.5 text-[14px] font-semibold text-ink-800">
              <FolderOpen class="size-4 text-violet-500" />最近资源
            </h3>
            <RouterLink :to="{ name: 'resources' }" class="text-xs text-brand-600 hover:underline">全部</RouterLink>
          </div>
          <ul v-if="recentResourceList.length" class="mt-3 divide-y divide-ink-100">
            <li v-for="r in recentResourceList" :key="r.id" class="flex items-center gap-3 py-2.5">
              <ResourceIcon :kind="r.file_type" />
              <div class="min-w-0 flex-1">
                <p class="line-clamp-1 text-[13px] font-medium text-ink-800">{{ r.title }}</p>
                <p class="text-[11.5px] text-ink-400">
                  {{ formatFileSize(r.file_size) }} · {{ relativeTime(r.created_at) }}
                </p>
              </div>
            </li>
          </ul>
          <p v-else class="py-6 text-center text-[13px] text-ink-400">暂无资源</p>
        </div>

        <!-- 最近成绩 -->
        <div class="fc-card p-4.5">
          <div class="flex items-center justify-between">
            <h3 class="flex items-center gap-1.5 text-[14px] font-semibold text-ink-800">
              <Trophy class="size-4 text-amber-500" />最近成绩
            </h3>
            <RouterLink :to="{ name: 'grades' }" class="text-xs text-brand-600 hover:underline">全部</RouterLink>
          </div>
          <ul v-if="recentGradeList.length" class="mt-3 divide-y divide-ink-100">
            <li v-for="g in recentGradeList" :key="g.id" class="flex items-center gap-3 py-2.5">
              <UiAvatar :name="g.student_name" size="sm" />
              <div class="min-w-0 flex-1">
                <p class="line-clamp-1 text-[13px] font-medium text-ink-800">{{ g.student_name }}</p>
                <p class="line-clamp-1 text-[11.5px] text-ink-400">{{ g.assessment_title }}</p>
              </div>
              <div class="text-right">
                <p class="text-[13px] font-semibold text-brand-700 tabular-nums">
                  {{ g.score ?? '—' }}
                </p>
                <p v-if="g.duration_ms" class="text-[11px] text-ink-400 tabular-nums">
                  {{ formatDuration(g.duration_ms) }}
                </p>
              </div>
            </li>
          </ul>
          <p v-else class="py-6 text-center text-[13px] text-ink-400">暂无成绩记录</p>
        </div>
      </div>
    </section>

    <!-- ============ 特色 ============ -->
    <section id="highlights" class="border-y border-ink-200 bg-white py-14">
      <div class="fc-container">
        <div class="mx-auto max-w-2xl text-center">
          <h2 class="text-[24px] font-bold tracking-tight text-ink-900">我们怎么教</h2>
          <p class="mt-2.5 text-[14px] text-ink-500">
            魔方不只是玩具，它是可以被系统化训练的思维体操。
          </p>
        </div>

        <div class="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            v-for="(item, i) in highlights"
            :key="i"
            class="fc-card p-5 transition hover:-translate-y-0.5 hover:shadow-lift"
          >
            <span
              class="inline-flex size-9.5 items-center justify-center rounded-xl text-white"
              :style="{ backgroundColor: item.color || '#3366ff' }"
            >
              <component :is="highlightIcons[i % highlightIcons.length]" class="size-4.5" />
            </span>
            <h3 class="mt-3.5 text-[15px] font-semibold text-ink-900">{{ item.title }}</h3>
            <p class="mt-1.5 text-[13px] leading-relaxed text-ink-500">{{ item.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 课程体系（未登录时的对外展示） ============ -->
    <section v-if="!auth.isLoggedIn && publicCourses.length" class="fc-container py-14">
      <div class="mb-7 text-center">
        <h2 class="text-[24px] font-bold tracking-tight text-ink-900">课程体系</h2>
        <p class="mt-2.5 text-[14px] text-ink-500">从启蒙到竞速，四阶递进的成长路径</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div v-for="c in publicCourses" :key="c.id" class="fc-card p-5">
          <UiBadge :label="c.category || '课程'" custom-class="bg-brand-50 text-brand-700 border-brand-200" />
          <h3 class="mt-3 text-[15px] font-semibold text-ink-900">{{ c.title }}</h3>
          <p class="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-ink-500">{{ c.summary }}</p>
          <div class="mt-3.5 flex items-center gap-3 border-t border-ink-100 pt-3 text-[11.5px] text-ink-500">
            <span v-if="c.age_range">{{ c.age_range }}</span>
            <span>{{ c.total_lessons }} 课时</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 机构介绍 ============ -->
    <section class="fc-container py-14">
      <div class="fc-card overflow-hidden">
        <div class="grid lg:grid-cols-[1.3fr_1fr]">
          <div class="p-6 lg:p-8">
            <h2 class="text-[20px] font-bold tracking-tight text-ink-900">
              {{ about.title || '关于风驰思维魔方' }}
            </h2>
            <div class="mt-4 space-y-3.5 text-[14px] leading-[1.85] text-ink-600">
              <p v-for="(para, i) in aboutParagraphs" :key="i">{{ para }}</p>
            </div>
          </div>
          <div class="fc-cube-bg flex items-center justify-center border-t border-ink-200 bg-ink-50 p-8 lg:border-t-0 lg:border-l">
            <div class="grid grid-cols-3 gap-2.5">
              <div
                v-for="(color, i) in cubeColors"
                :key="i"
                class="size-14 rounded-xl shadow-soft transition hover:scale-105"
                :style="{ backgroundColor: color }"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 底部 CTA ============ -->
    <section v-if="!auth.isLoggedIn" class="fc-container pb-16">
      <div class="rounded-2xl bg-brand-600 px-6 py-10 text-center shadow-lift lg:px-12">
        <h2 class="text-[22px] font-bold tracking-tight text-white">教师账号由机构统一开通</h2>
        <p class="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-brand-100">
          本系统面向风驰思维魔方机构内部教师使用。如需开通账号或重置密码，请联系机构超级管理员。
        </p>
        <RouterLink
          :to="{ name: 'login' }"
          class="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
        >
          <LogIn class="size-4" />
          教师登录
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowDown,
  Boxes,
  FolderOpen,
  GraduationCap,
  Layers,
  LogIn,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-vue-next'
import UiStat from '@/components/UiStat.vue'
import UiBadge from '@/components/UiBadge.vue'
import UiAvatar from '@/components/UiAvatar.vue'
import ResourceIcon from '@/components/ResourceIcon.vue'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { COURSE_STATUS } from '@/lib/dict'
import { formatDuration, formatFileSize, relativeTime } from '@/lib/format'
import { dashboardStats, recentCourses, recentResources } from '@/api/stats'
import { recentGrades } from '@/api/grades'
import { listCourses } from '@/api/courses'

const auth = useAuthStore()

const hero = ref({})
const about = ref({})
const highlights = ref([])
const baseline = ref({})
const publicCourses = ref([])

const stats = ref({})
const recentCourseList = ref([])
const recentResourceList = ref([])
const recentGradeList = ref([])
const loadingStats = ref(false)

const cubeColors = ['#ef4444', '#facc15', '#3b82f6', '#f97316', '#ffffff', '#22c55e', '#22c55e', '#3b82f6', '#ef4444']
const cubeGrid = [cubeColors.slice(0, 3), cubeColors.slice(3, 6), cubeColors.slice(6, 9)]

const highlightIcons = [Layers, Target, Trophy, Zap]

const DEFAULT_HIGHLIGHTS = [
  { title: '分层课程体系', desc: '启蒙 / 进阶 / 竞速 / 盲拧四阶递进，按年龄与基础匹配', color: '#3366ff' },
  { title: '小班教练制', desc: '每班 6-8 人，教练跟进到人，进度可追踪', color: '#22c55e' },
  { title: '阶段化测评', desc: '每个阶段有测评与成绩档案，成长看得见', color: '#f97316' },
  { title: '教研资源共享', desc: '教案、公式图表、视频素材统一归档，团队共用', color: '#ef4444' },
]

const aboutParagraphs = computed(() => {
  const content = about.value?.content || ''
  const list = String(content).split('\n').map((s) => s.trim()).filter(Boolean)
  return list.length ? list : ['课程按认知发展阶段分层设计，形成完整的成长路径。']
})

const baselineStats = computed(() => {
  const b = baseline.value || {}
  const list = [
    { label: '在读学员', value: Number(b.students) || 0 },
    { label: '专业教练', value: Number(b.coaches) || 0 },
    { label: '累计课时', value: Number(b.lessons) || 0 },
    { label: '办学年数', value: Number(b.years) || 0 },
  ]
  return list.filter((i) => i.value > 0).map((i) => ({ ...i, value: i.value.toLocaleString('zh-CN') }))
})

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

async function loadPublic() {
  if (!isSupabaseConfigured) {
    highlights.value = DEFAULT_HIGHLIGHTS
    return
  }
  try {
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['home.hero', 'home.about', 'home.highlights', 'stats.baseline'])
    for (const row of data || []) {
      if (row.key === 'home.hero') hero.value = row.value || {}
      if (row.key === 'home.about') about.value = row.value || {}
      if (row.key === 'home.highlights') highlights.value = row.value?.items || []
      if (row.key === 'stats.baseline') baseline.value = row.value || {}
    }
    if (!highlights.value.length) highlights.value = DEFAULT_HIGHLIGHTS
  } catch {
    highlights.value = DEFAULT_HIGHLIGHTS
  }
}

async function loadDashboard() {
  if (!auth.isLoggedIn) return
  loadingStats.value = true
  try {
    const [s, courses, resources, grades] = await Promise.all([
      dashboardStats(),
      auth.can('course.view') ? recentCourses(5) : Promise.resolve([]),
      auth.can('resource.view') ? recentResources(5) : Promise.resolve([]),
      auth.can('grade.view') ? recentGrades(5) : Promise.resolve([]),
    ])
    stats.value = s
    recentCourseList.value = courses
    recentResourceList.value = resources
    recentGradeList.value = grades
  } catch {
    // 首页看板失败不影响主体展示
  } finally {
    loadingStats.value = false
  }
}

/** 未登录时展示课程体系概览（仅已上架课程的基础字段） */
async function loadPublicCourses() {
  if (auth.isLoggedIn || !isSupabaseConfigured) return
  try {
    const { items } = await listCourses({ status: 'published', pageSize: 4, paged: true })
    publicCourses.value = items
  } catch {
    // 未登录无权限时静默跳过
  }
}

onMounted(async () => {
  await loadPublic()
  if (auth.isLoggedIn) {
    await loadDashboard()
  }
})
</script>
