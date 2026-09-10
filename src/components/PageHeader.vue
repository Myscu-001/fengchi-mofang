<template>
  <div class="border-b border-ink-200 bg-white">
    <div class="fc-container flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-5">
      <div class="min-w-0">
        <div class="flex items-center gap-2.5">
          <h1 class="text-[20px] font-semibold tracking-tight text-ink-900">{{ title }}</h1>
          <slot name="badge" />
        </div>
        <p v-if="description" class="mt-1 text-[13px] text-ink-500">{{ description }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
})
</script>
