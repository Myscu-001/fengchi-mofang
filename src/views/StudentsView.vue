<template>
  <div>
    <PageHeader title="学员档案" description="一人一档，记录学员基础信息、状态与成绩轨迹">
      <!-- 导入 / 导出是电脑上整理数据的活儿，手机端只用「新增学员」，页头保持清爽 -->
      <UiButton v-if="canView" variant="outline" class="max-lg:hidden" @click="exportStudents">
        <template #icon><Download class="size-4" /></template>
        导出
      </UiButton>
      <UiButton v-if="canManage" variant="outline" class="max-lg:hidden" @click="ioOpen = true">
        <template #icon><Upload class="size-4" /></template>
        导入
      </UiButton>
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
            type="search"
            enterkeyhint="search"
            class="fc-input pl-9.5"
            placeholder="搜索姓名、昵称、家长姓名或电话"
            @input="onKeywordInput"
            @keyup.enter="onKeywordEnter"
          />
        </div>

        <!-- 桌面端：原生下拉，鼠标操作最顺 -->
        <select v-model="filters.status" class="fc-input w-auto min-w-[120px] max-lg:hidden" @change="applyFilters">
          <option value="">全部状态</option>
          <option v-for="o in STUDENT_STATUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <select v-model="filters.level" class="fc-input w-auto min-w-[120px] max-lg:hidden" @change="applyFilters">
          <option value="">全部水平</option>
          <option v-for="l in STUDENT_LEVEL_OPTIONS" :key="l" :value="l">{{ l }}</option>
        </select>

        <!-- 手机端：一个「筛选」按钮拉起抽屉。
             原生 select 在 App 的 WebView 里点击后会弹出空白列表，这里彻底不用它。 -->
        <button
          type="button"
          class="ui-f-btn lg:hidden"
          :class="activeFilterCount ? 'ui-f-btn--on' : ''"
          @click="filterOpen = true"
        >
          <SlidersHorizontal class="size-4" />
          筛选
          <span v-if="activeFilterCount" class="ui-f-badge">{{ activeFilterCount }}</span>
        </button>

        <UiButton variant="outline" class="max-lg:hidden" @click="resetFilters">
          <template #icon><RotateCcw class="size-3.5" /></template>
          重置
        </UiButton>
      </div>

      <div class="fc-card mt-5 overflow-hidden">
        <UiLoading v-if="loading" text="正在加载学员…" />

        <template v-else-if="students.length">
          <!-- 桌面端：完整表格（手机端由下方卡片列表接管，表格直接隐藏） -->
          <div class="hidden overflow-x-auto lg:block">
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
                <tr
                  v-for="s in students"
                  :key="s.id"
                  class="cursor-pointer transition hover:bg-ink-50/70"
                  @click="openDetail(s)"
                >
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

          <!-- 手机端：卡片列表。头像 + 姓名 + 状态徽章，姓名下面一行灰色小字（小名 / 年龄 / 段位）
               用来分辨重名；整行点进学员自己的页面，编辑 / 删除等操作统一收进学员详情页，列表不再误触。 -->
          <ul class="divide-y divide-ink-100 lg:hidden">
            <li
              v-for="s in students"
              :key="s.id"
              class="flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors active:bg-ink-50"
              @click="openDetail(s)"
            >
              <UiAvatar :src="s.avatar_url" :name="s.name" size="md" />

              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <p class="truncate text-[15px] font-semibold text-ink-900">{{ s.name }}</p>
                  <UiBadge
                    :label="STUDENT_STATUS[s.status]?.label"
                    :custom-class="STUDENT_STATUS[s.status]?.style"
                  />
                </div>

                <p v-if="sublineOf(s)" class="mt-0.5 truncate text-[12px] text-ink-400">
                  {{ sublineOf(s) }}
                </p>
              </div>

              <ChevronRight class="size-4.5 flex-none text-ink-300" />
            </li>
          </ul>
        </template>

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

      <!-- 底部：左侧「切换显示」按钮 + 右侧翻页。开启切换显示后不分页，所有学员铺在同一页里 -->
      <div v-if="total > pageSize || showAll" class="mt-5 flex flex-wrap items-center justify-center gap-3">
        <UiButton :variant="showAll ? 'primary' : 'outline'" @click="toggleShowAll">
          <template #icon><Layers class="size-4" /></template>
          切换显示
        </UiButton>
        <UiPagination v-if="!showAll" v-model:page="page" :page-size="pageSize" :total="total" />
        <span v-else class="text-sm text-ink-500">已显示全部 {{ total }} 名学员</span>
      </div>
    </div>

    <!-- 手机端筛选抽屉：点选即生效（抽屉保持打开，方便连着改两项），点「完成」收起 -->
    <UiSheet
      :open="filterOpen"
      title="筛选学员"
      subtitle="点选后立即生效"
      @close="filterOpen = false"
    >
      <div class="px-4 pt-1 pb-5">
        <p class="ui-f-title">学员状态</p>
        <div class="ui-f-chips">
          <button
            v-for="o in STATUS_FILTER_OPTIONS"
            :key="o.value"
            type="button"
            class="ui-f-chip"
            :class="filters.status === o.value ? 'ui-f-chip--on' : ''"
            @click="setFilter('status', o.value)"
          >
            {{ o.label }}
          </button>
        </div>

        <p class="ui-f-title mt-5">当前水平</p>
        <div class="ui-f-chips">
          <button
            v-for="o in LEVEL_FILTER_OPTIONS"
            :key="o.value"
            type="button"
            class="ui-f-chip"
            :class="filters.level === o.value ? 'ui-f-chip--on' : ''"
            @click="setFilter('level', o.value)"
          >
            {{ o.label }}
          </button>
        </div>

        <div class="mt-6 flex gap-3">
          <UiButton variant="outline" block :disabled="!activeFilterCount" @click="resetFilterDrawer">
            重置
          </UiButton>
          <UiButton variant="primary" block @click="filterOpen = false">完成</UiButton>
        </div>
      </div>
    </UiSheet>

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
          <select v-model="form.gender" class="fc-input max-lg:hidden">
            <option value="unknown">未填写</option>
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
          <UiSelectSheet
            v-model="form.gender"
            class="lg:hidden"
            title="选择性别"
            :options="GENDER_OPTIONS"
          />
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
          <select v-model="form.status" class="fc-input max-lg:hidden">
            <option v-for="o in STUDENT_STATUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <UiSelectSheet
            v-model="form.status"
            class="lg:hidden"
            title="选择学员状态"
            :options="STUDENT_STATUS_OPTIONS"
          />
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

    <!-- 批量导入 / 导出 -->
    <ImportExportModal :open="ioOpen" @close="ioOpen = false" @imported="onImported" />

    <!-- 学员档案详情已迁移至独立的学员子页面（StudentDetailView） -->
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  ChevronRight,
  Download,
  Eye,
  Layers,
  PauseCircle,
  Pencil,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
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
import UiSheet from '@/components/UiSheet.vue'
import UiSelectSheet from '@/components/UiSelectSheet.vue'
import UiPagination from '@/components/UiPagination.vue'
import ImportExportModal from '@/components/ImportExportModal.vue'
import {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  buildStudentCsv,
} from '@/api/students'
import { STUDENT_STATUS, STUDENT_STATUS_OPTIONS, STUDENT_LEVEL_OPTIONS } from '@/lib/dict'
import { formatDate } from '@/lib/format'
import { downloadCsv } from '@/lib/csv'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useDialogStore } from '@/stores/dialog'
import { recordAudit } from '@/lib/audit'

const auth = useAuthStore()
const toast = useToastStore()
const dialog = useDialogStore()

const canManage = computed(() => auth.can('student.manage'))
const canView = computed(() => auth.can('student.view'))

const students = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 15
const showAll = ref(false)
const loading = ref(true)
const filters = reactive({ keyword: '', status: '', level: '' })
const filterOpen = ref(false)
const counts = reactive({ total: 0, active: 0, paused: 0, ended: 0 })

/* 手机端筛选抽屉 / 抽屉式选择器的选项（第一项是「全部」，value 为空串） */
const GENDER_OPTIONS = [
  { value: 'unknown', label: '未填写' },
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
]
const STATUS_FILTER_OPTIONS = [{ value: '', label: '全部状态' }, ...STUDENT_STATUS_OPTIONS]
const LEVEL_FILTER_OPTIONS = [
  { value: '', label: '全部水平' },
  ...STUDENT_LEVEL_OPTIONS.map((l) => ({ value: l, label: l })),
]
const activeFilterCount = computed(() => (filters.status ? 1 : 0) + (filters.level ? 1 : 0))

const formOpen = ref(false)
const editing = ref(null)
const saving = ref(false)
const errorMsg = ref('')
const ioOpen = ref(false)

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

/* 手机卡片里姓名下面那行灰色小字：小名 / 年龄 / 段位，有哪个显示哪个（都没有就不占地方）。
   只取这三样 —— 家长、学校之类的在详情页看，列表一行小字够分辨重名就行。 */
function sublineOf(s) {
  const age = s.birthday ? ageOf(s.birthday) : ''
  return [s.nickname, age && age !== '—' ? `${age} 岁` : '', s.level]
    .filter(Boolean)
    .join(' · ')
}

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

/* 连点筛选项 / 快速打字时会有多个请求同时在飞：用序号丢弃过期响应，
   防止先发的旧结果后到、把新结果覆盖掉。 */
let loadSeq = 0

async function load() {
  const seq = ++loadSeq
  loading.value = true
  try {
    /* 开启「切换显示」时不再分页，一次取回全部学员 */
    const { items, total: count } = await listStudents({
      ...filters,
      page: page.value,
      pageSize,
      paged: !showAll.value,
    })
    if (seq !== loadSeq) return
    students.value = items
    total.value = count
  } catch (err) {
    if (seq !== loadSeq) return
    toast.error(err.message)
    students.value = []
    total.value = 0
  } finally {
    if (seq === loadSeq) loading.value = false
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

function toggleShowAll() {
  showAll.value = !showAll.value
  page.value = 1
  load()
}

function applyFilters() {
  /* page 被 watch 监听：只有已经停在第 1 页时才需要手动 load，
     否则改 page 本身就会触发一次，再手动打一次就白费一个来回（新加坡节点 200~400ms） */
  if (page.value === 1) load()
  else page.value = 1
}

/* 手机端搜索：输入即搜（350ms 防抖）。安卓软键盘上按「搜索」键不一定触发 keyup.enter，
   光靠回车是搜不出来的 —— 这是之前搜不到人的根因。 */
let keywordTimer = null

function onKeywordInput() {
  clearTimeout(keywordTimer)
  keywordTimer = setTimeout(applyFilters, 350)
}

function onKeywordEnter() {
  clearTimeout(keywordTimer)
  applyFilters()
}

/* 手机端筛选抽屉：点一项立即生效（抽屉留着，方便连着改状态和水平） */
function setFilter(key, value) {
  if (filters[key] === value) return
  filters[key] = value
  applyFilters()
}

function resetFilterDrawer() {
  filters.status = ''
  filters.level = ''
  applyFilters()
}

function exportStudents() {
  const csv = buildStudentCsv(students.value)
  downloadCsv(`学员花名册_${formatDate(new Date())}.csv`, csv)
  toast.success('已导出学员花名册')
}

function onImported() {
  load()
  loadCounts()
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
      recordAudit({
        action: 'update',
        targetType: 'student',
        targetId: editing.value.id,
        summary: `修改学员档案「${payload.name}」`,
      })
      toast.success('学员信息已保存')
    } else {
      const created = await createStudent(payload)
      recordAudit({
        action: 'create',
        targetType: 'student',
        targetId: created?.id,
        summary: `新增学员「${payload.name}」`,
      })
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
    recordAudit({
      action: 'delete',
      targetType: 'student',
      targetId: student.id,
      summary: `删除学员「${student.name}」`,
    })
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

/* 离开页面时把还没落地的防抖定时器清掉，避免对已卸载的页面发请求 */
onBeforeUnmount(() => clearTimeout(keywordTimer))
</script>

<style scoped>
/* 类名独占 ui-f-* 前缀（筛选按钮 / 抽屉分组 / 选项 chip），绝不与全局样式撞名 */

/* 手机端「筛选」按钮：长得像输入框，但它是 button，点了不会唤起软键盘 */
.ui-f-btn {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 6px;
  min-height: 42px;
  padding: 9px 14px;
  border: 1px solid var(--color-ink-200, #e3e5e2);
  border-radius: var(--radius-field, 10px);
  background: #fff;
  font-size: 14px;
  color: var(--color-ink-700, #3d4239);
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    color 0.15s ease;
}
.ui-f-btn:active {
  background: var(--color-ink-50, #f7f8f6);
}
.ui-f-btn--on {
  border-color: var(--color-brand-500, #e8564f);
  background: var(--color-brand-50, #fdf1f0);
  color: var(--color-brand-700, #b93a33);
  font-weight: 600;
}
.ui-f-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 17px;
  height: 17px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--color-brand-600, #d4453c);
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}

/* 抽屉里的分组标题与选项 chip */
.ui-f-title {
  margin: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-ink-500, #6b7069);
}
.ui-f-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.ui-f-chip {
  min-height: 38px;
  padding: 8px 15px;
  border: 1px solid var(--color-ink-200, #e3e5e2);
  border-radius: 999px;
  background: #fff;
  font-size: 13.5px;
  color: var(--color-ink-700, #3d4239);
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    color 0.15s ease,
    transform 0.1s ease;
}
.ui-f-chip:active {
  transform: scale(0.97);
}
.ui-f-chip--on {
  border-color: var(--color-brand-500, #e8564f);
  background: var(--color-brand-50, #fdf1f0);
  color: var(--color-brand-700, #b93a33);
  font-weight: 600;
}
</style>
