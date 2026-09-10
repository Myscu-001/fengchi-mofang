<template>
  <div v-if="total > 0" class="flex flex-wrap items-center justify-between gap-3">
    <p class="text-xs text-ink-500">
      共 <span class="font-semibold text-ink-700">{{ total }}</span> 条 · 第 {{ page }} / {{ totalPages }} 页
    </p>

    <div class="flex items-center gap-1">
      <button
        type="button"
        class="flex size-8 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="page <= 1"
        @click="go(page - 1)"
      >
        <ChevronLeft class="size-4" />
      </button>

      <button
        v-for="p in pages"
        :key="p.key"
        type="button"
        class="min-w-8 rounded-lg border px-2 py-1.5 text-[13px] transition"
        :class="
          p.value === page
            ? 'border-brand-600 bg-brand-600 font-semibold text-white'
            : p.value
              ? 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
              : 'cursor-default border-transparent text-ink-400'
        "
        :disabled="!p.value"
        @click="p.value && go(p.value)"
      >
        {{ p.label }}
      </button>

      <button
        type="button"
        class="flex size-8 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="page >= totalPages"
        @click="go(page + 1)"
      >
        <ChevronRight class="size-4" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 20 },
  total: { type: Number, default: 0 },
})

const emit = defineEmits(['update:page'])

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

const pages = computed(() => {
  const last = totalPages.value
  const cur = props.page
  if (last <= 7) {
    return Array.from({ length: last }, (_, i) => ({ key: `p${i + 1}`, value: i + 1, label: i + 1 }))
  }
  const list = []
  const push = (value, label = String(value)) => list.push({ key: `p${value}-${label}`, value, label })

  push(1)
  if (cur > 3) list.push({ key: 'gap-l', value: 0, label: '…' })
  for (let i = Math.max(2, cur - 1); i <= Math.min(last - 1, cur + 1); i++) push(i)
  if (cur < last - 2) list.push({ key: 'gap-r', value: 0, label: '…' })
  push(last)
  return list
})

function go(target) {
  if (target < 1 || target > totalPages.value || target === props.page) return
  emit('update:page', target)
}
</script>
