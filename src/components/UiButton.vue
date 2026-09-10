<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center gap-1.5 rounded-[10px] font-medium whitespace-nowrap transition select-none disabled:cursor-not-allowed disabled:opacity-55"
    :class="[sizeClass, variantClass, block ? 'w-full' : '']"
    @click="$emit('click', $event)"
  >
    <Loader2 v-if="loading" class="size-3.5 animate-spin" />
    <slot v-else name="icon" />
    <slot />
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { Loader2 } from 'lucide-vue-next'

const props = defineProps({
  variant: { type: String, default: 'primary' }, // primary | secondary | outline | ghost | danger | success
  size: { type: String, default: 'md' }, // sm | md | lg
  type: { type: String, default: 'button' },
  loading: Boolean,
  disabled: Boolean,
  block: Boolean,
})

defineEmits(['click'])

const sizeClass = computed(
  () =>
    ({
      sm: 'h-8 px-3 text-[13px]',
      md: 'h-9.5 px-4 text-sm',
      lg: 'h-11 px-5 text-[15px]',
    })[props.size] || 'h-9.5 px-4 text-sm',
)

const variantClass = computed(
  () =>
    ({
      primary: 'bg-brand-600 text-white shadow-soft hover:bg-brand-700 active:bg-brand-800',
      secondary: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
      outline: 'border border-ink-200 bg-white text-ink-700 hover:bg-ink-50 hover:border-ink-300',
      ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-800',
      danger: 'bg-red-500 text-white hover:bg-red-600',
      success: 'bg-emerald-500 text-white hover:bg-emerald-600',
    })[props.variant] || '',
)
</script>
