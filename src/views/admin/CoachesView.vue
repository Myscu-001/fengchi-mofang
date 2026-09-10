<template>
  <div>
    <PageHeader title="师资团队" description="维护对外展示的教练团队信息，教练资料与系统登录账号相互独立">
      <UiButton variant="primary" @click="openCreate">
        <template #icon><UserPlus class="size-4" /></template>
        新增教练
      </UiButton>
    </PageHeader>

    <div class="fc-container py-7">
      <div class="grid grid-cols-3 gap-3.5">
        <UiStat label="教练总数" :value="stats.total" :icon="Users" tone="brand" />
        <UiStat label="启用展示" :value="stats.active" :icon="Eye" tone="green" />
        <UiStat label="停用" :value="stats.inactive" :icon="EyeOff" tone="orange" />
      </div>

      <div class="fc-card mt-5 flex flex-wrap items-center gap-2.5 p-3.5">
        <div class="relative min-w-[220px] flex-1">
          <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
          <input v-model="keyword" class="fc-input pl-9.5" placeholder="搜索教练姓名或头衔" @keyup.enter="load" />
        </div>
        <select v-model="statusFilter" class="fc-input w-auto min-w-[120px]" @change="load">
          <option value="">全部状态</option>
          <option value="active">启用展示</option>
          <option value="inactive">停用</option>
        </select>
        <UiButton variant="outline" @click="resetFilters">
          <template #icon><RotateCcw class="size-3.5" /></template>
          重置
        </UiButton>
      </div>

      <div class="fc-card mt-5 overflow-hidden">
        <UiLoading v-if="loading" text="正在加载师资团队…" />

        <div v-else-if="coaches.length" class="overflow-x-auto">
          <table class="w-full min-w-[860px] text-left text-[13px]">
            <thead class="border-b border-ink-200 bg-ink-50 text-[12px] text-ink-500">
              <tr>
                <th class="px-4 py-3 font-medium">教练</th>
                <th class="px-4 py-3 font-medium">竞技生涯</th>
                <th class="px-4 py-3 font-medium">教学经验</th>
                <th class="px-4 py-3 font-medium">三阶平均</th>
                <th class="px-4 py-3 font-medium">荣誉 / 专长</th>
                <th class="px-4 py-3 font-medium">状态</th>
                <th class="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ink-100">
              <tr v-for="c in coaches" :key="c.id" class="transition hover:bg-ink-50/70">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2.5">
                    <UiAvatar :src="c.avatar_url" :name="c.name" size="sm" />
                    <div class="min-w-0">
                      <p class="truncate font-medium text-ink-800">{{ c.name }}</p>
                      <p class="truncate text-[11.5px] text-ink-400">{{ c.title || '教练' }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 text-ink-600">{{ c.years_competing || '—' }}</td>
                <td class="px-4 py-3 text-ink-600">{{ c.years_teaching || '—' }}</td>
                <td class="px-4 py-3 tabular-nums text-ink-600">{{ c.avg_time || '—' }}</td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="h in (c.highlights || []).slice(0, 3)"
                      :key="h"
                      class="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700"
                    >{{ h }}</span>
                    <span v-if="(c.highlights || []).length > 3" class="text-[11px] text-ink-400">+{{ c.highlights.length - 3 }}</span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <UiBadge
                    :label="c.is_active ? '启用' : '停用'"
                    :custom-class="c.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-ink-100 text-ink-600 border-ink-200'"
                  />
                </td>
                <td class="px-4 py-3">
                  <div class="flex justify-end gap-1">
                    <button
                      class="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                      title="编辑资料"
                      @click="openEdit(c)"
                    >
                      <Pencil class="size-3.5" />
                    </button>
                    <button
                      class="rounded-lg p-1.5 text-ink-400 transition hover:bg-red-50 hover:text-red-500"
                      title="删除教练"
                      @click="remove(c)"
                    >
                      <Trash2 class="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <UiEmpty v-else :icon="Users" title="没有匹配的教练" description="新增一位教练，开始充实师资团队展示。">
          <UiButton variant="primary" @click="openCreate">
            <template #icon><UserPlus class="size-4" /></template>
            新增教练
          </UiButton>
        </UiEmpty>
      </div>
    </div>

    <!-- 新增 / 编辑 -->
    <UiModal :open="formOpen" :title="editTarget ? `编辑：${editTarget.name}` : '新增教练'" width="md" @close="formOpen = false">
      <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="submitForm">
        <div class="flex flex-col items-center gap-3 sm:col-span-2">
          <UiAvatar :src="form.avatar_url || ''" :name="form.name || '教练'" size="lg" />
          <div class="flex items-center gap-2">
            <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />
            <UiButton size="sm" variant="outline" @click="fileInput?.click()">
              <template #icon><ImageIcon class="size-3.5" /></template>
              {{ form.avatar_url ? '更换头像' : '上传头像' }}
            </UiButton>
            <button
              v-if="form.avatar_url"
              type="button"
              class="text-[12px] text-ink-400 transition hover:text-red-500"
              @click="form.avatar_url = ''"
            >
              移除
            </button>
          </div>
          <p v-if="uploading" class="text-[12px] text-ink-400">头像上传中…</p>
        </div>

        <UiField label="姓名" required>
          <input v-model="form.name" class="fc-input" placeholder="教练姓名" required />
        </UiField>
        <UiField label="头衔 / 职务">
          <input v-model="form.title" class="fc-input" placeholder="例：竞速教练" />
        </UiField>
        <UiField label="竞技生涯">
          <input v-model="form.years_competing" class="fc-input" placeholder="例：9 年" />
        </UiField>
        <UiField label="教学经验">
          <input v-model="form.years_teaching" class="fc-input" placeholder="例：7 年" />
        </UiField>
        <UiField label="三阶平均成绩">
          <input v-model="form.avg_time" class="fc-input" placeholder="例：9s" />
        </UiField>
        <UiField label="展示状态">
          <select v-model="form.is_active" class="fc-input">
            <option :value="true">启用展示</option>
            <option :value="false">停用</option>
          </select>
        </UiField>

        <UiField label="荣誉 / 专长" class="sm:col-span-2" hint="每行一条，或用英文逗号分隔">
          <textarea v-model="highlightsText" class="fc-input" rows="3" placeholder="例：吉尼斯世界纪录保持者&#10;亚洲纪录保持者&#10;WCA 官方裁判" />
        </UiField>

        <UiField label="个人简介" class="sm:col-span-2">
          <textarea v-model="form.bio" class="fc-input" rows="3" placeholder="教练的个人经历与教学理念" />
        </UiField>

        <p v-if="formError" class="sm:col-span-2 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
          {{ formError }}
        </p>
      </form>

      <template #footer>
        <UiButton variant="outline" @click="formOpen = false">取消</UiButton>
        <UiButton variant="primary" :loading="saving" @click="submitForm">保存</UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  Eye,
  EyeOff,
  Image as ImageIcon,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
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
import { listCoaches, createCoach, updateCoach, deleteCoach, uploadCoachAvatar } from '@/api/coaches'
import { useToastStore } from '@/stores/toast'
import { useDialogStore } from '@/stores/dialog'

const toast = useToastStore()
const dialog = useDialogStore()

const coaches = ref([])
const loading = ref(true)
const keyword = ref('')
const statusFilter = ref('')

const formOpen = ref(false)
const saving = ref(false)
const uploading = ref(false)
const formError = ref('')
const editTarget = ref(null)
const fileInput = ref(null)
const form = reactive({
  name: '',
  title: '',
  years_competing: '',
  years_teaching: '',
  avg_time: '',
  highlights: [],
  bio: '',
  avatar_url: '',
  is_active: true,
})
const highlightsText = ref('')

const stats = computed(() => {
  const total = coaches.value.length
  const active = coaches.value.filter((c) => c.is_active).length
  return { total, active, inactive: total - active }
})

function parseHighlights(text) {
  return String(text || '')
    .split(/[\n,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

async function load() {
  loading.value = true
  try {
    let list = await listCoaches({ includeInactive: true })
    const kw = keyword.value.trim().toLowerCase()
    if (kw) {
      list = list.filter(
        (c) => (c.name || '').toLowerCase().includes(kw) || (c.title || '').toLowerCase().includes(kw),
      )
    }
    if (statusFilter.value === 'active') list = list.filter((c) => c.is_active)
    if (statusFilter.value === 'inactive') list = list.filter((c) => !c.is_active)
    coaches.value = list
  } catch (err) {
    toast.error(err.message)
    coaches.value = []
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  keyword.value = ''
  statusFilter.value = ''
  load()
}

function openCreate() {
  editTarget.value = null
  formError.value = ''
  highlightsText.value = ''
  Object.assign(form, {
    name: '',
    title: '',
    years_competing: '',
    years_teaching: '',
    avg_time: '',
    highlights: [],
    bio: '',
    avatar_url: '',
    is_active: true,
  })
  formOpen.value = true
}

function openEdit(coach) {
  editTarget.value = coach
  formError.value = ''
  Object.assign(form, {
    name: coach.name,
    title: coach.title || '',
    years_competing: coach.years_competing || '',
    years_teaching: coach.years_teaching || '',
    avg_time: coach.avg_time || '',
    highlights: Array.isArray(coach.highlights) ? [...coach.highlights] : [],
    bio: coach.bio || '',
    avatar_url: coach.avatar_url || '',
    is_active: coach.is_active !== false,
  })
  highlightsText.value = form.highlights.join('\n')
  formOpen.value = true
}

async function onFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  uploading.value = true
  formError.value = ''
  try {
    form.avatar_url = await uploadCoachAvatar(file)
    toast.success('头像已上传')
  } catch (err) {
    formError.value = err.message
  } finally {
    uploading.value = false
    e.target.value = ''
  }
}

async function submitForm() {
  if (!form.name.trim()) {
    formError.value = '请填写教练姓名'
    return
  }
  saving.value = true
  formError.value = ''
  const payload = {
    name: form.name.trim(),
    title: form.title.trim(),
    years_competing: form.years_competing.trim(),
    years_teaching: form.years_teaching.trim(),
    avg_time: form.avg_time.trim(),
    highlights: parseHighlights(highlightsText.value),
    bio: form.bio.trim(),
    avatar_url: form.avatar_url || null,
    is_active: form.is_active,
  }
  try {
    if (editTarget.value) {
      await updateCoach(editTarget.value.id, payload)
      toast.success('教练信息已保存')
    } else {
      await createCoach(payload)
      toast.success('教练已添加')
    }
    formOpen.value = false
    await load()
  } catch (err) {
    formError.value = err.message
  } finally {
    saving.value = false
  }
}

async function remove(coach) {
  const ok = await dialog.confirm({
    title: '删除教练',
    message: `确认从师资团队中移除「${coach.name}」吗？该操作不可撤销。`,
    confirmText: '删除',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteCoach(coach)
    toast.success('教练已删除')
    await load()
  } catch (err) {
    toast.error(err.message)
  }
}

onMounted(load)
</script>
