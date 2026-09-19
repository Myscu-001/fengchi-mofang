<template>
  <button
    type="button"
    role="switch"
    :aria-checked="model"
    class="fc-switch"
    :class="{ 'is-on': model }"
    @click="toggle"
  >
    <span class="fc-switch-knob" />
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const model = computed(() => props.modelValue)
function toggle() {
  emit('update:modelValue', !props.modelValue)
}
</script>

<style scoped>
.fc-switch {
  position: relative;
  width: 46px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--color-ink-300);
  transition: background 0.22s ease;
}
.fc-switch.is-on {
  background: var(--color-brand-500);
}
.fc-switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 2px rgb(20 23 15 / 0.3);
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.fc-switch.is-on .fc-switch-knob {
  transform: translateX(18px);
}
/* 按下时滑块微微拉长，复刻 iOS 的「弹性」手感 */
.fc-switch:active .fc-switch-knob {
  width: 28px;
}
.fc-switch:focus-visible {
  outline: 2px solid var(--color-brand-500);
  outline-offset: 2px;
}
</style>
