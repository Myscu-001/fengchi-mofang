<template>
  <div>
    <PageHeader title="测评成绩" description="创建阶段测评、录入成绩与复原耗时，形成学员成长档案">
      <UiButton v-if="canManage" variant="primary" @click="openCreate">
        <template #icon><Plus class="size-4" /></template>
        新建测评
      </UiButton>
    </PageHeader>

    <div class="fc-container py-7">
      <div class="grid gap-5 lg:grid-cols-[340px_1fr]">
        <!-- 测评列表 -->
        <aside>
          <div class="fc-card flex items-center gap-2 p-2.5">
            <div class="relative flex-1">
              <Search class="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ink-400" />
              <input
                v-model="keyword"
                class="fc-input pl-8.5"
                placeholder="搜索测评名称"
                @keyup.enter="loadAssessments"
              />
            </div>
            <select v-model="typeFilter" class="fc-input w-auto min-w-[104px]" @change="loadAssessments">
              <option value="">全部</option>
              <option v-for="o in ASSESSMENT_TYPE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>

          <div class="fc-card mt-3.5 overflow-hidden">
            <UiLoading v-if="loadingList" text="加载中…" />
            <template v-else-if="assessments.length">
              <button
                v-for="a in assessments"
                :key="a.id"
                type="button"
                class="flex w-full items-start gap-3 border-b border-ink-100 px-4 py-3.5 text-left transition last:border-0"
                :class="current?.id === a.id ? 'bg-brand-50' : 'hover:bg-ink-50'"
                @click="selectAssessment(a)"
              >
                <span
                  class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg"
                  :class="current?.id === a.id ? 'bg-brand-100 text-brand-700' : 'bg-amber-50 text-amber-500'"
                >
                  <Trophy class="size-4" />
                </span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-[13.5px] font-medium text-ink-800">{{ a.title }}</p>
                  <p class="mt-0.5 truncate text-[11.5px] text-ink-500">
                    {{ a.course?.title || '未关联课程' }} · {{ formatDate(a.assessed_at) }}
                  </p>
                  <div class="mt-1.5 flex items-center gap-2">
                    <UiBadge :label="ASSESSMENT_TYPE[a.type]?.label" :custom-class="ASSESSMENT_TYPE[a.type]?.style" />
                    <span class="text-[11.5px] text-ink-400">{{ a.grade_count }} 条成绩</span>
                  </div>
                </div>
              </button>
            </template>

            <UiEmpty v-else :icon="Trophy" title="暂无测评" description="创建一次测评后即可录入成绩。" />
          </div>

          <div v-if="total > pageSize" class="mt-3.5">
            <UiPagination v-model:page="page" :page-size="pageSize" :total="total" />
          </div>
        </aside>

        <!-- 成绩录入 -->
        <section>
          <div v-if="!current" class="fc-card">
            <UiEmpty
              :icon="ClipboardList"
              title="请选择一次测评"
              description="从左侧选择测评，右侧会显示该测评的成绩录入表。"
            />
          </div>

          <template v-else>
            <div class="fc-card p-5">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <h2 class="text-[17px] font-semibold text-ink-900">{{ current.title }}</h2>
                    <UiBadge :label="ASSESSMENT_TYPE[current.type]?.label" :custom-class="ASSESSMENT_TYPE[current.type]?.style" />
                  </div>
                  <p class="mt-1.5 text-[12.5px] text-ink-500">
                    {{ current.course?.title || '未关联课程' }} · {{ current.class?.name || '不限定班级' }} ·
                    满分 {{ current.max_score }} · {{ formatDate(current.assessed_at) }}
                  </p>
                  <p v-if="current.description" class="mt-2 text-[13px] text-ink-600">{{ current.description }}</p>
                </div>

                <div class="flex items-center gap-2">
                  <UiButton v-if="canManage" size="sm" variant="outline" @click="openEditAssessment">
                    <template #icon><Pencil class="size-3.5" /></template>
                    编辑测评
                  </UiButton>
                  <UiButton v-if="canManage" size="sm" variant="ghost" @click="removeAssessment">
                    <template #icon><Trash2 class="size-3.5 text-red-500" /></template>
                  </UiButton>
                </div>
              </div>

              <div class="mt-4 grid grid-cols-2 gap-4 border-t border-ink-100 pt-4 sm:grid-cols-4">
                <div>
                  <p class="text-[11.5px] text-ink-500">录入人数</p>
                  <p class="mt-0.5 text-[17px] font-semibold text-ink-900 tabular-nums">{{ rows.length }}</p>
                </div>
                <div>
                  <p class="text-[11.5px] text-ink-500">平均分</p>
                  <p class="mt-0.5 text-[17px] font-semibold text-brand-700 tabular-nums">{{ summary.avgScore }}</p>
                </div>
                <div>
                  <p class="text-[11.5px] text-ink-500">最高分</p>
                  <p class="mt-0.5 text-[17px] font-semibold text-emerald-600 tabular-nums">{{ summary.maxScore }}</p>
                </div>
                <div>
                  <p class="text-[11.5px] text-ink-500">最快复原</p>
                  <p class="mt-0.5 text-[17px] font-semibold text-orange-500 tabular-nums">{{ summary.fastest }}</p>
                </div>
              </div>
            </div>

            <!-- 录入表 -->
            <div class="fc-card mt-4 overflow-hidden">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-ink-200 px-4 py-3">
                <h3 class="text-[14px] font-semibold text-ink-800">成绩明细</h3>
                <div v-if="canManage" class="flex items-center gap-2">
                  <select v-model="pickStudentId" class="fc-input w-auto min-w-[180px] py-1.5">
                    <option value="">添加学员到本次测评…</option>
                    <option v-for="s in selectableStudents" :key="s.id" :value="s.id">{{ s.name }}</option>
                  </select>
                  <UiButton size="sm" variant="outline" :disabled="!pickStudentId" @click="addRow">
                    <template #icon><UserPlus class="size-3.5" /></template>
                    添加
                  </UiButton>
                </div>
              </div>

              <div v-if="rows.length" class="overflow-x-auto">
                <table class="w-full min-w-[820px] text-left text-[13px]">
                  <thead class="border-b border-ink-200 bg-ink-50 text-[11.5px] text-ink-500">
                    <tr>
                      <th class="px-3.5 py-2.5 font-medium">学员</th>
                      <th class="px-3.5 py-2.5 font-medium">得分</th>
                      <th class="px-3.5 py-2.5 font-medium">复原耗时（秒）</th>
                      <th class="px-3.5 py-2.5 font-medium">名次</th>
                      <th class="px-3.5 py-2.5 font-medium">等级</th>
                      <th class="px-3.5 py-2.5 font-medium">评语</th>
                      <th v-if="canManage" class="px-3.5 py-2.5 text-right font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-ink-100">
                    <tr v-for="row in rows" :key="row.student_id" class="transition hover:bg-ink-50/60">
                      <td class="px-3.5 py-2.5">
                        <div class="flex items-center gap-2.5">
                          <UiAvatar :name="row.student_name" size="xs" />
                          <span class="font-medium whitespace-nowrap text-ink-800">{{ row.student_name }}</span>
                        </div>
                      </td>
                      <td class="px-3.5 py-2.5">
                        <input
                          v-model="row.score"
                          type="number"
                          step="0.5"
                          min="0"
                          :max="current.max_score"
                          class="fc-input w-20 py-1 text-center"
                          :disabled="!canManage"
                        />
                      </td>
                      <td class="px-3.5 py-2.5">
                        <input
                          v-model="row.seconds"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="—"
                          class="fc-input w-24 py-1 text-center"
                          :disabled="!canManage"
                        />
                      </td>
                      <td class="px-3.5 py-2.5">
                        <input
                          v-model="row.rank"
                          type="number"
                          min="1"
                          class="fc-input w-16 py-1 text-center"
                          :disabled="!canManage"
                        />
                      </td>
                      <td class="px-3.5 py-2.5">
                        <input
                          v-model="row.level"
                          class="fc-input w-16 py-1 text-center"
                          placeholder="A"
                          :disabled="!canManage"
                        />
                      </td>
                      <td class="px-3.5 py-2.5">
                        <input
                          v-model="row.comment"
                          class="fc-input py-1"
                          placeholder="课堂表现、改进建议…"
                          :disabled="!canManage"
                        />
                      </td>
                      <td v-if="canManage" class="px-3.5 py-2.5 text-right">
                        <button
                          class="rounded-lg p-1.5 text-ink-400 transition hover:bg-red-50 hover:text-red-500"
                          title="移除该行"
                          @click="removeRow(row)"
                        >
                          <X class="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <UiEmpty
                v-else
                :icon="ClipboardList"
                title="还没有成绩记录"
                description="从上方选择学员添加到本次测评，然后填写得分与耗时。"
              />

              <div v-if="canManage && rows.length" class="flex items-center justify-between border-t border-ink-200 bg-ink-50/60 px-4 py-3">
                <p class="text-[12.5px] text-ink-500">修改后记得点击保存，未填写的项会留空。</p>
                <UiButton variant="primary" :loading="saving" @click="saveAll">
                  <template #icon><Save class="size-4" /></template>
                  保存成绩
                </UiButton>
              </div>
            </div>
          </template>
        </section>
      </div>
    </div>

    <!-- 测评表单 -->
    <UiModal :open="formOpen" :title="editingAssessment ? '编辑测评' : '新建测评'" width="md" @close="formOpen = false">
      <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="saveAssessment">
        <UiField label="测评名称" required class="sm:col-span-2">
          <input v-model="aForm.title" class="fc-input" placeholder="例：三阶层先法结课测评" required />
        </UiField>

        <UiField label="测评类型">
          <select v-model="aForm.type" class="fc-input">
            <option v-for="o in ASSESSMENT_TYPE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </UiField>
        <UiField label="测评日期">
          <input v-model="aForm.assessed_at" type="date" class="fc-input" />
        </UiField>

        <UiField label="关联课程">
          <select v-model="aForm.course_id" class="fc-input">
            <option value="">未关联</option>
            <option v-for="c in courseOptions" :key="c.id" :value="c.id">{{ c.title }}</option>
          </select>
        </UiField>
        <UiField label="关联班级" hint="选择班级后可一键带入全班学员">
          <select v-model="aForm.class_id" class="fc-input">
            <option value="">不限定</option>
            <option v-for="c in classOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </UiField>

        <UiField label="满分">
          <input v-model.number="aForm.max_score" type="number" min="1" class="fc-input" />
        </UiField>
        <UiField label="及格分">
          <input v-model.number="aForm.pass_score" type="number" min="0" class="fc-input" />
        </UiField>

        <div class="sm:col-span-2">
          <UiField label="说明">
            <textarea v-model="aForm.description" class="fc-input" rows="2" placeholder="测评范围、评分标准…" />
          </UiField>
        </div>

        <p v-if="formError" class="sm:col-span-2 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
          {{ formError }}
        </p>
      </form>

      <template #footer>
        <UiButton variant="outline" @click="formOpen = false">取消</UiButton>
        <UiButton variant="primary" :loading="savingForm" @click="saveAssessment">
          {{ editingAssessment ? '保存修改' : '创建测评' }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ClipboardList,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Trophy,
  UserPlus,
  X,
} from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import UiButton from '@/components/UiButton.vue'
import UiBadge from '@/components/UiBadge.vue'
import UiAvatar from '@/components/UiAvatar.vue'
import UiEmpty from '@/components/UiEmpty.vue'
import UiLoading from '@/components/UiLoading.vue'
import UiModal from '@/components/UiModal.vue'
import UiField from '@/components/UiField.vue'
import UiPagination from '@/components/UiPagination.vue'
import {
  listAssessments,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  listGrades,
  saveGrades,
  deleteGrade,
} from '@/api/grades'
import { listCourseOptions } from '@/api/courses'
import { listClasses, listClassMembers } from '@/api/classes'
import { listStudentOptions } from '@/api/students'
import { ASSESSMENT_TYPE, ASSESSMENT_TYPE_OPTIONS } from '@/lib/dict'
import { formatDate } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useDialogStore } from '@/stores/dialog'

const auth = useAuthStore()
const toast = useToastStore()
const dialog = useDialogStore()
const route = useRoute()
const router = useRouter()

const canManage = computed(() => auth.can('grade.manage'))

const assessments = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 12
const keyword = ref('')
const typeFilter = ref('')
const loadingList = ref(true)

const current = ref(null)
const rows = ref([])
const saving = ref(false)

const courseOptions = ref([])
const classOptions = ref([])
const studentOptions = ref([])
const pickStudentId = ref('')

const formOpen = ref(false)
const editingAssessment = ref(null)
const savingForm = ref(false)
const formError = ref('')

const aForm = reactive({
  title: '',
  type: 'stage',
  assessed_at: new Date().toISOString().slice(0, 10),
  course_id: '',
  class_id: '',
  max_score: 100,
  pass_score: 60,
  description: '',
})

const summary = computed(() => {
  const scores = rows.value.map((r) => Number(r.score)).filter((n) => !Number.isNaN(n) && n > 0)
  const seconds = rows.value.map((r) => Number(r.seconds)).filter((n) => !Number.isNaN(n) && n > 0)
  return {
    avgScore: scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—',
    maxScore: scores.length ? Math.max(...scores).toFixed(1) : '—',
    fastest: seconds.length ? `${Math.min(...seconds).toFixed(2)}s` : '—',
  }
})

const selectableStudents = computed(() => {
  const used = new Set(rows.value.map((r) => r.student_id))
  return studentOptions.value.filter((s) => !used.has(s.id))
})

async function loadAssessments() {
  loadingList.value = true
  try {
    const { items, total: count } = await listAssessments({
      keyword: keyword.value,
      type: typeFilter.value,
      page: page.value,
      pageSize,
    })
    assessments.value = items
    total.value = count

    const targetId = route.query.assessment
    if (targetId) {
      const found = items.find((a) => a.id === targetId)
      if (found) await selectAssessment(found)
      router.replace({ name: 'grades' })
    } else if (current.value) {
      const refreshed = items.find((a) => a.id === current.value.id)
      if (refreshed) current.value = refreshed
    }
  } catch (err) {
    toast.error(err.message)
    assessments.value = []
  } finally {
    loadingList.value = false
  }
}

async function loadOptions() {
  try {
    const [courses, classes, students] = await Promise.all([
      listCourseOptions(),
      auth.can('class.view') ? listClasses({}) : Promise.resolve({ items: [] }),
      listStudentOptions(),
    ])
    courseOptions.value = courses
    classOptions.value = classes.items || []
    studentOptions.value = students
  } catch {
    // 忽略
  }
}

async function selectAssessment(item) {
  current.value = item
  pickStudentId.value = ''
  try {
    const grades = await listGrades(item.id)
    rows.value = grades.map((g) => ({
      id: g.id,
      student_id: g.student_id,
      student_name: g.student_name,
      score: g.score ?? '',
      seconds: g.duration_ms ? (g.duration_ms / 1000).toFixed(2) : '',
      rank: g.rank ?? '',
      level: g.level || '',
      comment: g.comment || '',
      is_pass: g.is_pass,
    }))
  } catch (err) {
    toast.error(err.message)
    rows.value = []
  }
}

function addRow() {
  const student = studentOptions.value.find((s) => s.id === pickStudentId.value)
  if (!student) return
  rows.value.push({
    id: null,
    student_id: student.id,
    student_name: student.name,
    score: '',
    seconds: '',
    rank: '',
    level: '',
    comment: '',
    is_pass: null,
  })
  pickStudentId.value = ''
}

async function removeRow(row) {
  if (row.id) {
    try {
      await deleteGrade(row.id)
    } catch (err) {
      toast.error(err.message)
      return
    }
  }
  rows.value = rows.value.filter((r) => r.student_id !== row.student_id)
}

async function saveAll() {
  saving.value = true
  try {
    const payload = rows.value
      .filter((r) => r.score !== '' || r.seconds !== '' || r.rank !== '' || r.level || r.comment)
      .map((r) => ({
        student_id: r.student_id,
        score: r.score === '' ? null : Number(r.score),
        duration_ms: r.seconds === '' ? null : Math.round(Number(r.seconds) * 1000),
        rank: r.rank === '' ? null : Number(r.rank),
        level: r.level || null,
        comment: r.comment || null,
        is_pass:
          r.score === '' || current.value?.pass_score === null || current.value?.pass_score === undefined
            ? null
            : Number(r.score) >= Number(current.value.pass_score),
      }))

    if (!payload.length) {
      toast.warning('没有需要保存的成绩')
      return
    }

    await saveGrades(current.value.id, payload)
    toast.success(`已保存 ${payload.length} 条成绩`)
    await selectAssessment(current.value)
    await loadAssessments()
  } catch (err) {
    toast.error(err.message)
  } finally {
    saving.value = false
  }
}

function openCreate() {
  editingAssessment.value = null
  formError.value = ''
  Object.assign(aForm, {
    title: '',
    type: 'stage',
    assessed_at: new Date().toISOString().slice(0, 10),
    course_id: current.value?.course_id || '',
    class_id: current.value?.class_id || '',
    max_score: 100,
    pass_score: 60,
    description: '',
  })
  formOpen.value = true
}

function openEditAssessment() {
  if (!current.value) return
  editingAssessment.value = current.value
  formError.value = ''
  Object.assign(aForm, {
    title: current.value.title,
    type: current.value.type,
    assessed_at: current.value.assessed_at?.slice(0, 10) || '',
    course_id: current.value.course_id || '',
    class_id: current.value.class_id || '',
    max_score: current.value.max_score ?? 100,
    pass_score: current.value.pass_score ?? 60,
    description: current.value.description || '',
  })
  formOpen.value = true
}

async function saveAssessment() {
  formError.value = ''
  if (!aForm.title.trim()) {
    formError.value = '请填写测评名称'
    return
  }
  savingForm.value = true
  try {
    const payload = {
      ...aForm,
      title: aForm.title.trim(),
      course_id: aForm.course_id || null,
      class_id: aForm.class_id || null,
      description: aForm.description?.trim() || null,
    }
    if (editingAssessment.value) {
      await updateAssessment(editingAssessment.value.id, payload)
      toast.success('测评已保存')
    } else {
      const created = await createAssessment(payload)
      toast.success('测评已创建')
      formOpen.value = false
      await loadAssessments()
      const found = assessments.value.find((a) => a.id === created.id)
      if (found) await selectAssessment(found)
      // 若指定了班级，自动带入全班学员
      if (payload.class_id) await prefillClassStudents(payload.class_id)
      return
    }
    formOpen.value = false
    await loadAssessments()
  } catch (err) {
    formError.value = err.message
  } finally {
    savingForm.value = false
  }
}

async function prefillClassStudents(classId) {
  try {
    const members = await listClassMembers(classId)
    const existing = new Set(rows.value.map((r) => r.student_id))
    for (const m of members) {
      if (!m.student?.id || existing.has(m.student.id)) continue
      rows.value.push({
        id: null,
        student_id: m.student.id,
        student_name: m.student.name,
        score: '',
        seconds: '',
        rank: '',
        level: '',
        comment: '',
        is_pass: null,
      })
    }
    toast.info('已带入班级学员名单，填写后记得保存')
  } catch {
    // 忽略
  }
}

async function removeAssessment() {
  const ok = await dialog.confirm({
    title: '删除测评',
    message: `确认删除「${current.value.title}」吗？该测评下的所有成绩记录会一并删除。`,
    confirmText: '删除',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteAssessment(current.value.id)
    toast.success('测评已删除')
    current.value = null
    rows.value = []
    await loadAssessments()
  } catch (err) {
    toast.error(err.message)
  }
}

watch(page, loadAssessments)

onMounted(() => {
  loadAssessments()
  loadOptions()
})
</script>
