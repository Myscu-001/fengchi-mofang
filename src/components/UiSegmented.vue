<template>
  <div ref="root" class="fc-segmented">
    <span ref="pill" class="fc-segmented-pill" />
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="fc-segmented-item"
      :class="{ 'is-active': model === opt.value }"
      @click="select(opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'

const props = defineProps({
  options: { type: Array, required: true }, // [{ label, value }]
  modelValue: { type: [String, Number], default: '' },
})
const emit = defineEmits(['update:modelValue'])

const root = ref(null)
const pill = ref(null)
const model = ref(props.modelValue)

function select(value) {
  model.value = value
  emit('update:modelValue', value)
}

function movePill() {
  const active = root.value?.querySelector('.fc-segmented-item.is-active')
  if (active && pill.value) {
    pill.value.style.width = `${active.offsetWidth}px`
    pill.value.style.left = `${active.offsetLeft}px`
  }
}

function onResize() {
  nextTick(movePill)
}

onMounted(() => {
  nextTick(movePill)
  window.addEventListener('resize', onResize)
  // 字体加载完成后宽度会变化，补一次定位
  if (document.fonts?.ready) document.fonts.ready.then(() => nextTick(movePill))
})
onBeforeUnmount(() => window.removeEventListener('resize', onResize))
watch(() => props.modelValue, (v) => {
  model.value = v
  nextTick(movePill)
})
</script>

<style scoped>
.fc-segmented {
  position: relative;
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: var(--color-ink-100);
  border-radius: 999px;
}
.fc-segmented-pill {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 0;
  z-index: 0;
  border-radius: 999px;
  background: #fff;
  box-shadow: var(--shadow-soft);
  transition:
    left 0.28s cubic-bezier(0.16, 1, 0.3, 1),
    width 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
.fc-segmented-item {
  position: relative;
  z-index: 1;
  border: 0;
  background: transparent;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-ink-500);
  border-radius: 999px;
  transition: color 0.2s ease;
  cursor: pointer;
}
.fc-segmented-item.is-active {
  color: var(--color-ink-900);
}
</style>
