<template>
  <Teleport to="body">
    <Transition name="fc-modal">
      <div v-if="open" class="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto p-4 sm:p-6">
        <div class="fixed inset-0 bg-ink-900/45 backdrop-blur-[2px]" @click="closeOnOverlay && $emit('close')" />

        <div
          class="relative my-auto w-full rounded-2xl border border-ink-200 bg-white shadow-lift"
          :class="widthClass"
        >
          <header
            v-if="title || $slots.header"
            class="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4"
          >
            <div class="min-w-0">
              <slot name="header">
                <h3 class="truncate text-[15px] font-semibold text-ink-900">{{ title }}</h3>
                <p v-if="subtitle" class="mt-0.5 text-xs text-ink-500">{{ subtitle }}</p>
              </slot>
            </div>
            <button
              type="button"
              class="shrink-0 rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
              @click="$emit('close')"
            >
              <X class="size-4" />
            </button>
          </header>

          <div class="px-5 py-4" :class="bodyClass">
            <slot />
          </div>

          <footer
            v-if="$slots.footer"
            class="flex items-center justify-end gap-2 border-t border-ink-200 bg-ink-50/60 px-5 py-3.5"
          >
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  open: Boolean,
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  width: { type: String, default: 'md' }, // sm | md | lg | xl
  closeOnOverlay: { type: Boolean, default: true },
  bodyClass: { type: String, default: '' },
})

defineEmits(['close'])

const widthClass = computed(
  () =>
    ({
      sm: 'max-w-[420px]',
      md: 'max-w-[560px]',
      lg: 'max-w-[760px]',
      xl: 'max-w-[980px]',
    })[props.width] || 'max-w-[560px]',
)
</script>

<style>
.fc-modal-enter-active,
.fc-modal-leave-active {
  transition: opacity 0.2s ease;
}
.fc-modal-enter-active .relative,
.fc-modal-leave-active .relative {
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.fc-modal-enter-from,
.fc-modal-leave-to {
  opacity: 0;
}
.fc-modal-enter-from .relative,
.fc-modal-leave-to .relative {
  transform: translateY(10px) scale(0.985);
}
</style>
