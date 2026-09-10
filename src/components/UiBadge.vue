<template>
  <span
    class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap"
    :class="customClass || 'bg-ink-100 text-ink-600 border-ink-200'"
  >
    <span v-if="dot" class="size-1.5 rounded-full" :class="dot" />
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup>
defineProps({
  label: { type: String, default: '' },
  customClass: { type: String, default: '' },
  dot: { type: String, default: '' },
})
</script>
