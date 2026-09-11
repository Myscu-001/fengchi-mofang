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
      <UiButton variant="outline" @click="exportReport">
        <template #icon><FileText class="size-3.5" /></template>
        成长报告
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

      <!-- 魔方段位 -->
      <div class="fc-card p-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="flex items-center gap-1.5 text-[14px] font-semibold text-ink-900">
            <Medal class="size-4 text-amber-500" />魔方段位
          </h3>
          <span class="text-[12px] text-ink-400">按各项目最佳平均成绩自动评定</span>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <div
            v-for="r in ranks"
            :key="r.value"
            class="rounded-xl border border-ink-200 p-3"
            :style="r.rank ? { borderColor: r.rank.color + '66', background: r.rank.color + '12' } : {}"
          >
            <div class="flex items-center justify-between">
              <span class="text-[12.5px] font-medium text-ink-600">{{ r.label }}</span>
              <span v-if="r.rank" class="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white" :style="{ backgroundColor: r.rank.color }">{{ r.rank.label }}</span>
              <span v-else class="text-[10px] text-ink-400">未达标</span>
            </div>
            <div class="mt-1.5 text-[12px] text-ink-500">
              最佳平均 <span class="font-semibold tabular-nums text-ink-700">{{ r.bestAvg != null ? r.bestAvg.toFixed(2) + 's' : '—' }}</span>
            </div>
            <div v-if="r.next" class="mt-0.5 text-[11px] text-ink-400">
              距离「{{ r.next.label }}」还差 {{ Math.max(0, (r.bestAvg != null ? r.bestAvg : r.next.max) - r.next.max).toFixed(2) }}s
            </div>
          </div>
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

      <!-- 训练目标 -->
      <div class="fc-card p-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="flex items-center gap-1.5 text-[14px] font-semibold text-ink-900">
            <Target class="size-4 text-brand-500" />训练目标
            <span class="ml-1 text-[12px] font-normal text-ink-400">{{ cubeMeta?.label }}</span>
          </h3>
          <div class="flex items-center gap-2">
            <UiButton v-if="canManageGoals && goalState.has" variant="ghost" size="sm" @click="removeGoal">删除</UiButton>
            <UiButton v-if="canManageGoals" variant="outline" size="sm" @click="openGoalEdit">
              {{ goalState.has ? '编辑目标' : '设置目标' }}
            </UiButton>
          </div>
        </div>

        <template v-if="goalState.has">
          <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-600">
            <span>{{ goalState.detail }}</span>
            <span v-if="currentGoal?.due" class="text-ink-400">截止 {{ formatDate(currentGoal.due) }}</span>
            <span
              class="rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
              :class="goalState.achieved ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'"
            >{{ goalState.achieved ? '已达成' : '进行中' }}</span>
          </div>
          <div class="mt-2.5 h-2 overflow-hidden rounded-full bg-ink-100">
            <div
              class="h-full rounded-full transition-all"
              :class="goalState.achieved ? 'bg-emerald-500' : 'bg-brand-500'"
              :style="{ width: Math.round(goalState.pct * 100) + '%' }"
            />
          </div>
          <p class="mt-1.5 text-[11.5px] text-ink-400">完成度 {{ Math.round(goalState.pct * 100) }}%</p>
          <p v-if="currentGoal?.note" class="mt-1 text-[12px] text-ink-500">{{ currentGoal.note }}</p>
        </template>
        <p v-else class="mt-3 text-[12.5px] text-ink-400">
          {{ canManageGoals ? '尚未为该项目设置训练目标，点击「设置目标」开始。' : '尚未为该项目设置训练目标。' }}
        </p>
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

      <!-- 相关教学资源 -->
      <div v-if="canViewResources" class="fc-card p-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="flex items-center gap-1.5 text-[14px] font-semibold text-ink-900">
            <FolderOpen class="size-4 text-brand-500" />相关教学资源
            <span class="ml-1 text-[12px] font-normal text-ink-400">{{ cubeMeta?.label }}</span>
          </h3>
          <RouterLink
            :to="{ name: 'resources', query: { project } }"
            class="text-[12.5px] text-brand-600 hover:underline"
          >
            查看全部
          </RouterLink>
        </div>
        <UiLoading v-if="relatedLoading" text="加载相关资源…" />
        <div v-else-if="relatedResources.length" class="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="res in relatedResources"
            :key="res.id"
            class="flex items-start gap-2.5 rounded-xl border border-ink-200 p-3 transition hover:border-brand-200 hover:bg-brand-50/40"
          >
            <ResourceIcon :kind="res.file_type" />
            <div class="min-w-0 flex-1">
              <p class="line-clamp-1 text-[13px] font-medium text-ink-800" :title="res.title">{{ res.title }}</p>
              <p class="mt-0.5 line-clamp-1 text-[11.5px] text-ink-400" :title="res.file_name">{{ res.file_name }}</p>
            </div>
          </div>
        </div>
        <p v-else class="mt-2 py-4 text-center text-[12.5px] text-ink-400">
          暂无「{{ cubeMeta?.label }}」相关教学资源，可在资源中心上传时绑定该魔方项目。
        </p>
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

        <!-- 详细模式：5 次单次时间，竖排，自动识别写法 -->
        <div v-else class="space-y-3">
          <p class="text-[12px] leading-relaxed text-ink-500">
            录入 5 个单次时间（竖排）。<b class="text-ink-600">纯数字自动识别</b>：<code class="rounded bg-ink-100 px-1">1134</code> → 11.34 秒，<code class="rounded bg-ink-100 px-1">12345</code> → 1:23.45；<b class="text-ink-600">留空或填非数字即记为 DNF</b>。
          </p>
          <div
            v-for="(at, i) in scoreForm.attempts"
            :key="i"
            class="flex items-center gap-2.5 rounded-xl border px-3 py-2"
            :class="attemptInfo(at).is_dnf ? 'border-red-200 bg-red-50' : 'border-ink-200'"
          >
            <span class="w-5 shrink-0 text-[13px] font-semibold text-ink-400">{{ i + 1 }}</span>
            <input
              v-model="at.raw"
              inputmode="numeric"
              maxlength="8"
              class="fc-input flex-1"
              :class="attemptInfo(at).is_dnf ? 'text-red-500 placeholder-red-300' : ''"
              :placeholder="'留空 / 非数字 = DNF，如 1134 / 12345'"
            />
            <span
              v-if="attemptInfo(at).is_dnf"
              class="w-16 shrink-0 text-right text-[12px] font-medium text-red-500"
            >DNF</span>
            <span
              v-else
              class="w-20 shrink-0 text-right text-[12px] tabular-nums text-brand-600"
            >{{ attemptInfo(at).preview }}</span>
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

    <!-- 训练目标 -->
    <UiModal :open="goalOpen" title="设置训练目标" width="sm" @close="goalOpen = false">
      <div class="space-y-4">
        <UiField label="魔方项目">
          <input class="fc-input" :value="cubeMeta?.label" disabled />
        </UiField>
        <UiField label="目标类型">
          <div class="flex gap-2">
            <button
              type="button"
              class="flex-1 rounded-lg border px-3 py-2 text-[13px] font-medium transition"
              :class="goalForm.type === 'time' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600'"
              @click="goalForm.type = 'time'"
            >
              成绩目标
            </button>
            <button
              type="button"
              class="flex-1 rounded-lg border px-3 py-2 text-[13px] font-medium transition"
              :class="goalForm.type === 'rank' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600'"
              @click="goalForm.type = 'rank'"
            >
              段位目标
            </button>
          </div>
        </UiField>
        <template v-if="goalForm.type === 'time'">
          <UiField label="目标平均成绩（秒）" required>
            <input v-model="goalForm.target" type="number" step="0.01" min="0" class="fc-input" placeholder="例：20" />
          </UiField>
          <UiField label="起始成绩（秒）" hint="用于计算进度，默认取当前最佳平均">
            <input v-model="goalForm.baseline" type="number" step="0.01" min="0" class="fc-input" />
          </UiField>
        </template>
        <UiField v-else label="目标段位" required>
          <select v-model="goalForm.target" class="fc-input">
            <option value="">请选择</option>
            <option v-for="t in rankTiers(project)" :key="t.key" :value="t.key">{{ t.label }}（≤ {{ t.max }}s）</option>
          </select>
        </UiField>
        <UiField label="截止日期">
          <input v-model="goalForm.due" type="date" class="fc-input" />
        </UiField>
        <UiField label="备注">
          <input v-model="goalForm.note" class="fc-input" placeholder="例：暑期集训前达成" />
        </UiField>
      </div>
      <template #footer>
        <UiButton variant="outline" @click="goalOpen = false">取消</UiButton>
        <UiButton variant="primary" :loading="goalSaving" @click="saveGoal">保存目标</UiButton>
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
  FileText,
  FolderOpen,
  ListChecks,
  Medal,
  Pencil,
  Plus,
  Target,
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
import ResourceIcon from '@/components/ResourceIcon.vue'
import { CUBE_PROJECTS, STUDENT_STATUS, STUDENT_STATUS_OPTIONS } from '@/lib/dict'
import { rankForProject, nextRank, rankTiers } from '@/lib/ranks'
import { formatDate } from '@/lib/format'
import { getStudent, updateStudent } from '@/api/students'
import {
  listScores,
  scoreStats,
  studentProjectBests,
  createScore,
  updateScore,
  deleteScore,
  bulkDeleteScores,
  buildScoreCsv,
  computeAo5,
} from '@/api/scores'
import { listResourcesByTag } from '@/api/resources'
import { loadGoals, saveGoals } from '@/api/goals'
import { getSetting } from '@/api/settings'
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
const relatedResources = ref([])
const relatedLoading = ref(false)

const canViewResources = computed(() => auth.can('resource.view'))

// 训练目标
const canManageGoals = computed(() => auth.can('settings.manage'))
const goals = ref({})
const goalOpen = ref(false)
const goalSaving = ref(false)
const goalForm = reactive({ type: 'time', target: '', baseline: '', due: '', note: '' })

const cubeMeta = computed(() => CUBE_PROJECTS.find((p) => p.value === project.value) || null)
const today = new Date().toISOString().slice(0, 10)

const bests = ref({})
const ranks = computed(() => {
  const m = bests.value || {}
  return CUBE_PROJECTS.map((p) => {
    const best = m[p.value]?.bestAvg ?? null
    const rank = rankForProject(p.value, best)
    const tiers = rankTiers(p.value)
    const idx = rank ? tiers.findIndex((t) => t.key === rank.key) : -1
    const next = idx >= 0 && idx < tiers.length - 1 ? tiers[idx + 1] : null
    return { ...p, bestAvg: best, rank, next }
  })
})

// ===== 训练目标进度 =====
const currentGoal = computed(() => {
  const sid = student.value?.id
  if (!sid) return null
  return goals.value[sid]?.[project.value] || null
})

const goalState = computed(() => {
  const g = currentGoal.value
  const cur = bests.value?.[project.value]?.bestAvg ?? null
  if (!g) return { has: false, current: cur, pct: 0, achieved: false, detail: '' }

  if (g.type === 'rank') {
    const tiers = rankTiers(project.value)
    const targetIdx = tiers.findIndex((t) => t.key === g.target)
    const curRank = rankForProject(project.value, cur)
    const curIdx = curRank ? tiers.findIndex((t) => t.key === curRank.key) : -1
    const achieved = cur != null && targetIdx >= 0 && curIdx >= targetIdx
    const pct = achieved ? 1 : targetIdx >= 0 ? Math.max(0, Math.min(1, (curIdx + 1) / (targetIdx + 1))) : 0
    const tl = tiers.find((t) => t.key === g.target)
    return {
      has: true,
      current: cur,
      pct,
      achieved,
      detail: curRank ? `当前段位 ${curRank.label} · 目标 ${tl?.label || '—'}` : `目标段位 ${tl?.label || '—'}`,
    }
  }

  const target = Number(g.target)
  const base = g.baseline != null && g.baseline !== '' ? Number(g.baseline) : cur
  const achieved = cur != null && target > 0 && cur <= target
  let pct = 0
  if (achieved) pct = 1
  else if (base != null && cur != null && base > target && target > 0) {
    pct = Math.max(0, Math.min(1, (base - cur) / (base - target)))
  }
  return {
    has: true,
    current: cur,
    pct,
    achieved,
    detail: cur != null ? `当前 ${cur.toFixed(2)}s · 目标 ${target.toFixed(2)}s` : `目标 ${target.toFixed(2)}s`,
  }
})

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

// 单次时间输入框解析：纯数字自动识别写法，无数字（留空/非数字）即 DNF
// 规则：末 2 位为百分秒，其余数字按「[分][秒]」解读（秒占末 2 位，前缀为分）
// 例：1134 -> 11.34 秒；12345 -> 1:23.45
function parseAttemptRaw(raw) {
  const digits = String(raw == null ? '' : raw).replace(/\D/g, '')
  if (!digits) return { value: null, is_dnf: true }
  const cs = parseInt(digits.slice(-2), 10)
  const before = digits.slice(0, -2)
  let minutes = 0
  let seconds = 0
  if (before === '') {
    seconds = 0
  } else if (before.length <= 2) {
    seconds = parseInt(before, 10)
  } else {
    seconds = parseInt(before.slice(-2), 10)
    minutes = parseInt(before.slice(0, -2), 10) || 0
  }
  const value = round2(minutes * 60 + seconds + cs / 100)
  if (value <= 0) return { value: null, is_dnf: true }
  return { value, is_dnf: false }
}

// 秒 -> 展示串（>=60 用 分:秒.百分秒 写法）
function fmtTimeShort(v) {
  if (v == null) return 'DNF'
  const minutes = Math.floor(v / 60)
  const secPart = v - minutes * 60
  if (minutes > 0) {
    const s = Math.floor(secPart)
    const cs = Math.round((secPart - s) * 100)
    return `${minutes}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
  }
  return secPart.toFixed(2)
}

// 展示串 -> 纯数字原始串（编辑回显时保证新解析可无损还原）
function valueToRaw(v) {
  if (v == null) return ''
  const minutes = Math.floor(Number(v) / 60)
  const rem = Number(v) - minutes * 60
  const secs = Math.floor(rem)
  const cs = Math.round((rem - secs) * 100)
  return `${minutes}${String(secs).padStart(2, '0')}${String(cs).padStart(2, '0')}`
}

function attemptInfo(at) {
  const p = parseAttemptRaw(at.raw)
  return {
    ...p,
    display: fmtTimeShort(p.value),
    preview: p.is_dnf ? 'DNF' : p.value >= 60 ? fmtTimeShort(p.value) : `${fmtTimeShort(p.value)}秒`,
  }
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
  return { raw: '' }
}

const scoreForm = reactive({
  recordedAt: today,
  mode: 'detail',
  avgSeconds: '',
  singleBestSeconds: '',
  attempts: [blankAttempt(), blankAttempt(), blankAttempt(), blankAttempt(), blankAttempt()],
  note: '',
})

const detailCalc = computed(() => {
  const attempts = scoreForm.attempts.map((a) => parseAttemptRaw(a.raw))
  return computeAo5(attempts)
})

const detailHint = computed(() => {
  const valid = scoreForm.attempts.filter((a) => !attemptInfo(a).is_dnf).length
  const dnf = 5 - valid
  if (dnf === 5) return '所有成绩均为 DNF'
  if (valid < 3) return '有效成绩不足 3 次，平均成绩记为 DNF'
  if (valid < 5) return `还有 ${5 - valid} 次留空，将记为 DNF`
  return ''
})

const canSaveScore = computed(() => {
  if (scoreForm.mode === 'simple') {
    return scoreForm.avgSeconds !== '' && scoreForm.singleBestSeconds !== ''
  }
  const valid = scoreForm.attempts.filter((a) => !attemptInfo(a).is_dnf).length
  return valid >= 1
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
      raw: a.is_dnf || a.value == null ? '' : valueToRaw(a.value),
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
    const overMax = scoreForm.attempts.some((a) => {
      const p = parseAttemptRaw(a.raw)
      return !p.is_dnf && p.value > 3600
    })
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
      payload.attempts = scoreForm.attempts.map((a) => parseAttemptRaw(a.raw))
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
    loadRelated()
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
    if (student.value) await Promise.all([loadProject(), loadBests(), loadGoalsList()])
  } catch (err) {
    toast.error(err.message)
  } finally {
    loading.value = false
  }
}

async function loadBests() {
  try {
    bests.value = await studentProjectBests({ studentId: student.value.id })
  } catch {
    bests.value = {}
  }
}

/** 加载与当前魔方项目关联的教学资源（资源以项目枚举值作为标签存储） */
async function loadRelated() {
  if (!auth.can('resource.view') || !project.value) {
    relatedResources.value = []
    return
  }
  relatedLoading.value = true
  try {
    relatedResources.value = await listResourcesByTag(project.value, 6)
  } catch {
    relatedResources.value = []
  } finally {
    relatedLoading.value = false
  }
}

// ===== 训练目标：读取 / 编辑 =====
async function loadGoalsList() {
  try {
    goals.value = await loadGoals()
  } catch {
    goals.value = {}
  }
}

function openGoalEdit() {
  const g = currentGoal.value
  const cur = bests.value?.[project.value]?.bestAvg ?? null
  Object.assign(goalForm, {
    type: g?.type || 'time',
    target: g ? String(g.target) : '',
    baseline: g?.baseline != null ? String(g.baseline) : cur != null ? cur.toFixed(2) : '',
    due: g?.due || '',
    note: g?.note || '',
  })
  goalOpen.value = true
}

async function persistGoals(next) {
  await saveGoals(next)
  goals.value = next
}

async function saveGoal() {
  const type = goalForm.type
  const rawTarget = String(goalForm.target ?? '').trim()
  if (!rawTarget) {
    toast.error('请填写目标值')
    return
  }
  const goal = {
    type,
    target: type === 'time' ? Number(rawTarget) : rawTarget,
    baseline: goalForm.baseline !== '' ? Number(goalForm.baseline) : null,
    due: goalForm.due || null,
    note: goalForm.note?.trim() || null,
  }
  if (type === 'time' && !(goal.target > 0)) {
    toast.error('目标成绩需大于 0')
    return
  }
  goalSaving.value = true
  try {
    const next = JSON.parse(JSON.stringify(goals.value))
    const sid = student.value.id
    next[sid] = next[sid] || {}
    next[sid][project.value] = goal
    await persistGoals(next)
    goalOpen.value = false
    toast.success('目标已保存')
  } catch (err) {
    toast.error(err.message)
  } finally {
    goalSaving.value = false
  }
}

async function removeGoal() {
  const sid = student.value.id
  if (!goals.value[sid]?.[project.value]) return
  const ok = await dialog.confirm({
    title: '删除目标',
    message: '确认删除该项目下的训练目标吗？',
    confirmText: '删除',
    danger: true,
  })
  if (!ok) return
  goalSaving.value = true
  try {
    const next = JSON.parse(JSON.stringify(goals.value))
    delete next[sid][project.value]
    if (!Object.keys(next[sid]).length) delete next[sid]
    await persistGoals(next)
    goalOpen.value = false
    toast.success('目标已删除')
  } catch (err) {
    toast.error(err.message)
  } finally {
    goalSaving.value = false
  }
}

/** 生成可打印的学员成长报告（浏览器打印 → 另存为 PDF，方便发家长） */
async function exportReport() {
  const st = student.value
  if (!st) return

  let brand = { name: '风驰思维魔方' }
  let contact = {}
  try {
    brand = { ...brand, ...(await getSetting('site.brand', {})) }
    contact = (await getSetting('site.contact', {})) || {}
  } catch {
    // 使用默认品牌信息
  }

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const fmt = (v) => (v == null ? '—' : Number(v).toFixed(2) + 's')
  const fmtRow = (v, dnf) => (dnf ? 'DNF' : v == null ? '—' : Number(v).toFixed(2))

  const rankCards = ranks.value
    .map((r) => {
      const single = bests.value?.[r.value]?.bestSingle ?? null
      return `<div class="card"${r.rank ? ` style="border-color:${r.rank.color}66"` : ''}>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <b>${esc(r.label)}</b>
          ${r.rank ? `<span class="rank" style="background:${r.rank.color}">${esc(r.rank.label)}</span>` : '<span class="muted">未达标</span>'}
        </div>
        <div class="line">最佳平均 <b>${fmt(r.bestAvg)}</b></div>
        <div class="line">最佳单次 <b>${fmt(single)}</b></div>
      </div>`
    })
    .join('')

  const recent = scores.value.slice(0, 12)
  const rows = recent.length
    ? recent
        .map(
          (s) => `<tr>
        <td>${esc(formatDate(s.recorded_at))}</td>
        <td>${fmtRow(s.avg_seconds, s.avg_is_dnf)}</td>
        <td>${fmtRow(s.single_best_seconds, s.single_is_dnf)}</td>
        <td>${s.mode === 'detail' ? '详细' : '简单'}</td>
        <td>${esc(s.note || '')}</td>
      </tr>`,
        )
        .join('')
    : '<tr><td colspan="5" style="text-align:center;color:#9aa0a6;">暂无成绩记录</td></tr>'

  const contactLine = [
    contact.phone && `电话 ${contact.phone}`,
    contact.wechat && `微信 ${contact.wechat}`,
    contact.address && `地址 ${contact.address}`,
    contact.hours,
  ]
    .filter(Boolean)
    .join('　')

  const genderMap = { male: '男', female: '女', unknown: '未填写' }
  const generated = new Date().toLocaleString('zh-CN')

  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8" />
<title>${esc(st.name)}成长报告</title>
<style>
  *{box-sizing:border-box;}
  body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;color:#1f2937;margin:0;padding:34px;}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #EA625F;padding-bottom:12px;margin-bottom:18px;}
  h1{font-size:22px;margin:0 0 4px;}
  .sub,.muted{color:#9aa0a6;font-size:12px;}
  .brand{font-weight:700;color:#EA625F;font-size:14px;text-align:right;}
  .meta{font-size:13px;color:#4b5563;line-height:2;margin-bottom:18px;}
  .meta b{color:#111827;}
  h2{font-size:14px;margin:22px 0 10px;padding-left:8px;border-left:3px solid #EA625F;}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
  .card{border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;}
  .card .line{font-size:12px;color:#4b5563;margin-top:4px;}
  .rank{display:inline-block;padding:1px 6px;border-radius:4px;color:#fff;font-size:11px;}
  table{width:100%;border-collapse:collapse;font-size:12.5px;}
  th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left;}
  th{background:#f9fafb;color:#6b7280;font-weight:500;}
  .foot{margin-top:26px;font-size:11.5px;color:#9aa0a6;border-top:1px solid #e5e7eb;padding-top:10px;}
  @media print{body{padding:0;} @page{margin:14mm;}}
</style></head><body>
  <div class="head">
    <div>
      <h1>学员成长报告</h1>
      <div class="sub">生成时间：${esc(generated)}</div>
    </div>
    <div class="brand">${esc(brand.name || '')}</div>
  </div>

  <div class="meta">
    <div><b>姓名：</b>${esc(st.name)}${st.nickname ? ' <span class="muted">（' + esc(st.nickname) + '）</span>' : ''}</div>
    <div><b>性别：</b>${genderMap[st.gender] || '—'}　　<b>年龄：</b>${esc(ageOf(st.birthday))}　　<b>当前水平：</b>${esc(st.level || '—')}</div>
    <div><b>家长：</b>${esc(st.guardian_name || '—')}　　<b>加入日期：</b>${esc(formatDate(st.joined_at))}</div>
  </div>

  <h2>魔方段位与最好成绩</h2>
  <div class="grid">${rankCards}</div>

  <h2>${esc(cubeMeta.value?.label || '')} · 近期成绩</h2>
  <table>
    <thead><tr><th>日期</th><th>平均成绩(秒)</th><th>单次最佳(秒)</th><th>模式</th><th>备注</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="foot">${contactLine ? esc(contactLine) : '　'}</div>
</body></html>`

  const w = window.open('', '_blank')
  if (!w) {
    toast.error('浏览器拦截了新窗口，请允许弹窗后重试')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => {
    try {
      w.print()
    } catch {
      // 用户仍可手动打印
    }
  }, 500)
}

watch(
  () => route.params.id,
  (id) => {
    if (id) load()
  },
)

onMounted(load)
</script>
