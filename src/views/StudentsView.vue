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
              <tr v-for="s in students" :key="s.id" class="cursor-pointer transition hover:bg-ink-50/70" @click="openDetail(s)">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2.5">
                    <UiAvatar :src="s.avatar_url" :name="s.name" size="sm" />
                    <div class="min-w-0">
                      <p class="truncate font-medium text-ink-800 group-hover:text-brand-700">{{ s.name }}</p>
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
                  <div class="flex justify-end gap-1" @click.stop>
                    <RouterLink
                      :to="{ name: 'student-detail', params: { id: s.id } }"
                      class="rounded-lg p-1.5 text-ink-400 transition hover:bg-brand-50 hover:text-brand-600"
                      title="查看完整档案 / 魔方成绩"
                    >
                      <Eye class="size-3.5" />
                    </RouterLink>
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

    <!-- 学员档案详情已迁移至独立的学员子页面（StudentDetailView） -->
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
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
} from '@/api/students'
import { STUDENT_STATUS, STUDENT_STATUS_OPTIONS, STUDENT_LEVEL_OPTIONS } from '@/lib/dict'
import { formatDate } from '@/lib/format'
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

const router = useRouter()

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

function openDetail(s) {
  router.push({ name: 'student-detail', params: { id: s.id } })
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

watch(page, load)
onMounted(() => {
  load()
  loadCounts()
})
</script>
