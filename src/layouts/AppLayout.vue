<template>
  <div class="flex min-h-screen flex-col bg-ink-50">
    <!-- 未配置提示 -->
    <div v-if="!configured" class="bg-amber-50 px-4 py-2.5 text-center text-[13px] text-amber-800">
      <TriangleAlert class="mr-1.5 inline size-3.5" />
      尚未配置 Supabase 连接信息，页面可浏览但无法登录或读写数据。请在项目根目录的
      <code class="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">.env.production</code>
      中填入 <code class="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">VITE_SUPABASE_URL</code> 与
      <code class="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">VITE_SUPABASE_ANON_KEY</code>。
    </div>

    <!-- 首次登录需改密 -->
    <div
      v-else-if="auth.profile?.must_change_password"
      class="bg-brand-600 px-4 py-2.5 text-center text-[13px] text-white"
    >
      <KeyRound class="mr-1.5 inline size-3.5" />
      这是初始密码，为保障账号安全，请尽快前往
      <RouterLink :to="{ name: 'profile' }" class="font-semibold underline underline-offset-2">
        个人中心
      </RouterLink>
      修改密码。
    </div>

    <AppHeader />

    <main class="flex-1">
      <RouterView v-slot="{ Component }">
        <component :is="Component" />
      </RouterView>
    </main>

    <AppFooter :brand="brand" :contact="contact" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import { KeyRound, TriangleAlert } from 'lucide-vue-next'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { ensureRanksLoaded } from '@/lib/ranks'

const auth = useAuthStore()
const configured = isSupabaseConfigured

const brand = ref({ name: '风驰思维魔方', full_name: '', slogan: '' })
const contact = ref({})

onMounted(async () => {
  if (!configured) return
  try {
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['site.brand', 'site.contact'])
    for (const row of data || []) {
      if (row.key === 'site.brand') brand.value = { ...brand.value, ...row.value }
      if (row.key === 'site.contact') contact.value = row.value || {}
    }
  } catch {
    // 未登录或网络异常时使用默认文案
  }
  // 段位体系可能已被后台自定义，提前加载供全站段位展示使用
  ensureRanksLoaded()
})
</script>
