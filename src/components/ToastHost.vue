<template>
  <div class="pointer-events-none fixed top-4 right-4 z-[120] flex w-[min(92vw,380px)] flex-col gap-2">
    <TransitionGroup name="fc-toast">
      <div
        v-for="t in toast.items"
        :key="t.id"
        class="pointer-events-auto flex items-start gap-3 rounded-xl border bg-white px-3.5 py-3 shadow-lift"
        :class="styles[t.type]?.box || styles.info.box"
      >
        <component :is="styles[t.type]?.icon || CircleAlert" class="mt-0.5 size-4 shrink-0" :class="styles[t.type]?.iconColor" />
        <p class="flex-1 text-sm leading-relaxed break-words text-ink-800">{{ t.message }}</p>
        <button
          type="button"
          class="mt-0.5 rounded p-0.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-600"
          @click="toast.remove(t.id)"
        >
          <X class="size-3.5" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()

const styles = {
  success: {
    box: 'border-emerald-200',
    icon: CircleCheck,
    iconColor: 'text-emerald-500',
  },
  error: {
    box: 'border-red-200',
    icon: TriangleAlert,
    iconColor: 'text-red-500',
  },
  warning: {
    box: 'border-amber-200',
    icon: TriangleAlert,
    iconColor: 'text-amber-500',
  },
  info: {
    box: 'border-brand-200',
    icon: Info,
    iconColor: 'text-brand-500',
  },
}
</script>

<style>
.fc-toast-enter-active,
.fc-toast-leave-active {
  transition: all 0.25s ease;
}
.fc-toast-enter-from {
  opacity: 0;
  transform: translateX(16px) scale(0.98);
}
.fc-toast-leave-to {
  opacity: 0;
  transform: translateX(16px) scale(0.98);
}
</style>
