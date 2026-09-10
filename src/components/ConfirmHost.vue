<template>
  <Teleport to="body">
    <Transition name="fc-confirm">
      <div
        v-if="dialog.open"
        class="fixed inset-0 z-[130] flex items-center justify-center p-4"
        @keydown.esc="dialog.settle(false)"
      >
        <div class="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]" @click="dialog.settle(false)" />
        <div class="relative w-full max-w-[420px] rounded-2xl border border-ink-200 bg-white p-5 shadow-lift">
          <div class="flex items-start gap-3">
            <div
              class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full"
              :class="dialog.danger ? 'bg-red-50 text-red-500' : 'bg-brand-50 text-brand-600'"
            >
              <TriangleAlert v-if="dialog.danger" class="size-4.5" />
              <CircleAlert v-else class="size-4.5" />
            </div>
            <div class="flex-1">
              <h3 class="text-[15px] font-semibold text-ink-900">{{ dialog.title }}</h3>
              <p v-if="dialog.message" class="mt-1.5 text-sm leading-relaxed text-ink-600">
                {{ dialog.message }}
              </p>
              <p v-if="dialog.detail" class="mt-2 rounded-lg bg-ink-50 px-2.5 py-2 text-xs text-ink-500">
                {{ dialog.detail }}
              </p>
            </div>
          </div>

          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-[10px] border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
              @click="dialog.settle(false)"
            >
              {{ dialog.cancelText }}
            </button>
            <button
              type="button"
              class="rounded-[10px] px-4 py-2 text-sm font-medium text-white transition"
              :class="dialog.danger ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-600 hover:bg-brand-700'"
              @click="dialog.settle(true)"
            >
              {{ dialog.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { CircleAlert, TriangleAlert } from 'lucide-vue-next'
import { useDialogStore } from '@/stores/dialog'

const dialog = useDialogStore()
</script>

<style>
.fc-confirm-enter-active,
.fc-confirm-leave-active {
  transition: opacity 0.2s ease;
}
.fc-confirm-enter-active .relative,
.fc-confirm-leave-active .relative {
  transition: transform 0.2s ease;
}
.fc-confirm-enter-from,
.fc-confirm-leave-to {
  opacity: 0;
}
.fc-confirm-enter-from .relative,
.fc-confirm-leave-to .relative {
  transform: scale(0.96) translateY(6px);
}
</style>
