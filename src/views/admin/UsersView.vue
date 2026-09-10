<template>
  <div>
    <PageHeader title="账号管理" description="开通教师账号、分配角色与停用账号，本系统不开放自助注册">
      <UiButton variant="primary" @click="openCreate">
        <template #icon><UserPlus class="size-4" /></template>
        开通账号
      </UiButton>
    </PageHeader>

    <div class="fc-container py-7">
      <div class="grid grid-cols-3 gap-3.5">
        <UiStat label="员工总数" :value="stats.total" :icon="Users" tone="brand" />
        <UiStat label="正常使用" :value="stats.active" :icon="UserCheck" tone="green" />
        <UiStat label="超级管理员" :value="stats.admins" :icon="Crown" tone="orange" />
      </div>

      <div class="fc-card mt-5 flex flex-wrap items-center gap-2.5 p-3.5">
        <div class="relative min-w-[200px] flex-1">
          <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
          <input v-model="filters.keyword" class="fc-input pl-9.5" placeholder="搜索姓名、邮箱或电话" @keyup.enter="applyFilters" />
        </div>
        <select v-model="filters.role" class="fc-input w-auto min-w-[130px]" @change="applyFilters">
          <option value="">全部角色</option>
          <option v-for="r in roles" :key="r.code" :value="r.code">{{ r.name }}</option>
        </select>
        <select v-model="filters.status" class="fc-input w-auto min-w-[120px]" @change="applyFilters">
          <option value="">全部状态</option>
          <option value="active">正常</option>
          <option value="disabled">已停用</option>
        </select>
        <UiButton variant="outline" @click="resetFilters">
          <template #icon><RotateCcw class="size-3.5" /></template>
          重置
        </UiButton>
      </div>

      <div class="fc-card mt-5 overflow-hidden">
        <UiLoading v-if="loading" text="正在加载员工…" />

        <div v-else-if="staff.length" class="overflow-x-auto">
          <table class="w-full min-w-[900px] text-left text-[13px]">
            <thead class="border-b border-ink-200 bg-ink-50 text-[12px] text-ink-500">
              <tr>
                <th class="px-4 py-3 font-medium">员工</th>
                <th class="px-4 py-3 font-medium">角色</th>
                <th class="px-4 py-3 font-medium">状态</th>
                <th class="px-4 py-3 font-medium">联系电话</th>
                <th class="px-4 py-3 font-medium">开通时间</th>
                <th class="px-4 py-3 font-medium">最近登录</th>
                <th class="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ink-100">
              <tr v-for="s in staff" :key="s.id" class="transition hover:bg-ink-50/70">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2.5">
                    <UiAvatar :src="s.avatar_url" :name="s.full_name" size="sm" />
                    <div class="min-w-0">
                      <p class="truncate font-medium text-ink-800">
                        {{ s.full_name || '未填写姓名' }}
                        <span v-if="s.id === auth.user?.id" class="ml-1 text-[11px] text-brand-600">（我）</span>
                      </p>
                      <p class="truncate text-[11.5px] text-ink-400">{{ s.email }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <UiBadge :label="roleLabel(s.role_code)" :custom-class="roleStyle(s.role_code)" />
                </td>
                <td class="px-4 py-3">
                  <UiBadge
                    :label="s.status === 'active' ? '正常' : '已停用'"
                    :custom-class="s.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'"
                  />
                </td>
                <td class="px-4 py-3 text-ink-600">{{ s.phone || '—' }}</td>
                <td class="px-4 py-3 text-ink-600">{{ formatDate(s.created_at) }}</td>
                <td class="px-4 py-3 text-ink-600">{{ relativeTime(s.last_login_at) }}</td>
                <td class="px-4 py-3">
                  <div class="flex justify-end gap-1">
                    <button
                      class="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                      title="编辑角色与资料"
                      @click="openEdit(s)"
                    >
                      <Pencil class="size-3.5" />
                    </button>
                    <button
                      class="rounded-lg p-1.5 text-ink-400 transition hover:bg-amber-50 hover:text-amber-600"
                      title="重置密码"
                      @click="openReset(s)"
                    >
                      <KeyRound class="size-3.5" />
                    </button>
                    <button
                      class="rounded-lg p-1.5 text-ink-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                      title="删除账号"
                      :disabled="s.id === auth.user?.id"
                      @click="remove(s)"
                    >
                      <Trash2 class="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <UiEmpty v-else :icon="Users" title="没有匹配的员工" description="换个关键词试试，或者开通一个新的教师账号。">
          <UiButton variant="primary" @click="openCreate">
            <template #icon><UserPlus class="size-4" /></template>
            开通账号
          </UiButton>
        </UiEmpty>
      </div>

      <div v-if="total > pageSize" class="mt-5">
        <UiPagination v-model:page="page" :page-size="pageSize" :total="total" />
      </div>
    </div>

    <!-- 开通账号 -->
    <UiModal :open="createOpen" title="开通教师账号" subtitle="系统不开放自助注册，账号由超级管理员统一创建" width="md" @close="createOpen = false">
      <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="submitCreate">
        <UiField label="登录邮箱" required class="sm:col-span-2">
          <input v-model="cForm.email" type="email" class="fc-input" placeholder="teacher@example.com" required />
        </UiField>
        <UiField label="姓名" required>
          <input v-model="cForm.full_name" class="fc-input" placeholder="真实姓名" required />
        </UiField>
        <UiField label="联系电话">
          <input v-model="cForm.phone" class="fc-input" placeholder="手机号" />
        </UiField>
        <UiField label="初始密码" required hint="至少 8 位，账号首次登录后会提示修改">
          <input v-model="cForm.password" type="text" class="fc-input font-mono" placeholder="例：Mofang2026" required />
        </UiField>
        <UiField label="职务 / 头衔">
          <input v-model="cForm.title" class="fc-input" placeholder="例：金牌教练" />
        </UiField>

        <div class="sm:col-span-2">
          <p class="mb-1.5 text-[13px] font-medium text-ink-700">分配角色 <span class="text-red-500">*</span></p>
          <div class="grid gap-2 sm:grid-cols-3">
            <label
              v-for="r in roles"
              :key="r.code"
              class="cursor-pointer rounded-xl border p-3 transition"
              :class="cForm.role_code === r.code ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:bg-ink-50'"
            >
              <input v-model="cForm.role_code" type="radio" :value="r.code" class="hidden" />
              <p class="text-[13px] font-medium text-ink-800">{{ r.name }}</p>
              <p class="mt-0.5 text-[11.5px] leading-relaxed text-ink-500">{{ r.description }}</p>
            </label>
          </div>
        </div>

        <p v-if="createError" class="sm:col-span-2 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
          {{ createError }}
        </p>
      </form>

      <template #footer>
        <UiButton variant="outline" @click="createOpen = false">取消</UiButton>
        <UiButton variant="primary" :loading="creating" @click="submitCreate">创建账号</UiButton>
      </template>
    </UiModal>

    <!-- 编辑 -->
    <UiModal :open="editOpen" :title="`编辑：${editTarget?.full_name || ''}`" width="md" @close="editOpen = false">
      <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="submitEdit">
        <UiField label="姓名" required>
          <input v-model="eForm.full_name" class="fc-input" required />
        </UiField>
        <UiField label="联系电话">
          <input v-model="eForm.phone" class="fc-input" />
        </UiField>
        <UiField label="职务 / 头衔">
          <input v-model="eForm.title" class="fc-input" />
        </UiField>
        <UiField label="账号状态">
          <select v-model="eForm.status" class="fc-input" :disabled="editTarget?.id === auth.user?.id">
            <option value="active">正常</option>
            <option value="disabled">停用</option>
          </select>
        </UiField>
        <UiField label="角色" class="sm:col-span-2" :hint="editTarget?.id === auth.user?.id ? '不能修改自己的角色' : ''">
          <select v-model="eForm.role_code" class="fc-input" :disabled="editTarget?.id === auth.user?.id">
            <option v-for="r in roles" :key="r.code" :value="r.code">{{ r.name }} · {{ r.description }}</option>
          </select>
        </UiField>
        <UiField label="个人简介" class="sm:col-span-2">
          <textarea v-model="eForm.bio" class="fc-input" rows="2" />
        </UiField>

        <p v-if="editError" class="sm:col-span-2 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
          {{ editError }}
        </p>
      </form>

      <template #footer>
        <UiButton variant="outline" @click="editOpen = false">取消</UiButton>
        <UiButton variant="primary" :loading="editing" @click="submitEdit">保存修改</UiButton>
      </template>
    </UiModal>

    <!-- 重置密码 -->
    <UiModal :open="resetOpen" title="重置密码" :subtitle="resetTarget?.full_name" width="sm" @close="resetOpen = false">
      <UiField label="新密码" required hint="重置后请通过安全方式告知该员工">
        <input v-model="resetPassword" type="text" class="fc-input font-mono" placeholder="至少 8 位" />
      </UiField>
      <div class="mt-3 flex gap-2">
        <UiButton size="sm" variant="outline" @click="generatePassword">
          <template #icon><Sparkles class="size-3.5" /></template>
          随机生成
        </UiButton>
      </div>
      <p v-if="resetError" class="mt-3 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
        {{ resetError }}
      </p>
      <template #footer>
        <UiButton variant="outline" @click="resetOpen = false">取消</UiButton>
        <UiButton variant="primary" :loading="resetting" @click="submitReset">确认重置</UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  Crown,
  KeyRound,
  Pencil,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
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
  listStaff,
  staffStats,
  createStaff,
  updateStaff,
  resetStaffPassword,
  deleteStaff,
  listRoles,
} from '@/api/users'
import { roleLabel, roleStyle } from '@/lib/permissions'
import { formatDate, relativeTime } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useDialogStore } from '@/stores/dialog'

const auth = useAuthStore()
const toast = useToastStore()
const dialog = useDialogStore()

const staff = ref([])
const roles = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 15
const loading = ref(true)
const stats = reactive({ total: 0, active: 0, admins: 0 })
const filters = reactive({ keyword: '', role: '', status: '' })

const createOpen = ref(false)
const creating = ref(false)
const createError = ref('')
const cForm = reactive({ email: '', password: '', full_name: '', phone: '', title: '', role_code: 'teacher' })

const editOpen = ref(false)
const editing = ref(false)
const editError = ref('')
const editTarget = ref(null)
const eForm = reactive({ full_name: '', phone: '', title: '', bio: '', role_code: 'teacher', status: 'active' })

const resetOpen = ref(false)
const resetting = ref(false)
const resetError = ref('')
const resetTarget = ref(null)
const resetPassword = ref('')

async function load() {
  loading.value = true
  try {
    const { items, total: count } = await listStaff({ ...filters, page: page.value, pageSize })
    staff.value = items
    total.value = count
  } catch (err) {
    toast.error(err.message)
    staff.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    Object.assign(stats, await staffStats())
  } catch {
    // 忽略
  }
}

async function loadRoles() {
  try {
    roles.value = await listRoles()
  } catch (err) {
    toast.error(err.message)
  }
}

function applyFilters() {
  page.value = 1
  load()
}

function resetFilters() {
  filters.keyword = ''
  filters.role = ''
  filters.status = ''
  applyFilters()
}

function openCreate() {
  createError.value = ''
  Object.assign(cForm, {
    email: '',
    password: 'Mofang' + Math.floor(1000 + Math.random() * 9000),
    full_name: '',
    phone: '',
    title: '',
    role_code: 'teacher',
  })
  createOpen.value = true
}

async function submitCreate() {
  createError.value = ''
  if (!cForm.email.trim() || !cForm.full_name.trim()) {
    createError.value = '请填写邮箱与姓名'
    return
  }
  if ((cForm.password || '').length < 8) {
    createError.value = '初始密码长度至少 8 位'
    return
  }
  creating.value = true
  try {
    await createStaff({ ...cForm })
    toast.success('账号已创建，请把初始密码告知该员工')
    createOpen.value = false
    await Promise.all([load(), loadStats()])
  } catch (err) {
    createError.value = err.message
  } finally {
    creating.value = false
  }
}

function openEdit(target) {
  editTarget.value = target
  editError.value = ''
  Object.assign(eForm, {
    full_name: target.full_name || '',
    phone: target.phone || '',
    title: target.title || '',
    bio: target.bio || '',
    role_code: target.role_code,
    status: target.status,
  })
  editOpen.value = true
}

async function submitEdit() {
  editError.value = ''
  if (!eForm.full_name.trim()) {
    editError.value = '请填写姓名'
    return
  }
  editing.value = true
  try {
    const payload = { ...eForm, full_name: eForm.full_name.trim() }
    if (editTarget.value.id === auth.user?.id) {
      delete payload.role_code
      delete payload.status
    }
    await updateStaff(editTarget.value.id, payload)
    toast.success('员工信息已保存')
    editOpen.value = false
    await Promise.all([load(), loadStats()])
    if (editTarget.value.id === auth.user?.id) await auth.refresh()
  } catch (err) {
    editError.value = err.message
  } finally {
    editing.value = false
  }
}

function openReset(target) {
  resetTarget.value = target
  resetError.value = ''
  generatePassword()
  resetOpen.value = true
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = 'Mf'
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)]
  resetPassword.value = out
}

async function submitReset() {
  resetError.value = ''
  if ((resetPassword.value || '').length < 8) {
    resetError.value = '密码长度至少 8 位'
    return
  }
  resetting.value = true
  try {
    await resetStaffPassword(resetTarget.value.id, resetPassword.value)
    toast.success('密码已重置，请安全告知该员工')
    resetOpen.value = false
  } catch (err) {
    resetError.value = err.message
  } finally {
    resetting.value = false
  }
}

async function remove(target) {
  const ok = await dialog.confirm({
    title: '删除账号',
    message: `确认删除「${target.full_name || target.email}」的账号吗？该员工的登录权限会被立即回收。`,
    detail: '若只是暂时离开，建议改为「停用」而不是删除。',
    confirmText: '删除',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteStaff(target.id)
    toast.success('账号已删除')
    await Promise.all([load(), loadStats()])
  } catch (err) {
    toast.error(err.message)
  }
}

watch(page, load)
onMounted(() => {
  load()
  loadStats()
  loadRoles()
})
</script>
