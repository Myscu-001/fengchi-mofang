<template>
  <div class="ui-ss">
    <!-- 触发器：外观与 .fc-input 一致，点它不会唤起键盘（是 button，不是 input） -->
    <button
      type="button"
      class="ui-ss-trigger"
      :disabled="disabled"
      @click="open = true"
    >
      <span class="ui-ss-label" :class="isPlaceholder ? 'ui-ss-label--ph' : ''">
        {{ currentLabel }}
      </span>
      <ChevronDown class="ui-ss-caret" />
    </button>

    <UiSheet :open="open" :title="title" @close="open = false">
      <ul class="ui-ss-list">
        <li v-for="opt in options" :key="String(opt.value)">
          <button
            type="button"
            class="ui-ss-opt"
            :class="opt.value === modelValue ? 'ui-ss-opt--on' : ''"
            @click="choose(opt)"
          >
            <span class="ui-ss-opt-text">
              {{ opt.label }}
              <small v-if="opt.hint" class="ui-ss-opt-hint">{{ opt.hint }}</small>
            </span>
            <Check v-if="opt.value === modelValue" class="ui-ss-check" />
          </button>
        </li>
      </ul>
    </UiSheet>
  </div>
</template>

<script setup>
/**
 * 手机端专用的「抽屉式下拉选择器」。
 *
 * 为什么不直接用原生 <select>：在安卓 App 的 WebView 里，给 select 加了
 * `appearance:none` + 自定义背景箭头之后，点击弹出来的是 Chromium 自绘的列表，
 * 在部分机型上会渲染成一片空白 —— 用户什么也看不见、没法选。
 * 换成 UiSheet + 按钮列表，既躲开这个坑，触控手感也更像原生 App。
 *
 * 桌面端（lg 及以上）请继续用原生 <select>，体验更顺。
 */
import { computed, ref } from 'vue'
import { Check, ChevronDown } from 'lucide-vue-next'
import UiSheet from '@/components/UiSheet.vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  /** [{ value, label, hint? }] */
  options: { type: Array, default: () => [] },
  title: { type: String, default: '请选择' },
  placeholder: { type: String, default: '请选择' },
  disabled: Boolean,
})

const emit = defineEmits(['update:modelValue', 'change'])

const open = ref(false)

const current = computed(() => props.options.find((o) => o.value === props.modelValue))
const currentLabel = computed(() => current.value?.label ?? props.placeholder)
const isPlaceholder = computed(() => !current.value)

function choose(opt) {
  open.value = false
  if (opt.value === props.modelValue) return
  emit('update:modelValue', opt.value)
  emit('change', opt.value)
}
</script>

<style scoped>
/* 类名独占 ui-ss-* 前缀：绝不能与本组件外的任何全局样式同名（踩过 UiSheet 撞名的坑） */
.ui-ss {
  display: block;
}

.ui-ss-trigger {
  display: flex;
  width: 100%;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px;
  border: 1px solid var(--color-ink-200, #e3e5e2);
  border-radius: var(--radius-field, 10px);
  background: #fff;
  font-size: 15px;
  color: var(--color-ink-800, #14170f);
  text-align: left;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}
.ui-ss-trigger:active:not(:disabled) {
  border-color: var(--color-brand-500, #e8564f);
}
.ui-ss-trigger:disabled {
  background: var(--color-ink-100, #f1f2f0);
  color: var(--color-ink-400, #8b918a);
  cursor: not-allowed;
}

.ui-ss-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ui-ss-label--ph {
  color: var(--color-ink-400, #8b918a);
}

.ui-ss-caret {
  flex: none;
  width: 16px;
  height: 16px;
  color: var(--color-ink-400, #8b918a);
}

/* ---------- 抽屉里的选项列表 ---------- */
.ui-ss-list {
  padding: 6px 0 10px;
}

.ui-ss-opt {
  display: flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 16px;
  font-size: 15px;
  color: var(--color-ink-700, #3d4239);
  text-align: left;
}

.ui-ss-opt:active {
  background: var(--color-ink-100, #f1f2f0);
}

@media (hover: hover) {
  .ui-ss-opt:hover {
    background: var(--color-ink-50, #f7f8f6);
  }
}

.ui-ss-opt--on {
  background: var(--color-brand-50, #fdf1f0);
  color: var(--color-brand-600, #d4453c);
  font-weight: 600;
}

.ui-ss-opt-text {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.ui-ss-opt-hint {
  margin-top: 2px;
  font-size: 12px;
  font-weight: 400;
  color: var(--color-ink-400, #8b918a);
}

.ui-ss-check {
  flex: none;
  width: 17px;
  height: 17px;
  color: var(--color-brand-600, #d4453c);
}
</style>
