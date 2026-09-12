<template>
  <div>
    <!-- ============ 首屏 ============ -->
    <section class="fc-cube-bg border-b border-ink-200 bg-white">
      <div class="fc-container py-12 lg:py-16">
        <div class="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div class="fc-anim-in">
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[12px] font-medium text-brand-700"
            >
              <Sparkles class="size-3.5" />
              魔方 + 博弈桌游 双课程线
            </span>

            <h1 class="mt-5 text-[34px] leading-[1.15] font-bold tracking-tight text-ink-900 lg:text-[44px]">
              {{ hero.title || brand.name }}
            </h1>
            <p class="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-600">
              {{ hero.subtitle || brand.slogan }}
            </p>

            <!-- 四条能力主张 -->
            <div class="mt-5 flex flex-wrap gap-x-4 gap-y-1.5">
              <span v-for="tag in capabilityTags" :key="tag" class="inline-flex items-center gap-1.5 text-[12.5px] text-ink-500">
                <span class="size-1.5 rounded-full" :style="{ backgroundColor: tag.color }" />
                {{ tag.text }}
              </span>
            </div>

            <div class="mt-7 flex flex-wrap items-center gap-3">
              <template v-if="auth.isLoggedIn">
                <RouterLink
                  :to="{ name: 'courses' }"
                  class="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-medium text-white shadow-soft transition hover:bg-brand-700"
                >
                  <Boxes class="size-4" />
                  进入课程体系
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
                  @click="scrollTo('curriculum')"
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

          <!-- 品牌标准字 -->
          <div class="fc-anim-in flex justify-center">
            <div class="relative">
              <div class="absolute -inset-8 rounded-[40px] bg-brand-100/40 blur-3xl" />
              <img
                :src="assetUrl(brand.logo_url)"
                class="relative w-[300px] max-w-full drop-shadow-xl lg:w-[360px]"
                :alt="brand.full_name"
              />
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
          <p class="mt-1 text-[13px] text-ink-500">实时统计机构内的教学数据</p>
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
        <UiStat
          label="魔方成绩"
          :value="stats.scoreTotal"
          :hint="weekly.thisWeek ? `本周 +${weekly.thisWeek} 条` : '累计录入记录'"
          :icon="Trophy"
          tone="orange"
        />
        <UiStat label="教学资源" :value="stats.resourceTotal" :hint="`机构资料库`" :icon="FolderOpen" tone="violet" />
      </div>

      <!-- 待关注学员（近期未测评，置顶提醒） -->
      <div v-if="auth.can('student.view') && auth.can('score.view')" class="fc-card mt-5 p-4.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="flex items-center gap-1.5 text-[14px] font-semibold text-ink-800">
            <TriangleAlert class="size-4 text-amber-500" />待关注学员
            <span
              v-if="attention.total"
              class="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-600"
            >{{ attention.total }} 人超 30 天未测评</span>
          </h3>
          <RouterLink :to="{ name: 'honor' }" class="text-xs text-brand-600 hover:underline">
            查看荣誉墙
          </RouterLink>
        </div>

        <div v-if="attention.items.length" class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="row in attention.items"
            :key="row.id"
            type="button"
            class="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50/70 py-1 pr-3 pl-1 text-[12.5px] text-ink-700 transition hover:bg-amber-100"
            :title="row.lastDate ? `最后测试 ${row.lastDate}` : '从未测试'"
            @click="goStudent(row.id)"
          >
            <UiAvatar :src="row.avatar_url" :name="row.name" size="xs" />
            {{ row.name }}
            <span class="font-medium text-amber-600">{{ row.days == null ? '未测试' : row.days + ' 天' }}</span>
          </button>
        </div>
        <p v-else class="mt-3 text-[12.5px] text-emerald-600">全部在读学员近 30 天都有测试记录，状态良好。</p>
      </div>

      <div class="mt-5 grid gap-4 lg:grid-cols-2">
        <div class="fc-card p-4.5">
          <div class="flex items-center justify-between">
            <h3 class="flex items-center gap-1.5 text-[14px] font-semibold text-ink-800">
              <Boxes class="size-4 text-brand-500" />最近课程
            </h3>
            <RouterLink :to="{ name: 'courses' }" class="text-xs text-brand-600 hover:underline">全部</RouterLink>
          </div>
          <ul v-if="recentCourseList.length" class="mt-3 divide-y divide-ink-100">
            <li v-for="c in recentCourseList" :key="c.id" class="flex items-center gap-3 py-2.5">
              <TrackDot :track="c.track" />
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

        <div class="fc-card p-4.5">
          <div class="flex items-center justify-between">
            <h3 class="flex items-center gap-1.5 text-[14px] font-semibold text-ink-800">
              <FolderOpen class="size-4 text-cube-green-deep" />最近资源
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
      </div>
    </section>

    <!-- ============ 课程体系（双课程线） ============ -->
    <section v-if="curriculum.tracks?.length" id="curriculum" class="border-y border-ink-200 bg-white py-14">
      <div class="fc-container">
        <div class="mx-auto max-w-2xl text-center">
          <h2 class="text-[24px] font-bold tracking-tight text-ink-900">
            {{ curriculum.title || '课程体系' }}
          </h2>
          <p class="mt-2.5 text-[14px] text-ink-500">{{ curriculum.subtitle }}</p>
        </div>

        <div class="mt-9 grid gap-5 lg:grid-cols-2">
          <div
            v-for="track in curriculum.tracks"
            :key="track.name"
            class="fc-card overflow-hidden transition hover:shadow-lift"
          >
            <div class="h-1.5" :style="{ backgroundColor: track.color }" />
            <div class="p-5 lg:p-6">
              <div class="flex items-baseline justify-between gap-3">
                <h3 class="text-[18px] font-bold tracking-tight text-ink-900">{{ track.name }}</h3>
                <span class="text-[11px] font-medium tracking-widest text-ink-300 uppercase">{{ track.label }}</span>
              </div>
              <p class="mt-2 text-[13px] leading-relaxed text-ink-500">{{ track.note }}</p>

              <ol class="mt-5 space-y-0">
                <li
                  v-for="(stage, i) in track.stages"
                  :key="stage.title"
                  class="relative flex gap-3.5 pb-5 last:pb-0"
                >
                  <!-- 连接线 -->
                  <span
                    v-if="i < track.stages.length - 1"
                    class="absolute top-7 left-[13px] h-full w-px"
                    :style="{ backgroundColor: `${track.color}33` }"
                  />
                  <span
                    class="z-10 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                    :style="{ backgroundColor: track.color }"
                  >
                    {{ i + 1 }}
                  </span>
                  <div class="min-w-0 pt-0.5">
                    <p class="text-[14px] font-medium text-ink-800">{{ stage.title }}</p>
                    <p class="mt-0.5 text-[12.5px] leading-relaxed text-ink-500">{{ stage.desc }}</p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>

        <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
          <RouterLink
            v-if="auth.isLoggedIn"
            :to="{ name: 'courses' }"
            class="inline-flex h-10.5 items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-medium text-white shadow-soft transition hover:bg-brand-700"
          >
            <Boxes class="size-4" />
            查看全部课程
          </RouterLink>
          <span v-else class="text-[13px] text-ink-500">
            完整课程信息与教案在系统内查看，教师账号由机构管理员开通
          </span>
        </div>
      </div>
    </section>

    <!-- ============ 课程技能 / 学习收获 ============ -->
    <section v-if="outcomes.cube || outcomes.board" class="fc-container py-14">
      <div class="mx-auto max-w-2xl text-center">
        <h2 class="text-[24px] font-bold tracking-tight text-ink-900">{{ outcomes.title || '课程技能' }}</h2>
        <p class="mt-2.5 text-[14px] text-ink-500">{{ outcomes.subtitle }}</p>
      </div>

      <div class="mt-9 grid gap-5 lg:grid-cols-2">
        <div v-for="block in outcomeBlocks" :key="block.title" class="fc-card p-5 lg:p-6">
          <h3 class="flex items-center gap-2 text-[16px] font-semibold text-ink-900">
            <span class="size-2.5 rounded-sm" :style="{ backgroundColor: block.color }" />
            {{ block.title }}
          </h3>
          <ul class="mt-4 grid gap-2.5 sm:grid-cols-2">
            <li v-for="item in block.items" :key="item" class="flex items-start gap-2">
              <Check class="mt-0.5 size-3.5 shrink-0" :style="{ color: block.color }" />
              <span class="text-[13px] leading-relaxed text-ink-600">{{ item }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ============ 师资团队 ============ -->
    <section v-if="coaches.length" class="border-y border-ink-200 bg-white py-14">
      <div class="fc-container">
        <div class="mx-auto max-w-2xl text-center">
          <h2 class="text-[24px] font-bold tracking-tight text-ink-900">师资团队</h2>
          <p class="mt-2.5 text-[14px] text-ink-500">
            教练团队具备魔方职业选手竞技水平，拥有多年教学经验与赛事实战经历
          </p>
        </div>

        <div class="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="coach in coaches"
            :key="coach.id"
            class="fc-card flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lift"
          >
            <div class="flex items-center gap-3">
              <UiAvatar :src="coach.avatar_url" :name="coach.name" size="lg" />
              <div class="min-w-0">
                <p class="text-[15px] font-semibold text-ink-900">{{ coach.name }}</p>
                <p class="mt-0.5 text-[12px] text-ink-500">{{ coach.title || '教练' }}</p>
              </div>
            </div>

            <div v-if="coachMetrics(coach).length" class="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-ink-100 pt-3.5">
              <div v-for="m in coachMetrics(coach)" :key="m.label">
                <p class="text-[11px] text-ink-400">{{ m.label }}</p>
                <p class="text-[13.5px] font-semibold text-brand-700 tabular-nums">{{ m.value }}</p>
              </div>
            </div>

            <ul v-if="coach.highlights?.length" class="mt-3.5 space-y-1.5">
              <li v-for="h in coach.highlights" :key="h" class="flex items-start gap-1.5">
                <span class="mt-1.5 size-1 shrink-0 rounded-full bg-cube-yellow-deep" />
                <span class="text-[12.5px] leading-relaxed text-ink-600">{{ h }}</span>
              </li>
            </ul>

            <p v-if="coach.bio" class="mt-3.5 text-[12.5px] leading-relaxed text-ink-500">{{ coach.bio }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 教学理念 ============ -->
    <section v-if="philosophy.content" class="fc-container py-14">
      <div class="relative overflow-hidden rounded-2xl bg-ink-900 px-6 py-10 lg:px-14 lg:py-12">
        <div class="fc-cube-bg absolute inset-0 opacity-40" />
        <div class="relative mx-auto max-w-3xl text-center">
          <Quote class="mx-auto size-7 text-cube-yellow" />
          <p class="mt-5 text-[19px] leading-[1.75] font-medium text-white lg:text-[22px]">
            {{ philosophy.content }}
          </p>
          <p class="mt-5 text-[12.5px] tracking-widest text-white/50 uppercase">
            {{ philosophy.title || '我们的判断' }}
          </p>
        </div>
      </div>
    </section>

    <!-- ============ 为什么选择我们 ============ -->
    <section v-if="why.items?.length" class="border-y border-ink-200 bg-white py-14">
      <div class="fc-container">
        <div class="mx-auto max-w-2xl text-center">
          <h2 class="text-[24px] font-bold tracking-tight text-ink-900">{{ why.title || '为什么选择我们' }}</h2>
        </div>

        <div class="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="(item, i) in why.items" :key="item.title" class="fc-card p-5">
            <span
              class="inline-flex size-9 items-center justify-center rounded-xl text-[13px] font-semibold text-white"
              :style="{ backgroundColor: cubeColors[i % cubeColors.length] }"
            >
              {{ String(i + 1).padStart(2, '0') }}
            </span>
            <h3 class="mt-3.5 text-[15px] font-semibold text-ink-900">{{ item.title }}</h3>
            <p class="mt-1.5 text-[13px] leading-relaxed text-ink-500">{{ item.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 关于我们 ============ -->
    <section class="fc-container py-14">
      <div class="fc-card overflow-hidden">
        <div class="grid lg:grid-cols-[1.35fr_1fr]">
          <div class="p-6 lg:p-8">
            <h2 class="text-[20px] font-bold tracking-tight text-ink-900">
              {{ about.title || '关于风驰思维' }}
            </h2>
            <div class="mt-4 space-y-3.5 text-[14px] leading-[1.85] text-ink-600">
              <p v-for="(para, i) in aboutParagraphs" :key="i">{{ para }}</p>
            </div>

            <div v-if="contact.address" class="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink-100 pt-4 text-[12.5px] text-ink-500">
              <span class="inline-flex items-center gap-1.5">
                <MapPin class="size-3.5" />{{ contact.address }}
              </span>
              <span v-if="contact.hours" class="inline-flex items-center gap-1.5">
                <Clock class="size-3.5" />{{ contact.hours }}
              </span>
              <span v-if="contact.phone" class="inline-flex items-center gap-1.5">
                <Phone class="size-3.5" />{{ contact.phone }}
              </span>
            </div>
          </div>

          <div class="fc-cube-bg flex flex-col items-center justify-center gap-5 border-t border-ink-200 bg-ink-50 p-8 lg:border-t-0 lg:border-l">
            <img
              :src="assetUrl(brand.logo_mark_url)"
              class="w-24 drop-shadow-lg lg:w-28"
              :alt="brand.name"
            />
            <div class="grid grid-cols-4 gap-2">
              <div
                v-for="(color, i) in cubeColors"
                :key="i"
                class="size-9 rounded-lg shadow-soft"
                :style="{ backgroundColor: color }"
              />
            </div>
            <p v-if="brand.english_name" class="text-[11px] tracking-[0.2em] text-ink-400 uppercase">
              {{ brand.english_name }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 底部 CTA ============ -->
    <section v-if="!auth.isLoggedIn" class="fc-container pb-16">
      <div class="rounded-2xl bg-brand-600 px-6 py-10 text-center shadow-lift lg:px-12">
        <h2 class="text-[22px] font-bold tracking-tight text-white">教师账号由机构统一开通</h2>
        <p class="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-brand-100">
          本系统面向风驰思维机构内部教师使用。如需开通账号或重置密码，请联系机构超级管理员。
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
import { RouterLink, useRouter } from 'vue-router'
import {
  ArrowDown,
  Boxes,
  Check,
  Clock,
  FolderOpen,
  LogIn,
  MapPin,
  Phone,
  Quote,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  Trophy,
  Users,
} from 'lucide-vue-next'
import UiStat from '@/components/UiStat.vue'
import UiBadge from '@/components/UiBadge.vue'
import UiAvatar from '@/components/UiAvatar.vue'
import ResourceIcon from '@/components/ResourceIcon.vue'
import TrackDot from '@/components/TrackDot.vue'
import { useAuthStore } from '@/stores/auth'
import { useSiteStore } from '@/stores/site'
import { COURSE_STATUS } from '@/lib/dict'
import { assetUrl } from '@/lib/assets'
import { formatDuration, formatFileSize, relativeTime } from '@/lib/format'
import { dashboardStats, recentCourses, recentResources, weeklyScoreStats, attentionStudents } from '@/api/stats'
import { listCoaches } from '@/api/coaches'

const auth = useAuthStore()
const site = useSiteStore()
const router = useRouter()

const coaches = ref([])
const stats = ref({})
const recentCourseList = ref([])
const recentResourceList = ref([])
const loadingStats = ref(false)
const weekly = ref({ thisWeek: 0, lastWeek: 0, delta: 0 })
const attention = ref({ total: 0, items: [] })

const brand = computed(() => site.brand)
const hero = computed(() => site.hero)
const about = computed(() => site.about)
const contact = computed(() => site.contact)
const outcomes = computed(() => site.outcomes)
const philosophy = computed(() => site.philosophy)
const why = computed(() => site.why)
const curriculum = computed(() => site.settings['home.curriculum'] || {})

const cubeColors = ['#EA625F', '#F2E926', '#93BC37', '#34B4E2', '#F0A020']

const capabilityTags = [
  { text: '空间思维', color: '#EA625F' },
  { text: '逻辑推理', color: '#F2E926' },
  { text: '专注力', color: '#93BC37' },
  { text: '抗挫能力', color: '#34B4E2' },
]

const aboutParagraphs = computed(() => {
  const raw = about.value?.paragraphs
  if (Array.isArray(raw) && raw.length) return raw
  const content = about.value?.content || ''
  const list = String(content).split('\n').map((s) => s.trim()).filter(Boolean)
  return list.length ? list : []
})

const outcomeBlocks = computed(() => {
  const list = []
  if (outcomes.value?.cube?.items?.length) list.push({ ...outcomes.value.cube })
  if (outcomes.value?.board?.items?.length) list.push({ ...outcomes.value.board })
  return list
})

const baselineStats = computed(() => {
  const b = site.baseline || {}
  return [
    { label: '在读学员', value: Number(b.students) || 0 },
    { label: '专业教练', value: Number(b.coaches) || 0 },
    { label: '累计课时', value: Number(b.lessons) || 0 },
    { label: '办学年数', value: Number(b.years) || 0 },
  ]
    .filter((i) => i.value > 0)
    .map((i) => ({ ...i, value: i.value.toLocaleString('zh-CN') }))
})

function coachMetrics(coach) {
  const list = []
  if (coach.years_competing) list.push({ label: '竞技生涯', value: coach.years_competing })
  if (coach.years_teaching) list.push({ label: '教学经验', value: coach.years_teaching })
  if (coach.avg_time) list.push({ label: '三阶平均', value: coach.avg_time })
  return list
}

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

async function loadCoaches() {
  try {
    coaches.value = await listCoaches()
  } catch {
    coaches.value = []
  }
}

async function loadDashboard() {
  if (!auth.isLoggedIn) return
  loadingStats.value = true
  const canScore = auth.can('score.view')
  const canStudent = auth.can('student.view')
  try {
    const [s, courses, resources, w, att] = await Promise.all([
      dashboardStats(),
      auth.can('course.view') ? recentCourses(5) : Promise.resolve([]),
      auth.can('resource.view') ? recentResources(5) : Promise.resolve([]),
      canScore ? weeklyScoreStats() : Promise.resolve({ thisWeek: 0, lastWeek: 0, delta: 0 }),
      canScore && canStudent
        ? attentionStudents({ days: 30, limit: 8 })
        : Promise.resolve({ total: 0, items: [] }),
    ])
    stats.value = s
    recentCourseList.value = courses
    recentResourceList.value = resources
    weekly.value = w
    attention.value = att
  } catch {
    // 看板失败不影响首页主体
  } finally {
    loadingStats.value = false
  }
}

function goStudent(id) {
  router.push({ name: 'student-detail', params: { id } })
}

onMounted(async () => {
  // 师资为公开数据，未登录也能展示
  loadCoaches()
  if (auth.isLoggedIn) await loadDashboard()
})
</script>
