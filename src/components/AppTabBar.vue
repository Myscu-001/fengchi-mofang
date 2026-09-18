<template>
  <nav
    v-if="auth.isLoggedIn && items.length"
    aria-label="快捷导航"
    class="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 backdrop-blur-md lg:hidden"
  >
    <div class="fc-safe-bottom flex items-stretch">
      <RouterLink
        v-for="item in items"
        :key="item.name"
        :to="item.to"
        class="fc-tab flex h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-ink-500 transition-colors active:bg-ink-100"
        active-class="!text-brand-600"
      >
        <component :is="item.icon" class="size-[21px]" />
        <span class="text-[10.5px] leading-none font-medium">{{ item.label }}</span>
      </RouterLink>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { BarChart3, FolderOpen, LayoutDashboard, Users } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

/* 手机上只放最高频的四个入口，其余功能仍走顶部的汉堡菜单。
   权限过滤与 AppHeader 保持一致（同一套 perm 值），
   没有权限的项直接不出现在 Tab 栏里。 */
const defs = [
  { name: 'home', to: { name: 'home' }, label: '首页', icon: LayoutDashboard },
  { name: 'students', to: { name: 'students' }, label: '学员档案', icon: Users, perm: 'student.view' },
  {
    name: 'analytics',
    to: { name: 'analytics' },
    label: '统计分析',
    icon: BarChart3,
    perm: 'score.view',
  },
  {
    name: 'resources',
    to: { name: 'resources' },
    label: '资源中心',
    icon: FolderOpen,
    perm: 'resource.view',
  },
]

const items = computed(() => defs.filter((i) => !i.perm || auth.can(i.perm)))
</script>

<style>
/* 去掉安卓点击时那块灰蓝色的高亮块，改由 :active 背景色给反馈 */
.fc-tab {
  -webkit-tap-highlight-color: transparent;
}
</style>
