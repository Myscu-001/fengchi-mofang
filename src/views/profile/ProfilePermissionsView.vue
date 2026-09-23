<template>
  <div>
    <PageHeader title="我的权限" :description="`共 ${permissionList.length} 项`">
      <UiButton variant="outline" @click="router.back()">
        <template #icon><ArrowLeft class="size-3.5" /></template>
        返回
      </UiButton>
    </PageHeader>

    <div class="fc-container py-6">
      <div class="fc-card p-5">
        <p v-if="!permissionList.length" class="text-[13px] text-ink-400">暂无权限</p>
        <ul v-else class="mt-1 space-y-3">
          <li v-for="p in permissionList" :key="p.code" class="flex items-start gap-2.5">
            <Check class="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <div>
              <p class="text-[13.5px] text-ink-800">{{ p.name }}</p>
              <p class="mt-0.5 text-[11.5px] text-ink-400">{{ p.moduleLabel }} · {{ p.code }}</p>
            </div>
          </li>
        </ul>
      </div>

      <p class="pfm-tip">权限由超级管理员在「角色权限」里分配，本人无法修改。</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Check } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import UiButton from '@/components/UiButton.vue'
import { useProfileAccount } from '@/lib/useProfileAccount'

const router = useRouter()
const { permissionList, load } = useProfileAccount()

onMounted(load)
</script>

<style scoped>
.pfm-tip {
  margin: 14px 0 0;
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--color-ink-400);
}
</style>
