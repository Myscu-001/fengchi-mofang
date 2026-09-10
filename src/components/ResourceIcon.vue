<template>
  <div
    class="flex size-9 shrink-0 items-center justify-center rounded-[10px] border"
    :class="meta.style"
  >
    <component :is="meta.icon" class="size-4" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Archive, File, FileText, FileType, Image, Presentation, Sheet, Video } from 'lucide-vue-next'
import { FILE_KIND } from '@/lib/dict'

const props = defineProps({
  kind: { type: String, default: 'other' },
})

const ICONS = {
  document: FileText,
  pdf: FileType,
  sheet: Sheet,
  slide: Presentation,
  image: Image,
  video: Video,
  archive: Archive,
  other: File,
}

const meta = computed(() => {
  const entry = FILE_KIND[props.kind] || FILE_KIND.other
  return { ...entry, icon: ICONS[entry.icon] || File }
})
</script>
