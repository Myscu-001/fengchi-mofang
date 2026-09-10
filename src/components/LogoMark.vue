<template>
  <div class="flex items-center gap-2.5">
    <svg :width="size" :height="size" viewBox="0 0 64 64" class="shrink-0 rounded-[10px]">
      <rect width="64" height="64" rx="14" fill="#1f47f5" />
      <rect x="8" y="8" width="14" height="14" rx="3" fill="#ef4444" />
      <rect x="25" y="8" width="14" height="14" rx="3" fill="#facc15" />
      <rect x="42" y="8" width="14" height="14" rx="3" fill="#3b82f6" />
      <rect x="8" y="25" width="14" height="14" rx="3" fill="#f97316" />
      <rect x="25" y="25" width="14" height="14" rx="3" fill="#ffffff" />
      <rect x="42" y="25" width="14" height="14" rx="3" fill="#22c55e" />
      <rect x="8" y="42" width="14" height="14" rx="3" fill="#22c55e" />
      <rect x="25" y="42" width="14" height="14" rx="3" fill="#3b82f6" />
      <rect x="42" y="42" width="14" height="14" rx="3" fill="#ef4444" />
    </svg>
    <div v-if="showText" class="leading-tight">
      <p class="text-[15px] font-semibold tracking-tight text-ink-900">
        {{ brand.name }}
      </p>
      <p class="text-[11px] text-ink-500">{{ brand.sub }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  size: { type: Number, default: 34 },
  showText: { type: Boolean, default: true },
  brand: {
    type: Object,
    default: () => ({ name: '风驰思维魔方', sub: '教学管理系统' }),
  },
})
</script>
