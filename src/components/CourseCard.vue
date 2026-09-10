<template>
  <article
    class="group fc-card flex cursor-pointer flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-lift"
    @click="$emit('open', course)"
  >
    <!-- 封面 -->
    <div class="relative h-36 overflow-hidden bg-ink-100">
      <img
        v-if="course.cover_url"
        :src="course.cover_url"
        :alt="course.title"
        class="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
        loading="lazy"
      />
      <div v-else class="fc-cube-bg flex size-full items-center justify-center bg-brand-50">
        <LayoutGrid class="size-9 text-brand-300" />
      </div>

      <div class="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
        <UiBadge :custom-class="statusMeta.style" :dot="statusMeta.dot" :label="statusMeta.label" />
        <UiBadge v-if="course.category" :label="course.category" custom-class="border-white/70 bg-white/90 text-ink-700" />
      </div>
    </div>

    <!-- 内容 -->
    <div class="flex flex-1 flex-col p-4">
      <h3 class="line-clamp-1 text-[15px] font-semibold text-ink-900 transition group-hover:text-brand-700">
        {{ course.title }}
      </h3>
      <p v-if="course.subtitle" class="mt-1 line-clamp-1 text-xs text-ink-500">{{ course.subtitle }}</p>
      <p class="mt-2 line-clamp-2 flex-1 text-[13px] leading-relaxed text-ink-500">
        {{ course.summary || '暂无课程简介' }}
      </p>

      <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px] text-ink-500">
        <span class="inline-flex items-center gap-1">
          <BookOpen class="size-3.5 text-ink-400" />{{ course.lesson_count ?? course.total_lessons ?? 0 }} 课时
        </span>
        <span class="inline-flex items-center gap-1">
          <Users class="size-3.5 text-ink-400" />{{ course.student_count ?? 0 }} 名学员
        </span>
        <span v-if="course.age_range" class="inline-flex items-center gap-1">
          <Baby class="size-3.5 text-ink-400" />{{ course.age_range }}
        </span>
      </div>

      <div class="mt-3.5 flex items-center justify-between border-t border-ink-100 pt-3">
        <div class="flex items-center gap-0.5">
          <span
            v-for="i in 5"
            :key="i"
            class="block size-1.5 rounded-full"
            :class="i <= Number(course.level) ? 'bg-brand-500' : 'bg-ink-200'"
          />
          <span class="ml-1.5 text-[11.5px] text-ink-500">{{ levelLabel(course.level) }}</span>
        </div>
        <span class="inline-flex items-center gap-0.5 text-[12.5px] font-medium text-brand-600">
          查看详情
          <ChevronRight class="size-3.5" />
        </span>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { Baby, BookOpen, ChevronRight, LayoutGrid, Users } from 'lucide-vue-next'
import UiBadge from '@/components/UiBadge.vue'
import { COURSE_STATUS, levelLabel } from '@/lib/dict'

const props = defineProps({
  course: { type: Object, required: true },
})

defineEmits(['open'])

const statusMeta = computed(
  () => COURSE_STATUS[props.course.status] || { label: '未知', style: '', dot: 'bg-ink-300' },
)
</script>
