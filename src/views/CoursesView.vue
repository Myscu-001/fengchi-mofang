<template>
  <div>
    <PageHeader title="课程体系" description="维护机构的分层课程、课时教案与上架状态">
      <template v-if="canManage">
        <UiButton variant="primary" @click="openCreate">
          <template #icon><Plus class="size-4" /></template>
          新建课程
        </UiButton>
      </template>
    </PageHeader>

    <div class="fc-container py-7">
      <!-- 概览 -->
      <div class="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <UiStat label="课程总数" :value="counts.total" :icon="Boxes" tone="brand" />
        <UiStat label="已上架" :value="counts.published" :icon="CircleCheck" tone="green" />
        <UiStat label="草稿" :value="counts.draft" :icon="Pencil" tone="orange" />
        <UiStat label="已归档" :value="counts.archived" :icon="Archive" tone="slate" />
      </div>

      <!-- 筛选 -->
      <div class="fc-card mt-5 flex flex-wrap items-center gap-2.5 p-3.5">
        <div class="relative min-w-[220px] flex-1">
          <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
          <input
            v-model="filters.keyword"
            class="fc-input pl-9.5"
            placeholder="搜索课程名称、副标题或简介"
            @keyup.enter="applyFilters"
          />
        </div>

        <select v-model="filters.category" class="fc-input w-auto min-w-[130px]" @change="applyFilters">
          <option value="">全部分类</option>
          <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
        </select>

        <select v-model="filters.status" class="fc-input w-auto min-w-[120px]" @change="applyFilters">
          <option value="">全部状态</option>
          <option v-for="o in COURSE_STATUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>

        <select v-model="filters.level" class="fc-input w-auto min-w-[140px]" @change="applyFilters">
          <option value="">全部难度</option>
          <option v-for="o in LEVEL_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>

        <UiButton variant="outline" @click="resetFilters">
          <template #icon><RotateCcw class="size-3.5" /></template>
          重置
        </UiButton>
      </div>

      <!-- 列表 -->
      <div v-if="loading" class="fc-card mt-5">
        <UiLoading text="正在加载课程…" />
      </div>

      <div v-else-if="courses.length" class="mt-5">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div v-for="course in courses" :key="course.id" class="relative">
            <CourseCard :course="course" @open="goDetail" />
            <button
              v-if="canManage"
              type="button"
              class="absolute top-2.5 right-2.5 rounded-lg bg-white/90 p-1.5 text-ink-500 opacity-0 shadow-soft transition hover:text-brand-600 focus:opacity-100 group-hover:opacity-100"
              style="backdrop-filter: blur(4px)"
              title="编辑课程"
              @click.stop="openEdit(course)"
            >
              <Pencil class="size-3.5" />
            </button>
          </div>
        </div>

        <div class="mt-6">
          <UiPagination v-model:page="page" :page-size="pageSize" :total="total" />
        </div>
      </div>

      <div v-else class="fc-card mt-5">
        <UiEmpty
          :icon="Boxes"
          title="还没有课程"
          description="创建第一门课程，开始搭建你的分层课程体系。"
        >
          <UiButton v-if="canManage" variant="primary" @click="openCreate">
            <template #icon><Plus class="size-4" /></template>
            新建课程
          </UiButton>
        </UiEmpty>
      </div>
    </div>

    <CourseFormModal
      :open="formOpen"
      :course="editing"
      @close="formOpen = false"
      @saved="loadCourses"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Archive,
  Boxes,
  CircleCheck,
  Pencil,
  Plus,
  RotateCcw,
  Search,
} from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import UiButton from '@/components/UiButton.vue'
import UiStat from '@/components/UiStat.vue'
import UiEmpty from '@/components/UiEmpty.vue'
import UiLoading from '@/components/UiLoading.vue'
import UiPagination from '@/components/UiPagination.vue'
import CourseCard from '@/components/CourseCard.vue'
import CourseFormModal from '@/components/CourseFormModal.vue'
import { listCourses } from '@/api/courses'
import { COURSE_CATEGORY_OPTIONS, COURSE_STATUS_OPTIONS, LEVEL_OPTIONS } from '@/lib/dict'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const auth = useAuthStore()
const toast = useToastStore()
const router = useRouter()

const canManage = computed(() => auth.can('course.manage'))
const categoryOptions = COURSE_CATEGORY_OPTIONS

const courses = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 12
const loading = ref(true)

const filters = reactive({ keyword: '', category: '', status: '', level: '' })

const counts = reactive({ total: 0, published: 0, draft: 0, archived: 0 })

const formOpen = ref(false)
const editing = ref(null)

async function loadCourses() {
  loading.value = true
  try {
    const { items, total: count } = await listCourses({
      ...filters,
      page: page.value,
      pageSize,
    })
    courses.value = items
    total.value = count
  } catch (err) {
    toast.error(err.message)
    courses.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function loadCounts() {
  try {
    const statuses = ['published', 'draft', 'archived']
    const results = await Promise.all(
      statuses.map((s) => listCourses({ status: s, paged: false })),
    )
    const all = await listCourses({ paged: false })
    counts.total = all.total
    counts.published = results[0].total
    counts.draft = results[1].total
    counts.archived = results[2].total
  } catch {
    // 概览统计失败不阻断列表
  }
}

function applyFilters() {
  page.value = 1
  loadCourses()
}

function resetFilters() {
  filters.keyword = ''
  filters.category = ''
  filters.status = ''
  filters.level = ''
  applyFilters()
}

function goDetail(course) {
  router.push({ name: 'course-detail', params: { id: course.id } })
}

function openCreate() {
  editing.value = null
  formOpen.value = true
}

function openEdit(course) {
  editing.value = { ...course, total_lessons: course.lesson_count ?? course.total_lessons ?? 0 }
  formOpen.value = true
}

watch(page, () => loadCourses())

onMounted(() => {
  loadCourses()
  loadCounts()
})
</script>

<style scoped>
.relative:hover > button {
  opacity: 1;
}
</style>
