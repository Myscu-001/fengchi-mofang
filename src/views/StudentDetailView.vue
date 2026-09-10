<template>
  <div>
    <PageHeader :title="student?.name || '学员档案'" :description="student?.nickname ? `小名 ${student.nickname}` : '魔方成绩与训练轨迹'">
      <template #badge>
        <UiBadge v-if="student" :label="STUDENT_STATUS[student.status]?.label" :custom-class="STUDENT_STATUS[student.status]?.style" />
      </template>

      <UiButton variant="outline" @click="router.back()">
        <template #icon><ArrowLeft class="size-3.5" /></template>
        返回
      </UiButton>
      <UiButton v-if="canManageStudent" variant="outline" @click="openStudentEdit">
        <template #icon><UserCog class="size-4" /></template>
        编辑资料
      </UiButton>
    </PageHeader>

    <div v-if="loading" class="fc-container py-7">
      <div class="fc-card"><UiLoading text="正在加载学员档案…" /></div>
    </div>

    <div v-else-if="!student" class="fc-container py-7">
      <div class="fc-card">
        <UiEmpty :icon="Users" title="学员不存在" description="该学员可能已被删除，或你没有查看权限。">
          <UiButton variant="primary" @click="router.push({ name: 'students' })">返回学员列表</UiButton>
        </UiEmpty>
      </div>
    </div>

    <div v-else class="fc-container py-7 space-y-5">
      <!-- 学员基本信息 -->
      <div class="fc-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <UiAvatar :src="student.avatar_url" :name="student.name" size="xl" />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-[18px] font-bold text-ink-900">{{ student.name }}</h2>
            <span v-if="student.nickname" class="text-[13px] text-ink-400">（{{ student.nickname }}）</span>
          </div>
          <div class="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-ink-600">
            <span>性别：{{ { male: '男', female: '女', unknown: '未填写' }[student.gender] || '—' }}</span>
            <span>年龄：{{ ageOf(student.birthday) }}</span>
            <span v-if="student.level">水平：{{ student.level }}</span>
            <span>家长：{{ student.guardian_name || '—' }}</span>
            <span>电话：{{ student.guardian_phone || student.phone || '—' }}</span>
            <span>加入：{{ formatDate(student.joined_at) }}</span>
          </div>
          <p v-if="student.notes" class="mt-2 text-[12.5px] leading-relaxed text-ink-500">{{ student.notes }}</p>
        </div>
      </div>

      <!-- 魔方项目切换 -->
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="p in CUBE_PROJECTS"
          :key="p.value"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition"
          :class="project === p.value
            ? 'border-transparent text-white shadow-soft'
            : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'"
          :style="project === p.value ? { backgroundColor: p.color } : {}"
          @click="switchProject(p.value)"
        >
          <span class="size-2 rounded-sm" :style="{ backgroundColor: project === p.value ? 'rgba(255,255,255,.85)' : p.color }" />
          {{ p.label }}
        </button>
      </div>

      <!-- 统计卡片 -->
      <div class="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <UiStat label="成绩次数" :value="stats.count" :icon="ListChecks" tone="brand" />
        <UiStat label="最佳平均" :value="fmtSec(stats.bestAvg, false)" :hint="stats.bestAvg != null ? '秒' : ''" :icon="Timer" tone="green" />
        <UiStat label="最佳单次" :value="fmtSec(stats.bestSingle, false)" :hint="stats.bestSingle != null ? '秒' : ''" :icon="Zap" tone="orange" />
        <UiStat label="最后测试" :value="stats.lastRecordedAt ? formatDate(stats.lastRecordedAt) : '—'" :icon="CalendarClock" tone="violet" />
      </div>

      <!-- 成绩记录 -->
      <div class="fc-card overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 p-3.5">
          <h3 class="text-[14px] font-semibold text-ink-900">
            成绩记录
            <span class="ml-1 text-[12px] font-normal text-ink-400">{{ cubeMeta?.label }} · 共 {{ scores.length }} 条</span>
          </h3>
          <div class="flex flex-wrap items-center gap-2">
            <select v-model="pageSize" class="fc-input w-auto min-w-[104px] text-[12.5px]" @change="page = 1">
              <option :value="10">10 条/页</option>
              <option :value="20">20 条/页</option>
              <option :value="30">30 条/页</option>
            </select>
            <UiButton v-if="canManage" variant="outline" size="sm" @click="confirmBulkDelete" :disabled="!scores.length">
              <template #icon><Trash2 class="size-3.5" /></template>
              批量删除
            </UiButton>
            <UiButton v-if="scores.length" variant="outline" size="sm" @click="exportCsv">
              <template #icon><Download class="size-3.5" /></template>
              导出
            </UiButton>
            <UiButton v-if="canManage" variant="primary" size="sm" @click="openAdd">
              <template #icon><Plus class="size-3.5" /></template>
              新增成绩
            </UiButton>
          </div>
        </div>

        <!-- 撤回批量删除 -->
        <div v-if="bulkDeleted.length" class="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-800">
          <span>已清空 {{ bulkDeleted.length }} 条{{ cubeMeta?.label }}成绩</span>
          <UiButton variant="outline" size="sm" @click="undoBulk">撤回</UiButton>
        </div>

        <UiLoading v-if="listLoading" text="加载成绩…" />

        <div v-else-if="pagedScores.length" class="overflow-x-auto">
          <table class="w-full min-w-[640px] text-left text-[13px]">
            <thead class="border-b border-ink-200 bg-ink-50 text-[12px] text-ink-500">
              <tr>
                <th class="px-4 py-3 font-medium">日期</th>
                <th class="px-4 py-3 font-medium">平均成绩</th>
                <th class="px-4 py-3 font-medium">单次最佳</th>
                <th class="px-4 py-3 font-medium">模式</th>
                <th class="px-4 py-3 font-medium">备注</th>
                <th v-if="canManage" class="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ink-100">
              <tr v-for="row in pagedScores" :key="row.id" class="transition hover:bg-ink-50/60">
                <td class="px-4 py-3 text-ink-600">{{ formatDate(row.recorded_at) }}</td>
                <td class="px-4 py-3">
                  <span class="font-semibold tabular-nums" :class="row.avg_is_dnf ? 'text-red-500' : 'text-brand-700'">
                    {{ fmtSec(row.avg_seconds, row.avg_is_dnf) }}
                  </span>
                  <span v-if="row.avgPB" class="ml-1 inline-flex rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">PB</span>
                </td>
                <td class="px-4 py-3">
                  <span class="font-semibold tabular-nums" :class="row.single_is_dnf ? 'text-red-500' : 'text-orange-600'">
                    {{ fmtSec(row.single_best_seconds, row.single_is_dnf) }}
                  </span>
                  <span v-if="row.singlePB" class="ml-1 inline-flex rounded-md bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">PB</span>
                </td>
                <td class="px-4 py-3">
                  <UiBadge :label="row.mode === 'detail' ? '详细' : '简单'" custom-class="border-ink-200 bg-ink-50 text-ink-600" />
                </td>
                <td class="px-4 py-3 max-w-[180px] truncate text-ink-500" :title="row.note">{{ row.note || '—' }}</td>
                <td v-if="canManage" class="px-4 py-3">
                  <div class="flex justify-end gap-1">
                    <button class="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700" title="编辑" @click="openEdit(row)">
                      <Pencil class="size-3.5" />
                    </button>
                    <button class="rounded-lg p-1.5 text-ink-400 transition hover:bg-red-50 hover:text-red-500" title="删除" @click="remove(row)">
                      <Trash2 class="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="px-4 py-10 text-center text-[13px] text-ink-400">
          暂无{{ cubeMeta?.label }}成绩记录，点击「新增成绩」开始录入。
        </div>

        <div v-if="totalPages > 1" class="border-t border-ink-100 p-3.5">
          <UiPagination v-model:page="page" :page-size="pageSize" :total="scores.length" />
        </div>
      </div>

      <!-- 成绩趋势 -->
      <div v-if="scores.length" class="fc-card p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h3 class="flex items-center gap-1.5 text-[14px] font-semibold text-ink-900">
            <TrendingUp class="size-4 text-brand-500" />成绩趋势
          </h3>
          <div class="flex flex-wrap items-center gap-2 text-[12.5px]">
            <input v-model="rangeStart" type="date" class="fc-input w-auto" @change="page = 1" />
            <span class="text-ink-400">至</span>
            <input v-model="rangeEnd" type="date" class="fc-input w-auto" :max="today" @change="page = 1" />
            <UiButton variant="outline" size="sm" @click="resetRange">重置</UiButton>
          </div>
        </div>

        <div class="mt-3 flex items-center gap-4 text-[12px] text-ink-500">
          <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-emerald-500" />平均成绩</span>
          <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-orange-500" />单次最佳</span>
          <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-red-400" />DNF</span>
        </div>

        <div v-if="chartPoints.length" class="mt-3">
          <svg :viewBox="`0 0 ${chartW} ${chartH}`" class="w-full" preserveAspectRatio="xMidYMid meet">
            <!-- Y 轴网格与刻度 -->
            <g v-for="t in yTicks" :key="t.v">
              <line :x1="padL" :y1="yOf(t.v)" :x2="chartW - padR" :y2="yOf(t.v)" stroke="#EEF0F2" stroke-width="1" />
              <text :x="padL - 6" :y="yOf(t.v) + 3" text-anchor="end" font-size="10" fill="#9aa0a6">{{ t.label }}</text>
            </g>
            <!-- 平均成绩线 -->
            <polyline
              v-if="avgLine"
              :points="avgLine"
              fill="none"
              stroke="#10b981"
              stroke-width="2"
              stroke-linejoin="round"
            />
            <!-- 单次最佳线 -->
            <polyline
              v-if="singleLine"
              :points="singleLine"
              fill="none"
              stroke="#f97316"
              stroke-width="2"
              stroke-linejoin="round"
            />
            <!-- 数据点 -->
            <g v-for="(pt, i) in chartPoints" :key="pt.id">
              <circle
                v-if="!pt.avgDnf"
                :cx="pt.x" :cy="pt.yAvg" :r="hovered?.id === pt.id ? 5 : 3.5"
                fill="#10b981" stroke="#fff" stroke-width="1.5"
                class="cursor-pointer"
                @mouseenter="hovered = pt"
                @mouseleave="hovered = null"
              />
              <text v-else :x="pt.x" :y="pt.yAvg + 3" text-anchor="middle" font-size="9" fill="#ef4444" class="cursor-pointer" @mouseenter="hovered = pt" @mouseleave="hovered = null">✕</text>

              <circle
                v-if="!pt.singleDnf"
                :cx="pt.x" :cy="pt.ySingle" :r="hovered?.id === pt.id ? 5 : 3.5"
                fill="#f97316" stroke="#fff" stroke-width="1.5"
                class="cursor-pointer"
                @mouseenter="hovered = pt"
                @mouseleave="hovered = null"
              />
              <text v-else :x="pt.x" :y="pt.ySingle + 3" text-anchor="middle" font-size="9" fill="#ef4444" class="cursor-pointer" @mouseenter="hovered = pt" @mouseleave="hovered = null">✕</text>

              <text :x="pt.x" :y="chartH - padB + 14" text-anchor="middle" font-size="9" fill="#9aa0a6">{{ pt.dateLabel }}</text>
            </g>

            <!-- 悬浮提示 -->
            <g v-if="hovered">
              <rect
                :x="Math.min(Math.max(hovered.x - 70, 2), chartW - 142)"
                :y="Math.max(hovered.yAvg, hovered.ySingle) - 46"
                width="140" height="38" rx="6" fill="#1f2937" opacity="0.92"
              />
              <text :x="Math.min(Math.max(hovered.x - 62, 10), chartW - 134)" :y="Math.max(hovered.yAvg, hovered.ySingle) - 30" font-size="10" fill="#fff">
                {{ hovered.dateLabel }}
              </text>
              <text :x="Math.min(Math.max(hovered.x - 62, 10), chartW - 134)" :y="Math.max(hovered.yAvg, hovered.ySingle) - 16" font-size="10" fill="#a7f3d0">
                平均 {{ fmtSec(hovered.avg, hovered.avgDnf) }}
              </text>
              <text :x="Math.min(Math.max(hovered.x - 62, 10), chartW - 134)" :y="Math.max(hovered.yAvg, hovered.ySingle) - 4" font-size="10" fill="#fed7aa">
                单次 {{ fmtSec(hovered.single, hovered.singleDnf) }}
              </text>
            </g>
          </svg>
        </div>
        <p v-else class="py-8 text-center text-[13px] text-ink-400">该日期范围内无成绩数据</p>
      </div>
    </div>

    <!-- 新增 / 编辑成绩 -->
    <UiModal :open="scoreOpen" :title="editing ? '编辑成绩' : '新增成绩'" width="md" @close="scoreOpen = false">
      <form class="space-y-4" @submit.prevent="saveScore">
        <UiField label="日期">
          <input v-model="scoreForm.recordedAt" type="date" class="fc-input" :max="today" required />
        </UiField>

        <UiField label="录入模式">
          <div class="flex gap-2">
            <button
              type="button"
              class="flex-1 rounded-lg border px-3 py-2 text-[13px] font-medium transition"
              :class="scoreForm.mode === 'simple' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600'"
              @click="scoreForm.mode = 'simple'"
            >
              简单模式
            </button>
            <button
              type="button"
              class="flex-1 rounded-lg border px-3 py-2 text-[13px] font-medium transition"
              :class="scoreForm.mode === 'detail' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600'"
              @click="scoreForm.mode = 'detail'"
            >
              详细模式（Ao5）
            </button>
          </div>
        </UiField>

        <!-- 简单模式 -->
        <div v-if="scoreForm.mode === 'simple'" class="grid gap-4 sm:grid-cols-2">
          <UiField label="平均成绩（秒）" required>
            <input v-model="scoreForm.avgSeconds" type="number" step="0.01" min="0" class="fc-input" placeholder="如 12.34" />
          </UiField>
          <UiField label="单次最佳（秒）" required>
            <input v-model="scoreForm.singleBestSeconds" type="number" step="0.01" min="0" class="fc-input" placeholder="如 9.87" />
          </UiField>
        </div>

        <!-- 详细模式 -->
        <div v-else class="space-y-3">
          <p class="text-[12px] text-ink-500">录入 5 个单次时间（纯数字，自动 ÷100 换算为秒），可勾选 DNF。</p>
          <div
            v-for="(at, i) in scoreForm.attempts"
            :key="i"
            class="flex items-center gap-2.5 rounded-xl border border-ink-200 px-3 py-2"
          >
            <span class="w-5 shrink-0 text-[13px] font-semibold text-ink-400">{{ i + 1 }}</span>
            <input
              v-model="at.raw"
              :disabled="at.is_dnf"
              inputmode="numeric"
              maxlength="6"
              class="fc-input flex-1 disabled:bg-ink-100 disabled:text-ink-300"
              :placeholder="at.is_dnf ? 'DNF' : '整数，如 1234'"
              @input="onAttemptInput(at)"
            />
            <span v-if="!at.is_dnf" class="w-16 shrink-0 text-right text-[12px] tabular-nums text-ink-500">
              {{ at.raw && Number(at.raw) > 0 ? `→${(Number(at.raw) / 100).toFixed(2)}秒` : '' }}
            </span>
            <label class="flex shrink-0 cursor-pointer items-center gap-1 text-[12px] text-ink-500">
              <input v-model="at.is_dnf" type="checkbox" class="size-4 accent-red-500" @change="onAttemptDnfToggle(at)" />
              DNF
            </label>
          </div>

          <div class="rounded-xl bg-ink-50 px-3.5 py-3 text-[13px]">
            <div class="flex justify-between">
              <span class="text-ink-500">平均成绩</span>
              <span class="font-semibold" :class="detailCalc.avgIsDnf ? 'text-red-500' : 'text-brand-700'">
                {{ detailCalc.avgIsDnf ? 'DNF' : (detailCalc.avgSeconds != null ? detailCalc.avgSeconds.toFixed(2) + ' 秒' : '—') }}
              </span>
            </div>
            <div class="mt-1 flex justify-between">
              <span class="text-ink-500">单次最佳</span>
              <span class="font-semibold" :class="detailCalc.singleIsDnf ? 'text-red-500' : 'text-orange-600'">
                {{ detailCalc.singleIsDnf ? 'DNF' : (detailCalc.singleBestSeconds != null ? detailCalc.singleBestSeconds.toFixed(2) + ' 秒' : '—') }}
              </span>
            </div>
            <p v-if="detailHint" class="mt-2 text-[12px] text-amber-600">{{ detailHint }}</p>
          </div>
        </div>

        <UiField label="备注">
          <input v-model="scoreForm.note" class="fc-input" placeholder="可选，如「周测」「赛前练习」" />
        </UiField>

        <p v-if="scoreError" class="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
          {{ scoreError }}
        </p>
      </form>

      <template #footer>
        <UiButton variant="outline" @click="scoreOpen = false">取消</UiButton>
        <UiButton variant="primary" :loading="scoreSaving" :disabled="!canSaveScore" @click="saveScore">保存</UiButton>
      </template>
    </UiModal>

    <!-- 编辑学员资料 -->
    <UiModal :open="studentEditOpen" title="编辑学员资料" width="lg" @close="studentEditOpen = false">
      <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="saveStudent">
        <UiField label="姓名" required>
          <input v-model="studentForm.name" class="fc-input" required />
        </UiField>
        <UiField label="昵称 / 小名">
          <input v-model="studentForm.nickname" class="fc-input" />
        </UiField>
        <UiField label="性别">
          <select v-model="studentForm.gender" class="fc-input">
            <option value="unknown">未填写</option>
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
        </UiField>
        <UiField label="出生日期">
          <input v-model="studentForm.birthday" type="date" class="fc-input" />
        </UiField>
        <UiField label="家长姓名">
          <input v-model="studentForm.guardian_name" class="fc-input" />
        </UiField>
        <UiField label="家长电话">
          <input v-model="studentForm.guardian_phone" class="fc-input" />
        </UiField>
        <UiField label="当前水平">
          <input v-model="studentForm.level" class="fc-input" placeholder="新手 / 入门 / 熟练 / 竞速" />
        </UiField>
        <UiField label="学员状态">
          <select v-model="studentForm.status" class="fc-input">
            <option v-for="o in STUDENT_STATUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </UiField>
        <div class="sm:col-span-2">
          <UiField label="备注">
            <textarea v-model="studentForm.notes" class="fc-input" rows="3" />
          </UiField>
        </div>
        <p v-if="studentError" class="sm:col-span-2 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
          {{ studentError }}
        </p>
      </form>
      <template #footer>
        <UiButton variant="outline" @click="studentEditOpen = false">取消</UiButton>
        <UiButton variant="primary" :loading="studentSaving" @click="saveStudent">保存</UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  CalendarClock,
  Download,
  ListChecks,
  Pencil,
  Plus,
  Timer,
  Trash2,
  TrendingUp,
  UserCog,
  Users,
  Zap,
} from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import UiButton from '@/components/UiButton.vue'
import UiBadge from '@/components/UiBadge.vue'
import UiAvatar from '@/components/UiAvatar.vue'
import UiModal from '@/components/UiModal.vue'
import UiField from '@/components/UiField.vue'
import UiStat from '@/components/UiStat.vue'
import UiEmpty from '@/components/UiEmpty.vue'
import UiLoading from '@/components/UiLoading.vue'
import UiPagination from '@/components/UiPagination.vue'
import { CUBE_PROJECTS, STUDENT_STATUS, STUDENT_STATUS_OPTIONS } from '@/lib/dict'
import { formatDate } from '@/lib/format'
import { getStudent, updateStudent } from '@/api/students'
import {
  listScores,
  scoreStats,
  createScore,
  updateScore,
  deleteScore,
  bulkDeleteScores,
  buildScoreCsv,
  computeAo5,
} from '@/api/scores'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useDialogStore } from '@/stores/dialog'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()
const dialog = useDialogStore()

const canManage = computed(() => auth.can('score.manage'))
const canManageStudent = computed(() => auth.can('student.manage'))

const student = ref(null)
const loading = ref(true)
const listLoading = ref(false)
const project = ref(CUBE_PROJECTS[1]?.value || '3x3') // 默认三阶
const scores = ref([])
const stats = reactive({ count: 0, bestAvg: null, bestSingle: null, lastRecordedAt: null })
const page = ref(1)
const pageSize = ref(10)
const bulkDeleted = ref([])

const cubeMeta = computed(() => CUBE_PROJECTS.find((p) => p.value === project.value) || null)
const today = new Date().toISOString().slice(0, 10)

function ageOf(birthday) {
  if (!birthday) return '—'
  const d = new Date(birthday)
  if (Number.isNaN(d.getTime())) return '—'
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1
  return age >= 0 && age < 120 ? `${age} 岁` : '—'
}

function fmtSec(sec, isDnf) {
  if (isDnf) return 'DNF'
  if (sec == null) return '—'
  return Number(sec).toFixed(2)
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100
}

// PB 标记：按当前项目历史最小平均 / 最小单次（四舍五入到两位小数比对）
const decoratedScores = computed(() => {
  const avgVals = scores.value.filter((r) => !r.avg_is_dnf && r.avg_seconds != null).map((r) => round2(r.avg_seconds))
  const singleVals = scores.value.filter((r) => !r.single_is_dnf && r.single_best_seconds != null).map((r) => round2(r.single_best_seconds))
  const bestAvg = avgVals.length ? Math.min(...avgVals) : null
  const bestSingle = singleVals.length ? Math.min(...singleVals) : null
  return scores.value.map((r) => ({
    ...r,
    avgPB: !r.avg_is_dnf && r.avg_seconds != null && round2(r.avg_seconds) === bestAvg,
    singlePB: !r.single_is_dnf && r.single_best_seconds != null && round2(r.single_best_seconds) === bestSingle,
  }))
})

// 日期范围过滤
const rangeStart = ref('')
const rangeEnd = ref('')
const filteredScores = computed(() => {
  let list = decoratedScores.value
  if (rangeStart.value) list = list.filter((r) => r.recorded_at >= rangeStart.value)
  if (rangeEnd.value) list = list.filter((r) => r.recorded_at <= rangeEnd.value)
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredScores.value.length / pageSize.value)))
const pagedScores = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredScores.value.slice(start, start + pageSize.value)
})

function resetRange() {
  rangeStart.value = ''
  rangeEnd.value = ''
}

// ===== 图表 =====
const chartW = 720
const chartH = 300
const padL = 40
const padR = 16
const padT = 16
const padB = 32

const chartPoints = computed(() => {
  const list = [...filteredScores.value].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
  const vals = []
  list.forEach((r) => {
    if (!r.avg_is_dnf && r.avg_seconds != null) vals.push(Number(r.avg_seconds))
    if (!r.single_is_dnf && r.single_best_seconds != null) vals.push(Number(r.single_best_seconds))
  })
  if (!vals.length) return []
  let yMin = Math.floor(Math.min(...vals))
  let yMax = Math.ceil(Math.max(...vals))
  if (yMax - yMin <= 4) {
    yMin = Math.max(0, yMin - 1)
    yMax = yMax + 1
  }
  if (yMin < 0) yMin = 0
  const n = list.length
  return list.map((r, i) => {
    const x = n === 1 ? (padL + chartW - padR) / 2 : padL + (i / (n - 1)) * (chartW - padL - padR)
    const yOfVal = (v) => padT + (1 - (v - yMin) / (yMax - yMin || 1)) * (chartH - padT - padB)
    return {
      id: r.id,
      x,
      yAvg: r.avg_is_dnf ? padT : yOfVal(Number(r.avg_seconds)),
      ySingle: r.single_is_dnf ? padT : yOfVal(Number(r.single_best_seconds)),
      avg: r.avg_seconds,
      avgDnf: r.avg_is_dnf,
      single: r.single_best_seconds,
      singleDnf: r.single_is_dnf,
      dateLabel: formatDate(r.recorded_at),
    }
  })
})

const yTicks = computed(() => {
  const list = chartPoints.value
  if (!list.length) return []
  const vals = []
  list.forEach((p) => {
    if (!p.avgDnf) vals.push(Number(p.avg))
    if (!p.singleDnf) vals.push(Number(p.single))
  })
  let yMin = Math.floor(Math.min(...vals))
  let yMax = Math.ceil(Math.max(...vals))
  if (yMax - yMin <= 4) {
    yMin = Math.max(0, yMin - 1)
    yMax = yMax + 1
  }
  const ticks = []
  const span = yMax - yMin || 1
  const step = span <= 6 ? 1 : Math.ceil(span / 5)
  for (let v = yMin; v <= yMax; v += step) ticks.push({ v, label: String(v) })
  return ticks
})

const yOf = (v) => padT + (1 - (v - (yTicks.value[0]?.v ?? 0)) / ((yTicks.value[yTicks.value.length - 1]?.v ?? 1) - (yTicks.value[0]?.v ?? 0) || 1)) * (chartH - padT - padB)

const toLine = (key) =>
  chartPoints.value
    .filter((p) => !p[key === 'avgDnf' ? 'avgDnf' : 'singleDnf'])
    .map((p) => `${p.x},${p[key === 'avgDnf' ? 'yAvg' : 'ySingle']}`)
    .join(' ')

const avgLine = computed(() => (chartPoints.value.some((p) => !p.avgDnf) ? toLine('avgDnf') : ''))
const singleLine = computed(() => (chartPoints.value.some((p) => !p.singleDnf) ? toLine('singleDnf') : ''))

const hovered = ref(null)

// ===== 成绩弹窗 =====
const scoreOpen = ref(false)
const editing = ref(null)
const scoreSaving = ref(false)
const scoreError = ref('')

function blankAttempt() {
  return { raw: '', is_dnf: false }
}

const scoreForm = reactive({
  recordedAt: today,
  mode: 'detail',
  avgSeconds: '',
  singleBestSeconds: '',
  attempts: [blankAttempt(), blankAttempt(), blankAttempt(), blankAttempt(), blankAttempt()],
  note: '',
})

function onAttemptInput(at) {
  at.raw = String(at.raw || '').replace(/\D/g, '').slice(0, 6)
}

function onAttemptDnfToggle(at) {
  if (at.is_dnf) at.raw = ''
}

const detailCalc = computed(() => {
  const attempts = scoreForm.attempts.map((a) => ({
    value: a.is_dnf || !a.raw ? null : Number(a.raw) / 100,
    is_dnf: a.is_dnf,
  }))
  return computeAo5(attempts)
})

const detailHint = computed(() => {
  const valid = scoreForm.attempts.filter((a) => !a.is_dnf && Number(a.raw) > 0).length
  const dnf = scoreForm.attempts.filter((a) => a.is_dnf).length
  if (dnf >= 3) return '有效成绩不足 3 次，平均成绩记为 DNF'
  if (dnf === 5) return '所有成绩均为 DNF'
  if (valid < 5 && dnf === 0) return '请完整录入 5 个有效单次时间'
  return ''
})

const canSaveScore = computed(() => {
  if (scoreForm.mode === 'simple') {
    return scoreForm.avgSeconds !== '' && scoreForm.singleBestSeconds !== ''
  }
  const valid = scoreForm.attempts.filter((a) => !a.is_dnf && Number(a.raw) > 0).length
  const dnf = scoreForm.attempts.filter((a) => a.is_dnf).length
  return valid + dnf === 5
})

function openAdd() {
  editing.value = null
  scoreError.value = ''
  Object.assign(scoreForm, {
    recordedAt: today,
    mode: 'detail',
    avgSeconds: '',
    singleBestSeconds: '',
    note: '',
    attempts: [blankAttempt(), blankAttempt(), blankAttempt(), blankAttempt(), blankAttempt()],
  })
  scoreOpen.value = true
}

function openEdit(row) {
  editing.value = row
  scoreError.value = ''
  if (row.mode === 'detail') {
    const attempts = (row.attempts && Array.isArray(row.attempts) ? row.attempts : []).map((a) => ({
      raw: a.is_dnf || a.value == null ? '' : String(Math.round(Number(a.value) * 100)),
      is_dnf: !!a.is_dnf,
    }))
    while (attempts.length < 5) attempts.push(blankAttempt())
    Object.assign(scoreForm, {
      recordedAt: row.recorded_at,
      mode: 'detail',
      avgSeconds: '',
      singleBestSeconds: '',
      note: row.note || '',
      attempts,
    })
  } else {
    Object.assign(scoreForm, {
      recordedAt: row.recorded_at,
      mode: 'simple',
      avgSeconds: row.avg_seconds != null ? String(row.avg_seconds) : '',
      singleBestSeconds: row.single_best_seconds != null ? String(row.single_best_seconds) : '',
      note: row.note || '',
      attempts: [blankAttempt(), blankAttempt(), blankAttempt(), blankAttempt(), blankAttempt()],
    })
  }
  scoreOpen.value = true
}

async function saveScore() {
  scoreError.value = ''
  if (!scoreForm.recordedAt) {
    scoreError.value = '请选择日期'
    return
  }
  if (scoreForm.mode === 'detail') {
    const overMax = scoreForm.attempts.some((a) => !a.is_dnf && Number(a.raw) > 360000)
    if (overMax && !(await dialog.confirm({ title: '时间超出合理范围', message: '有单次时间超过 1 小时，确认仍要保存吗？', confirmText: '强制保存' }))) {
      return
    }
  }
  scoreSaving.value = true
  try {
    const payload = {
      studentId: student.value.id,
      project: project.value,
      recordedAt: scoreForm.recordedAt,
      mode: scoreForm.mode,
      note: scoreForm.note.trim() || null,
    }
    if (scoreForm.mode === 'detail') {
      payload.attempts = scoreForm.attempts.map((a) => ({
        value: a.is_dnf || !a.raw ? null : Number(a.raw) / 100,
        is_dnf: a.is_dnf,
      }))
    } else {
      payload.avgSeconds = scoreForm.avgSeconds
      payload.singleBestSeconds = scoreForm.singleBestSeconds
    }
    if (editing.value) await updateScore(editing.value.id, payload)
    else await createScore(payload)
    toast.success('成绩已保存')
    scoreOpen.value = false
    await loadProject()
  } catch (err) {
    scoreError.value = err.message
  } finally {
    scoreSaving.value = false
  }
}

async function remove(row) {
  const ok = await dialog.confirm({ title: '删除成绩', message: `确认删除 ${formatDate(row.recorded_at)} 的这条成绩吗？`, confirmText: '删除', danger: true })
  if (!ok) return
  try {
    await deleteScore(row.id)
    toast.success('成绩已删除')
    await loadProject()
  } catch (err) {
    toast.error(err.message)
  }
}

async function confirmBulkDelete() {
  const ok = await dialog.confirm({
    title: '批量删除成绩',
    message: `确认清空「${student.value.name}」在「${cubeMeta.value?.label}」下的全部 ${scores.value.length} 条成绩吗？此操作可撤回。`,
    confirmText: '清空',
    danger: true,
  })
  if (!ok) return
  try {
    const snapshot = await listScores({ studentId: student.value.id, project: project.value, page: 1, pageSize: 10000 })
    await bulkDeleteScores({ studentId: student.value.id, project: project.value })
    bulkDeleted.value = snapshot.items
    toast.success('已清空，可点击「撤回」恢复')
    await loadProject()
  } catch (err) {
    toast.error(err.message)
  }
}

async function undoBulk() {
  try {
    for (const r of bulkDeleted.value) {
      await createScore({
        studentId: student.value.id,
        project: project.value,
        recordedAt: r.recorded_at,
        mode: r.mode,
        note: r.note,
        avgSeconds: r.avg_seconds,
        singleBestSeconds: r.single_best_seconds,
        attempts: r.attempts,
      })
    }
    toast.success('成绩已恢复')
    bulkDeleted.value = []
    await loadProject()
  } catch (err) {
    toast.error(err.message)
  }
}

function exportCsv() {
  const csv = buildScoreCsv(scores.value, student.value.name, cubeMeta.value?.label || '')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${student.value.name}_${cubeMeta.value?.label}_成绩.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  toast.success('已导出 CSV')
}

// ===== 学员资料编辑 =====
const studentEditOpen = ref(false)
const studentSaving = ref(false)
const studentError = ref('')
const studentForm = reactive({
  name: '', nickname: '', gender: 'unknown', birthday: '', guardian_name: '', guardian_phone: '', level: '', status: 'active', notes: '',
})

function openStudentEdit() {
  studentError.value = ''
  Object.assign(studentForm, {
    name: student.value.name || '',
    nickname: student.value.nickname || '',
    gender: student.value.gender || 'unknown',
    birthday: student.value.birthday || '',
    guardian_name: student.value.guardian_name || '',
    guardian_phone: student.value.guardian_phone || '',
    level: student.value.level || '',
    status: student.value.status || 'active',
    notes: student.value.notes || '',
  })
  studentEditOpen.value = true
}

async function saveStudent() {
  studentError.value = ''
  if (!studentForm.name.trim()) {
    studentError.value = '请填写学员姓名'
    return
  }
  studentSaving.value = true
  try {
    const payload = { ...studentForm, name: studentForm.name.trim() }
    for (const k of ['nickname', 'birthday', 'guardian_name', 'guardian_phone', 'level', 'notes']) {
      if (payload[k] === '') payload[k] = null
    }
    await updateStudent(student.value.id, payload)
    toast.success('学员资料已保存')
    studentEditOpen.value = false
    student.value = await getStudent(student.value.id)
  } catch (err) {
    studentError.value = err.message
  } finally {
    studentSaving.value = false
  }
}

// ===== 加载 =====
async function loadProject() {
  listLoading.value = true
  try {
    const [list, st] = await Promise.all([
      listScores({ studentId: student.value.id, project: project.value, page: 1, pageSize: 10000 }),
      scoreStats({ studentId: student.value.id, project: project.value }),
    ])
    scores.value = list.items
    Object.assign(stats, st)
    if (page.value > totalPages.value) page.value = totalPages.value
  } catch (err) {
    toast.error(err.message)
    scores.value = []
  } finally {
    listLoading.value = false
  }
}

function switchProject(p) {
  if (p === project.value) return
  project.value = p
  page.value = 1
  resetRange()
  bulkDeleted.value = []
  loadProject()
}

async function load() {
  loading.value = true
  try {
    student.value = await getStudent(route.params.id)
    if (student.value) await loadProject()
  } catch (err) {
    toast.error(err.message)
  } finally {
    loading.value = false
  }
}

watch(
  () => route.params.id,
  (id) => {
    if (id) load()
  },
)

onMounted(load)
</script>
