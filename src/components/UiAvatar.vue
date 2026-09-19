<template>
  <div
    class="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-ink-200 bg-brand-50 font-semibold text-brand-600 uppercase select-none"
    :class="sizeClass"
  >
    <img v-if="showImage" :src="src" :alt="name" class="size-full object-cover" @error="failed = true" />
    <span v-else>{{ letter }}</span>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  src: { type: String, default: '' },
  name: { type: String, default: '' },
  size: { type: String, default: 'md' }, // xs | sm | md | lg | xl
})

const sizeClass = computed(
  () =>
    ({
      xs: 'size-7 text-[11px]',
      sm: 'size-8 text-xs',
      md: 'size-10 text-sm',
      lg: 'size-16 text-xl',
      xl: 'size-20 text-2xl',
    })[props.size] || 'size-10 text-sm',
)

// 图片加载失败（地址失效、文件被删、外部服务不可用）时回退到姓名首字母，
// 否则浏览器会露出一个破图图标，比没有头像更难看。
const failed = ref(false)
watch(
  () => props.src,
  () => {
    // 换了新地址要重新给一次机会，否则一次失败会永久降级成首字母
    failed.value = false
  },
)

const showImage = computed(() => !!props.src && !failed.value)
const letter = computed(() => (props.name || '?').trim().charAt(0).toUpperCase())
</script>
