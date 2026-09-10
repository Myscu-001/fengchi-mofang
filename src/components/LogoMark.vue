<template>
  <!-- 完整标准字组合：立方体图标 + 中英文标准字（页脚、登录页使用） -->
  <img
    v-if="lockup"
    :src="assetUrl(brand.logo_url)"
    :style="{ height: `${size}px` }"
    class="w-auto select-none"
    :alt="brand.full_name || brand.name"
  />

  <!-- 图标 + 文字组合（导航栏使用，小尺寸下更清晰） -->
  <div v-else class="flex items-center gap-2.5">
    <img
      :src="assetUrl(brand.logo_mark_url)"
      :style="{ width: `${size}px`, height: `${size}px` }"
      class="shrink-0 object-contain select-none"
      :alt="brand.name"
    />
    <div v-if="showText" class="leading-tight">
      <p class="text-[15px] font-semibold tracking-tight text-ink-900">
        {{ brand.name }}
      </p>
      <p class="text-[11px] text-ink-500">{{ brand.sub }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { assetUrl } from '@/lib/assets'

const props = defineProps({
  size: { type: Number, default: 36 },
  showText: { type: Boolean, default: true },
  lockup: { type: Boolean, default: false },
  brand: {
    type: Object,
    default: () => ({}),
  },
})

const DEFAULTS = {
  name: '风驰思维',
  full_name: '风驰思维魔方教育',
  logo_url: '/brand/logo.png',
  logo_mark_url: '/brand/logo-mark.png',
}

// 站点配置加载完成后父组件会重新传入 brand，这里保持响应式
const brand = computed(() => ({
  ...DEFAULTS,
  ...(props.brand || {}),
  sub: props.brand?.sub || '教学管理系统',
}))
</script>
