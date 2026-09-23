<template>
  <div>
    <PageHeader title="修改密码" description="建议使用字母 + 数字组合，长度至少 8 位">
      <UiButton variant="outline" @click="router.back()">
        <template #icon><ArrowLeft class="size-3.5" /></template>
        返回
      </UiButton>
    </PageHeader>

    <div class="fc-container py-6">
      <div class="fc-card p-5">
        <div class="flex items-center gap-2">
          <h3 class="text-[15px] font-semibold text-ink-900">设置新密码</h3>
          <UiBadge
            v-if="auth.profile?.must_change_password"
            label="当前为初始密码"
            custom-class="bg-amber-50 text-amber-700 border-amber-200"
          />
        </div>

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

      <div class="fc-card mt-5 p-5">
        <h3 class="text-[15px] font-semibold text-ink-900">安全提示</h3>
        <ul class="mt-3 space-y-2 text-[12.5px] leading-relaxed text-ink-500">
          <li>· 请勿将账号借给他人使用。</li>
          <li>· 如怀疑账号泄露，请立即修改密码并联系超级管理员。</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ArrowLeft, Eye, EyeOff } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import UiButton from '@/components/UiButton.vue'
import UiBadge from '@/components/UiBadge.vue'
import UiField from '@/components/UiField.vue'
import { useProfileAccount } from '@/lib/useProfileAccount'

const router = useRouter()
const { auth, pwdForm, showPwd, pwdError, savingPwd, savePassword } = useProfileAccount()
</script>
