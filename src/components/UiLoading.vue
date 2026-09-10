<template>
  <div class="flex flex-col items-center justify-center gap-2.5 py-12 text-ink-400">
    <Loader2 class="size-5 animate-spin text-brand-500" />
    <p class="text-[13px]">{{ text }}</p>
  </div>
</template>

<script setup>
import { Loader2 } from 'lucide-vue-next'

defineProps({
  text: { type: String, default: '加载中…' },
})
</script>
