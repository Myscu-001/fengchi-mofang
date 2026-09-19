<template>
  <nav
    v-if="auth.isLoggedIn && items.length"
    aria-label="快捷导航"
    class="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 backdrop-blur-md lg:hidden"
  >
    <div class="fc-tabbar-row fc-safe-bottom">
      <RouterLink
        v-for="item in items"
        :key="item.name"
        :to="item.to"
        class="fc-tab"
        :class="{ 'is-active': isActive(item) }"
      >
        <component :is="item.icon" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { BarChart3, LayoutDashboard, User, Users } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()

/* 手机上只放最高频的四个入口，其余功能走首页的工作台图标。
   权限过滤与 AppHeader 保持一致（同一套 perm 值），没有权限的项直接不出现。
   match 列出「算作选中本 Tab」的所有路由名（如在学员详情页时也高亮「学员」）。
   高度固定 60px，按下只变颜色、不做缩放（见 styles/app-workbench.css）。 */
const defs = [
  {
    name: 'home',
    to: { name: 'home' },
    label: '首页',
    icon: LayoutDashboard,
    match: ['home'],
  },
  {
    name: 'students',
    to: { name: 'students' },
    label: '学员',
    icon: Users,
    perm: 'student.view',
    match: ['students', 'student-detail', 'student-learning', 'student-cfop'],
  },
  {
    name: 'analytics',
    to: { name: 'analytics' },
    label: '统计',
    icon: BarChart3,
    perm: 'score.view',
    match: ['analytics', 'honor'],
  },
  {
    name: 'profile',
    to: { name: 'profile' },
    label: '我的',
    icon: User,
    match: ['profile'],
  },
]

const items = computed(() => defs.filter((i) => !i.perm || auth.can(i.perm)))

function isActive(item) {
  return item.match.includes(route.name)
}
</script>
