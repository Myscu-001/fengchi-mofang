<template>
  <div ref="root" class="relative flex shrink-0 self-stretch" @click.stop>
    <button
      type="button"
      class="flex items-center gap-1.5 rounded-[10px] border bg-white px-3 text-[13px] whitespace-nowrap transition select-none"
      :class="open ? 'border-brand-400 text-brand-700' : 'border-ink-200 text-ink-600 active:bg-ink-100'"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="open = !open"
    >
      <Tags class="size-3.5 shrink-0" />
      <span>{{ label }}</span>
      <ChevronDown class="size-3.5 shrink-0 transition-transform" :class="open && 'rotate-180'" />
    </button>

    <Transition name="fc-pop">
      <div
        v-if="open"
        class="absolute top-full right-0 z-30 mt-1.5 w-56 rounded-xl border border-ink-200 bg-white p-1.5 shadow-lift"
        role="listbox"
        aria-multiselectable="true"
      >
        <template v-for="(group, gi) in menuGroups" :key="group.title">
          <p
            class="px-2 pt-1 pb-1 text-[11px] font-medium text-ink-400"
            :class="gi > 0 && 'mt-1 border-t border-ink-100 pt-2'"
          >
            {{ group.title }}
          </p>
          <button
            v-for="item in group.items"
            :key="item.value"
            type="button"
            role="option"
            class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] transition active:bg-ink-100"
            :class="hasTag(item.value) ? 'font-medium text-brand-700' : 'text-ink-700'"
            :aria-selected="hasTag(item.value)"
            @click="toggle(item.value)"
          >
            <span
              class="flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition"
              :class="hasTag(item.value) ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-300'"
            >
              <Check v-if="hasTag(item.value)" class="size-3" />
            </span>
            <span
              v-if="item.color"
              class="size-2.5 shrink-0 rounded-sm"
              :style="{ backgroundColor: item.color }"
            />
            <span class="truncate">{{ item.label }}</span>
          </button>
        </template>

        <p class="border-t border-ink-100 px-2 pt-2 pb-1 text-[11px] leading-relaxed text-ink-400">
          点一下即可添加或取消，可多选
        </p>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, ChevronDown, Tags } from 'lucide-vue-next'

/**
 * 标签快选下拉。与「逗号分隔的标签输入框」配合使用：
 * 点选即把标签追加/移除到字符串里，不影响用户手输的内容与格式。
 */
const props = defineProps({
  /** 逗号分隔的标签字符串（与输入框双向绑定） */
  modelValue: { type: String, default: '' },
  /** 固定预设：支持 ['魔方'] 或 [{ value, label, color }] */
  presets: { type: Array, default: () => [] },
  /** 额外候选（如本页历史用过的标签），字符串数组 */
  history: { type: Array, default: () => [] },
  /** 按钮文案 */
  label: { type: String, default: '常用标签' },
})

const emit = defineEmits(['update:modelValue'])

const root = ref(null)
const open = ref(false)

/** 当前已填的标签（兼容中英文逗号） */
const current = computed(() =>
  String(props.modelValue || '')
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean),
)

function normalize(list) {
  return list.map((p) =>
    typeof p === 'string'
      ? { value: p, label: p, color: '' }
      : { value: p.value, label: p.label || p.value, color: p.color || '' },
  )
}

const presetItems = computed(() => normalize(props.presets))

const historyItems = computed(() => {
  const presetValues = new Set(presetItems.value.map((p) => p.value))
  return normalize(props.history.filter((t) => t && !presetValues.has(t)).slice(0, 12))
})

/** 下拉面板分组：常用在前，历史在后（历史为空则不出现这一组） */
const menuGroups = computed(() => {
  const groups = [{ title: '常用标签', items: presetItems.value }]
  if (historyItems.value.length) groups.push({ title: '本学员用过', items: historyItems.value })
  return groups
})

function hasTag(tag) {
  return current.value.includes(tag)
}

function toggle(tag) {
  const list = [...current.value]
  const i = list.indexOf(tag)
  if (i >= 0) list.splice(i, 1)
  else list.push(tag)
  emit('update:modelValue', list.join(', '))
}

// 根节点已 @click.stop，因此 document 上收到的点击一定是「组件外部点击」
function onDocClick() {
  if (open.value) open.value = false
}

function onKeydown(e) {
  if (e.key === 'Escape' && open.value) open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.fc-pop-enter-active,
.fc-pop-leave-active {
  transition:
    opacity 0.14s ease,
    transform 0.14s ease;
}
.fc-pop-enter-from,
.fc-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
