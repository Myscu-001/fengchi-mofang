<template>
  <div>
    <PageHeader title="操作日志" description="记录谁在什么时候对成绩、资源、账号等数据做了什么，便于追溯">
      <UiButton variant="outline" @click="exportCsv" :disabled="!logs.length">
        <template #icon><Download class="size-3.5" /></template>
        导出
      </UiButton>
      <UiButton variant="outline" @click="purgeOld">
        <template #icon><Trash2 class="size-3.5" /></template>
        清理 90 天前
      </UiButton>
      <UiButton variant="primary" :loading="loading" @click="load">
        <template #icon><RefreshCw class="size-3.5" /></template>
        刷新
      </UiButton>
    </PageHeader>

    <div class="fc-container space-y-5 py-7">
      <!-- 筛选 -->
      <div class="fc-card flex flex-wrap items-end gap-3 p-4">
        <div class="relative min-w-[200px] flex-1">
          <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
          <input
            v-model="filters.keyword"
            class="fc-input pl-9.5"
            placeholder="搜索描述或操作人"
            @keyup.enter="applyFilters"
          />
        </div>
        <select v-model="filters.targetType" class="fc-input w-auto min-w-[130px]" @change="applyFilters">
          <option value="">全部对象</option>
          <option v-for="t in AUDIT_TARGETS" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
        <select v-model="filters.action" class="fc-input w-auto min-w-[110px]" @change="applyFilters">
          <option value="">全部动作</option>
          <option v-for="a in AUDIT_ACTIONS" :key="a.value" :value="a.value">{{ a.label }}</option>
        </select>
        <input v-model="filters.start" type="date" class="fc-input w-auto" @change="applyFilters" />
        <span class="pb-2 text-ink-400">至</span>
        <input v-model="filters.end" type="date" class="fc-input w-auto" @change="applyFilters" />
        <UiButton variant="outline" @click="resetFilters">
          <template #icon><RotateCcw class="size-3.5" /></template>
          重置
        </UiButton>
        <span class="ml-auto pb-2 text-[12.5px] text-ink-400">共 {{ total }} 条记录</span>
      </div>

      <UiLoading v-if="loading" text="正在加载操作日志…" />

      <!-- 表未创建 -->
      <div v-else-if="tableMissing" class="fc-card p-8 text-center">
        <TriangleAlert class="mx-auto size-7 text-amber-500" />
        <h3 class="mt-3 text-[15px] font-semibold text-ink-900">审计表尚未创建</h3>
        <p class="mx-auto mt-2 max-w-xl text-[13px] leading-relaxed text-ink-500">
          请在 Supabase 后台的 SQL 编辑器中执行项目里的
          <code class="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[12px]">supabase/09_audit_logs.sql</code>
          ，即可开始记录操作日志。在此之前，系统的其他功能不受影响。
        </p>
      </div>

      <div v-else-if="logs.length" class="fc-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[820px] text-left text-[13px]">
            <thead class="border-b border-ink-200 bg-ink-50 text-[12px] text-ink-500">
              <tr>
                <th class="w-40 px-4 py-3 font-medium">时间</th>
                <th class="px-4 py-3 font-medium">操作人</th>
                <th class="w-20 px-4 py-3 font-medium">动作</th>
                <th class="w-24 px-4 py-3 font-medium">对象</th>
                <th class="px-4 py-3 font-medium">描述</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ink-100">
              <tr v-for="log in logs" :key="log.id" class="transition hover:bg-ink-50/60">
                <td class="px-4 py-3 whitespace-nowrap text-ink-500">{{ formatDateTime(log.created_at) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-ink-700">{{ log.actor_name || '—' }}</td>
                <td class="px-4 py-3">
                  <UiBadge :label="auditActionMeta(log.action).label" :custom-class="auditActionMeta(log.action).style" />
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-ink-500">{{ auditTargetLabel(log.target_type) }}</td>
                <td class="px-4 py-3 text-ink-700">{{ log.summary }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="total > pageSize" class="border-t border-ink-100 p-3.5">
          <UiPagination v-model:page="page" :page-size="pageSize" :total="total" />
        </div>
      </div>

      <div v-else class="fc-card p-10 text-center text-[13px] text-ink-400">
        暂无符合条件的操作日志
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { Download, RefreshCw, RotateCcw, Search, Trash2, TriangleAlert } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import UiButton from '@/components/UiButton.vue'
import UiBadge from '@/components/UiBadge.vue'
import UiLoading from '@/components/UiLoading.vue'
import UiPagination from '@/components/UiPagination.vue'
import {
  listAuditLogs,
  purgeAuditLogsBefore,
  auditActionMeta,
  auditTargetLabel,
  AUDIT_ACTIONS,
  AUDIT_TARGETS,
} from '@/api/audit'
import { formatDateTime } from '@/lib/format'
import { useToastStore } from '@/stores/toast'
import { useDialogStore } from '@/stores/dialog'

const toast = useToastStore()
const dialog = useDialogStore()

const loading = ref(true)
const tableMissing = ref(false)
const logs = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 30
const filters = reactive({ keyword: '', targetType: '', action: '', start: '', end: '' })

async function load() {
  loading.value = true
  try {
    const { items, total: count } = await listAuditLogs({ ...filters, page: page.value, pageSize })
    logs.value = items
    total.value = count
    tableMissing.value = false
  } catch (err) {
    // 表未创建时给出明确指引，而不是笼统报错
    if (/does not exist|PGRST205|schema cache|relation/i.test(err.message || '')) {
      tableMissing.value = true
      logs.value = []
      total.value = 0
    } else {
      toast.error(err.message)
    }
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  page.value = 1
  load()
}

function resetFilters() {
  filters.keyword = ''
  filters.targetType = ''
  filters.action = ''
  filters.start = ''
  filters.end = ''
  applyFilters()
}

function exportCsv() {
  const head = ['时间', '操作人', '动作', '对象', '描述']
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [head.join(',')]
  for (const l of logs.value) {
    lines.push(
      [
        formatDateTime(l.created_at),
        l.actor_name || '',
        auditActionMeta(l.action).label,
        auditTargetLabel(l.target_type),
        l.summary,
      ]
        .map(esc)
        .join(','),
    )
  }
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `操作日志_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function purgeOld() {
  const d = new Date()
  d.setDate(d.getDate() - 90)
  const iso = d.toISOString()
  const ok = await dialog.confirm({
    title: '清理历史日志',
    message: `确认删除 ${d.toLocaleDateString('zh-CN')} 之前的操作日志吗？该操作不可撤销。`,
    confirmText: '清理',
    danger: true,
  })
  if (!ok) return
  try {
    const n = await purgeAuditLogsBefore(iso)
    toast.success(`已清理 ${n} 条历史日志`)
    load()
  } catch (err) {
    toast.error(err.message)
  }
}

watch(page, load)
onMounted(load)
</script>
