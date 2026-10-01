<template>
  <div>
    <PageHeader :title="`${studentName} · 成长时间线`" description="成绩、上课、CFOP 掌握与目标的自动成长轨迹">
      <UiButton variant="outline" @click="goBack">
        <template #icon><ArrowLeft class="size-3.5" /></template>
        返回学员详情
      </UiButton>
    </PageHeader>

    <div class="fc-container py-6">
      <p v-if="loadError" class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
        {{ loadError }}
      </p>

      <StudentTimeline
        :student="student"
        :scores="scores"
        :logs="logs"
        :cfop-learned="cfopLearned"
        :goals="studentGoals"
        :loading="loading"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import UiButton from '@/components/UiButton.vue'
import StudentTimeline from '@/components/StudentTimeline.vue'
import { getStudent } from '@/api/students'
import { listAllStudentScores } from '@/api/scores'
import { listLearningLogs } from '@/api/learning'
import { loadCfopProgress } from '@/api/cfop'
import { loadGoals } from '@/api/goals'

const route = useRoute()
const router = useRouter()

const student = ref(null)
const scores = ref([])
const logs = ref([])
const cfopLearned = ref({})
const goalsMap = ref({})
const loading = ref(true)
const loadError = ref('')

const studentName = computed(() => student.value?.name || '学员')
const studentGoals = computed(() => (student.value ? goalsMap.value[student.value.id] || {} : {}))

function goBack() {
  router.push({ name: 'student-detail', params: { id: route.params.id } })
}

async function load() {
  const id = route.params.id
  if (!id) return
  loading.value = true
  loadError.value = ''
  try {
    const [st, scoreRows, logRows, cfop, goals] = await Promise.all([
      getStudent(id),
      listAllStudentScores(id),
      listLearningLogs(id).catch(() => []),
      loadCfopProgress(id).catch(() => ({})),
      loadGoals().catch(() => ({})),
    ])
    student.value = st
    scores.value = Array.isArray(scoreRows) ? scoreRows : []
    logs.value = Array.isArray(logRows) ? logRows : []
    cfopLearned.value = cfop && typeof cfop === 'object' ? cfop : {}
    goalsMap.value = goals && typeof goals === 'object' ? goals : {}
  } catch (err) {
    loadError.value = err.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, load)
onMounted(load)
</script>
