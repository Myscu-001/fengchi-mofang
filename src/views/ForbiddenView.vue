<template>
  <div class="flex min-h-screen items-center justify-center bg-ink-50 p-6">
    <div class="fc-card w-full max-w-md p-8 text-center">
      <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
        <ShieldAlert class="size-6" />
      </div>
      <h1 class="mt-5 text-[19px] font-semibold text-ink-900">没有访问权限</h1>
      <p class="mt-2 text-[13.5px] leading-relaxed text-ink-500">
        当前账号「{{ auth.displayName }}」（{{ roleLabel(auth.roleCode) }}）没有访问该功能的权限。
        如需调整权限，请联系机构超级管理员。
      </p>
      <p v-if="route.query.from" class="mt-3 rounded-lg bg-ink-100 px-3 py-2 font-mono text-[11.5px] text-ink-500">
        {{ route.query.from }}
      </p>

      <div class="mt-6 flex justify-center gap-2.5">
        <UiButton variant="outline" @click="router.back()">返回上一页</UiButton>
        <UiButton variant="primary" @click="router.push({ name: 'home' })">回到首页</UiButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ShieldAlert } from 'lucide-vue-next'
import UiButton from '@/components/UiButton.vue'
import { useAuthStore } from '@/stores/auth'
import { roleLabel } from '@/lib/permissions'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
</script>
