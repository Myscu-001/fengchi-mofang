<template>
  <UiModal
    :open="open"
    :title="isEdit ? '编辑课程' : '新建课程'"
    :subtitle="isEdit ? course?.title : '填写课程基础信息，保存后可继续维护课时教案'"
    width="lg"
    @close="$emit('close')"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <!-- 封面 -->
      <div class="flex items-start gap-4">
        <div class="relative h-[104px] w-40 shrink-0 overflow-hidden rounded-xl border border-ink-200 bg-ink-50">
          <img v-if="form.cover_url" :src="form.cover_url" class="size-full object-cover" alt="课程封面" />
          <div v-else class="fc-cube-bg flex size-full items-center justify-center">
            <ImageIcon class="size-6 text-ink-300" />
          </div>
          <button
            v-if="form.cover_url"
            type="button"
            class="absolute top-1.5 right-1.5 rounded-lg bg-white/90 p-1 text-ink-500 transition hover:text-red-500"
            @click="form.cover_url = ''"
          >
            <X class="size-3.5" />
          </button>
        </div>

        <div class="flex-1">
          <p class="text-[13px] font-medium text-ink-700">课程封面</p>
          <p class="mt-1 text-xs text-ink-500">建议 16:9 或 4:3 图片，JPG / PNG，不超过 5MB。</p>
          <div class="mt-2.5 flex items-center gap-2">
            <label
              class="inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-[10px] border border-ink-200 bg-white px-3 text-[13px] font-medium text-ink-700 transition hover:bg-ink-50"
            >
              <Upload class="size-3.5" />
              {{ uploading ? '上传中…' : '选择图片' }}
              <input type="file" accept="image/*" class="hidden" :disabled="uploading" @change="handleCover" />
            </label>
            <span v-if="uploading" class="text-xs text-ink-400">上传中…</span>
          </div>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <UiField label="课程名称" required>
            <input v-model="form.title" class="fc-input" placeholder="例：三阶魔方入门 · 层先法还原" required />
          </UiField>
        </div>

        <div class="sm:col-span-2">
          <UiField label="副标题" hint="一句话点出课程特色">
            <input v-model="form.subtitle" class="fc-input" placeholder="例：从零到完整还原的第一条路" />
          </UiField>
        </div>

        <UiField label="课程分类">
          <input
            v-model="form.category"
            class="fc-input"
            list="course-category-list"
            placeholder="启蒙 / 入门 / 进阶 / 竞速"
          />
          <datalist id="course-category-list">
            <option v-for="c in COURSE_CATEGORY_OPTIONS" :key="c" :value="c" />
          </datalist>
        </UiField>

        <UiField label="难度等级">
          <select v-model.number="form.level" class="fc-input">
            <option v-for="o in LEVEL_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </UiField>

        <UiField label="适用阶段">
          <input v-model="form.stage" class="fc-input" placeholder="例：小学低年级" />
        </UiField>

        <UiField label="适龄区间">
          <input v-model="form.age_range" class="fc-input" placeholder="例：7-10岁" />
        </UiField>

        <UiField label="单课时长（分钟）">
          <input v-model.number="form.lesson_minutes" type="number" min="10" max="240" class="fc-input" />
        </UiField>

        <UiField label="课时数" hint="保存课时教案后会自动同步">
          <input v-model.number="form.total_lessons" type="number" min="0" class="fc-input" />
        </UiField>

        <UiField label="课程价格（元）" hint="填 0 表示不对外展示价格">
          <input v-model.number="form.price" type="number" min="0" step="0.01" class="fc-input" />
        </UiField>

        <UiField label="上架状态">
          <select v-model="form.status" class="fc-input">
            <option v-for="o in COURSE_STATUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </UiField>

        <div class="sm:col-span-2">
          <UiField label="课程简介" hint="用于课程卡片展示，建议 60 字以内">
            <textarea v-model="form.summary" class="fc-input" rows="2" placeholder="简短介绍这门课解决什么问题" />
          </UiField>
        </div>

        <div class="sm:col-span-2">
          <UiField label="课程目标">
            <input v-model="form.goal" class="fc-input" placeholder="例：掌握层先法完整解法，平均复原进入 2 分钟内" />
          </UiField>
        </div>

        <div class="sm:col-span-2">
          <UiField label="详细介绍">
            <textarea
              v-model="form.description"
              class="fc-input"
              rows="5"
              placeholder="课程内容、教学方法、适合人群、学完能达到的效果…"
            />
          </UiField>
        </div>

        <UiField label="标签" hint="多个标签用逗号分隔">
          <input v-model="tagsInput" class="fc-input" placeholder="启蒙, 零基础, 幼儿" />
        </UiField>

        <UiField label="排序权重" hint="数值越小越靠前">
          <input v-model.number="form.sort_order" type="number" class="fc-input" />
        </UiField>
      </div>

      <p v-if="errorMsg" class="flex items-center gap-2 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
        <CircleAlert class="size-3.5 shrink-0" />
        {{ errorMsg }}
      </p>
    </form>

    <template #footer>
      <UiButton variant="outline" @click="$emit('close')">取消</UiButton>
      <UiButton variant="primary" :loading="saving" @click="handleSubmit">
        {{ isEdit ? '保存修改' : '创建课程' }}
      </UiButton>
    </template>
  </UiModal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { CircleAlert, Image as ImageIcon, Upload, X } from 'lucide-vue-next'
import UiModal from '@/components/UiModal.vue'
import UiField from '@/components/UiField.vue'
import UiButton from '@/components/UiButton.vue'
import { createCourse, updateCourse, uploadCover } from '@/api/courses'
import { COURSE_CATEGORY_OPTIONS, COURSE_STATUS_OPTIONS, LEVEL_OPTIONS } from '@/lib/dict'
import { useToastStore } from '@/stores/toast'

const props = defineProps({
  open: Boolean,
  course: { type: Object, default: null },
})

const emit = defineEmits(['close', 'saved'])

const toast = useToastStore()
const saving = ref(false)
const uploading = ref(false)
const errorMsg = ref('')
const tagsInput = ref('')

const isEdit = computed(() => Boolean(props.course?.id))

const blank = () => ({
  title: '',
  subtitle: '',
  cover_url: '',
  summary: '',
  description: '',
  category: '',
  level: 1,
  stage: '',
  age_range: '',
  goal: '',
  total_lessons: 0,
  lesson_minutes: 45,
  price: 0,
  status: 'draft',
  sort_order: 100,
})

const form = reactive(blank())

watch(
  () => props.open,
  (open) => {
    if (!open) return
    errorMsg.value = ''
    Object.assign(form, blank())
    if (props.course) {
      for (const key of Object.keys(form)) {
        if (props.course[key] !== undefined && props.course[key] !== null) form[key] = props.course[key]
      }
      tagsInput.value = (props.course.tags || []).join(', ')
    } else {
      tagsInput.value = ''
    }
  },
  { immediate: true },
)

async function handleCover(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    errorMsg.value = '封面图片不能超过 5MB'
    return
  }
  uploading.value = true
  errorMsg.value = ''
  try {
    form.cover_url = await uploadCover(file)
    toast.success('封面上传成功')
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    uploading.value = false
  }
}

async function handleSubmit() {
  errorMsg.value = ''
  if (!form.title.trim()) {
    errorMsg.value = '请填写课程名称'
    return
  }

  const payload = {
    ...form,
    title: form.title.trim(),
    subtitle: form.subtitle?.trim() || null,
    cover_url: form.cover_url || null,
    summary: form.summary?.trim() || null,
    description: form.description?.trim() || null,
    category: form.category?.trim() || null,
    stage: form.stage?.trim() || null,
    age_range: form.age_range?.trim() || null,
    goal: form.goal?.trim() || null,
    tags: tagsInput.value
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean),
  }

  saving.value = true
  try {
    const saved = isEdit.value
      ? await updateCourse(props.course.id, payload)
      : await createCourse(payload)
    toast.success(isEdit.value ? '课程已保存' : '课程已创建')
    emit('saved', saved)
    emit('close')
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    saving.value = false
  }
}
</script>
