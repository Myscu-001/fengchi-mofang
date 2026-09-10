<template>
  <span
    class="flex shrink-0 items-center justify-center rounded-lg"
    :class="withLabel ? 'h-7 gap-1.5 rounded-full px-2.5' : 'size-9'"
    :style="{ backgroundColor: `${meta.color}1f` }"
    :title="meta.label"
  >
    <span class="rounded-sm" :class="withLabel ? 'size-2' : 'size-2.5'" :style="{ backgroundColor: meta.color }" />
    <span v-if="withLabel" class="text-[11.5px] font-medium" :style="{ color: meta.deepColor }">
      {{ meta.short }}
    </span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { trackMeta } from '@/lib/dict'

const props = defineProps({
  track: { type: String, default: '' },
  withLabel: { type: Boolean, default: false },
})

const FALLBACK = { value: '未分类', label: '未分类', short: '未分类', color: '#A0A69C', deepColor: '#545A51' }

const meta = computed(() => trackMeta(props.track) || FALLBACK)
</script>
