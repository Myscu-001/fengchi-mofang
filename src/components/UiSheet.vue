<template>
  <Teleport to="body">
    <Transition name="fc-sheet">
      <div v-if="open" class="fc-sheet-root" @click.self="closeOnOverlay && $emit('close')">
        <div class="fc-sheet-mask" />

        <div class="fc-sheet-panel" role="dialog" aria-modal="true">
          <header class="fc-sheet-head">
            <div class="min-w-0">
              <slot name="header">
                <h3 class="fc-sheet-title">{{ title }}</h3>
                <p v-if="subtitle" class="fc-sheet-sub">{{ subtitle }}</p>
              </slot>
            </div>
            <button type="button" class="fc-sheet-x" aria-label="关闭" @click="$emit('close')">
              <X class="size-4.5" />
            </button>
          </header>

          <div class="fc-sheet-body">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { onBeforeUnmount, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  open: Boolean,
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  /** 点遮罩关闭 */
  closeOnOverlay: { type: Boolean, default: true },
})

const emit = defineEmits(['close'])

/* ---------- 打开时锁背景滚动 + Esc 关闭（原生手感） ---------- */
let prevOverflow = ''

function onKeydown(e) {
  if (e.key === 'Escape' && props.open) emit('close')
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', onKeydown)
    } else {
      document.body.style.overflow = prevOverflow || ''
      window.removeEventListener('keydown', onKeydown)
    }
  },
)

onBeforeUnmount(() => {
  // 组件被销毁时若正处于打开状态，必须把滚动锁解掉，否则整站不能滚
  if (props.open) document.body.style.overflow = prevOverflow || ''
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
/* 手机端：底部升起的抽屉；桌面端：居中弹窗（见下方媒体查询） */
.fc-sheet-root {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.fc-sheet-mask {
  position: absolute;
  inset: 0;
  background: rgba(20, 23, 15, 0.45);
  backdrop-filter: blur(2px);
}

.fc-sheet-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 92vh;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: #fff;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -8px 40px -8px rgba(20, 23, 15, 0.28);
}

/* ---------- 头部：固定不滚 ---------- */
.fc-sheet-head {
  display: flex;
  flex: none;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--color-ink-200, #e3e5e2);
}
.fc-sheet-title {
  margin: 0;
  font-size: 15.5px;
  font-weight: 700;
  color: var(--color-ink-900, #14170f);
}
.fc-sheet-sub {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--color-ink-400, #8b918a);
}
.fc-sheet-x {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  margin: -4px -4px 0 0;
  border-radius: 10px;
  color: var(--color-ink-400, #8b918a);
  transition: background 0.15s, color 0.15s;
}
.fc-sheet-x:active {
  background: var(--color-ink-100, #f1f2f0);
  color: var(--color-ink-700, #3d4239);
}

/* ---------- 内容：内部滚动，不带动背景页面 ---------- */
.fc-sheet-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

@media (min-width: 1024px) {
  .fc-sheet-root {
    align-items: center;
    padding: 24px;
  }
  .fc-sheet-panel {
    width: 100%;
    max-width: 1060px;
    max-height: 86vh;
    padding-bottom: 0;
    border-radius: 18px;
    box-shadow: 0 20px 60px -12px rgba(20, 23, 15, 0.32);
  }
  .fc-sheet-head {
    padding: 16px 22px 13px;
  }
  .fc-sheet-body {
    padding-bottom: 4px;
  }
}

/* ---------- 过渡：手机自下升起 / 桌面淡入上浮 ---------- */
.fc-sheet-enter-active,
.fc-sheet-leave-active {
  transition: opacity 0.2s ease;
}
.fc-sheet-enter-active .fc-sheet-panel,
.fc-sheet-leave-active .fc-sheet-panel {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.fc-sheet-enter-from,
.fc-sheet-leave-to {
  opacity: 0;
}
.fc-sheet-enter-from .fc-sheet-panel,
.fc-sheet-leave-to .fc-sheet-panel {
  transform: translateY(100%);
}
@media (min-width: 1024px) {
  .fc-sheet-enter-from .fc-sheet-panel,
  .fc-sheet-leave-to .fc-sheet-panel {
    transform: translateY(12px) scale(0.985);
  }
}

@media (prefers-reduced-motion: reduce) {
  .fc-sheet-enter-active,
  .fc-sheet-leave-active,
  .fc-sheet-enter-active .fc-sheet-panel,
  .fc-sheet-leave-active .fc-sheet-panel {
    transition: none;
  }
}
</style>
