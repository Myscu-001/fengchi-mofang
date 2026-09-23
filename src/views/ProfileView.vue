<template>
  <div>
    <PageHeader :title="isMobile ? '我的' : '个人中心'" description="维护个人资料与登录密码">
      <!-- 手机端看不到这一栏（右上角的退出已改成列表里的红色入口），只在电脑保留 -->
      <UiButton variant="outline" class="hidden lg:inline-flex" @click="handleSignOut">
        <template #icon><LogOut class="size-4" /></template>
        退出登录
      </UiButton>
    </PageHeader>

    <!-- ===================== 手机端：列表入口 + 子页面 ===================== -->
    <div v-if="isMobile" class="fc-container py-5">
      <button type="button" class="fc-card w-full p-4.5 text-left" @click="go('profile-edit')">
        <div class="flex items-center gap-3.5">
          <UiAvatar :src="auth.profile?.avatar_url" :name="auth.displayName" size="lg" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-[16px] font-semibold text-ink-900">{{ auth.displayName }}</p>
            <p class="mt-0.5 truncate text-[12.5px] text-ink-500">
              {{ [auth.profile?.title, roleLabel(auth.roleCode)].filter(Boolean).join(' · ') }}
            </p>
            <p class="mt-0.5 truncate text-[11.5px] text-ink-400">{{ auth.user?.email }}</p>
          </div>
          <ChevronRight class="size-4 shrink-0 text-ink-300" />
        </div>
      </button>

      <nav class="fc-card mt-4 overflow-hidden">
        <button v-for="row in rows" :key="row.name" type="button" class="pfm-row" @click="go(row.name)">
          <span class="pfm-row-ic" :class="row.warn ? 'pfm-row-ic--warn' : ''">
            <component :is="row.icon" class="size-4.5" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="flex items-center gap-2">
              <b class="truncate text-[14px] font-medium text-ink-900">{{ row.title }}</b>
              <span v-if="row.tag" class="pfm-tag" :class="row.warn ? 'pfm-tag--warn' : ''">{{ row.tag }}</span>
            </span>
            <span class="mt-0.5 block truncate text-[11.5px] text-ink-400">{{ row.sub }}</span>
          </span>
          <ChevronRight class="size-4 shrink-0 text-ink-300" />
        </button>
      </nav>

      <nav class="fc-card mt-4 overflow-hidden">
        <button type="button" class="pfm-row" @click="handleSignOut">
          <span class="pfm-row-ic pfm-row-ic--danger">
            <LogOut class="size-4.5" />
          </span>
          <span class="flex-1 text-[14px] font-medium text-red-600">退出登录</span>
        </button>
      </nav>

      <p class="pfm-foot">风驰思维魔方 · 内部管理系统</p>
    </div>

    <!-- ===================== 电脑端：一整页铺开，维持原样 ===================== -->
    <div v-else class="fc-container py-7">
      <div class="grid gap-5 lg:grid-cols-[1fr_340px]">
        <!-- 基本资料 -->
        <div class="space-y-5">
          <div class="fc-card p-5">
            <h3 class="text-[15px] font-semibold text-ink-900">基本资料</h3>

            <div class="mt-4 flex items-center gap-4">
              <UiAvatar :src="auth.profile?.avatar_url" :name="auth.displayName" size="lg" />
              <div>
                <label class="pfm-upload">
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

          <div class="fc-card p-5">
            <div class="flex items-center justify-between">
              <h3 class="text-[15px] font-semibold text-ink-900">诊断日志</h3>
              <UiBadge
                v-if="errorLogs.length"
                :label="`${errorLogs.length} 条`"
                custom-class="bg-red-50 text-red-600 border-red-200"
              />
            </div>
            <p class="mt-1 text-[12px] text-ink-500">记录本机最近的前端报错，反馈问题时可直接复制给管理员。</p>

            <div v-if="errorLogs.length" class="mt-3 space-y-2">
              <div v-for="(e, i) in errorLogs.slice(0, 3)" :key="i" class="rounded-lg bg-ink-50 p-2.5 text-[11.5px]">
                <p class="line-clamp-1 font-medium text-ink-700">{{ e.message }}</p>
                <p class="mt-0.5 text-ink-400">{{ e.time }}</p>
              </div>
              <div class="flex items-center gap-2 pt-1">
                <UiButton size="sm" variant="outline" @click="copyLogs">
                  <template #icon><Copy class="size-3.5" /></template>
                  复制全部
                </UiButton>
                <UiButton size="sm" variant="ghost" @click="clearLogs">
                  <template #icon><Trash2 class="size-3.5 text-red-500" /></template>
                  清空
                </UiButton>
              </div>
            </div>
            <p v-else class="mt-3 text-[12.5px] text-ink-400">暂无错误记录，一切正常。</p>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Bug,
  Check,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  ListChecks,
  LogOut,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import UiButton from '@/components/UiButton.vue'
import UiBadge from '@/components/UiBadge.vue'
import UiAvatar from '@/components/UiAvatar.vue'
import UiField from '@/components/UiField.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useDialogStore } from '@/stores/dialog'
import { useProfileAccount } from '@/lib/useProfileAccount'
import { useIsMobile } from '@/lib/useMediaQuery'
import { roleLabel, roleStyle } from '@/lib/permissions'
import { formatDate, relativeTime } from '@/lib/format'

const auth = useAuthStore()
const toast = useToastStore()
const dialog = useDialogStore()
const router = useRouter()
const isMobile = useIsMobile()

const {
  profileForm,
  pwdForm,
  uploadingAvatar,
  savingProfile,
  savingPwd,
  savedAt,
  showPwd,
  pwdError,
  errorLogs,
  permissionList,
  load,
  handleAvatar,
  saveProfile,
  savePassword,
  copyLogs,
  clearLogs,
} = useProfileAccount()

/* 手机端把每一项拆成入口，点进去再改 —— 列表只负责「显示现状 + 跳过去」 */
const rows = computed(() => [
  {
    name: 'profile-edit',
    icon: UserRound,
    title: '个人资料',
    sub: [auth.profile?.title, auth.profile?.phone].filter(Boolean).join(' · ') || '头像、姓名、职务与简介',
  },
  {
    name: 'profile-password',
    icon: KeyRound,
    title: '修改密码',
    tag: auth.profile?.must_change_password ? '初始密码' : '',
    warn: !!auth.profile?.must_change_password,
    sub: auth.profile?.must_change_password ? '当前仍是初始密码，建议尽快修改' : '字母 + 数字，长度至少 8 位',
  },
  {
    name: 'profile-account',
    icon: ShieldCheck,
    title: '账号与安全',
    sub:
      auth.profile?.status === 'active'
        ? `账号正常 · ${relativeTime(auth.profile?.last_login_at)}登录`
        : '账号已停用',
  },
  {
    name: 'profile-permissions',
    icon: ListChecks,
    title: '我的权限',
    sub: `共 ${permissionList.value.length} 项 · ${roleLabel(auth.roleCode)}`,
  },
  {
    name: 'profile-logs',
    icon: Bug,
    title: '诊断日志',
    tag: errorLogs.value.length ? `${errorLogs.value.length} 条` : '',
    warn: !!errorLogs.value.length,
    sub: errorLogs.value.length ? '有报错待反馈给管理员' : '暂无错误记录，一切正常',
  },
])

function go(name) {
  router.push({ name })
}

async function handleSignOut() {
  const ok = await dialog.confirm({
    title: '退出登录',
    message: '确定要退出当前账号吗？',
    confirmText: '退出',
  })
  if (!ok) return
  await auth.signOut()
  toast.success('已退出登录')
  router.push({ name: 'login' })
}

onMounted(load)
</script>

<style scoped>
/* 手机端「我的」列表行：左边图标块 + 标题副标题 + 右箭头 */
.pfm-row {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
  padding: 13px 15px;
  text-align: left;
  background: transparent;
  transition: background-color 0.14s ease;
  -webkit-tap-highlight-color: transparent;
}
.pfm-row + .pfm-row {
  border-top: 1px solid var(--color-ink-100);
}
.pfm-row:active {
  background: var(--color-ink-50);
}
.pfm-row-ic {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--color-brand-50);
  color: var(--color-brand-600);
}
.pfm-row-ic--warn {
  background: #fff5ed;
  color: #c2671a;
}
.pfm-row-ic--danger {
  background: #fdeaea;
  color: #cf3b32;
}
.pfm-tag {
  flex: none;
  border-radius: 6px;
  padding: 1px 6px;
  font-size: 10.5px;
  font-weight: 500;
  background: var(--color-ink-100);
  color: var(--color-ink-500);
}
.pfm-tag--warn {
  background: #fff1e4;
  color: #b4600f;
}
.pfm-upload {
  display: inline-flex;
  height: 34px;
  cursor: pointer;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--color-ink-200);
  background: #fff;
  border-radius: 10px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-ink-700);
  transition: background-color 0.15s ease;
}
@media (hover: hover) {
  .pfm-upload:hover {
    background: var(--color-ink-50);
  }
}
.pfm-foot {
  margin: 22px 0 0;
  text-align: center;
  font-size: 11.5px;
  color: var(--color-ink-300);
}
</style>
