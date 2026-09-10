<template>
  <div class="fc-card p-4.5 transition hover:shadow-lift">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-[13px] text-ink-500">{{ label }}</p>
        <p class="mt-1.5 text-[26px] leading-none font-semibold text-ink-900 tabular-nums">
          {{ displayValue }}
        </p>
      </div>
      <div
        class="flex size-9.5 shrink-0 items-center justify-center rounded-xl"
        :class="toneClass"
      >
        <component :is="icon" class="size-4.5" />
      </div>
    </div>
    <p v-if="hint" class="mt-2.5 text-xs text-ink-500">{{ hint }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Box } from 'lucide-vue-next'

const props = defineProps({
  label: { type: String, default: '' },
  value: { type: [Number, String], default: 0 },
  hint: { type: String, default: '' },
  icon: { type: [Object, Function], default: () => Box },
  tone: { type: String, default: 'brand' }, // brand | green | orange | red | violet | slate
})

const displayValue = computed(() =>
  typeof props.value === 'number' ? props.value.toLocaleString('zh-CN') : props.value,
)

const toneClass = computed(
  () =>
    ({
      brand: 'bg-brand-50 text-brand-600',
      green: 'bg-emerald-50 text-emerald-600',
      orange: 'bg-orange-50 text-orange-500',
      red: 'bg-red-50 text-red-500',
      violet: 'bg-violet-50 text-violet-600',
      slate: 'bg-ink-100 text-ink-600',
    })[props.tone] || 'bg-brand-50 text-brand-600',
)
</script>
