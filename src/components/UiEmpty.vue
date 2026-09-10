<template>
  <div class="flex flex-col items-center justify-center px-6 py-14 text-center">
    <div class="flex size-14 items-center justify-center rounded-2xl border border-ink-200 bg-white text-ink-300 shadow-soft">
      <component :is="icon" class="size-6" />
    </div>
    <h3 class="mt-4 text-[15px] font-semibold text-ink-800">{{ title }}</h3>
    <p v-if="description" class="mt-1.5 max-w-md text-sm leading-relaxed text-ink-500">
      {{ description }}
    </p>
    <div v-if="$slots.default" class="mt-5">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { Inbox } from 'lucide-vue-next'

defineProps({
  /** 传入 lucide 图标组件，如 :icon="BookOpen" */
  icon: { type: [Object, Function], default: () => Inbox },
  title: { type: String, default: '暂无数据' },
  description: { type: String, default: '' },
})
</script>
