<template>
  <UiModal :open="open" title="数据导入" width="lg" @close="$emit('close')">
    <div class="space-y-4">
      <!-- 模式切换 -->
      <div class="flex rounded-lg bg-ink-100 p-0.5">
        <button
          type="button"
          class="flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition"
          :class="mode === 'student' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'"
          @click="switchMode('student')"
        >
          导入学员
        </button>
        <button
          type="button"
          class="flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition"
          :class="mode === 'score' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'"
          @click="switchMode('score')"
        >
          导入成绩
        </button>
      </div>

      <!-- 模板与说明 -->
      <div class="rounded-[10px] bg-ink-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-600">
        <p v-if="mode === 'student'">
          列：<b>姓名, 性别(男/女/未填写), 昵称, 出生日期, 家长姓名, 家长电话, 电话, 学校, 年级, 水平, 加入日期, 状态(在读/停课/结业/退学)</b>。姓名必填，其余可空。
        </p>
        <p v-else>
          列：<b>学员姓名, 魔方项目(三阶/3x3…), 日期, 单次时间(分号分隔 5 次，可含 DNF), 平均成绩, 单次最佳, 模式, 备注</b>。
          填「单次时间」走详细(Ao5)模式，留空则填「平均成绩/单次最佳」走简单模式。学员按姓名匹配。
        </p>
        <UiButton size="sm" variant="outline" class="mt-2" @click="downloadTemplate">
          <template #icon><Download class="size-3.5" /></template>
          下载模板
        </UiButton>
      </div>

      <!-- 文件选择 -->
      <div>
        <input
          type="file"
          accept=".csv,text/csv"
          class="block w-full text-[13px] text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-[12.5px] file:font-medium file:text-brand-700 hover:file:bg-brand-100"
          @change="onFile"
        />
        <p v-if="parseError" class="mt-1.5 text-[12px] text-red-600">{{ parseError }}</p>
      </div>

      <!-- 预览 -->
      <div v-if="previewRows.length" class="max-h-64 overflow-auto rounded-xl border border-ink-200">
        <table class="w-full text-left text-[12px]">
          <thead class="sticky top-0 bg-ink-50 text-[11.5px] text-ink-500">
            <tr>
              <th v-for="h in previewHeaders" :key="h" class="px-2 py-2 font-medium">{{ h }}</th>
              <th class="px-2 py-2 font-medium">状态</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink-100">
            <tr v-for="(r, i) in previewRows" :key="i" :class="r.error ? 'text-red-600' : 'text-ink-700'">
              <td v-for="h in previewHeaders" :key="h" class="max-w-[140px] truncate px-2 py-1.5">{{ r.data[h] ?? '' }}</td>
              <td class="whitespace-nowrap px-2 py-1.5">{{ r.error ? '✕ ' + r.error : '可导入' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="previewRows.length" class="text-[12px] text-ink-500">
        共 {{ previewRows.length }} 行，<span class="font-semibold text-emerald-600">{{ validCount }}</span> 行可导入，<span class="font-semibold text-red-600">{{ previewRows.length - validCount }}</span> 行有问题。
      </p>

      <p v-if="result" class="rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-700">{{ result }}</p>
    </div>

    <template #footer>
      <UiButton variant="outline" @click="$emit('close')">关闭</UiButton>
      <UiButton variant="primary" :loading="importing" :disabled="validCount === 0" @click="doImport">
        确认导入（{{ validCount }} 条）
      </UiButton>
    </template>
  </UiModal>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import UiModal from '@/components/UiModal.vue'
import UiButton from '@/components/UiButton.vue'
import { parseCsv, downloadCsv, toCsv } from '@/lib/csv'
import { listStudentOptions, createStudent, buildStudentCsv } from '@/api/students'
import { createScore } from '@/api/scores'
import { useToastStore } from '@/stores/toast'

defineProps({ open: Boolean })
const emit = defineEmits(['close', 'imported'])

const toast = useToastStore()

const mode = ref('student')
const parseError = ref('')
const previewRows = ref([])
const previewHeaders = ref([])
const importing = ref(false)
const result = ref('')
const studentOptions = ref([])

const PROJECT_ALIAS = {
  三阶: '3x3', 二阶: '2x2', 四阶: '4x4', 五阶: '5x5', 金字塔: 'pyraminx', 斜转: 'skewb',
  '3x3': '3x3', '2x2': '2x2', '4x4': '4x4', '5x5': '5x5', pyraminx: 'pyraminx', skewb: 'skewb',
}

const validCount = computed(() => previewRows.value.filter((r) => !r.error).length)

const n = (v) => (v == null || String(v).trim() === '' ? null : v)

function parseTimeToken(s) {
  s = String(s).trim()
  if (/^dnf$/i.test(s)) return { value: null, is_dnf: true }
  let val
  if (/:/.test(s)) {
    const p = s.split(':')
    const m = parseFloat(p[0])
    const sec = parseFloat(String(p[1] || '').replace(',', '.'))
    if (!Number.isNaN(m) && !Number.isNaN(sec)) val = m * 60 + sec
  } else {
    val = parseFloat(s.replace(',', '.'))
  }
  if (val == null || Number.isNaN(val) || val <= 0) return { invalid: true }
  return { value: Math.round(val * 100) / 100, is_dnf: false }
}

function studentTemplate() {
  const headers = ['姓名', '性别', '昵称', '出生日期', '家长姓名', '家长电话', '电话', '学校', '年级', '水平', '加入日期', '状态']
  const example = {
    姓名: '张三', 性别: '男', 昵称: '小名', 出生日期: '2016-05-01', 家长姓名: '张爸',
    家长电话: '13800000000', 电话: '', 学校: 'XX小学', 年级: '三年级', 水平: '新手', 加入日期: '2026-05-01', 状态: '在读',
  }
  return toCsv(headers, [example])
}

function scoreTemplate() {
  const headers = ['学员姓名', '魔方项目', '日期', '单次时间', '平均成绩', '单次最佳', '模式', '备注']
  const example = {
    学员姓名: '张三', 魔方项目: '三阶', 日期: '2026-05-01',
    单次时间: '12.34;11.80;DNF;10.92;11.20', 平均成绩: '', 单次最佳: '', 模式: '详细', 备注: '周测',
  }
  return toCsv(headers, [example])
}

function downloadTemplate() {
  if (mode.value === 'student') downloadCsv('学员导入模板.csv', studentTemplate())
  else downloadCsv('成绩导入模板.csv', scoreTemplate())
}

function switchMode(m) {
  mode.value = m
  resetPreview()
}

function resetPreview() {
  parseError.value = ''
  previewRows.value = []
  previewHeaders.value = []
  result.value = ''
}

async function onFile(e) {
  const file = e.target.files && e.target.files[0]
  resetPreview()
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      buildPreview(String(reader.result))
    } catch (err) {
      parseError.value = '解析失败：' + err.message
    }
  }
  reader.onerror = () => {
    parseError.value = '文件读取失败'
  }
  reader.readAsText(file, 'utf-8')
}

function buildPreview(text) {
  const rows = parseCsv(text)
  if (rows.length < 2) {
    parseError.value = '文件为空或只有表头，请检查'
    return
  }
  const headers = rows[0].map((h) => String(h).trim())
  previewHeaders.value = headers
  const dataRows = rows.slice(1)
  const out = []

  if (mode.value === 'student') {
    for (const r of dataRows) {
      const obj = {}
      headers.forEach((h, i) => (obj[h] = r[i] ?? ''))
      const name = (obj['姓名'] || '').trim()
      const errs = []
      if (!name) errs.push('缺少姓名')
      const payload = {
        name,
        gender: { 男: 'male', 女: 'female' }[(obj['性别'] || '').trim()] || 'unknown',
        nickname: n(obj['昵称']),
        birthday: n(obj['出生日期']),
        guardian_name: n(obj['家长姓名']),
        guardian_phone: n(obj['家长电话']),
        phone: n(obj['电话']),
        school: n(obj['学校']),
        grade: n(obj['年级']),
        level: n(obj['水平']),
        joined_at: n(obj['加入日期']),
        status: { 在读: 'active', 停课: 'paused', 结业: 'graduated', 退学: 'left' }[(obj['状态'] || '').trim()] || 'active',
      }
      out.push({ data: obj, error: errs.join('；') || null, payload: errs.length ? null : payload })
    }
  } else {
    const sMap = {}
    for (const s of studentOptions.value || []) sMap[s.name] = s.id
    for (const r of dataRows) {
      const obj = {}
      headers.forEach((h, i) => (obj[h] = r[i] ?? ''))
      const name = (obj['学员姓名'] || obj['姓名'] || '').trim()
      const projectRaw = (obj['魔方项目'] || '').trim()
      const project = PROJECT_ALIAS[projectRaw]
      const date = (obj['日期'] || '').trim()
      const timesRaw = (obj['单次时间'] || '').trim()
      const avgRaw = (obj['平均成绩'] || obj['平均成绩(秒)'] || '').trim()
      const singleRaw = (obj['单次最佳'] || obj['单次最佳(秒)'] || '').trim()
      const note = (obj['备注'] || '').trim()
      const errs = []
      if (!name) errs.push('缺少学员姓名')
      else if (!sMap[name]) errs.push('找不到学员：' + name)
      if (!project) errs.push('魔方项目无法识别：' + projectRaw)
      if (!date) errs.push('缺少日期')

      let payload = null
      if (!errs.length) {
        if (timesRaw) {
          const tokens = timesRaw.split(/[;；,，]/).map((s) => s.trim()).filter(Boolean)
          if (tokens.length < 3) errs.push('单次时间至少 3 个')
          else {
            const attempts = tokens.map(parseTimeToken)
            if (attempts.some((a) => a.invalid)) errs.push('单次时间含无法识别的值')
            else payload = { studentId: sMap[name], project, recordedAt: date, mode: 'detail', note: n(note), attempts }
          }
        } else if (avgRaw || singleRaw) {
          const avg = parseFloat(avgRaw)
          const single = parseFloat(singleRaw)
          if ((Number.isNaN(avg) || avg <= 0) && (Number.isNaN(single) || single <= 0)) errs.push('缺少有效成绩')
          else payload = { studentId: sMap[name], project, recordedAt: date, mode: 'simple', note: n(note), avgSeconds: Number.isNaN(avg) ? null : avg, singleBestSeconds: Number.isNaN(single) ? null : single }
        } else errs.push('缺少成绩数据')
      }
      out.push({ data: obj, error: errs.join('；') || null, payload: errs.length ? null : payload })
    }
  }
  previewRows.value = out
}

async function doImport() {
  importing.value = true
  result.value = ''
  let ok = 0
  let fail = 0
  const valid = previewRows.value.filter((r) => r.payload)
  for (const r of valid) {
    try {
      if (mode.value === 'student') await createStudent(r.payload)
      else await createScore(r.payload)
      ok += 1
    } catch (e) {
      r.error = '导入失败：' + e.message
      fail += 1
    }
  }
  result.value = `成功导入 ${ok} 条${fail ? '，' + fail + ' 条失败（见状态列）' : ''}`
  importing.value = false
  if (ok > 0) {
    toast.success(`已导入 ${ok} 条${mode.value === 'student' ? '学员' : '成绩'}`)
    emit('imported')
  }
}

onMounted(async () => {
  try {
    studentOptions.value = await listStudentOptions()
  } catch {
    studentOptions.value = []
  }
})
</script>
