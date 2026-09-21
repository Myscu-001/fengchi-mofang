<template>
  <Teleport to="body">
    <Transition name="ui-sheet">
      <div v-if="open" class="ui-sheet-root">
        <!-- 遮罩：点击关闭（层级显式压在面板之下，见下方样式） -->
        <div
          class="ui-sheet-mask"
          @click="closeOnOverlay && $emit('close')"
        />

        <div class="ui-sheet-panel" role="dialog" aria-modal="true">
          <header class="ui-sheet-head">
            <div class="min-w-0">
              <slot name="header">
                <h3 class="ui-sheet-title">{{ title }}</h3>
                <p v-if="subtitle" class="ui-sheet-sub">{{ subtitle }}</p>
              </slot>
            </div>
            <button type="button" class="ui-sheet-x" aria-label="关闭" @click="$emit('close')">
              <X class="size-4.5" />
            </button>
          </header>

          <div class="ui-sheet-body">
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
/* ⚠️ 类名必须用 ui-sheet-* 前缀，且与本组件外的任何全局样式隔离：
   之前叫 fc-sheet-*，与 styles/app-workbench.css 里「系统管理抽屉」的
   .fc-sheet-mask 撞名 —— 全局那条写了 z-index: 60，而本组件（scoped）没写，
   结果遮罩被顶到面板之上：整屏被 34% 深色 + blur 盖住（看着发虚发糊），
   且遮罩吃掉全部点击 → 关不掉、点不动。
   现改为独占前缀 + 显式层级（mask 0 / panel 1），从根上杜绝再次发生。 */

/* 手机端：底部升起的抽屉；桌面端：居中弹窗（见下方媒体查询） */
.ui-sheet-root {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.ui-sheet-mask {
  position: absolute;
  inset: 0;
  z-index: 0;
  /* 不用 backdrop-filter：全视口模糊会让 Chromium 把整屏按低分辨率光栅化，
     文字会整体发虚，而且低端机/软件渲染下容易卡顿。纯色遮罩更稳、更接近原生。 */
  background: rgb(20 23 15 / 0.42);
}

.ui-sheet-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 92vh;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: #fff;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -8px 40px -8px rgb(20 23 15 / 0.28);
}

/* ---------- 头部：固定不滚 ---------- */
.ui-sheet-head {
  display: flex;
  flex: none;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--color-ink-200, #e3e5e2);
}
.ui-sheet-title {
  margin: 0;
  font-size: 15.5px;
  font-weight: 700;
  color: var(--color-ink-900, #14170f);
}
.ui-sheet-sub {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--color-ink-400, #8b918a);
}
.ui-sheet-x {
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
.ui-sheet-x:hover {
  background: var(--color-ink-100, #f1f2f0);
  color: var(--color-ink-700, #3d4239);
}
.ui-sheet-x:active {
  background: var(--color-ink-100, #f1f2f0);
  color: var(--color-ink-700, #3d4239);
}

/* ---------- 内容：内部滚动，不带动背景页面 ---------- */
.ui-sheet-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

@media (min-width: 1024px) {
  .ui-sheet-root {
    align-items: center;
    padding: 24px;
  }
  .ui-sheet-panel {
    width: 100%;
    max-width: 1060px;
    max-height: 86vh;
    padding-bottom: 0;
    border-radius: 18px;
    box-shadow: 0 20px 60px -12px rgb(20 23 15 / 0.32);
  }
  .ui-sheet-head {
    padding: 16px 22px 13px;
  }
  .ui-sheet-body {
    padding-bottom: 4px;
  }
}

/* ---------- 过渡：手机自下升起 / 桌面淡入上浮 ---------- */
.ui-sheet-enter-active,
.ui-sheet-leave-active {
  transition: opacity 0.2s ease;
}
.ui-sheet-enter-active .ui-sheet-panel,
.ui-sheet-leave-active .ui-sheet-panel {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.ui-sheet-enter-from,
.ui-sheet-leave-to {
  opacity: 0;
}
.ui-sheet-enter-from .ui-sheet-panel,
.ui-sheet-leave-to .ui-sheet-panel {
  transform: translateY(100%);
}
@media (min-width: 1024px) {
  .ui-sheet-enter-from .ui-sheet-panel,
  .ui-sheet-leave-to .ui-sheet-panel {
    transform: translateY(12px) scale(0.985);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ui-sheet-enter-active,
  .ui-sheet-leave-active,
  .ui-sheet-enter-active .ui-sheet-panel,
  .ui-sheet-leave-active .ui-sheet-panel {
    transition: none;
  }
}
</style>
