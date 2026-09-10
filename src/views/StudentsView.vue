<template>
  <div>
    <PageHeader title="学员档案" description="一人一档，记录学员基础信息、班级与成绩轨迹">
      <UiButton v-if="canManage" variant="primary" @click="openForm(null)">
        <template #icon><UserPlus class="size-4" /></template>
        新增学员
      </UiButton>
    </PageHeader>

    <div class="fc-container py-7">
      <div class="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <UiStat label="学员总数" :value="counts.total" :icon="Users" tone="brand" />
        <UiStat label="在读" :value="counts.active" :icon="UserCheck" tone="green" />
        <UiStat label="停课" :value="counts.paused" :icon="PauseCircle" tone="orange" />
        <UiStat label="结业 / 退学" :value="counts.ended" :icon="UserMinus" tone="slate" />
      </div>

      <div class="fc-card mt-5 flex flex-wrap items-center gap-2.5 p-3.5">
        <div class="relative min-w-[220px] flex-1">
          <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
          <input
            v-model="filters.keyword"
            class="fc-input pl-9.5"
            placeholder="搜索姓名、昵称、家长姓名或电话"
            @keyup.enter="applyFilters"
          />
        </div>
        <select v-model="filters.status" class="fc-input w-auto min-w-[120px]" @change="applyFilters">
          <option value="">全部状态</option>
          <option v-for="o in STUDENT_STATUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <select v-model="filters.level" class="fc-input w-auto min-w-[120px]" @change="applyFilters">
          <option value="">全部水平</option>
          <option v-for="l in STUDENT_LEVEL_OPTIONS" :key="l" :value="l">{{ l }}</option>
        </select>
        <UiButton variant="outline" @click="resetFilters">
          <template #icon><RotateCcw class="size-3.5" /></template>
          重置
        </UiButton>
      </div>

      <div class="fc-card mt-5 overflow-hidden">
        <UiLoading v-if="loading" text="正在加载学员…" />

        <div v-else-if="students.length" class="overflow-x-auto">
          <table class="w-full min-w-[880px] text-left text-[13px]">
            <thead class="border-b border-ink-200 bg-ink-50 text-[12px] text-ink-500">
              <tr>
                <th class="px-4 py-3 font-medium">学员</th>
                <th class="px-4 py-3 font-medium">年龄</th>
                <th class="px-4 py-3 font-medium">家长 / 联系方式</th>
                <th class="px-4 py-3 font-medium">学校 / 年级</th>
                <th class="px-4 py-3 font-medium">水平</th>
                <th class="px-4 py-3 font-medium">加入时间</th>
                <th class="px-4 py-3 font-medium">状态</th>
                <th class="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ink-100">
              <tr v-for="s in students" :key="s.id" class="transition hover:bg-ink-50/70">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2.5">
                    <UiAvatar :src="s.avatar_url" :name="s.name" size="sm" />
                    <div class="min-w-0">
                      <p class="truncate font-medium text-ink-800">{{ s.name }}</p>
                      <p v-if="s.nickname" class="truncate text-[11.5px] text-ink-400">{{ s.nickname }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 text-ink-600 tabular-nums">{{ ageOf(s.birthday) }}</td>
                <td class="px-4 py-3 text-ink-600">
                  <p>{{ s.guardian_name || '—' }}</p>
                  <p class="text-[11.5px] text-ink-400">{{ s.guardian_phone || s.phone || '—' }}</p>
                </td>
                <td class="px-4 py-3 text-ink-600">
                  <p>{{ s.school || '—' }}</p>
                  <p class="text-[11.5px] text-ink-400">{{ s.grade || '—' }}</p>
                </td>
                <td class="px-4 py-3">
                  <UiBadge v-if="s.level" :label="s.level" custom-class="bg-brand-50 text-brand-700 border-brand-200" />
                  <span v-else class="text-ink-400">—</span>
                </td>
                <td class="px-4 py-3 text-ink-600">{{ formatDate(s.joined_at) }}</td>
                <td class="px-4 py-3">
                  <UiBadge :label="STUDENT_STATUS[s.status]?.label" :custom-class="STUDENT_STATUS[s.status]?.style" />
                </td>
                <td class="px-4 py-3">
                  <div class="flex justify-end gap-1">
                    <button
                      class="rounded-lg p-1.5 text-ink-400 transition hover:bg-brand-50 hover:text-brand-600"
                      title="查看档案"
                      @click="openDetail(s)"
                    >
                      <Eye class="size-3.5" />
                    </button>
                    <template v-if="canManage">
                      <button
                        class="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                        title="编辑"
                        @click="openForm(s)"
                      >
                        <Pencil class="size-3.5" />
                      </button>
                      <button
                        class="rounded-lg p-1.5 text-ink-400 transition hover:bg-red-50 hover:text-red-500"
                        title="删除"
                        @click="remove(s)"
                      >
                        <Trash2 class="size-3.5" />
                      </button>
                    </template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <UiEmpty
          v-else
          :icon="Users"
          title="还没有学员"
          description="录入第一位学员，后续的班级、成绩都会挂到他名下。"
        >
          <UiButton v-if="canManage" variant="primary" @click="openForm(null)">
            <template #icon><UserPlus class="size-4" /></template>
            新增学员
          </UiButton>
        </UiEmpty>
      </div>

      <div v-if="total > pageSize" class="mt-5">
        <UiPagination v-model:page="page" :page-size="pageSize" :total="total" />
      </div>
    </div>

    <!-- 新增 / 编辑 -->
    <UiModal
      :open="formOpen"
      :title="editing ? '编辑学员' : '新增学员'"
      width="lg"
      @close="formOpen = false"
    >
      <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="save">
        <UiField label="姓名" required>
          <input v-model="form.name" class="fc-input" placeholder="学员真实姓名" required />
        </UiField>
        <UiField label="昵称 / 小名">
          <input v-model="form.nickname" class="fc-input" placeholder="课堂称呼" />
        </UiField>

        <UiField label="性别">
          <select v-model="form.gender" class="fc-input">
            <option value="unknown">未填写</option>
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
        </UiField>
        <UiField label="出生日期" :hint="form.birthday ? `当前 ${ageOf(form.birthday)}` : '用于自动计算年龄'">
          <input v-model="form.birthday" type="date" class="fc-input" />
        </UiField>

        <UiField label="家长姓名">
          <input v-model="form.guardian_name" class="fc-input" placeholder="监护人姓名" />
        </UiField>
        <UiField label="家长电话">
          <input v-model="form.guardian_phone" class="fc-input" placeholder="联系电话" />
        </UiField>

        <UiField label="学员本人电话">
          <input v-model="form.phone" class="fc-input" />
        </UiField>
        <UiField label="来源渠道">
          <input v-model="form.source" class="fc-input" placeholder="例：朋友推荐 / 地推 / 线上" />
        </UiField>

        <UiField label="就读学校">
          <input v-model="form.school" class="fc-input" />
        </UiField>
        <UiField label="年级">
          <input v-model="form.grade" class="fc-input" placeholder="例：二年级" />
        </UiField>

        <UiField label="当前水平">
          <input v-model="form.level" class="fc-input" list="student-level-list" placeholder="新手 / 入门 / 熟练 / 竞速" />
          <datalist id="student-level-list">
            <option v-for="l in STUDENT_LEVEL_OPTIONS" :key="l" :value="l" />
          </datalist>
        </UiField>
        <UiField label="加入日期">
          <input v-model="form.joined_at" type="date" class="fc-input" />
        </UiField>

        <UiField label="学员状态">
          <select v-model="form.status" class="fc-input">
            <option v-for="o in STUDENT_STATUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </UiField>

        <div class="sm:col-span-2">
          <UiField label="备注">
            <textarea v-model="form.notes" class="fc-input" rows="3" placeholder="学习特点、注意事项、家长诉求…" />
          </UiField>
        </div>

        <p v-if="errorMsg" class="sm:col-span-2 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
          {{ errorMsg }}
        </p>
      </form>

      <template #footer>
        <UiButton variant="outline" @click="formOpen = false">取消</UiButton>
        <UiButton variant="primary" :loading="saving" @click="save">
          {{ editing ? '保存修改' : '新增学员' }}
        </UiButton>
      </template>
    </UiModal>

    <!-- 学员档案详情 -->
    <UiModal :open="detailOpen" :title="current?.name" :subtitle="current?.nickname || ''" width="lg" @close="detailOpen = false">
      <div v-if="detailLoading" class="py-8"><UiLoading text="正在加载档案…" /></div>
      <div v-else class="space-y-5">
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div v-for="item in detailFacts" :key="item.label">
            <p class="text-[11.5px] text-ink-500">{{ item.label }}</p>
            <p class="mt-0.5 text-[14px] font-medium text-ink-800">{{ item.value }}</p>
          </div>
        </div>

        <div v-if="current?.notes">
          <p class="text-[12px] font-semibold text-ink-500">备注</p>
          <p class="mt-1 text-[13px] leading-relaxed text-ink-600">{{ current.notes }}</p>
        </div>

        <div>
          <h4 class="text-[13px] font-semibold text-ink-800">所在班级</h4>
          <ul v-if="studentClasses.length" class="mt-2 divide-y divide-ink-100 rounded-xl border border-ink-200">
            <li v-for="m in studentClasses" :key="m.id" class="flex items-center justify-between px-3.5 py-2.5">
              <div>
                <p class="text-[13px] font-medium text-ink-800">{{ m.class?.name }}</p>
                <p class="text-[11.5px] text-ink-400">{{ m.class?.course?.title || '未关联课程' }}</p>
              </div>
              <UiBadge :label="CLASS_STATUS[m.class?.status]?.label" :custom-class="CLASS_STATUS[m.class?.status]?.style" />
            </li>
          </ul>
          <p v-else class="mt-2 text-[13px] text-ink-400">暂未加入班级</p>
        </div>

        <div>
          <h4 class="text-[13px] font-semibold text-ink-800">成绩记录</h4>
          <div v-if="studentGrades.length" class="mt-2 overflow-hidden rounded-xl border border-ink-200">
            <table class="w-full text-left text-[12.5px]">
              <thead class="border-b border-ink-200 bg-ink-50 text-[11.5px] text-ink-500">
                <tr>
                  <th class="px-3.5 py-2 font-medium">测评</th>
                  <th class="px-3.5 py-2 font-medium">日期</th>
                  <th class="px-3.5 py-2 font-medium">得分</th>
                  <th class="px-3.5 py-2 font-medium">耗时</th>
                  <th class="px-3.5 py-2 font-medium">等级</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-ink-100">
                <tr v-for="g in studentGrades" :key="g.id">
                  <td class="px-3.5 py-2 text-ink-700">{{ g.assessment_title }}</td>
                  <td class="px-3.5 py-2 text-ink-500">{{ formatDate(g.assessed_at) }}</td>
                  <td class="px-3.5 py-2 font-medium text-brand-700 tabular-nums">
                    {{ g.score ?? '—' }}<span class="text-ink-400">/{{ g.max_score }}</span>
                  </td>
                  <td class="px-3.5 py-2 text-ink-600 tabular-nums">{{ formatDuration(g.duration_ms) }}</td>
                  <td class="px-3.5 py-2 text-ink-600">{{ g.level || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="mt-2 text-[13px] text-ink-400">暂无成绩记录</p>
        </div>
      </div>

      <template #footer>
        <UiButton variant="outline" @click="detailOpen = false">关闭</UiButton>
        <UiButton v-if="canManage" variant="primary" @click="openForm(current); detailOpen = false">
          编辑档案
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  Eye,
  PauseCircle,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import UiButton from '@/components/UiButton.vue'
import UiStat from '@/components/UiStat.vue'
import UiBadge from '@/components/UiBadge.vue'
import UiAvatar from '@/components/UiAvatar.vue'
import UiEmpty from '@/components/UiEmpty.vue'
import UiLoading from '@/components/UiLoading.vue'
import UiModal from '@/components/UiModal.vue'
import UiField from '@/components/UiField.vue'
import UiPagination from '@/components/UiPagination.vue'
import {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  listStudentClasses,
  listStudentGrades,
} from '@/api/students'
import { STUDENT_STATUS, STUDENT_STATUS_OPTIONS, STUDENT_LEVEL_OPTIONS, CLASS_STATUS } from '@/lib/dict'
import { formatDate, formatDuration } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useDialogStore } from '@/stores/dialog'

const auth = useAuthStore()
const toast = useToastStore()
const dialog = useDialogStore()

const canManage = computed(() => auth.can('student.manage'))

const students = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 15
const loading = ref(true)
const filters = reactive({ keyword: '', status: '', level: '' })
const counts = reactive({ total: 0, active: 0, paused: 0, ended: 0 })

const formOpen = ref(false)
const editing = ref(null)
const saving = ref(false)
const errorMsg = ref('')

const detailOpen = ref(false)
const current = ref(null)
const detailLoading = ref(false)
const studentClasses = ref([])
const studentGrades = ref([])

const blank = () => ({
  name: '',
  nickname: '',
  gender: 'unknown',
  birthday: '',
  phone: '',
  guardian_name: '',
  guardian_phone: '',
  school: '',
  grade: '',
  level: '',
  source: '',
  joined_at: new Date().toISOString().slice(0, 10),
  status: 'active',
  notes: '',
})

const form = reactive(blank())

const detailFacts = computed(() => {
  const c = current.value || {}
  return [
    { label: '性别', value: { male: '男', female: '女', unknown: '未填写' }[c.gender] || '—' },
    { label: '年龄', value: ageOf(c.birthday) },
    { label: '家长', value: c.guardian_name || '—' },
    { label: '联系电话', value: c.guardian_phone || c.phone || '—' },
    { label: '学校', value: c.school || '—' },
    { label: '年级', value: c.grade || '—' },
    { label: '当前水平', value: c.level || '—' },
    { label: '加入时间', value: formatDate(c.joined_at) },
  ]
})

function ageOf(birthday) {
  if (!birthday) return '—'
  const d = new Date(birthday)
  if (Number.isNaN(d.getTime())) return '—'
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1
  return age >= 0 && age < 120 ? `${age} 岁` : '—'
}

async function load() {
  loading.value = true
  try {
    const { items, total: count } = await listStudents({ ...filters, page: page.value, pageSize })
    students.value = items
    total.value = count
  } catch (err) {
    toast.error(err.message)
    students.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function loadCounts() {
  try {
    const [all, active, paused, graduated, left] = await Promise.all([
      listStudents({ paged: false }),
      listStudents({ status: 'active', paged: false }),
      listStudents({ status: 'paused', paged: false }),
      listStudents({ status: 'graduated', paged: false }),
      listStudents({ status: 'left', paged: false }),
    ])
    counts.total = all.total
    counts.active = active.total
    counts.paused = paused.total
    counts.ended = graduated.total + left.total
  } catch {
    // 忽略
  }
}

function applyFilters() {
  page.value = 1
  load()
}

function resetFilters() {
  filters.keyword = ''
  filters.status = ''
  filters.level = ''
  applyFilters()
}

function openForm(student) {
  editing.value = student
  errorMsg.value = ''
  Object.assign(form, blank())
  if (student) {
    for (const key of Object.keys(form)) {
      if (student[key] !== undefined && student[key] !== null) form[key] = student[key]
    }
  }
  formOpen.value = true
}

async function save() {
  errorMsg.value = ''
  if (!form.name.trim()) {
    errorMsg.value = '请填写学员姓名'
    return
  }
  saving.value = true
  try {
    const payload = { ...form, name: form.name.trim() }
    for (const key of ['birthday', 'joined_at', 'nickname', 'phone', 'guardian_name', 'guardian_phone', 'school', 'grade', 'level', 'source', 'notes']) {
      if (payload[key] === '') payload[key] = null
    }
    if (editing.value) {
      await updateStudent(editing.value.id, payload)
      toast.success('学员信息已保存')
    } else {
      await createStudent(payload)
      toast.success('学员已新增')
    }
    formOpen.value = false
    await Promise.all([load(), loadCounts()])
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    saving.value = false
  }
}

async function remove(student) {
  const ok = await dialog.confirm({
    title: '删除学员',
    message: `确认删除「${student.name}」吗？其班级关联与成绩记录也会一并删除，且不可恢复。`,
    confirmText: '删除',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteStudent(student.id)
    toast.success('学员已删除')
    await Promise.all([load(), loadCounts()])
  } catch (err) {
    toast.error(err.message)
  }
}

async function openDetail(student) {
  current.value = student
  detailOpen.value = true
  detailLoading.value = true
  try {
    const tasks = [listStudentClasses(student.id)]
    tasks.push(auth.can('grade.view') ? listStudentGrades(student.id) : Promise.resolve([]))
    const [classes, grades] = await Promise.all(tasks)
    studentClasses.value = classes
    studentGrades.value = grades
  } catch (err) {
    toast.error(err.message)
    studentClasses.value = []
    studentGrades.value = []
  } finally {
    detailLoading.value = false
  }
}

watch(page, load)
onMounted(() => {
  load()
  loadCounts()
})
</script>
