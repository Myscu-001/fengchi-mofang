<template>
  <div>
    <PageHeader title="账号与安全" description="账号状态与安全提醒">
      <UiButton variant="outline" @click="router.back()">
        <template #icon><ArrowLeft class="size-3.5" /></template>
        返回
      </UiButton>
    </PageHeader>

    <div class="fc-container py-6 space-y-5">
      <div class="fc-card p-5">
        <h3 class="text-[15px] font-semibold text-ink-900">账号信息</h3>
        <dl class="mt-3.5 space-y-3 text-[13px]">
          <div class="flex items-center justify-between">
            <dt class="text-ink-500">登录邮箱</dt>
            <dd class="text-ink-700">{{ auth.user?.email || '—' }}</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="text-ink-500">角色</dt>
            <dd>
              <UiBadge :label="roleLabel(auth.roleCode)" :custom-class="roleStyle(auth.roleCode)" />
            </dd>
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
        <h3 class="text-[15px] font-semibold text-ink-900">安全提示</h3>
        <ul class="mt-3 space-y-2 text-[12.5px] leading-relaxed text-ink-500">
          <li>· 请勿将账号借给他人使用。</li>
          <li>· 学员信息与家长联系方式属于敏感数据，请勿截图外传。</li>
          <li>· 如怀疑账号泄露，请立即修改密码并联系超级管理员。</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ArrowLeft } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import UiButton from '@/components/UiButton.vue'
import UiBadge from '@/components/UiBadge.vue'
import { useProfileAccount } from '@/lib/useProfileAccount'
import { roleLabel, roleStyle } from '@/lib/permissions'
import { formatDate, relativeTime } from '@/lib/format'

const router = useRouter()
const { auth } = useProfileAccount()
</script>
