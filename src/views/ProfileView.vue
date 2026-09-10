<template>
  <div>
    <PageHeader title="个人中心" description="维护个人资料与登录密码" />

    <div class="fc-container py-7">
      <div class="grid gap-5 lg:grid-cols-[1fr_340px]">
        <!-- 基本资料 -->
        <div class="space-y-5">
          <div class="fc-card p-5">
            <h3 class="text-[15px] font-semibold text-ink-900">基本资料</h3>

            <div class="mt-4 flex items-center gap-4">
              <UiAvatar :src="auth.profile?.avatar_url" :name="auth.displayName" size="lg" />
              <div>
                <label
                  class="inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-[10px] border border-ink-200 bg-white px-3 text-[13px] font-medium text-ink-700 transition hover:bg-ink-50"
                >
                  <Upload class="size-3.5" />
                  {{ uploadingAvatar ? '上传中…' : '更换头像' }}
                  <input type="file" accept="image/*" class="hidden" :disabled="uploadingAvatar" @change="handleAvatar" />
                </label>
                <p class="mt-1.5 text-[11.5px] text-ink-400">支持 JPG / PNG / WebP，不超过 2MB</p>
              </div>
            </div>

            <form class="mt-5 grid gap-4 sm:grid-cols-2" @submit.prevent="saveProfile">
              <UiField label="姓名" required>
                <input v-model="profileForm.full_name" class="fc-input" placeholder="真实姓名" required />
              </UiField>
              <UiField label="职务 / 头衔">
                <input v-model="profileForm.title" class="fc-input" placeholder="例：金牌教练" />
              </UiField>
              <UiField label="联系电话">
                <input v-model="profileForm.phone" class="fc-input" placeholder="手机号" />
              </UiField>
              <UiField label="登录邮箱" hint="邮箱由管理员维护，不可自行修改">
                <input :value="auth.user?.email" class="fc-input" disabled />
              </UiField>
              <div class="sm:col-span-2">
                <UiField label="个人简介">
                  <textarea v-model="profileForm.bio" class="fc-input" rows="3" placeholder="擅长方向、教学理念…" />
                </UiField>
              </div>

              <div class="sm:col-span-2 flex items-center gap-3">
                <UiButton type="submit" variant="primary" :loading="savingProfile">保存资料</UiButton>
                <span v-if="savedAt" class="text-[12.5px] text-emerald-600">已于 {{ savedAt }} 保存</span>
              </div>
            </form>
          </div>

          <!-- 修改密码 -->
          <div class="fc-card p-5">
            <div class="flex items-center gap-2">
              <h3 class="text-[15px] font-semibold text-ink-900">修改密码</h3>
              <UiBadge
                v-if="auth.profile?.must_change_password"
                label="当前为初始密码"
                custom-class="bg-amber-50 text-amber-700 border-amber-200"
              />
            </div>
            <p class="mt-1 text-[12.5px] text-ink-500">建议使用字母 + 数字组合，长度至少 8 位。</p>

            <form class="mt-4 grid max-w-md gap-4" @submit.prevent="savePassword">
              <UiField label="新密码" required>
                <div class="relative">
                  <input
                    v-model="pwdForm.password"
                    :type="showPwd ? 'text' : 'password'"
                    class="fc-input pr-10"
                    placeholder="至少 8 位"
                    required
                  />
                  <button
                    type="button"
                    class="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-ink-400 transition hover:text-ink-600"
                    @click="showPwd = !showPwd"
                  >
                    <EyeOff v-if="showPwd" class="size-4" />
                    <Eye v-else class="size-4" />
                  </button>
                </div>
              </UiField>

              <UiField label="确认新密码" required :error="pwdError">
                <input v-model="pwdForm.confirm" type="password" class="fc-input" placeholder="再次输入新密码" required />
              </UiField>

              <div>
                <UiButton type="submit" variant="primary" :loading="savingPwd">更新密码</UiButton>
              </div>
            </form>
          </div>
        </div>

        <!-- 账号信息 -->
        <aside class="space-y-5">
          <div class="fc-card p-5">
            <h3 class="text-[15px] font-semibold text-ink-900">账号信息</h3>
            <dl class="mt-3.5 space-y-3 text-[13px]">
              <div class="flex items-center justify-between">
                <dt class="text-ink-500">角色</dt>
                <dd><UiBadge :label="roleLabel(auth.roleCode)" :custom-class="roleStyle(auth.roleCode)" /></dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="text-ink-500">账号状态</dt>
                <dd>
                  <UiBadge
                    :label="auth.profile?.status === 'active' ? '正常' : '已停用'"
                    :custom-class="auth.profile?.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'"
                  />
                </dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="text-ink-500">开通时间</dt>
                <dd class="text-ink-700">{{ formatDate(auth.profile?.created_at) }}</dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="text-ink-500">最近登录</dt>
                <dd class="text-ink-700">{{ relativeTime(auth.profile?.last_login_at) }}</dd>
              </div>
            </dl>
          </div>

          <div class="fc-card p-5">
            <h3 class="text-[15px] font-semibold text-ink-900">我的权限</h3>
            <p class="mt-1 text-[12px] text-ink-500">共 {{ auth.permissions.length }} 项</p>
            <ul class="mt-3 space-y-2">
              <li v-for="p in permissionList" :key="p.code" class="flex items-start gap-2">
                <Check class="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                <div>
                  <p class="text-[13px] text-ink-700">{{ p.name }}</p>
                  <p class="text-[11.5px] text-ink-400">{{ p.moduleLabel }}</p>
                </div>
              </li>
            </ul>
            <p v-if="!permissionList.length" class="mt-3 text-[13px] text-ink-400">暂无权限</p>
          </div>

          <div class="fc-card p-5">
            <h3 class="text-[15px] font-semibold text-ink-900">安全提示</h3>
            <ul class="mt-3 space-y-2 text-[12.5px] leading-relaxed text-ink-500">
              <li>· 请勿将账号借给他人使用。</li>
              <li>· 学员信息与家长联系方式属于敏感数据，请勿截图外传。</li>
              <li>· 如怀疑账号泄露，请立即修改密码并联系超级管理员。</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { Check, Eye, EyeOff, Upload } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import UiButton from '@/components/UiButton.vue'
import UiBadge from '@/components/UiBadge.vue'
import UiAvatar from '@/components/UiAvatar.vue'
import UiField from '@/components/UiField.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { roleLabel, roleStyle } from '@/lib/permissions'
import { formatDate, relativeTime } from '@/lib/format'
import { listPermissions } from '@/api/users'

const auth = useAuthStore()
const toast = useToastStore()

const uploadingAvatar = ref(false)
const savingProfile = ref(false)
const savingPwd = ref(false)
const savedAt = ref('')
const showPwd = ref(false)
const pwdError = ref('')
const allPermissions = ref([])

const profileForm = reactive({ full_name: '', title: '', phone: '', bio: '' })
const pwdForm = reactive({ password: '', confirm: '' })

const MODULE_LABELS = {
  system: '系统管理',
  course: '课程管理',
  student: '学员管理',
  class: '班级管理',
  grade: '成绩管理',
  resource: '资源管理',
}

const permissionList = computed(() =>
  allPermissions.value
    .filter((p) => auth.permissions.includes(p.code))
    .map((p) => ({ ...p, moduleLabel: MODULE_LABELS[p.module] || p.module })),
)

onMounted(async () => {
  profileForm.full_name = auth.profile?.full_name || ''
  profileForm.title = auth.profile?.title || ''
  profileForm.phone = auth.profile?.phone || ''
  profileForm.bio = auth.profile?.bio || ''

  try {
    allPermissions.value = await listPermissions()
  } catch {
    allPermissions.value = []
  }
})

async function handleAvatar(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    toast.error('头像不能超过 2MB')
    return
  }
  uploadingAvatar.value = true
  try {
    await auth.uploadAvatar(file)
    toast.success('头像已更新')
  } catch (err) {
    toast.error(err.message)
  } finally {
    uploadingAvatar.value = false
  }
}

async function saveProfile() {
  if (!profileForm.full_name.trim()) {
    toast.error('请填写姓名')
    return
  }
  savingProfile.value = true
  try {
    await auth.updateProfile({
      full_name: profileForm.full_name.trim(),
      title: profileForm.title?.trim() || null,
      phone: profileForm.phone?.trim() || null,
      bio: profileForm.bio?.trim() || null,
    })
    toast.success('资料已保存')
    savedAt.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } catch (err) {
    toast.error(err.message)
  } finally {
    savingProfile.value = false
  }
}

async function savePassword() {
  pwdError.value = ''
  if (pwdForm.password.length < 8) {
    pwdError.value = '密码长度至少 8 位'
    return
  }
  if (pwdForm.password !== pwdForm.confirm) {
    pwdError.value = '两次输入的密码不一致'
    return
  }
  savingPwd.value = true
  try {
    await auth.changePassword(pwdForm.password)
    pwdForm.password = ''
    pwdForm.confirm = ''
    toast.success('密码已更新')
  } catch (err) {
    pwdError.value = err.message
  } finally {
    savingPwd.value = false
  }
}
</script>
