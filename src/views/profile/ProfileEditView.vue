<template>
  <div>
    <PageHeader title="个人资料" description="头像、姓名与联系方式">
      <UiButton variant="outline" @click="router.back()">
        <template #icon><ArrowLeft class="size-3.5" /></template>
        返回
      </UiButton>
    </PageHeader>

    <div class="fc-container py-6">
      <div class="fc-card p-5">
        <h3 class="text-[15px] font-semibold text-ink-900">头像</h3>
        <div class="mt-3.5 flex items-center gap-4">
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
      </div>

      <form class="fc-card mt-5 grid gap-4 p-5 sm:grid-cols-2" @submit.prevent="saveProfile">
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
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Upload } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import UiButton from '@/components/UiButton.vue'
import UiAvatar from '@/components/UiAvatar.vue'
import UiField from '@/components/UiField.vue'
import { useProfileAccount } from '@/lib/useProfileAccount'

const router = useRouter()
const {
  auth,
  profileForm,
  uploadingAvatar,
  savingProfile,
  savedAt,
  load,
  handleAvatar,
  saveProfile,
} = useProfileAccount()

onMounted(load)
</script>

<style scoped>
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
.pfm-upload:active {
  background: var(--color-ink-100);
}
</style>
