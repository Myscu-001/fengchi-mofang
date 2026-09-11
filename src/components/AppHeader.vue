<template>
  <header class="sticky top-0 z-50 border-b border-ink-200 bg-white/85 backdrop-blur-md">
    <div class="fc-container flex h-15 items-center gap-4">
      <RouterLink :to="{ name: 'home' }" class="shrink-0">
        <LogoMark :brand="site.brand" />
      </RouterLink>

      <!-- 桌面导航 -->
      <nav class="hidden flex-1 items-center gap-0.5 lg:flex">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
          active-class="!bg-brand-50 !text-brand-700"
        >
          {{ item.label }}
        </RouterLink>

        <div v-if="adminItems.length" ref="adminRef" class="relative">
          <button
            type="button"
            class="flex items-center gap-1 rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
            :class="isAdminRoute ? 'bg-brand-50 text-brand-700' : ''"
            @click="adminOpen = !adminOpen"
          >
            系统管理
            <ChevronDown class="size-3.5 transition" :class="adminOpen ? 'rotate-180' : ''" />
          </button>
          <Transition name="fc-drop">
            <div
              v-if="adminOpen"
              class="absolute top-full left-0 mt-1.5 w-48 overflow-hidden rounded-xl border border-ink-200 bg-white p-1 shadow-lift"
            >
              <RouterLink
                v-for="item in adminItems"
                :key="item.to"
                :to="item.to"
                class="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13.5px] text-ink-600 transition hover:bg-ink-50 hover:text-ink-900"
                @click="adminOpen = false"
              >
                <component :is="item.icon" class="size-4 text-ink-400" />
                {{ item.label }}
              </RouterLink>
            </div>
          </Transition>
        </div>
      </nav>

      <div class="flex flex-1 items-center justify-end gap-2 lg:flex-none">
        <!-- 未登录 -->
        <template v-if="!auth.isLoggedIn">
          <RouterLink
            :to="{ name: 'login' }"
            class="hidden rounded-[10px] px-3 py-2 text-[13.5px] font-medium text-ink-600 transition hover:bg-ink-100 hover:text-ink-900 sm:block"
          >
            登录
          </RouterLink>
          <RouterLink
            :to="{ name: 'login' }"
            class="inline-flex h-9.5 items-center gap-1.5 rounded-[10px] bg-brand-600 px-4 text-sm font-medium text-white shadow-soft transition hover:bg-brand-700"
          >
            <LogIn class="size-3.5" />
            进入系统
          </RouterLink>
        </template>

        <!-- 已登录 -->
        <div v-else ref="userRef" class="relative">
          <button
            type="button"
            class="flex items-center gap-2 rounded-full border border-ink-200 bg-white py-1 pr-2.5 pl-1 transition hover:bg-ink-50"
            @click="userOpen = !userOpen"
          >
            <UiAvatar :src="auth.profile?.avatar_url" :name="auth.displayName" size="sm" />
            <span class="hidden max-w-[110px] truncate text-[13px] font-medium text-ink-700 sm:block">
              {{ auth.displayName }}
            </span>
            <ChevronDown class="size-3.5 text-ink-400" />
          </button>

          <Transition name="fc-drop">
            <div
              v-if="userOpen"
              class="absolute top-full right-0 mt-1.5 w-60 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lift"
            >
              <div class="flex items-center gap-2.5 border-b border-ink-200 px-3.5 py-3">
                <UiAvatar :src="auth.profile?.avatar_url" :name="auth.displayName" size="md" />
                <div class="min-w-0">
                  <p class="truncate text-[13.5px] font-semibold text-ink-900">{{ auth.displayName }}</p>
                  <p class="truncate text-[11.5px] text-ink-500">{{ auth.user?.email }}</p>
                </div>
              </div>

              <div class="px-3.5 py-2">
                <UiBadge :custom-class="roleStyle(auth.roleCode)" :label="roleLabel(auth.roleCode)" />
              </div>

              <div class="border-t border-ink-200 p-1">
                <RouterLink
                  :to="{ name: 'profile' }"
                  class="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13.5px] text-ink-600 transition hover:bg-ink-50 hover:text-ink-900"
                  @click="userOpen = false"
                >
                  <UserCog class="size-4 text-ink-400" />
                  个人中心
                </RouterLink>
                <button
                  type="button"
                  class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13.5px] text-red-600 transition hover:bg-red-50"
                  @click="handleSignOut"
                >
                  <LogOut class="size-4" />
                  退出登录
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <!-- 移动端菜单 -->
        <button
          type="button"
          class="rounded-lg p-2 text-ink-600 transition hover:bg-ink-100 lg:hidden"
          @click="mobileOpen = !mobileOpen"
        >
          <Menu v-if="!mobileOpen" class="size-5" />
          <X v-else class="size-5" />
        </button>
      </div>
    </div>

    <!-- 移动端导航面板 -->
    <Transition name="fc-drop">
      <nav v-if="mobileOpen" class="border-t border-ink-200 bg-white px-5 py-3 lg:hidden">
        <RouterLink
          v-for="item in allMobileItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ink-600 transition hover:bg-ink-50"
          active-class="!bg-brand-50 !text-brand-700"
          @click="mobileOpen = false"
        >
          <component :is="item.icon" class="size-4 text-ink-400" />
          {{ item.label }}
        </RouterLink>
      </nav>
    </Transition>
  </header>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Award,
  BarChart3,
  Boxes,
  ChevronDown,
  FolderOpen,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  X,
  Trophy,
} from 'lucide-vue-next'
import LogoMark from '@/components/LogoMark.vue'
import UiAvatar from '@/components/UiAvatar.vue'
import UiBadge from '@/components/UiBadge.vue'
import { useAuthStore } from '@/stores/auth'
import { useSiteStore } from '@/stores/site'
import { useToastStore } from '@/stores/toast'
import { useDialogStore } from '@/stores/dialog'
import { roleLabel, roleStyle } from '@/lib/permissions'

const auth = useAuthStore()
const site = useSiteStore()
const toast = useToastStore()
const dialog = useDialogStore()
const router = useRouter()
const route = useRoute()

const mobileOpen = ref(false)
const userOpen = ref(false)
const adminOpen = ref(false)
const userRef = ref(null)
const adminRef = ref(null)

const navDefs = [
  { to: { name: 'home' }, label: '首页', icon: LayoutDashboard },
  { to: { name: 'courses' }, label: '课程体系', icon: Boxes, perm: 'course.view' },
  { to: { name: 'students' }, label: '学员档案', icon: Users, perm: 'student.view' },
  { to: { name: 'analytics' }, label: '统计分析', icon: BarChart3, perm: 'score.view' },
  { to: { name: 'honor' }, label: 'PB 荣誉墙', icon: Trophy, perm: 'score.view' },
  { to: { name: 'resources' }, label: '资源中心', icon: FolderOpen, perm: 'resource.view' },
]

const adminDefs = [
  { to: { name: 'admin-users' }, label: '账号管理', icon: UserCog, perm: 'user.manage' },
  { to: { name: 'admin-roles' }, label: '角色权限', icon: ShieldCheck, perm: 'role.manage' },
  { to: { name: 'admin-coaches' }, label: '师资团队', icon: Award, perm: 'coach.manage' },
  { to: { name: 'admin-settings' }, label: '站点配置', icon: Settings, perm: 'settings.manage' },
]

const navItems = computed(() =>
  navDefs.filter((i) => !i.perm || auth.can(i.perm)),
)
const adminItems = computed(() => adminDefs.filter((i) => auth.can(i.perm)))
const allMobileItems = computed(() => [...navItems.value, ...adminItems.value])
const isAdminRoute = computed(() => route.path.startsWith('/admin'))

function handleOutsideClick(event) {
  if (userRef.value && !userRef.value.contains(event.target)) userOpen.value = false
  if (adminRef.value && !adminRef.value.contains(event.target)) adminOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
  site.load()
})
onBeforeUnmount(() => document.removeEventListener('click', handleOutsideClick))

async function handleSignOut() {
  userOpen.value = false
  const ok = await dialog.confirm({
    title: '退出登录',
    message: '确定要退出当前账号吗？',
    confirmText: '退出',
  })
  if (!ok) return
  await auth.signOut()
  toast.success('已退出登录')
  router.push({ name: 'login' })
}
</script>

<style>
.fc-drop-enter-active,
.fc-drop-leave-active {
  transition: all 0.16s ease;
}
.fc-drop-enter-from,
.fc-drop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
