<template>
  <div
    class="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-ink-200 bg-brand-50 font-semibold text-brand-600 uppercase select-none"
    :class="sizeClass"
  >
    <img v-if="src" :src="src" :alt="name" class="size-full object-cover" />
    <span v-else>{{ letter }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  src: { type: String, default: '' },
  name: { type: String, default: '' },
  size: { type: String, default: 'md' }, // xs | sm | md | lg
})

const sizeClass = computed(
  () =>
    ({
      xs: 'size-7 text-[11px]',
      sm: 'size-8 text-xs',
      md: 'size-10 text-sm',
      lg: 'size-16 text-xl',
    })[props.size] || 'size-10 text-sm',
)

const letter = computed(() => (props.name || '?').trim().charAt(0).toUpperCase())
</script>
