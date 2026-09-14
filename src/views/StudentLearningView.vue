<template>
  <div>
    <PageHeader title="学习记录" :description="student ? `${student.name} · 共 ${logs.length} 条记录` : '学员学习内容记录'">
      <UiButton variant="outline" @click="goBack">
        <template #icon><ArrowLeft class="size-3.5" /></template>
        返回档案
      </UiButton>
      <UiButton v-if="canManageStudent" variant="primary" @click="openAdd">
        <template #icon><Plus class="size-3.5" /></template>
        添加记录
      </UiButton>
    </PageHeader>

    <div class="fc-container space-y-5 py-7">
      <!-- 表未创建 -->
      <div
        v-if="tableMissing"
        class="fc-card p-8 text-center"
      >
        <TriangleAlert class="mx-auto size-7 text-amber-500" />
        <h3 class="mt-3 text-[15px] font-semibold text-ink-900">学习记录数据表尚未创建</h3>
        <p class="mx-auto mt-2 max-w-xl text-[13px] leading-relaxed text-ink-500">
          请在 Supabase 后台的 SQL 编辑器中执行项目里的
          <code class="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[12px]">supabase/10_student_learning_logs.sql</code>
          ，即可开始记录。在此之前，系统其它功能不受影响。
        </p>
      </div>

      <template v-else>
        <!-- 筛选 -->
        <div v-if="logs.length" class="fc-card flex flex-wrap items-end gap-3 p-4">
          <div class="relative min-w-[200px] flex-1">
            <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
            <input v-model="keyword" class="fc-input pl-9.5" placeholder="搜索学习内容或标签" />
          </div>
          <select v-model="projectFilter" class="fc-input w-auto min-w-[130px]">
            <option value="">全部项目</option>
            <option v-for="p in CUBE_PROJECTS" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
          <span class="ml-auto pb-2 text-[12.5px] text-ink-400">共 {{ filtered.length }} 条</span>
        </div>

        <UiLoading v-if="loading" text="加载学习记录…" />

        <div v-else-if="grouped.length" class="space-y-5">
          <section v-for="group in grouped" :key="group.month" class="fc-card p-5">
            <h3 class="flex items-center gap-2 text-[13px] font-semibold text-ink-500">
              {{ group.month }}
              <span class="text-[11.5px] font-normal text-ink-400">{{ group.items.length }} 条</span>
            </h3>

            <ol class="mt-4">
              <li
                v-for="(log, i) in group.items"
                :key="log.id"
                class="relative flex gap-3.5 pb-5 last:pb-0"
              >
                <span
                  v-if="i < group.items.length - 1"
                  class="absolute top-7 left-[5px] h-full w-px bg-ink-200"
                />
                <span class="z-10 mt-1.5 size-2.5 shrink-0 rounded-full bg-brand-500" />
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-[12.5px] font-medium text-ink-700">{{ formatDate(log.learned_on) }}</span>
                    <UiBadge
                      v-if="log.project"
                      :label="projectLabelOf(log.project)"
                      custom-class="border-transparent text-white"
                      :style="{ backgroundColor: projectColor(log.project) }"
                    />
                    <span
                      v-for="t in log.tags || []"
                      :key="t"
                      class="rounded-md bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-500"
                    >#{{ t }}</span>
                    <div v-if="canManageStudent" class="ml-auto flex items-center gap-1">
                      <button
                        class="rounded p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                        title="编辑"
                        @click="openEdit(log)"
                      >
                        <Pencil class="size-3.5" />
                      </button>
                      <button
                        class="rounded p-1 text-ink-400 transition hover:bg-red-50 hover:text-red-600"
                        title="删除"
                        @click="remove(log)"
                      >
                        <Trash2 class="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <p class="mt-1 text-[13px] leading-relaxed whitespace-pre-wrap text-ink-700">{{ log.content }}</p>
                </div>
              </li>
            </ol>
          </section>
        </div>

        <div v-else class="fc-card p-12 text-center">
          <BookOpen class="mx-auto size-7 text-ink-300" />
          <p class="mt-3 text-[13px] text-ink-400">
            {{ logs.length ? '没有符合筛选条件的学习记录' : canManageStudent ? '还没有学习记录，点击「添加记录」开始。' : '暂无学习记录。' }}
          </p>
        </div>
      </template>
    </div>

    <!-- 添加 / 编辑 -->
    <UiModal :open="logOpen" :title="editing ? '编辑学习记录' : '添加学习记录'" width="md" @close="logOpen = false">
      <div class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <UiField label="学习日期">
            <input v-model="form.learnedOn" type="date" class="fc-input" :max="today" />
          </UiField>
          <UiField label="关联魔方项目" hint="可不选">
            <select v-model="form.project" class="fc-input">
              <option value="">不关联</option>
              <option v-for="p in CUBE_PROJECTS" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
          </UiField>
        </div>

        <UiField label="学习内容" required>
          <textarea
            v-model="form.content"
            class="fc-input"
            rows="4"
            placeholder="例：今天吃透了 PLL 前 10 个公式，能独立复原四阶前两层"
          />
        </UiField>

        <UiField label="标签" hint="多个标签用逗号分隔，可不填">
          <input v-model="form.tags" class="fc-input" placeholder="公式, 提速, 四阶" />
        </UiField>

        <p v-if="errorMsg" class="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
          {{ errorMsg }}
        </p>
      </div>
      <template #footer>
        <UiButton variant="outline" @click="logOpen = false">取消</UiButton>
        <UiButton variant="primary" :loading="saving" @click="save">保存</UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, BookOpen, Pencil, Plus, Search, Trash2, TriangleAlert } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import UiButton from '@/components/UiButton.vue'
import UiBadge from '@/components/UiBadge.vue'
import UiField from '@/components/UiField.vue'
import UiModal from '@/components/UiModal.vue'
import UiLoading from '@/components/UiLoading.vue'
import { CUBE_PROJECTS } from '@/lib/dict'
import { formatDate } from '@/lib/format'
import { recordAudit } from '@/lib/audit'
import { getStudent } from '@/api/students'
import {
  listLearningLogs,
  createLearningLog,
  updateLearningLog,
  deleteLearningLog,
  isMissingTableError,
} from '@/api/learning'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useDialogStore } from '@/stores/dialog'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()
const dialog = useDialogStore()

const canManageStudent = computed(() => auth.can('student.manage'))
const today = new Date().toISOString().slice(0, 10)

const student = ref(null)
const logs = ref([])
const loading = ref(true)
const tableMissing = ref(false)

const keyword = ref('')
const projectFilter = ref('')

const logOpen = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const editing = ref(null)
const form = reactive({ learnedOn: '', project: '', content: '', tags: '' })

function projectLabelOf(value) {
  return CUBE_PROJECTS.find((p) => p.value === value)?.label || value
}

function projectColor(value) {
  return CUBE_PROJECTS.find((p) => p.value === value)?.color || '#94a3b8'
}

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return logs.value.filter((log) => {
    if (projectFilter.value && log.project !== projectFilter.value) return false
    if (!kw) return true
    const hay = `${log.content || ''} ${(log.tags || []).join(' ')} ${projectLabelOf(log.project || '')}`
    return hay.toLowerCase().includes(kw)
  })
})

const grouped = computed(() => {
  const map = new Map()
  for (const log of filtered.value) {
    const d = new Date(log.learned_on)
    const key = `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(log)
  }
  return [...map.entries()].map(([month, items]) => ({ month, items }))
})

async function loadStudent() {
  try {
    student.value = await getStudent(route.params.id)
  } catch {
    student.value = null
  }
}

async function loadLogs() {
  loading.value = true
  try {
    logs.value = await listLearningLogs(route.params.id)
    tableMissing.value = false
  } catch (err) {
    logs.value = []
    tableMissing.value = isMissingTableError(err)
    if (!tableMissing.value) toast.error(err.message)
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'student-detail', params: { id: route.params.id } })
}

function openAdd() {
  editing.value = null
  errorMsg.value = ''
  Object.assign(form, { learnedOn: today, project: projectFilter.value || '', content: '', tags: '' })
  logOpen.value = true
}

function openEdit(log) {
  editing.value = log
  errorMsg.value = ''
  Object.assign(form, {
    learnedOn: log.learned_on || today,
    project: log.project || '',
    content: log.content || '',
    tags: (log.tags || []).join(', '),
  })
  logOpen.value = true
}

async function save() {
  errorMsg.value = ''
  if (!form.content.trim()) {
    errorMsg.value = '请填写学习内容'
    return
  }
  saving.value = true
  try {
    const payload = {
      studentId: route.params.id,
      learnedOn: form.learnedOn || today,
      project: form.project || null,
      content: form.content,
      tags: form.tags
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean),
    }
    const who = student.value?.name || '学员'
    if (editing.value) {
      await updateLearningLog(editing.value.id, payload)
      recordAudit({ action: 'update', targetType: 'learning', targetId: route.params.id, summary: `修改 ${who} 的学习记录` })
    } else {
      await createLearningLog(payload)
      recordAudit({ action: 'create', targetType: 'learning', targetId: route.params.id, summary: `为 ${who} 添加学习记录` })
    }
    toast.success('学习记录已保存')
    logOpen.value = false
    await loadLogs()
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    saving.value = false
  }
}

async function remove(log) {
  const ok = await dialog.confirm({
    title: '删除学习记录',
    message: '确认删除这条学习记录吗？',
    confirmText: '删除',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteLearningLog(log.id)
    recordAudit({
      action: 'delete',
      targetType: 'learning',
      targetId: route.params.id,
      summary: `删除 ${student.value?.name || '学员'} 的一条学习记录`,
    })
    toast.success('学习记录已删除')
    await loadLogs()
  } catch (err) {
    toast.error(err.message)
  }
}

watch(
  () => route.params.id,
  (id) => {
    if (id) {
      loadStudent()
      loadLogs()
    }
  },
)

onMounted(() => {
  loadStudent()
  loadLogs()
})
</script>
