<template>
  <div>
    <PageHeader title="诊断日志" description="记录本机最近的前端报错">
      <template #badge>
        <UiBadge
          v-if="errorLogs.length"
          :label="`${errorLogs.length} 条`"
          custom-class="bg-red-50 text-red-600 border-red-200"
        />
      </template>
      <UiButton variant="outline" @click="router.back()">
        <template #icon><ArrowLeft class="size-3.5" /></template>
        返回
      </UiButton>
    </PageHeader>

    <div class="fc-container py-6">
      <div class="fc-card p-5">
        <p class="text-[12.5px] leading-relaxed text-ink-500">
          这里只看得到<b class="font-medium text-ink-700">这台设备</b>最近的前端报错。反馈问题时点「复制全部」直接发给管理员即可。
        </p>
        <div v-if="errorLogs.length" class="mt-4 space-y-2.5">
          <div v-for="(e, i) in errorLogs" :key="i" class="pfm-log">
            <div class="flex items-baseline justify-between gap-3">
              <p class="text-[12.5px] font-medium text-ink-800">{{ e.message }}</p>
              <span class="shrink-0 text-[11px] text-ink-400">{{ e.time }}</span>
            </div>
            <p v-if="e.route" class="mt-1 text-[11.5px] text-ink-400">页面：{{ e.route }}</p>
            <p v-if="e.info" class="mt-0.5 text-[11.5px] text-ink-400">位置：{{ e.info }}</p>
          </div>

          <div class="flex items-center gap-2 pt-1.5">
            <UiButton size="sm" variant="outline" @click="copyLogs">
              <template #icon><Copy class="size-3.5" /></template>
              复制全部
            </UiButton>
            <UiButton size="sm" variant="ghost" @click="clearLogs">
              <template #icon><Trash2 class="size-3.5 text-red-500" /></template>
              清空
            </UiButton>
          </div>
        </div>

        <p v-else class="mt-4 text-[13px] text-ink-400">暂无错误记录，一切正常。</p>
      </div>

      <!-- 界面还是旧样子时的自救：清掉 App 里缓存的页面文件再重载，比重装快 -->
      <div class="fc-card mt-5 p-5">
        <h3 class="text-[15px] font-semibold text-ink-900">刷新到最新版本</h3>
        <p class="mt-1 text-[12.5px] leading-relaxed text-ink-500">
          网页更新后，App 偶尔还会用这台手机里缓存的旧版本。点一下就把缓存清掉并重新加载，不用卸载重装。
        </p>
        <UiButton class="mt-3.5" size="sm" variant="outline" :loading="refreshing" @click="hardRefresh">
          <template #icon><RefreshCw class="size-3.5" /></template>
          清除缓存并刷新
        </UiButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Copy, RefreshCw, Trash2 } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import UiButton from '@/components/UiButton.vue'
import UiBadge from '@/components/UiBadge.vue'
import { useProfileAccount } from '@/lib/useProfileAccount'

const router = useRouter()
const { errorLogs, load, copyLogs, clearLogs } = useProfileAccount()

const refreshing = ref(false)

/* 「清除缓存并刷新」：让 SW 把 fc-* 缓存全部删掉再导航一次，
   这样连 sw.js 本身没变的场景也能拿到最新资源。没有 SW（浏览器里打开）就直接重载。 */
function hardRefresh() {
  refreshing.value = true
  const sw = navigator.serviceWorker?.controller
  if (sw) sw.postMessage('clear-cache')
  else setTimeout(() => window.location.reload(), 200)
}

onMounted(load)
</script>

<style scoped>
.pfm-log {
  border-radius: 10px;
  background: var(--color-ink-50);
  padding: 10px 12px;
}
</style>
