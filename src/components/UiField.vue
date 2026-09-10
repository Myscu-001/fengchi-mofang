<template>
  <label class="block">
    <span v-if="label" class="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-ink-700">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </span>
    <slot />
    <span v-if="error" class="mt-1 block text-xs text-red-500">{{ error }}</span>
    <span v-else-if="hint" class="mt-1 block text-xs text-ink-400">{{ hint }}</span>
  </label>
</template>

<script setup>
defineProps({
  label: { type: String, default: '' },
  required: Boolean,
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
})
</script>
