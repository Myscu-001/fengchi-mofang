<template>
  <Teleport to="body">
    <Transition name="fc-fsheet">
      <div v-if="open" class="fc-fsheet-root">
        <div class="fc-fsheet-mask" @click="$emit('close')" />

        <div class="fc-fsheet-panel">
          <span class="fc-fsheet-grip" />

          <header class="fc-fsheet-head">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="size-2.5 shrink-0 rounded-sm" :style="{ background: groupColor }" />
                <h3 class="truncate text-[16px] font-bold text-ink-900">{{ item?.title || '公式' }}</h3>
              </div>
              <p class="mt-1 flex flex-wrap items-center gap-x-2.5 text-[12px] text-ink-400">
                <span>{{ item?.label }}</span>
                <span v-if="learned" class="text-emerald-600">
                  已掌握{{ learnedDate ? ` ${learnedDate}` : '' }}
                </span>
                <span v-else>尚未掌握</span>
              </p>
            </div>
            <button type="button" class="fc-fsheet-x" aria-label="关闭" @click="$emit('close')">
              <X class="size-4.5" />
            </button>
          </header>

          <div class="fc-fsheet-body">
            <!-- 情况图案：沿用卡片上的图，不额外画一套 -->
            <div class="fc-fsheet-fig">
              <div v-html="figure" />
            </div>

            <p
              v-if="!canEdit && !hasAny"
              class="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-[12.5px] leading-relaxed text-amber-700"
            >
              这个情况还没有录入公式。
            </p>

            <!-- 复原公式 -->
            <section class="fc-fsheet-block">
              <div class="fc-fsheet-lbl">
                <b>复原公式</b>
                <span>看到这个情况时，照着做就能复原</span>
                <button
                  v-if="!canEdit && draft.solve"
                  type="button"
                  class="fc-fsheet-copy"
                  @click="copy(draft.solve, 'solve')"
                >
                  <component :is="copied === 'solve' ? Check : Copy" class="size-3.5" />
                  {{ copied === 'solve' ? '已复制' : '复制' }}
                </button>
              </div>

              <textarea
                v-if="canEdit"
                v-model="draft.solve"
                class="fc-fsheet-input"
                rows="2"
                spellcheck="false"
                placeholder="例如：R U R' U' R' F R F'"
              />
              <p v-else class="fc-fsheet-formula" :class="{ empty: !draft.solve }">
                {{ draft.solve || '暂未录入' }}
              </p>
            </section>

            <!-- 构造公式（打乱公式） -->
            <section class="fc-fsheet-block">
              <div class="fc-fsheet-lbl">
                <b>构造公式</b>
                <span>把复原好的魔方做一遍，就摆成这个情况</span>
                <button
                  v-if="!canEdit && draft.setup"
                  type="button"
                  class="fc-fsheet-copy"
                  @click="copy(draft.setup, 'setup')"
                >
                  <component :is="copied === 'setup' ? Check : Copy" class="size-3.5" />
                  {{ copied === 'setup' ? '已复制' : '复制' }}
                </button>
              </div>

              <textarea
                v-if="canEdit"
                v-model="draft.setup"
                class="fc-fsheet-input"
                rows="2"
                spellcheck="false"
                placeholder="留空可点右侧「按复原公式求逆」自动生成"
              />
              <p v-else class="fc-fsheet-formula" :class="{ empty: !draft.setup }">
                {{ draft.setup || '暂未录入' }}
              </p>

              <div v-if="canEdit" class="mt-2 flex flex-wrap items-center gap-2">
                <UiButton size="sm" variant="outline" :disabled="!draft.solve" @click="fillInverse">
                  <template #icon><Wand2 class="size-3.5" /></template>
                  按复原公式求逆
                </UiButton>
                <span v-if="inverseHint" class="text-[11.5px] text-emerald-600">{{ inverseHint }}</span>
              </div>
            </section>

            <p class="fc-fsheet-note">
              <b>支持标准魔方记号</b>：R L U D F B（加 <code>'</code> 表示逆时针、<code>2</code> 表示转两下），
              宽层 Rw / r、中层 M E S、整体旋转 x y z 都能识别。空格、换行、括号随意。
            </p>
          </div>

          <footer v-if="canEdit" class="fc-fsheet-foot">
            <span v-if="dirty" class="mr-auto text-[12px] font-medium text-amber-600">有未保存的改动</span>
            <span v-else class="mr-auto text-[12px] text-ink-400">公式全机构共用·所有学员都能看到</span>
            <UiButton size="sm" variant="primary" :loading="saving" :disabled="!dirty" @click="submit">
              保存公式
            </UiButton>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Check, Copy, Wand2, X } from 'lucide-vue-next'
import UiButton from '@/components/UiButton.vue'
import { CFOP_GROUPS } from '@/lib/cfop'
import { formatFormula, invertFormula } from '@/lib/cubeFormula'

const props = defineProps({
  open: Boolean,
  item: { type: Object, default: null },
  figure: { type: String, default: '' },
  formula: { type: Object, default: () => ({}) },
  canEdit: Boolean,
  learned: Boolean,
  learnedDate: { type: String, default: '' },
  saving: Boolean,
  /** 父组件每次保存成功会 +1；用它把 baseline 对齐到已保存的内容 */
  savedTick: { type: Number, default: 0 },
})

const emit = defineEmits(['close', 'save'])

const draft = ref({ solve: '', setup: '' })
const baseline = ref({ solve: '', setup: '' })
const copied = ref('')
const inverseHint = ref('')

const groupColor = computed(
  () => CFOP_GROUPS.find((g) => g.key === props.item?.group)?.color || '#8B918A',
)
const hasAny = computed(() => !!(draft.value.solve || draft.value.setup))
const dirty = computed(
  () => draft.value.solve !== baseline.value.solve || draft.value.setup !== baseline.value.setup,
)

/* 每次打开都从库里取值重填，避免残留上一条情况的编辑内容 */
watch(
  () => [props.open, props.item?.key],
  () => {
    if (!props.open) return
    const solve = String(props.formula?.solve || '')
    const setup = String(props.formula?.setup || '')
    draft.value = { solve, setup }
    baseline.value = { solve, setup }
    copied.value = ''
    inverseHint.value = ''
  },
  { immediate: true },
)

/** 清掉「已复制」提示，避免用户改了公式后还显示上一次的复制状态 */
watch(draft, () => {
  copied.value = ''
  inverseHint.value = ''
}, { deep: true })

/* 保存成功后父组件把 savedTick +1：把「已保存」基准对齐到当前内容，
   dirty 变回 false —— 于是不关弹层也能接着改同一条、再存一次。 */
watch(
  () => props.savedTick,
  () => {
    baseline.value = { ...draft.value }
  },
)

function fillInverse() {
  const inv = invertFormula(draft.value.solve)
  if (!inv) {
    inverseHint.value = '复原公式里没识别到有效的转动记号'
    return
  }
  draft.value = { ...draft.value, setup: inv }
  inverseHint.value = '已按复原公式求逆填入'
}

async function copy(text, which) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = which
  } catch {
    // 非 https 或浏览器不支持时静默失败，不打断查看
  }
}

function submit() {
  emit('save', {
    key: props.item?.key,
    solve: formatFormula(draft.value.solve),
    setup: formatFormula(draft.value.setup),
  })
}

/* ---------- 原生手感：锁背景滚动 + Esc 关闭 ---------- */

function onKeydown(e) {
  if (e.key === 'Escape' && props.open) emit('close')
}

/* 打开时锁住 body 滚动，否则手机在抽屉里往下滑，背景页面会跟着滚 */
let prevOverflow = ''
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
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = prevOverflow || ''
})
</script>

<style>
/* 手机端：底部升起；桌面端：居中卡片。内容多时只滚中间，头尾固定。 */
.fc-fsheet-root {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.fc-fsheet-mask {
  position: absolute;
  inset: 0;
  background: rgb(20 23 15 / 0.4);
  backdrop-filter: blur(2px);
}
.fc-fsheet-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 88vh;
  background: #fff;
  border-radius: 22px 22px 0 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  box-shadow: 0 -14px 44px -14px rgb(20 23 15 / 0.3);
}
.fc-fsheet-grip {
  width: 38px;
  height: 4px;
  border-radius: 3px;
  background: var(--color-ink-200);
  margin: 8px auto 2px;
  flex: none;
}
.fc-fsheet-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 18px 12px;
  border-bottom: 1px solid var(--color-ink-100);
  flex: none;
}
.fc-fsheet-x {
  flex: none;
  border: 0;
  background: none;
  padding: 6px;
  border-radius: 9px;
  color: var(--color-ink-400);
  transition: background-color 0.15s ease;
}
.fc-fsheet-x:active {
  background: var(--color-ink-100);
}
.fc-fsheet-body {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 16px 18px 18px;
}
.fc-fsheet-fig {
  display: flex;
  justify-content: center;
  padding: 12px;
  border-radius: 14px;
  background: var(--color-ink-50);
}
.fc-fsheet-fig svg {
  display: block;
}
.fc-fsheet-block {
  margin-top: 16px;
}
.fc-fsheet-lbl {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 7px;
}
.fc-fsheet-lbl b {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--color-ink-900);
}
.fc-fsheet-lbl > span {
  font-size: 11.5px;
  color: var(--color-ink-400);
}
.fc-fsheet-copy {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--color-ink-200);
  background: #fff;
  border-radius: 8px;
  padding: 3px 8px;
  font-size: 11.5px;
  color: var(--color-ink-600);
}
.fc-fsheet-copy:active {
  background: var(--color-ink-100);
}
/* 公式一律等宽字体：字母形状差别大，一眼能看出 U 和 U' 的区别 */
.fc-fsheet-formula,
.fc-fsheet-input {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 15px;
  line-height: 1.7;
  letter-spacing: 0.4px;
  word-break: break-word;
}
.fc-fsheet-formula {
  margin: 0;
  padding: 11px 13px;
  border-radius: 11px;
  background: var(--color-ink-50);
  color: var(--color-ink-900);
  white-space: pre-wrap;
}
.fc-fsheet-formula.empty {
  color: var(--color-ink-400);
  font-family: inherit;
  font-size: 13px;
  letter-spacing: 0;
}
.fc-fsheet-input {
  display: block;
  width: 100%;
  padding: 11px 13px;
  border: 1px solid var(--color-ink-200);
  border-radius: 11px;
  background: #fff;
  color: var(--color-ink-900);
  resize: vertical;
}
.fc-fsheet-input:focus {
  outline: none;
  border-color: var(--color-brand-500);
  box-shadow: 0 0 0 3px rgb(232 86 79 / 0.14);
}
.fc-fsheet-note {
  margin: 18px 0 0;
  font-size: 11.5px;
  line-height: 1.75;
  color: var(--color-ink-400);
}
.fc-fsheet-note code {
  padding: 1px 4px;
  border-radius: 5px;
  background: var(--color-ink-100);
  font-size: 11px;
}
.fc-fsheet-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
  padding: 12px 18px;
  border-top: 1px solid var(--color-ink-200);
  background: var(--color-ink-50);
}

/* ---------- 桌面端：改成居中弹窗 ---------- */
@media (min-width: 1024px) {
  .fc-fsheet-root {
    align-items: center;
    padding: 24px;
  }
  .fc-fsheet-panel {
    width: 100%;
    max-width: 600px;
    max-height: 86vh;
    border-radius: 16px;
    padding-bottom: 0;
    box-shadow: var(--shadow-lift);
  }
  .fc-fsheet-grip {
    display: none;
  }
  .fc-fsheet-head {
    padding: 16px 20px 14px;
  }
  .fc-fsheet-x:hover {
    background: var(--color-ink-100);
    color: var(--color-ink-700);
  }
  .fc-fsheet-body {
    padding: 18px 20px 20px;
  }
  .fc-fsheet-foot {
    padding: 13px 20px;
    border-radius: 0 0 16px 16px;
  }
  .fc-fsheet-copy:hover {
    background: var(--color-ink-50);
  }
  .fc-fsheet-formula {
    font-size: 16px;
  }
}

/* ---------- 过渡：手机向上滑入，桌面淡入微缩放 ---------- */
.fc-fsheet-enter-active,
.fc-fsheet-leave-active {
  transition: opacity 0.24s ease;
}
.fc-fsheet-enter-from,
.fc-fsheet-leave-to {
  opacity: 0;
}
.fc-fsheet-enter-active .fc-fsheet-panel,
.fc-fsheet-leave-active .fc-fsheet-panel {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.fc-fsheet-enter-from .fc-fsheet-panel,
.fc-fsheet-leave-to .fc-fsheet-panel {
  transform: translateY(102%);
}
@media (min-width: 1024px) {
  .fc-fsheet-enter-from .fc-fsheet-panel,
  .fc-fsheet-leave-to .fc-fsheet-panel {
    transform: translateY(8px) scale(0.985);
  }
}
</style>
