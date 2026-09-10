<template>
  <div>
    <PageHeader title="开班管理" description="排课、分配授课老师、管理班级名单">
      <UiButton v-if="canManage" variant="primary" @click="openForm(null)">
        <template #icon><Plus class="size-4" /></template>
        新建班级
      </UiButton>
    </PageHeader>

    <div class="fc-container py-7">
      <div class="fc-card flex flex-wrap items-center gap-2.5 p-3.5">
        <div class="relative min-w-[200px] flex-1">
          <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
          <input v-model="filters.keyword" class="fc-input pl-9.5" placeholder="搜索班级名称" @keyup.enter="load" />
        </div>
        <select v-model="filters.courseId" class="fc-input w-auto min-w-[180px]" @change="load">
          <option value="">全部课程</option>
          <option v-for="c in courseOptions" :key="c.id" :value="c.id">{{ c.title }}</option>
        </select>
        <select v-model="filters.status" class="fc-input w-auto min-w-[120px]" @change="load">
          <option value="">全部状态</option>
          <option v-for="(v, k) in CLASS_STATUS" :key="k" :value="k">{{ v.label }}</option>
        </select>
        <UiButton variant="outline" @click="resetFilters">
          <template #icon><RotateCcw class="size-3.5" /></template>
          重置
        </UiButton>
      </div>

      <div v-if="loading" class="fc-card mt-5"><UiLoading text="正在加载班级…" /></div>

      <div v-else-if="classes.length" class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="c in classes" :key="c.id" class="fc-card flex flex-col p-4.5 transition hover:shadow-lift">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="truncate text-[15px] font-semibold text-ink-900">{{ c.name }}</h3>
              <p class="mt-0.5 truncate text-[12.5px] text-ink-500">{{ c.course?.title || '未关联课程' }}</p>
            </div>
            <UiBadge :label="CLASS_STATUS[c.status]?.label" :custom-class="CLASS_STATUS[c.status]?.style" />
          </div>

          <dl class="mt-3.5 space-y-1.5 text-[12.5px]">
            <div class="flex items-center gap-1.5 text-ink-600">
              <CalendarDays class="size-3.5 text-ink-400" />
              {{ scheduleText(c) }}
            </div>
            <div class="flex items-center gap-1.5 text-ink-600">
              <MapPin class="size-3.5 text-ink-400" />
              {{ c.room || '未指定教室' }}
            </div>
            <div class="flex items-center gap-1.5 text-ink-600">
              <UserCog class="size-3.5 text-ink-400" />
              {{ c.teacher?.full_name || '未指定老师' }}
            </div>
          </dl>

          <div class="mt-3.5 flex items-center gap-2">
            <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
              <div
                class="h-full rounded-full transition-all"
                :class="c.member_count >= c.capacity ? 'bg-red-400' : 'bg-brand-500'"
                :style="{ width: `${Math.min(100, (c.member_count / Math.max(1, c.capacity)) * 100)}%` }"
              />
            </div>
            <span class="text-[11.5px] text-ink-500 tabular-nums">{{ c.member_count }}/{{ c.capacity }}</span>
          </div>

          <div class="mt-3.5 flex items-center gap-2 border-t border-ink-100 pt-3">
            <UiButton size="sm" variant="outline" @click="openMembers(c)">
              <template #icon><Users class="size-3.5" /></template>
              班级名单
            </UiButton>
            <template v-if="canManage">
              <UiButton size="sm" variant="ghost" @click="openForm(c)">
                <template #icon><Pencil class="size-3.5" /></template>
              </UiButton>
              <UiButton size="sm" variant="ghost" @click="remove(c)">
                <template #icon><Trash2 class="size-3.5 text-red-500" /></template>
              </UiButton>
            </template>
          </div>
        </div>
      </div>

      <div v-else class="fc-card mt-5">
        <UiEmpty :icon="GraduationCap" title="还没有班级" description="创建班级后，可以把学员加入名单并安排授课老师。">
          <UiButton v-if="canManage" variant="primary" @click="openForm(null)">
            <template #icon><Plus class="size-4" /></template>
            新建班级
          </UiButton>
        </UiEmpty>
      </div>
    </div>

    <!-- 班级表单 -->
    <UiModal :open="formOpen" :title="editing ? '编辑班级' : '新建班级'" width="lg" @close="formOpen = false">
      <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="save">
        <UiField label="班级名称" required class="sm:col-span-2">
          <input v-model="form.name" class="fc-input" placeholder="例：周六上午启蒙班" required />
        </UiField>

        <UiField label="关联课程">
          <select v-model="form.course_id" class="fc-input">
            <option value="">未关联</option>
            <option v-for="c in courseOptions" :key="c.id" :value="c.id">{{ c.title }}</option>
          </select>
        </UiField>

        <UiField label="授课老师">
          <select v-model="form.teacher_id" class="fc-input">
            <option value="">未指定</option>
            <option v-for="t in teacherOptions" :key="t.id" :value="t.id">
              {{ t.full_name || t.email }}（{{ roleLabel(t.role_code) }}）
            </option>
          </select>
        </UiField>

        <UiField label="上课星期">
          <select v-model.number="form.weekday" class="fc-input">
            <option :value="null">未指定</option>
            <option v-for="d in WEEKDAYS" :key="d.value" :value="d.value">{{ d.label }}</option>
          </select>
        </UiField>

        <UiField label="教室">
          <input v-model="form.room" class="fc-input" placeholder="例：一号教室" />
        </UiField>

        <UiField label="开始时间">
          <input v-model="form.start_time" type="time" class="fc-input" />
        </UiField>
        <UiField label="结束时间">
          <input v-model="form.end_time" type="time" class="fc-input" />
        </UiField>

        <UiField label="开班日期">
          <input v-model="form.start_date" type="date" class="fc-input" />
        </UiField>
        <UiField label="结班日期">
          <input v-model="form.end_date" type="date" class="fc-input" />
        </UiField>

        <UiField label="班级容量">
          <input v-model.number="form.capacity" type="number" min="1" max="50" class="fc-input" />
        </UiField>
        <UiField label="班级状态">
          <select v-model="form.status" class="fc-input">
            <option v-for="(v, k) in CLASS_STATUS" :key="k" :value="k">{{ v.label }}</option>
          </select>
        </UiField>

        <div class="sm:col-span-2">
          <UiField label="备注">
            <textarea v-model="form.notes" class="fc-input" rows="2" placeholder="上课须知、家长沟通要点…" />
          </UiField>
        </div>

        <p v-if="errorMsg" class="sm:col-span-2 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
          {{ errorMsg }}
        </p>
      </form>

      <template #footer>
        <UiButton variant="outline" @click="formOpen = false">取消</UiButton>
        <UiButton variant="primary" :loading="saving" @click="save">{{ editing ? '保存修改' : '创建班级' }}</UiButton>
      </template>
    </UiModal>

    <!-- 班级名单 -->
    <UiModal
      :open="membersOpen"
      :title="`${memberClass?.name || ''} · 班级名单`"
      :subtitle="memberClass ? `${memberClass.course?.title || '未关联课程'} · ${memberClass.member_count}/${memberClass.capacity} 人` : ''"
      width="lg"
      @close="membersOpen = false"
    >
      <div v-if="membersLoading" class="py-8"><UiLoading text="正在加载名单…" /></div>
      <div v-else class="space-y-4">
        <div v-if="canManage" class="flex flex-wrap items-center gap-2">
          <select v-model="addStudentId" class="fc-input min-w-[240px] flex-1">
            <option value="">选择要加入班级的学员…</option>
            <option v-for="s in availableStudents" :key="s.id" :value="s.id">
              {{ s.name }}{{ s.level ? `（${s.level}）` : '' }}
            </option>
          </select>
          <UiButton variant="primary" :disabled="!addStudentId" :loading="adding" @click="addMember">
            <template #icon><UserPlus class="size-3.5" /></template>
            加入班级
          </UiButton>
        </div>

        <div v-if="members.length" class="overflow-hidden rounded-xl border border-ink-200">
          <table class="w-full text-left text-[13px]">
            <thead class="border-b border-ink-200 bg-ink-50 text-[11.5px] text-ink-500">
              <tr>
                <th class="px-3.5 py-2.5 font-medium">学员</th>
                <th class="px-3.5 py-2.5 font-medium">水平</th>
                <th class="px-3.5 py-2.5 font-medium">加入日期</th>
                <th class="px-3.5 py-2.5 font-medium">状态</th>
                <th v-if="canManage" class="px-3.5 py-2.5 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ink-100">
              <tr v-for="m in members" :key="m.id">
                <td class="px-3.5 py-2.5">
                  <div class="flex items-center gap-2.5">
                    <UiAvatar :name="m.student?.name" size="xs" />
                    <span class="font-medium text-ink-800">{{ m.student?.name }}</span>
                  </div>
                </td>
                <td class="px-3.5 py-2.5 text-ink-600">{{ m.student?.level || '—' }}</td>
                <td class="px-3.5 py-2.5 text-ink-600">{{ formatDate(m.joined_at) }}</td>
                <td class="px-3.5 py-2.5">
                  <UiBadge
                    :label="m.status === 'active' ? '在读' : '已退出'"
                    :custom-class="m.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-ink-100 text-ink-600 border-ink-200'"
                  />
                </td>
                <td v-if="canManage" class="px-3.5 py-2.5 text-right">
                  <button
                    class="rounded-lg p-1.5 text-ink-400 transition hover:bg-red-50 hover:text-red-500"
                    title="移出班级"
                    @click="removeMember(m)"
                  >
                    <UserMinus class="size-3.5" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-else class="py-6 text-center text-[13px] text-ink-400">该班级还没有学员</p>
      </div>
    </UiModal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  CalendarDays,
  GraduationCap,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserCog,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import UiButton from '@/components/UiButton.vue'
import UiBadge from '@/components/UiBadge.vue'
import UiAvatar from '@/components/UiAvatar.vue'
import UiEmpty from '@/components/UiEmpty.vue'
import UiLoading from '@/components/UiLoading.vue'
import UiModal from '@/components/UiModal.vue'
import UiField from '@/components/UiField.vue'
import {
  listClasses,
  createClass,
  updateClass,
  deleteClass,
  listClassMembers,
  addClassMembers,
  removeClassMember,
} from '@/api/classes'
import { listCourseOptions } from '@/api/courses'
import { listTeacherOptions } from '@/api/users'
import { listStudentOptions } from '@/api/students'
import { CLASS_STATUS, WEEKDAYS, weekdayLabel } from '@/lib/dict'
import { formatDate, formatTime } from '@/lib/format'
import { roleLabel } from '@/lib/permissions'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useDialogStore } from '@/stores/dialog'

const auth = useAuthStore()
const toast = useToastStore()
const dialog = useDialogStore()

const canManage = computed(() => auth.can('class.manage'))

const classes = ref([])
const loading = ref(true)
const filters = reactive({ keyword: '', status: '', courseId: '' })

const courseOptions = ref([])
const teacherOptions = ref([])
const studentOptions = ref([])

const formOpen = ref(false)
const editing = ref(null)
const saving = ref(false)
const errorMsg = ref('')

const membersOpen = ref(false)
const memberClass = ref(null)
const members = ref([])
const membersLoading = ref(false)
const addStudentId = ref('')
const adding = ref(false)

const blank = () => ({
  name: '',
  course_id: '',
  teacher_id: '',
  room: '',
  weekday: null,
  start_time: '',
  end_time: '',
  start_date: '',
  end_date: '',
  capacity: 8,
  status: 'planning',
  notes: '',
})

const form = reactive(blank())

const availableStudents = computed(() => {
  const joined = new Set(members.value.map((m) => m.student?.id))
  return studentOptions.value.filter((s) => !joined.has(s.id))
})

function scheduleText(c) {
  const day = c.weekday ? weekdayLabel(c.weekday) : ''
  const time = c.start_time ? `${formatTime(c.start_time)}${c.end_time ? `-${formatTime(c.end_time)}` : ''}` : ''
  const range = c.start_date ? `${formatDate(c.start_date)} 起` : ''
  const parts = [day, time, range].filter(Boolean)
  return parts.length ? parts.join(' · ') : '未安排时间'
}

async function load() {
  loading.value = true
  try {
    const { items } = await listClasses(filters)
    classes.value = items
  } catch (err) {
    toast.error(err.message)
    classes.value = []
  } finally {
    loading.value = false
  }
}

async function loadOptions() {
  try {
    const tasks = [listCourseOptions()]
    tasks.push(auth.can('user.manage') ? listTeacherOptions() : Promise.resolve([]))
    tasks.push(auth.can('student.view') ? listStudentOptions() : Promise.resolve([]))
    const [courses, teachers, studentList] = await Promise.all(tasks)
    courseOptions.value = courses
    teacherOptions.value = teachers
    studentOptions.value = studentList
  } catch {
    // 选项加载失败不阻断页面
  }
}

function resetFilters() {
  filters.keyword = ''
  filters.status = ''
  filters.courseId = ''
  load()
}

function openForm(item) {
  editing.value = item
  errorMsg.value = ''
  Object.assign(form, blank())
  if (item) {
    Object.assign(form, {
      name: item.name,
      course_id: item.course_id || item.course?.id || '',
      teacher_id: item.teacher_id || item.teacher?.id || '',
      room: item.room || '',
      weekday: item.weekday ?? null,
      start_time: item.start_time || '',
      end_time: item.end_time || '',
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      capacity: item.capacity || 8,
      status: item.status || 'planning',
      notes: item.notes || '',
    })
  }
  formOpen.value = true
}

async function save() {
  errorMsg.value = ''
  if (!form.name.trim()) {
    errorMsg.value = '请填写班级名称'
    return
  }
  saving.value = true
  try {
    const payload = { ...form, name: form.name.trim() }
    for (const key of ['course_id', 'teacher_id', 'room', 'start_time', 'end_time', 'start_date', 'end_date', 'notes']) {
      if (payload[key] === '') payload[key] = null
    }
    if (payload.weekday === '' || payload.weekday === undefined) payload.weekday = null

    if (editing.value) {
      await updateClass(editing.value.id, payload)
      toast.success('班级已保存')
    } else {
      await createClass(payload)
      toast.success('班级已创建')
    }
    formOpen.value = false
    load()
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    saving.value = false
  }
}

async function remove(item) {
  const ok = await dialog.confirm({
    title: '删除班级',
    message: `确认删除「${item.name}」吗？班级名单会一并清除。`,
    confirmText: '删除',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteClass(item.id)
    toast.success('班级已删除')
    load()
  } catch (err) {
    toast.error(err.message)
  }
}

async function openMembers(item) {
  memberClass.value = item
  membersOpen.value = true
  membersLoading.value = true
  addStudentId.value = ''
  try {
    members.value = await listClassMembers(item.id)
  } catch (err) {
    toast.error(err.message)
    members.value = []
  } finally {
    membersLoading.value = false
  }
}

async function addMember() {
  if (!addStudentId.value) return
  adding.value = true
  try {
    await addClassMembers(memberClass.value.id, [addStudentId.value])
    toast.success('学员已加入班级')
    addStudentId.value = ''
    members.value = await listClassMembers(memberClass.value.id)
    await refreshMemberCount()
  } catch (err) {
    toast.error(err.message)
  } finally {
    adding.value = false
  }
}

async function removeMember(member) {
  const ok = await dialog.confirm({
    title: '移出班级',
    message: `确认把「${member.student?.name}」移出该班级吗？`,
    confirmText: '移出',
    danger: true,
  })
  if (!ok) return
  try {
    await removeClassMember(member.id)
    toast.success('已移出班级')
    members.value = await listClassMembers(memberClass.value.id)
    await refreshMemberCount()
  } catch (err) {
    toast.error(err.message)
  }
}

async function refreshMemberCount() {
  const { items } = await listClasses(filters)
  classes.value = items
  const updated = items.find((c) => c.id === memberClass.value?.id)
  if (updated) memberClass.value = updated
}

onMounted(() => {
  load()
  loadOptions()
})
</script>
