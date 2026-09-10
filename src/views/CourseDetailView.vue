<template>
  <div>
    <PageHeader :title="course?.title || '课程详情'" :description="course?.subtitle || ''">
      <template #badge>
        <UiBadge v-if="course" :label="statusMeta.label" :custom-class="statusMeta.style" :dot="statusMeta.dot" />
      </template>

      <UiButton variant="outline" @click="router.back()">
        <template #icon><ArrowLeft class="size-3.5" /></template>
        返回
      </UiButton>
      <template v-if="canManage && course">
        <UiButton variant="outline" @click="toggleStatus">
          <template #icon>
            <EyeOff v-if="course.status === 'published'" class="size-3.5" />
            <Eye v-else class="size-3.5" />
          </template>
          {{ course.status === 'published' ? '下架' : '上架' }}
        </UiButton>
        <UiButton variant="primary" @click="openEdit">
          <template #icon><Pencil class="size-4" /></template>
          编辑信息
        </UiButton>
        <UiButton variant="ghost" @click="handleDelete">
          <template #icon><Trash2 class="size-4 text-red-500" /></template>
        </UiButton>
      </template>
    </PageHeader>

    <div v-if="loading" class="fc-container py-7">
      <div class="fc-card"><UiLoading text="正在加载课程…" /></div>
    </div>

    <div v-else-if="!course" class="fc-container py-7">
      <div class="fc-card">
        <UiEmpty :icon="Boxes" title="课程不存在" description="该课程可能已被删除，或你没有查看权限。">
          <UiButton variant="primary" @click="router.push({ name: 'courses' })">返回课程列表</UiButton>
        </UiEmpty>
      </div>
    </div>

    <div v-else class="fc-container py-7">
      <!-- 头部信息 -->
      <div class="fc-card overflow-hidden">
        <div class="grid lg:grid-cols-[280px_1fr]">
          <div class="h-44 bg-ink-100 lg:h-full">
            <img v-if="course.cover_url" :src="course.cover_url" class="size-full object-cover" :alt="course.title" />
            <div v-else class="fc-cube-bg flex size-full items-center justify-center bg-brand-50">
              <LayoutGrid class="size-10 text-brand-300" />
            </div>
          </div>

          <div class="p-5 lg:p-6">
            <div class="flex flex-wrap items-center gap-2">
              <UiBadge v-if="course.category" :label="course.category" custom-class="bg-brand-50 text-brand-700 border-brand-200" />
              <UiBadge :label="levelLabel(course.level)" custom-class="bg-ink-100 text-ink-600 border-ink-200" />
              <UiBadge v-if="course.stage" :label="course.stage" custom-class="bg-ink-100 text-ink-600 border-ink-200" />
              <UiBadge v-if="course.age_range" :label="course.age_range" custom-class="bg-ink-100 text-ink-600 border-ink-200" />
            </div>

            <p class="mt-3.5 text-[14px] leading-relaxed text-ink-600">
              {{ course.summary || '暂无课程简介' }}
            </p>

            <div class="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p class="text-[11.5px] text-ink-500">课时数</p>
                <p class="mt-0.5 text-[17px] font-semibold text-ink-900 tabular-nums">{{ lessons.length }}</p>
              </div>
              <div>
                <p class="text-[11.5px] text-ink-500">单课时长</p>
                <p class="mt-0.5 text-[17px] font-semibold text-ink-900 tabular-nums">{{ course.lesson_minutes }}<span class="ml-0.5 text-[12px] font-normal text-ink-500">分</span></p>
              </div>
              <div>
                <p class="text-[11.5px] text-ink-500">关联资源</p>
                <p class="mt-0.5 text-[17px] font-semibold text-ink-900 tabular-nums">{{ resources.length }}</p>
              </div>
              <div>
                <p class="text-[11.5px] text-ink-500">开班数</p>
                <p class="mt-0.5 text-[17px] font-semibold text-ink-900 tabular-nums">{{ classes.length }}</p>
              </div>
            </div>

            <div v-if="course.tags?.length" class="mt-4 flex flex-wrap gap-1.5">
              <span
                v-for="tag in course.tags"
                :key="tag"
                class="rounded-md bg-ink-100 px-2 py-0.5 text-[11.5px] text-ink-600"
              >
                # {{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 标签页 -->
      <div class="mt-5 flex gap-1 border-b border-ink-200">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="relative -mb-px border-b-2 px-3.5 py-2.5 text-[13.5px] font-medium transition"
          :class="
            activeTab === tab.key
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-ink-500 hover:text-ink-800'
          "
          @click="activeTab = tab.key"
        >
          <component :is="tab.icon" class="mr-1.5 inline size-3.5" />
          {{ tab.label }}
          <span v-if="tab.count !== undefined" class="ml-1 text-[12px] text-ink-400">{{ tab.count }}</span>
        </button>
      </div>

      <!-- 课程信息 -->
      <div v-if="activeTab === 'info'" class="mt-5 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div class="fc-card p-5">
          <h3 class="text-[15px] font-semibold text-ink-900">课程介绍</h3>
          <div class="mt-3 space-y-3 text-[14px] leading-[1.85] text-ink-600">
            <p v-for="(para, i) in descriptionParagraphs" :key="i">{{ para }}</p>
          </div>
        </div>

        <div class="space-y-4">
          <div class="fc-card p-5">
            <h3 class="text-[15px] font-semibold text-ink-900">课程目标</h3>
            <p class="mt-2.5 text-[13.5px] leading-relaxed text-ink-600">
              {{ course.goal || '暂未填写课程目标' }}
            </p>
          </div>
          <div class="fc-card p-5">
            <h3 class="text-[15px] font-semibold text-ink-900">维护信息</h3>
            <dl class="mt-3 space-y-2 text-[13px]">
              <div class="flex justify-between">
                <dt class="text-ink-500">创建时间</dt>
                <dd class="text-ink-700">{{ formatDate(course.created_at) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-ink-500">最近更新</dt>
                <dd class="text-ink-700">{{ formatDateTime(course.updated_at) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-ink-500">排序权重</dt>
                <dd class="text-ink-700 tabular-nums">{{ course.sort_order }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-ink-500">上架时间</dt>
                <dd class="text-ink-700">{{ course.published_at ? formatDate(course.published_at) : '未上架' }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <!-- 课时教案 -->
      <div v-else-if="activeTab === 'lessons'" class="mt-5">
        <div class="mb-3 flex items-center justify-between">
          <p class="text-[13px] text-ink-500">按顺序维护课时内容，学员进度与教案一一对应。</p>
          <UiButton v-if="canManage" variant="primary" size="sm" @click="openLessonForm(null)">
            <template #icon><Plus class="size-3.5" /></template>
            新增课时
          </UiButton>
        </div>

        <div v-if="lessons.length" class="space-y-2.5">
          <div v-for="(lesson, index) in lessons" :key="lesson.id" class="fc-card overflow-hidden">
            <button
              type="button"
              class="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-ink-50"
              @click="toggleLesson(lesson.id)"
            >
              <span
                class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-[13px] font-semibold text-brand-700 tabular-nums"
              >
                {{ lesson.order_index }}
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-[14px] font-medium text-ink-900">{{ lesson.title }}</p>
                <p class="truncate text-[12px] text-ink-500">{{ lesson.goal || '未填写教学目标' }}</p>
              </div>
              <span class="hidden shrink-0 text-[12px] text-ink-400 sm:block">{{ lesson.duration_minutes }} 分钟</span>
              <ChevronDown
                class="size-4 shrink-0 text-ink-400 transition"
                :class="expandedLesson === lesson.id ? 'rotate-180' : ''"
              />
            </button>

            <Transition name="fc-expand">
              <div v-if="expandedLesson === lesson.id" class="border-t border-ink-100 bg-ink-50/50 px-4 py-4">
                <div class="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p class="text-[12px] font-semibold text-ink-500">教学目标</p>
                    <p class="mt-1 text-[13px] leading-relaxed text-ink-700">{{ lesson.goal || '—' }}</p>
                  </div>
                  <div>
                    <p class="text-[12px] font-semibold text-ink-500">核心公式 / 口诀</p>
                    <p class="mt-1 font-mono text-[13px] leading-relaxed text-brand-700">{{ lesson.formula || '—' }}</p>
                  </div>
                </div>

                <div class="mt-4">
                  <p class="text-[12px] font-semibold text-ink-500">教学内容</p>
                  <p class="mt-1 text-[13px] leading-[1.85] whitespace-pre-line text-ink-700">
                    {{ lesson.content || '—' }}
                  </p>
                </div>

                <div v-if="lesson.homework" class="mt-4">
                  <p class="text-[12px] font-semibold text-ink-500">课后练习</p>
                  <p class="mt-1 text-[13px] leading-relaxed text-ink-700">{{ lesson.homework }}</p>
                </div>

                <div v-if="canManage" class="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-200 pt-3.5">
                  <UiButton size="sm" variant="outline" :disabled="index === 0" @click="moveLesson(index, -1)">
                    <template #icon><ArrowUp class="size-3.5" /></template>
                    上移
                  </UiButton>
                  <UiButton
                    size="sm"
                    variant="outline"
                    :disabled="index === lessons.length - 1"
                    @click="moveLesson(index, 1)"
                  >
                    <template #icon><ArrowDown class="size-3.5" /></template>
                    下移
                  </UiButton>
                  <UiButton size="sm" variant="secondary" @click="openLessonForm(lesson)">
                    <template #icon><Pencil class="size-3.5" /></template>
                    编辑
                  </UiButton>
                  <UiButton size="sm" variant="ghost" @click="removeLesson(lesson)">
                    <template #icon><Trash2 class="size-3.5 text-red-500" /></template>
                    删除
                  </UiButton>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div v-else class="fc-card">
          <UiEmpty :icon="NotebookPen" title="还没有课时" description="把课程拆解成课时，教案与教学目标都可以在这里维护。">
            <UiButton v-if="canManage" variant="primary" @click="openLessonForm(null)">
              <template #icon><Plus class="size-4" /></template>
              新增课时
            </UiButton>
          </UiEmpty>
        </div>
      </div>

      <!-- 关联资源 -->
      <div v-else-if="activeTab === 'resources'" class="mt-5">
        <div v-if="resources.length" class="fc-card divide-y divide-ink-100">
          <div v-for="res in resources" :key="res.id" class="flex items-center gap-3.5 px-4 py-3.5">
            <ResourceIcon :kind="res.file_type" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-[13.5px] font-medium text-ink-800">{{ res.title }}</p>
              <p class="truncate text-[12px] text-ink-500">
                {{ res.file_name }} · {{ formatFileSize(res.file_size) }}
              </p>
            </div>
            <UiButton size="sm" variant="outline" :loading="downloadingId === res.id" @click="download(res)">
              <template #icon><Download class="size-3.5" /></template>
              下载
            </UiButton>
          </div>
        </div>
        <div v-else class="fc-card">
          <UiEmpty :icon="FolderOpen" title="暂无关联资源" description="在资源中心上传文件时，可以把它关联到本课程。">
            <UiButton v-if="auth.can('resource.view')" variant="primary" @click="router.push({ name: 'resources' })">
              前往资源中心
            </UiButton>
          </UiEmpty>
        </div>
      </div>

      <!-- 成绩概览 -->
      <div v-else-if="activeTab === 'grades'" class="mt-5">
        <div v-if="assessments.length" class="fc-card divide-y divide-ink-100">
          <RouterLink
            v-for="a in assessments"
            :key="a.id"
            :to="{ name: 'grades', query: { assessment: a.id } }"
            class="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-ink-50"
          >
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50">
              <Trophy class="size-4 text-amber-500" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[13.5px] font-medium text-ink-800">{{ a.title }}</p>
              <p class="text-[12px] text-ink-500">
                {{ ASSESSMENT_TYPE[a.type]?.label }} · {{ formatDate(a.assessed_at) }} · {{ a.grade_count }} 条成绩
              </p>
            </div>
            <ChevronRight class="size-4 shrink-0 text-ink-400" />
          </RouterLink>
        </div>
        <div v-else class="fc-card">
          <UiEmpty :icon="Trophy" title="暂无测评记录" description="为该课程创建阶段测评后，成绩会自动汇总到这里。" />
        </div>
      </div>
    </div>

    <!-- 课程编辑弹窗 -->
    <CourseFormModal :open="editOpen" :course="course" @close="editOpen = false" @saved="loadAll" />

    <!-- 课时编辑弹窗 -->
    <UiModal
      :open="lessonFormOpen"
      :title="editingLesson ? '编辑课时' : '新增课时'"
      width="md"
      @close="lessonFormOpen = false"
    >
      <form class="space-y-4" @submit.prevent="saveLesson">
        <UiField label="课时标题" required>
          <input v-model="lessonForm.title" class="fc-input" placeholder="例：底层白色十字" required />
        </UiField>
        <UiField label="教学目标">
          <input v-model="lessonForm.goal" class="fc-input" placeholder="这节课结束后，学员应该能做到什么" />
        </UiField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UiField label="时长（分钟）">
            <input v-model.number="lessonForm.duration_minutes" type="number" min="10" class="fc-input" />
          </UiField>
          <UiField label="顺序号" hint="留空则自动排在最后">
            <input v-model.number="lessonForm.order_index" type="number" min="1" class="fc-input" />
          </UiField>
        </div>
        <UiField label="核心公式 / 口诀">
          <input v-model="lessonForm.formula" class="fc-input font-mono" placeholder="例：R U R' U'" />
        </UiField>
        <UiField label="教学内容">
          <textarea v-model="lessonForm.content" class="fc-input" rows="5" placeholder="课堂步骤、讲解要点、常见错误纠正…" />
        </UiField>
        <UiField label="课后练习">
          <input v-model="lessonForm.homework" class="fc-input" placeholder="例：练习白色十字 5 次" />
        </UiField>
        <p v-if="lessonError" class="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
          {{ lessonError }}
        </p>
      </form>
      <template #footer>
        <UiButton variant="outline" @click="lessonFormOpen = false">取消</UiButton>
        <UiButton variant="primary" :loading="lessonSaving" @click="saveLesson">保存</UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Boxes,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  FolderOpen,
  LayoutGrid,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
  Trophy,
} from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import UiButton from '@/components/UiButton.vue'
import UiBadge from '@/components/UiBadge.vue'
import UiEmpty from '@/components/UiEmpty.vue'
import UiLoading from '@/components/UiLoading.vue'
import UiModal from '@/components/UiModal.vue'
import UiField from '@/components/UiField.vue'
import ResourceIcon from '@/components/ResourceIcon.vue'
import CourseFormModal from '@/components/CourseFormModal.vue'
import { getCourse, updateCourse, deleteCourse, listLessons, createLesson, updateLesson, deleteLesson, reorderLessons } from '@/api/courses'
import { listResources, downloadResource } from '@/api/resources'
import { listAssessments } from '@/api/grades'
import { listClasses } from '@/api/classes'
import { COURSE_STATUS, ASSESSMENT_TYPE, levelLabel } from '@/lib/dict'
import { formatDate, formatDateTime, formatFileSize } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useDialogStore } from '@/stores/dialog'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()
const dialog = useDialogStore()

const canManage = computed(() => auth.can('course.manage'))

const course = ref(null)
const lessons = ref([])
const resources = ref([])
const assessments = ref([])
const classes = ref([])
const loading = ref(true)
const activeTab = ref('info')
const expandedLesson = ref(null)
const downloadingId = ref(null)

const editOpen = ref(false)
const lessonFormOpen = ref(false)
const editingLesson = ref(null)
const lessonSaving = ref(false)
const lessonError = ref('')

const lessonForm = reactive({
  title: '',
  goal: '',
  content: '',
  formula: '',
  homework: '',
  duration_minutes: 45,
  order_index: undefined,
})

const statusMeta = computed(
  () => COURSE_STATUS[course.value?.status] || { label: '未知', style: '', dot: 'bg-ink-300' },
)

const descriptionParagraphs = computed(() => {
  const text = course.value?.description || ''
  const list = String(text).split('\n').map((s) => s.trim()).filter(Boolean)
  return list.length ? list : ['暂未填写课程详细介绍。']
})

const tabs = computed(() => [
  { key: 'info', label: '课程信息', icon: Boxes },
  { key: 'lessons', label: '课时教案', icon: NotebookPen, count: lessons.value.length },
  { key: 'resources', label: '关联资源', icon: FolderOpen, count: resources.value.length },
  { key: 'grades', label: '成绩概览', icon: Trophy, count: assessments.value.length },
])

async function loadAll() {
  loading.value = true
  const id = route.params.id
  try {
    course.value = await getCourse(id)
    if (!course.value) return

    const tasks = [listLessons(id)]
    tasks.push(auth.can('resource.view') ? listResources({ courseId: id, pageSize: 50 }) : Promise.resolve({ items: [] }))
    tasks.push(auth.can('grade.view') ? listAssessments({ courseId: id, pageSize: 50 }) : Promise.resolve({ items: [] }))
    tasks.push(auth.can('class.view') ? listClasses({ courseId: id }) : Promise.resolve({ items: [] }))

    const [lessonList, resourceList, assessmentList, classList] = await Promise.all(tasks)
    lessons.value = lessonList
    resources.value = resourceList.items || []
    assessments.value = assessmentList.items || []
    classes.value = classList.items || []
  } catch (err) {
    toast.error(err.message)
  } finally {
    loading.value = false
  }
}

function openEdit() {
  if (!course.value) return
  editOpen.value = true
}

async function toggleStatus() {
  const next = course.value.status === 'published' ? 'draft' : 'published'
  try {
    await updateCourse(course.value.id, { status: next })
    course.value.status = next
    toast.success(next === 'published' ? '课程已上架' : '课程已下架')
  } catch (err) {
    toast.error(err.message)
  }
}

async function handleDelete() {
  const ok = await dialog.confirm({
    title: '删除课程',
    message: `确认删除《${course.value.title}》吗？该操作会同时删除其下所有课时，且不可恢复。`,
    confirmText: '删除',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteCourse(course.value.id)
    toast.success('课程已删除')
    router.push({ name: 'courses' })
  } catch (err) {
    toast.error(err.message)
  }
}

function toggleLesson(id) {
  expandedLesson.value = expandedLesson.value === id ? null : id
}

function openLessonForm(lesson) {
  editingLesson.value = lesson
  lessonError.value = ''
  if (lesson) {
    Object.assign(lessonForm, {
      title: lesson.title,
      goal: lesson.goal || '',
      content: lesson.content || '',
      formula: lesson.formula || '',
      homework: lesson.homework || '',
      duration_minutes: lesson.duration_minutes || 45,
      order_index: lesson.order_index,
    })
  } else {
    Object.assign(lessonForm, {
      title: '',
      goal: '',
      content: '',
      formula: '',
      homework: '',
      duration_minutes: course.value?.lesson_minutes || 45,
      order_index: undefined,
    })
  }
  lessonFormOpen.value = true
}

async function saveLesson() {
  lessonError.value = ''
  if (!lessonForm.title.trim()) {
    lessonError.value = '请填写课时标题'
    return
  }
  lessonSaving.value = true
  try {
    const payload = {
      title: lessonForm.title.trim(),
      goal: lessonForm.goal?.trim() || null,
      content: lessonForm.content?.trim() || null,
      formula: lessonForm.formula?.trim() || null,
      homework: lessonForm.homework?.trim() || null,
      duration_minutes: Number(lessonForm.duration_minutes) || 45,
    }
    if (lessonForm.order_index) payload.order_index = Number(lessonForm.order_index)

    if (editingLesson.value) {
      await updateLesson(editingLesson.value.id, payload)
      toast.success('课时已保存')
    } else {
      await createLesson(course.value.id, payload)
      toast.success('课时已新增')
    }
    lessonFormOpen.value = false
    lessons.value = await listLessons(course.value.id)
    course.value = await getCourse(course.value.id)
  } catch (err) {
    lessonError.value = err.message
  } finally {
    lessonSaving.value = false
  }
}

async function removeLesson(lesson) {
  const ok = await dialog.confirm({
    title: '删除课时',
    message: `确认删除「${lesson.title}」吗？`,
    confirmText: '删除',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteLesson(lesson.id)
    toast.success('课时已删除')
    lessons.value = await listLessons(course.value.id)
    course.value = await getCourse(course.value.id)
  } catch (err) {
    toast.error(err.message)
  }
}

async function moveLesson(index, delta) {
  const target = index + delta
  if (target < 0 || target >= lessons.value.length) return
  const list = [...lessons.value]
  const [item] = list.splice(index, 1)
  list.splice(target, 0, item)
  lessons.value = list.map((l, i) => ({ ...l, order_index: i + 1 }))
  try {
    await reorderLessons(lessons.value.map((l) => l.id))
    expandedLesson.value = item.id
  } catch (err) {
    toast.error(err.message)
    lessons.value = await listLessons(course.value.id)
  }
}

async function download(resource) {
  downloadingId.value = resource.id
  try {
    const url = await downloadResource(resource)
    window.open(url, '_blank', 'noopener')
    toast.success('下载已开始')
  } catch (err) {
    toast.error(err.message)
  } finally {
    downloadingId.value = null
  }
}

onMounted(loadAll)
</script>

<style scoped>
.fc-expand-enter-active,
.fc-expand-leave-active {
  transition: all 0.18s ease;
}
.fc-expand-enter-from,
.fc-expand-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
